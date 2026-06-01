/**
 * svc-admin-notify — 管理员 Telegram 告警服务
 *
 * 内网服务，只能通过 Service Binding 调用。
 * 负责向管理员 Telegram 发送系统告警，适用于:
 *   - IAP / 订阅事件异常（webhook 验签失败、解析错误、退款）
 *   - Cron 任务执行失败（svc-fortune 生成、svc-notify 推送批次）
 *   - 系统流程阻断（队列超时、服务不可用、服务间调用失败）
 *   - API 调用失败告警
 *
 * 调用方配置:
 * ```jsonc
 * "services": [{ "binding": "SVC_ADMIN_NOTIFY", "service": "svc-admin-notify" }]
 * ```
 *
 * 调用示例 (via lib/service-clients.ts):
 * ```typescript
 * await adminNotifyClient.alert(env.SVC_ADMIN_NOTIFY, {
 *   title: 'IAP Webhook Failed',
 *   message: `Transaction ${txId} could not be processed`,
 *   level: 'error',
 *   context: { userId, productId },
 * })
 * ```
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

// ── Types ─────────────────────────────────────────────────────────

interface Env {
  /** Telegram Bot token from @BotFather */
  TELEGRAM_BOT_TOKEN: string
  /** Admin chat or group ID (negative for groups, positive for DMs) */
  TELEGRAM_CHAT_ID: string
}

type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

interface AlertBody {
  /** Short title shown in bold at the top */
  title?: string
  /** Main alert message */
  message: string
  /** Severity level — controls emoji prefix */
  level?: AlertLevel
  /** Optional key-value context pairs rendered as inline code */
  context?: Record<string, string>
}

// ── Constants ─────────────────────────────────────────────────────

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🔴',
  critical: '🚨',
}

// ── App ───────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>()

// ── Health ────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'svc-admin-notify',
    telegram: !!c.env.TELEGRAM_BOT_TOKEN && !!c.env.TELEGRAM_CHAT_ID,
  })
})

// ── Alert ─────────────────────────────────────────────────────────

/**
 * POST /alert
 * Send an admin alert to the configured Telegram chat.
 *
 * Body: AlertBody
 * Response: { success: true }
 */
app.post('/alert', async (c) => {
  const body = await c.req.json<AlertBody>()

  if (!body.message) {
    throw new HTTPException(400, { message: 'message is required' })
  }

  const level: AlertLevel = body.level ?? 'error'
  const emoji = LEVEL_EMOJI[level]
  const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`

  const lines: string[] = []

  // Header line
  if (body.title) {
    lines.push(`${emoji} <b>${escapeHtml(body.title)}</b>`)
  } else {
    lines.push(`${emoji} <b>${level.toUpperCase()}</b>`)
  }

  lines.push('')
  lines.push(escapeHtml(body.message))

  // Context key-value pairs
  if (body.context && Object.keys(body.context).length > 0) {
    lines.push('')
    for (const [key, value] of Object.entries(body.context)) {
      lines.push(`<b>${escapeHtml(key)}:</b> <code>${escapeHtml(value)}</code>`)
    }
  }

  // Timestamp footer
  lines.push('')
  lines.push(`<i>${timestamp}</i>`)

  await sendTelegram(c.env, lines.join('\n'))

  return c.json({ success: true })
})

// ── Error Handling ────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('[svc-admin-notify] Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ── Telegram Helper ───────────────────────────────────────────────

async function sendTelegram(env: Env, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new HTTPException(503, { message: 'Telegram not configured' })
  }

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('[svc-admin-notify] Telegram API failed:', res.status, error)
    throw new HTTPException(502, { message: `Telegram failed: ${error}` })
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Export ────────────────────────────────────────────────────────

export default app
