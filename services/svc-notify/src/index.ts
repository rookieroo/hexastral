/**
 * svc-notify — 用户推送通知服务
 *
 * 内网服务，只能通过 Service Binding 调用
 * 仅支持 Expo Push Notification（经由 Expo 服务器 → APNs / FCM）
 *
 * Expo Push 架构:
 *   App → getExpoPushTokenAsync → /expo-push/register → KV 储存
 *   Cron (hourly) → svc-notify → Expo Push API → APNs (iOS) / FCM (Android)
 *
 * 管理员告警（IAP 异常、Cron 失败、系统错误）请使用 svc-admin-notify。
 *
 * 调用方配置:
 * ```jsonc
 * "services": [{ "binding": "SVC_NOTIFY", "service": "svc-notify" }]
 * ```
 */

import { createLogger } from '@zhop/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

// ============ Logger ============

const logger = createLogger({ service: 'svc-notify' })

// ============ Admin Alert Helper ============

interface AlertPayload {
  title?: string
  message: string
  level?: 'info' | 'warning' | 'error' | 'critical'
  context?: Record<string, string>
}

/** Fire-and-forget Telegram alert — never throws */
function alertAdmin(svc: Fetcher, payload: AlertPayload): Promise<void> {
  return svc
    .fetch('https://svc-admin-notify.internal/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'error', ...payload }),
      signal: AbortSignal.timeout(3_000),
    })
    .then(() => undefined)
    .catch(() => undefined)
}

// ============ Types ============

interface Env {
  /** KV: pushtoken:{userId} → { token, locale, timezone? } */
  EXPO_PUSH_TOKENS: KVNamespace
  /** Queue: daily-signal push payloads per user */
  DAILY_FORTUNE_QUEUE: Queue<DailyFortuneMessage>
  /** hexastral-api — for push-targets D1 queries + daily_almanac reads */
  SVC_API: Fetcher
  /** svc-admin-notify — Telegram alert delivery */
  SVC_ADMIN_NOTIFY: Fetcher
  /** Shared internal secret for authenticating to push-targets */
  INTERNAL_KEY: string
}

/** Shape stored in EXPO_PUSH_TOKENS KV */
interface PushTokenRecord {
  token: string
  locale: string
  timezone?: string
  userId: string
  updatedAt: number
}

/** Queue message payload for per-user daily fortune push */
interface DailyFortuneMessage {
  userId: string
  token: string
  locale: string
  timezone?: string
}

// ============ App ============

const app = new Hono<{ Bindings: Env }>()

// ============ Health ============

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'svc-notify' })
})

// ============ Expo Push Notifications ============

/**
 * POST /expo-push/register
 * Store a device push token for the given userId.
 * Called by the iOS app after Expo.getExpoPushTokenAsync() succeeds.
 */
app.post('/expo-push/register', async (c) => {
  const body = await c.req.json<{
    userId: string
    token: string
    locale?: string
    timezone?: string
  }>()

  if (!body.userId || !body.token) {
    throw new HTTPException(400, { message: 'userId and token are required' })
  }
  if (!/^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/.test(body.token)) {
    throw new HTTPException(400, { message: 'Invalid Expo push token format' })
  }

  const record: PushTokenRecord = {
    userId: body.userId,
    token: body.token,
    locale: body.locale ?? 'en',
    timezone: body.timezone,
    updatedAt: Date.now(),
  }

  await c.env.EXPO_PUSH_TOKENS.put(
    `pushtoken:${body.userId}`,
    JSON.stringify(record),
    { expirationTtl: 60 * 60 * 24 * 365 } // 1 year — token refreshed on each app open
  )

  return c.json({ success: true })
})

/**
 * DELETE /expo-push/register
 * Unregister a device (e.g., on logout or notification opt-out).
 */
app.delete('/expo-push/register', async (c) => {
  const userId = c.req.query('userId')
  if (!userId) throw new HTTPException(400, { message: 'userId is required' })
  await c.env.EXPO_PUSH_TOKENS.delete(`pushtoken:${userId}`)
  return c.json({ success: true })
})

/**
 * GET /expo-push/locale/:userId
 * Returns the stored locale for the given userId's push token record.
 * Used by hexastral-api to build localized push notification strings.
 */
app.get('/expo-push/locale/:userId', async (c) => {
  const userId = c.req.param('userId')
  const record = (await c.env.EXPO_PUSH_TOKENS.get(
    `pushtoken:${userId}`,
    'json'
  )) as PushTokenRecord | null
  return c.json({ locale: record?.locale ?? 'zh' })
})

/**
 * POST /expo-push/notify-user
 * Send a push notification to a single user by userId.
 * Resolves the push token from KV internally — caller only needs the userId.
 * Body: { userId, title, body, data? }
 */
app.post('/expo-push/notify-user', async (c) => {
  const body = await c.req.json<{
    userId: string
    title: string
    body: string
    data?: Record<string, string>
  }>()

  if (!body.userId || !body.body) {
    throw new HTTPException(400, { message: 'userId and body are required' })
  }

  const record = (await c.env.EXPO_PUSH_TOKENS.get(
    `pushtoken:${body.userId}`,
    'json'
  )) as PushTokenRecord | null
  if (!record) return c.json({ sent: false })

  const { tickets, invalidTokens } = await sendExpoPush([record.token], {
    title: body.title,
    body: body.body,
    data: body.data,
    sound: 'default',
  })

  // Structured delivery log — captured by svc-tail via Logpush
  console.log(
    JSON.stringify({
      type: 'push_delivered',
      userId: body.userId,
      event: body.data?.type ?? 'unknown',
      sent: invalidTokens.length === 0,
      ticketCount: tickets.length,
      invalidTokenCount: invalidTokens.length,
    })
  )

  // Clean up stale KV entry if token is no longer valid
  if (invalidTokens.length > 0) {
    await c.env.EXPO_PUSH_TOKENS.delete(`pushtoken:${body.userId}`)
  }

  return c.json({ sent: true, tickets })
})

/**
 * POST /expo-push/send
 * Send a push notification to one or more Expo push tokens directly.
 * Body: { tokens: string[], title: string, body: string, data?: Record<string,string> }
 */
app.post('/expo-push/send', async (c) => {
  const body = await c.req.json<{
    tokens: string[]
    title: string
    body: string
    data?: Record<string, string>
    sound?: 'default' | null
    badge?: number
  }>()

  if (!body.tokens?.length || !body.body) {
    throw new HTTPException(400, { message: 'tokens and body are required' })
  }

  const { tickets, invalidTokens } = await sendExpoPush(body.tokens, {
    title: body.title,
    body: body.body,
    data: body.data,
    sound: body.sound ?? 'default',
    badge: body.badge,
  })

  return c.json({ success: true, tickets, invalidTokens })
})

// ============ Error Handling ============

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  logger.error('Unhandled error', { err: String(err) })
  return c.json({ error: 'Internal server error' }, 500)
})

// ============ Expo Push Helper ============

interface ExpoPushPayload {
  title?: string
  body: string
  data?: Record<string, string>
  sound?: 'default' | null
  badge?: number
}

interface ExpoPushResult {
  tickets: { id: string }[]
  /** Expo push tokens that are no longer valid (DeviceNotRegistered). */
  invalidTokens: string[]
}

interface ExpoTicket {
  status: string
  id?: string
  message?: string
  details?: { error?: string }
}

async function sendExpoPush(tokens: string[], payload: ExpoPushPayload): Promise<ExpoPushResult> {
  // Expo push API accepts up to 100 messages per request
  const chunkSize = 100
  const tickets: { id: string }[] = []
  const invalidTokens: string[] = []

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize)
    const messages = chunk.map((token) => ({ to: token, ...payload }))

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })

    if (!res.ok) {
      logger.error('Expo push API error', { status: String(res.status) })
      continue
    }

    const json = await res.json<{ data: ExpoTicket[] }>()
    json.data.forEach((item, idx) => {
      if (item.status === 'ok' && item.id) {
        tickets.push({ id: item.id })
      } else if (item.details?.error === 'DeviceNotRegistered') {
        // Token is stale — collect for cleanup
        const token = chunk[idx]
        if (token) invalidTokens.push(token)
      } else if (item.status !== 'ok') {
        logger.warn('Expo push token issue', { message: item.message })
      }
    })
  }

  return { tickets, invalidTokens }
}

// ============ Daily Fortune Fortune Text ============

/**
 * Locale-aware fallback push text — used when daily_almanac has no entry yet.
 * Covers all 9 supported locales. No emoji — keeps HexAstral brand voice consistent.
 * Lookup: exact locale → language prefix → 'en'
 */
function getDailyFallbackText(locale: string): { title: string; body: string } {
  const pool: Record<string, { title: string; body: string }[]> = {
    zh: [{ title: '今日运势已就绪', body: '你的星盘已为今日运算完毕，开启应用查看专属解读。' }],
    'zh-Hant': [
      { title: '今日運勢已就緒', body: '你的星盤已為今日運算完畢，開啟應用查看專屬解讀。' },
    ],
    en: [{ title: "Today's reading is ready", body: 'Open HexAstral to see your daily insight.' }],
    ko: [{ title: '오늘의 운세가 준비되었습니다', body: '앱을 열어 오늘의 사주를 확인해 보세요.' }],
    ja: [{ title: '本日の運勢が届きました', body: 'アプリを開いて運勢をご確認ください。' }],
    de: [
      {
        title: 'Ihre Tagesvorhersage ist bereit',
        body: 'Öffnen Sie HexAstral für Ihre tagesaktuelle Deutung.',
      },
    ],
    es: [
      {
        title: 'Tu lectura de hoy está lista',
        body: 'Abre HexAstral para ver tu interpretación diaria.',
      },
    ],
    vi: [{ title: 'Vận thế hôm nay đã sẵn sàng', body: 'Mở HexAstral để xem giải đoán hôm nay.' }],
    th: [{ title: 'ดวงชะตาวันนี้พร้อมแล้ว', body: 'เปิด HexAstral เพื่อดูการวิเคราะห์ประจำวัน' }],
  }
  const lang = locale.split('-')[0] ?? locale
  const candidates = pool[locale] ?? pool[lang] ?? pool['en'] ?? []
  return (
    candidates[0] ?? { title: 'Your reading awaits', body: "Open HexAstral for today's insight." }
  )
}

// ============ Scheduled Handler (Cron) ============

/**
 * Hourly cron: determines which IANA timezones are currently at 08:00 local,
 * fetches push targets from D1 via SVC_API, and enqueues fortune pushes.
 */
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  // Weekly cron (Sunday 03:00 UTC) — purge stale push tokens
  if (event.cron === '0 3 * * 0') {
    ctx.waitUntil(purgeStaleTokens(env))
    return
  }

  // Hourly cron — daily fortune push dispatch
  await runHourlyFortunePush(env)
}

/**
 * Purge push tokens that haven't been refreshed in > 90 days.
 * Runs weekly on Sunday 03:00 UTC.
 */
async function purgeStaleTokens(env: Env): Promise<void> {
  logger.info('stale-token purge started')
  let cursor: string | null = '0'
  let totalPurged = 0

  while (cursor !== null) {
    const url = new URL('https://internal/api/notify/stale-tokens')
    url.searchParams.set('inactiveDays', '90')
    url.searchParams.set('limit', '500')
    url.searchParams.set('cursor', cursor)

    const res = await env.SVC_API.fetch(url, {
      headers: { 'X-Internal-Key': env.INTERNAL_KEY },
    })

    if (!res.ok) {
      logger.error('stale-tokens fetch failed', { status: String(res.status) })
      break
    }

    const json = await res.json<{
      data: Array<{ token: string; userId: string; lastActiveAt: string }>
      nextCursor: string | null
    }>()

    if (json.data.length === 0) break

    const tokens = json.data.map((r) => r.token)

    // Delete from D1 in one batch call
    await await fetchD1WithRetry(env.SVC_API, 'https://internal/api/notify/unregister-stale', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.INTERNAL_KEY,
      },
      body: JSON.stringify({ tokens }),
      signal: AbortSignal.timeout(10_000),
    })

    // Delete from KV (per-userId, best-effort)
    await Promise.allSettled(
      json.data.map((r) => env.EXPO_PUSH_TOKENS.delete(`pushtoken:${r.userId}`))
    )

    totalPurged += tokens.length
    cursor = json.nextCursor
  }

  logger.info('stale-token purge complete', { totalPurged })
  alertAdmin(env.SVC_ADMIN_NOTIFY, {
    title: 'svc-notify: weekly stale-token purge complete',
    message: `Purged ${totalPurged} push tokens inactive > 90 days`,
    level: 'info',
    context: { totalPurged: String(totalPurged) },
  }).catch(() => {})
}

/**
 * Hourly cron dispatch: find timezones at 8am, enqueue fortune pushes.
 */
async function runHourlyFortunePush(env: Env): Promise<void> {
  logger.info('hourly fortune push check started')

  const now = new Date()
  const targetHour = 8

  // Find all IANA timezones where local hour == targetHour right now
  const matchingZones = TIMEZONE_POOL.filter((tz) => {
    try {
      const localHour = Number.parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(
          now
        ),
        10
      )
      return localHour === targetHour
    } catch {
      return false
    }
  })

  if (matchingZones.length === 0) {
    logger.info('No timezones at target hour', { targetHour })
    return
  }

  logger.info('Timezones at 8am', { zones: matchingZones.join(', ') })

  let totalEnqueued = 0
  let totalPages = 0

  for (const tz of matchingZones) {
    // Paginate through push-targets for this timezone
    let cursor: string | null = '0'
    while (cursor !== null) {
      const url = new URL('https://internal/api/notify/push-targets')
      url.searchParams.set('timezoneId', tz)
      url.searchParams.set('limit', '200')
      url.searchParams.set('cursor', cursor)

      const res = await env.SVC_API.fetch(url, {
        headers: { 'X-Internal-Key': env.INTERNAL_KEY },
      })

      if (!res.ok) {
        logger.error('push-targets fetch failed', { timezone: tz, status: String(res.status) })
        alertAdmin(env.SVC_ADMIN_NOTIFY, {
          title: 'svc-notify: push-targets fetch failed',
          message: `push-targets API returned ${res.status} for timezone ${tz}`,
          level: 'error',
          context: { timezone: tz, status: String(res.status) },
        }).catch(() => {})
        break
      }

      const json = await res.json<{
        data: Array<{ token: string; userId: string; timezoneId: string; locale: string | null }>
        nextCursor: string | null
      }>()

      const batch: DailyFortuneMessage[] = json.data.map((row) => ({
        userId: row.userId,
        token: row.token,
        locale: row.locale ?? 'en',
        timezone: row.timezoneId,
      }))

      // Enqueue in chunks of 100
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100)
        await env.DAILY_FORTUNE_QUEUE.sendBatch(chunk.map((msg) => ({ body: msg })))
      }

      totalEnqueued += batch.length
      totalPages++
      cursor = json.nextCursor
    }
  }

  logger.info('Hourly fortune push complete', {
    timezonesMatched: matchingZones.length,
    totalEnqueued,
    totalPages,
  })
}

/**
 * Pool of IANA timezones covering all inhabited UTC offsets.
 * One representative per offset ensures we hit every user exactly once per day.
 */
const TIMEZONE_POOL = [
  'Pacific/Midway', // UTC-11
  'Pacific/Honolulu', // UTC-10
  'Pacific/Marquesas', // UTC-09:30
  'America/Anchorage', // UTC-09
  'America/Los_Angeles', // UTC-08
  'America/Denver', // UTC-07
  'America/Chicago', // UTC-06
  'America/New_York', // UTC-05
  'America/Halifax', // UTC-04
  'America/St_Johns', // UTC-03:30
  'America/Sao_Paulo', // UTC-03
  'Atlantic/South_Georgia', // UTC-02
  'Atlantic/Azores', // UTC-01
  'Europe/London', // UTC+00
  'Europe/Paris', // UTC+01
  'Europe/Helsinki', // UTC+02
  'Europe/Moscow', // UTC+03
  'Asia/Tehran', // UTC+03:30
  'Asia/Dubai', // UTC+04
  'Asia/Kabul', // UTC+04:30
  'Asia/Karachi', // UTC+05
  'Asia/Kolkata', // UTC+05:30
  'Asia/Kathmandu', // UTC+05:45
  'Asia/Dhaka', // UTC+06
  'Asia/Yangon', // UTC+06:30
  'Asia/Bangkok', // UTC+07
  'Asia/Shanghai', // UTC+08
  'Australia/Eucla', // UTC+08:45
  'Asia/Tokyo', // UTC+09
  'Australia/Adelaide', // UTC+09:30
  'Australia/Sydney', // UTC+10
  'Pacific/Norfolk', // UTC+11
  'Pacific/Auckland', // UTC+12
  'Pacific/Chatham', // UTC+12:45
  'Pacific/Apia', // UTC+13
  'Pacific/Kiritimati', // UTC+14
]

// ============ Queue Consumer ============

/**
 * Delete invalidated push tokens from D1 via hexastral-api.
 * Fire-and-forget — never throws.
 */
async function fetchD1WithRetry(fetcher: Fetcher, url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetcher.fetch(url, options)
      if (resp.ok) return resp
      if (resp.status !== 429 && resp.status !== 503) {
        throw new Error(`HTTP ${resp.status}`)
      }
    } catch (err) {
      if (i === maxRetries - 1) throw err
    }
    await new Promise((r) => setTimeout(r, Math.random() * 1000 * 2 ** i))
  }
}

async function purgeInvalidTokensFromD1(env: Env, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return
  env.SVC_API.fetch('https://internal/api/notify/unregister-stale', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': env.INTERNAL_KEY,
    },
    body: JSON.stringify({ tokens }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined)
}

/**
 * Queue consumer for "daily-fortune" queue.
 * Receives batches of DailyFortuneMessage and sends Expo push notifications.
 *
 * Note: `users.notif_prefs_json` (e.g. dailyFortune) is not read here yet — toggles are stored from the app but not enforced on this path.
 */
async function queue(batch: MessageBatch<DailyFortuneMessage>, env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  // Batch-level metrics
  let sent = 0
  let fallback = 0
  let failed = 0
  let invalidTokenCount = 0

  const pushTasks = batch.messages.map(async (msg) => {
    const { userId, token, locale } = msg.body
    if (!/^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/.test(token)) {
      msg.ack()
      return
    }

    // Look up today's almanac row via hexastral-api (svc-signal cron writes daily_almanac
    // each 00:00 UTC; we read it here to dispatch the morning push). D1 is the single
    // source of truth — no KV cache layer.
    const almanacRes = await env.SVC_API.fetch(
      new Request(
        `https://hexastral-api.internal/api/internal/almanac/today?userId=${encodeURIComponent(userId)}&date=${today}`,
        {
          headers: { 'X-Internal-Key': env.INTERNAL_KEY },
          signal: AbortSignal.timeout(5_000),
        }
      )
    ).catch(() => null)

    let almanac: AlmanacRow | null = null
    if (almanacRes && almanacRes.ok) {
      const body = (await almanacRes.json().catch(() => null)) as { data: AlmanacRow | null } | null
      almanac = body?.data ?? null
    }

    let pushBody: string
    let data: Record<string, string> = { type: 'daily_signal' }
    let usedFallback = false

    if (almanac) {
      // Personalized push — deterministic Almanac headline (matches in-app card).
      pushBody = almanac.headline
      data = {
        type: 'daily_signal',
        date: today,
        energyLevel: almanac.energyLevel,
        relation: almanac.relation,
        ...(almanac.notificationId ? { notificationId: almanac.notificationId } : {}),
      }
    } else {
      // Fallback: svc-signal cron has not written for this user yet (brand-new account,
      // missing static traits, or cron lag). Use locale-aware default copy.
      const fb = getDailyFallbackText(locale)
      pushBody = fb.body
      usedFallback = true
    }

    try {
      const { invalidTokens } = await sendExpoPush([token], {
        body: pushBody,
        data,
        sound: 'default',
      })

      // Clean up DeviceNotRegistered tokens immediately
      if (invalidTokens.length > 0) {
        invalidTokenCount += invalidTokens.length
        await env.EXPO_PUSH_TOKENS.delete(`pushtoken:${userId}`)
        await purgeInvalidTokensFromD1(env, invalidTokens)
      } else {
        if (usedFallback) fallback++
        else sent++
      }

      msg.ack()
    } catch (err) {
      failed++
      logger.error('push failed', { userId, err: err instanceof Error ? err.message : String(err) })
      alertAdmin(env.SVC_ADMIN_NOTIFY, {
        title: 'svc-notify: Expo push delivery failed',
        message: `Push failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
        level: 'error',
        context: { userId },
      }).catch(() => {})
      msg.retry()
    }
  })

  await Promise.all(pushTasks)

  const total = batch.messages.length
  logger.info('Queue batch complete', {
    total,
    sent,
    fallback,
    failed,
    invalidTokens: invalidTokenCount,
  })
}

/** Shape of daily_almanac row returned by /api/internal/almanac/today */
interface AlmanacRow {
  userId: string
  date: string
  relation: string
  energyLevel: string
  headline: string
  todayLens: string
  watchFor: string
  luckyHour: string | null
  luckyDirection: string | null
  luckyColor: string | null
  locale: string
  notificationId: string | null
}

// ============ Export ============

export default {
  fetch: app.fetch,
  scheduled,
  queue,
}
