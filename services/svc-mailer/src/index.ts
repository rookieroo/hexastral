/**
 * svc-mailer — Hexastral 邮件发送服务
 *
 * 内网服务，只通过 Service Binding 调用，无公网暴露。
 * 使用 AWS SES 发送事务邮件 (nodejs_compat 模式下 SDK v3 可用)。
 *
 * 调用方配置 (wrangler.jsonc):
 *   { "binding": "SVC_MAILER", "service": "hexastral-svc-mailer" }
 *
 * Callers: hexastral-api, notionflare-newsletter (ALLOWED_CALLERS).
 * Optional `from` must be in ALLOWED_FROM_EMAILS (defaults to AWS_SES_FROM).
 */

import { SESv2Client, SendEmailCommand, type SendEmailCommandOutput } from '@aws-sdk/client-sesv2'
import { Hono } from 'hono'
import { z } from 'zod/v4'

interface Env {
  AWS_REGION: string
  AWS_SES_FROM: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  ENVIRONMENT: string
  /** Comma-separated allowed From addresses (includes AWS_SES_FROM always) */
  ALLOWED_FROM_EMAILS?: string
  /** Comma-separated caller ids (empty = allow all internal callers) */
  ALLOWED_CALLERS?: string
}

const app = new Hono<{ Bindings: Env }>()

const DEFAULT_CALLERS = ['hexastral-api', 'notionflare-newsletter']

function getSESClient(env: Env): SESv2Client {
  return new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function parseList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function allowedFromSet(env: Env): Set<string> {
  const set = new Set(parseList(env.ALLOWED_FROM_EMAILS))
  set.add(env.AWS_SES_FROM.toLowerCase())
  return set
}

function assertCaller(env: Env, caller: string | undefined): string | null {
  const allowed = parseList(env.ALLOWED_CALLERS)
  const list = allowed.length > 0 ? allowed : DEFAULT_CALLERS.map((c) => c.toLowerCase())
  const id = (caller ?? '').trim().toLowerCase()
  if (!id || !list.includes(id)) {
    return `caller not allowed: ${caller ?? '(missing)'}`
  }
  return null
}

function resolveFrom(env: Env, requested?: string): { from: string; error?: string } {
  const fallback = env.AWS_SES_FROM
  if (!requested) return { from: fallback }
  const allow = allowedFromSet(env)
  if (!allow.has(requested.toLowerCase())) {
    return { from: fallback, error: `from not allowlisted: ${requested}` }
  }
  return { from: requested }
}

const sendEmailSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(998),
    html: z.string().optional(),
    text: z.string().optional(),
    replyTo: z.string().email().optional(),
    from: z.string().email().optional(),
    caller: z.string().min(1).max(64).optional(),
  })
  .refine((d) => d.html ?? d.text, { message: 'At least one of html or text is required' })

const sendBatchSchema = z.object({
  emails: z
    .array(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1).max(998),
        html: z.string().optional(),
        text: z.string().optional(),
      })
    )
    .min(1)
    .max(50),
  caller: z.string().min(1).max(64).optional(),
})

app.post('/send', async (c) => {
  const body = sendEmailSchema.parse(await c.req.json())

  const callerErr = assertCaller(c.env, body.caller)
  if (callerErr) {
    return c.json({ success: false, error: 'forbidden', message: callerErr }, 403)
  }

  const { from, error: fromErr } = resolveFrom(c.env, body.from)
  if (fromErr) {
    return c.json({ success: false, error: 'forbidden', message: fromErr }, 403)
  }

  const toAddresses = Array.isArray(body.to) ? body.to : [body.to]
  const ses = getSESClient(c.env)

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: toAddresses },
    Content: {
      Simple: {
        Subject: { Data: body.subject, Charset: 'UTF-8' },
        Body: {
          ...(body.html && { Html: { Data: body.html, Charset: 'UTF-8' } }),
          ...(body.text && { Text: { Data: body.text, Charset: 'UTF-8' } }),
        },
      },
    },
    ...(body.replyTo && { ReplyToAddresses: [body.replyTo] }),
  })

  let result: SendEmailCommandOutput
  try {
    result = await ses.send(command)
  } catch (err) {
    const errName = err instanceof Error ? err.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(
      JSON.stringify({
        type: 'ses_error',
        error_name: errName,
        caller: body.caller,
        to_domains: toAddresses.map((a) => a.split('@')[1] ?? 'unknown'),
        subject: body.subject.slice(0, 60),
        error: errMsg,
        environment: c.env.ENVIRONMENT ?? 'unknown',
      })
    )
    return c.json({ success: false, error: errName, message: errMsg }, 502)
  }

  console.log(
    JSON.stringify({
      type: 'email_sent',
      provider: 'aws-ses',
      caller: body.caller,
      messageId: result.MessageId,
      recipients: toAddresses.length,
      toDomains: toAddresses.map((a) => a.split('@')[1] ?? 'unknown'),
      subject: body.subject.slice(0, 60),
      environment: c.env.ENVIRONMENT,
    })
  )

  return c.json({
    success: true,
    messageId: result.MessageId,
    provider: 'aws-ses',
  })
})

app.post('/send-batch', async (c) => {
  const body = sendBatchSchema.parse(await c.req.json())

  const callerErr = assertCaller(c.env, body.caller)
  if (callerErr) {
    return c.json({ success: false, error: 'forbidden', message: callerErr }, 403)
  }

  const ses = getSESClient(c.env)
  const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = []

  for (const email of body.emails) {
    if (!isValidEmail(email.to)) {
      results.push({ to: email.to, success: false, error: 'Invalid email address' })
      continue
    }

    try {
      const command = new SendEmailCommand({
        FromEmailAddress: c.env.AWS_SES_FROM,
        Destination: { ToAddresses: [email.to] },
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: {
              ...(email.html && { Html: { Data: email.html, Charset: 'UTF-8' } }),
              ...(email.text && { Text: { Data: email.text, Charset: 'UTF-8' } }),
            },
          },
        },
      })

      const result: SendEmailCommandOutput = await ses.send(command)
      results.push({ to: email.to, success: true, messageId: result.MessageId })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(
        JSON.stringify({
          type: 'ses_error',
          caller: body.caller,
          recipient_domain: email.to.split('@')[1] ?? 'unknown',
          subject: email.subject.slice(0, 60),
          error: errMsg,
        })
      )
      results.push({ to: email.to, success: false, error: errMsg })
    }
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.length - sent

  console.log(
    JSON.stringify({
      type: 'email_batch_sent',
      provider: 'aws-ses',
      caller: body.caller,
      sent,
      failed,
      total: results.length,
      environment: c.env.ENVIRONMENT,
    })
  )

  return c.json({
    success: sent > 0,
    summary: { sent, failed, total: results.length },
    results,
  })
})

app.get('/health', (c) => c.json({ status: 'ok', service: 'svc-mailer' }))

export default app
