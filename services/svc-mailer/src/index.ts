/**
 * svc-mailer — Hexastral 邮件发送服务
 *
 * 内网服务，只通过 Service Binding 调用，无公网暴露。
 * 使用 AWS SES 发送事务邮件 (nodejs_compat 模式下 SDK v3 可用)。
 *
 * 调用方配置 (wrangler.jsonc):
 *   { "binding": "SVC_MAILER", "service": "hexastral-svc-mailer" }
 *
 * 调用示例:
 *   await env.SVC_MAILER.fetch(new Request('http://internal/send', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       to: 'user@example.com',
 *       subject: '命运报告已生成',
 *       html: '<h1>你的报告已就绪</h1>',
 *     }),
 *   }))
 */

// SES v2 returns JSON (not XML) — required for Cloudflare Workers, which lacks DOMParser.
// SES v1 (@aws-sdk/client-ses) fails at response deserialization with `DOMParser is not defined`.
import { SESv2Client, SendEmailCommand, type SendEmailCommandOutput } from '@aws-sdk/client-sesv2'
import { Hono } from 'hono'
import { z } from 'zod/v4'

// ── Env ───────────────────────────────────────────────────────

interface Env {
  AWS_REGION: string
  AWS_SES_FROM: string
  // Secrets:
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  ENVIRONMENT: string
}

// ── App ───────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>()

// ── Helpers ───────────────────────────────────────────────────

function getSESClient(env: Env): SESv2Client {
  return new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

/** Basic email validation — defense in depth, never trust caller blindly */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

// ── Schemas ───────────────────────────────────────────────────

const sendEmailSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(998),
    html: z.string().optional(),
    text: z.string().optional(),
    replyTo: z.string().email().optional(),
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
})

// ── Routes ────────────────────────────────────────────────────

/**
 * POST /send
 * Body: { to: string | string[], subject: string, html?: string, text?: string }
 */
app.post('/send', async (c) => {
  const body = sendEmailSchema.parse(await c.req.json())

  const toAddresses = Array.isArray(body.to) ? body.to : [body.to]

  const ses = getSESClient(c.env)

  const command = new SendEmailCommand({
    FromEmailAddress: c.env.AWS_SES_FROM,
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
    // Include error name (e.g. MessageRejected, AccessDenied) for quick diagnosis
    console.error(
      JSON.stringify({
        type: 'ses_error',
        error_name: errName,
        to_domains: toAddresses.map((a) => a.split('@')[1] ?? 'unknown'),
        subject: body.subject.slice(0, 60),
        error: errMsg,
        environment: c.env.ENVIRONMENT ?? 'unknown',
      })
    )
    // Return structured error so hexastral-api can propagate the reason
    return c.json({ success: false, error: errName, message: errMsg }, 502)
  }

  // Structured send log for Logpush / svc-tail observability
  console.log(
    JSON.stringify({
      type: 'email_sent',
      provider: 'aws-ses',
      messageId: result.MessageId,
      recipients: toAddresses.length,
      // Log domain only — never the full address (privacy)
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

/**
 * POST /send-batch
 * Body: { emails: Array<{ to, subject, html?, text? }> }
 * Sends up to 50 emails; skips invalid addresses.
 */
app.post('/send-batch', async (c) => {
  const body = sendBatchSchema.parse(await c.req.json())

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
      // Log SES errors at error level so svc-tail keyword filter picks them up
      console.error(
        JSON.stringify({
          type: 'ses_error',
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

  // Structured batch summary log for observability
  console.log(
    JSON.stringify({
      type: 'email_batch_sent',
      provider: 'aws-ses',
      sent,
      failed,
      total: results.length,
      environment: c.env.ENVIRONMENT,
    })
  )

  return c.json({
    success: sent > 0,
    summary: {
      sent,
      failed,
      total: results.length,
    },
    results,
  })
})

/** GET /health */
app.get('/health', (c) => c.json({ status: 'ok', service: 'svc-mailer' }))

export default app
