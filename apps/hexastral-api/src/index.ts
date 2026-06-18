/**
 * hexastral-api — 统一的璇玑 API Worker
 *
 * 合并了 stellar-api + fengshui-api + yiching-api
 * 单 D1、单 Worker、单域名 api.hexastral.com
 */

import type {
  ExecutionContext,
  MessageBatch,
  ScheduledEvent,
} from '@cloudflare/workers-types/2023-07-01'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { CloudflareBindings, ContextVariables } from './infra-types'
import type { FengAnalyzeQueueMessage } from './lib/feng-analyze-queue'
import { processFengAnalyzeQueueBatch } from './lib/feng-analyze-queue'
import { runAnnualFengRefresh } from './lib/feng-annual-cron'
import { runReconcileSweep } from './lib/reconcile-sweep'
import { setAdminNotifyFetcher } from './lib/service-clients'
import { createChartRateLimitMiddleware } from './middleware/chart-rate-limit'
import { dbMiddleware } from './middleware/db'
import { createHmacVerifyMiddleware } from './middleware/hmac-verify'
import { createIdempotencyMiddleware } from './middleware/idempotency'
import { createTurnstileMiddleware } from './middleware/turnstile'
import {
  auspiceRoutes,
  auspiceTimelineRoutes,
  bondRoutes,
  chatRoutes,
  contactRoutes,
  ddlRoutes,
  discoveryRoutes,
  divinationRoutes,
  faceFeaturesRoutes,
  fengDeclinationRoutes,
  fengJobRoutes,
  fengMapRoutes,
  fengReportRoutes,
  fengSiteRoutes,
  flagsRoutes,
  geocodeRoutes,
  growthFunnelEventRoutes,
  healthRoutes,
  hexagramRoutes,
  internalAlmanacRoutes,
  kindredPushRoutes,
  lifeEventRoutes,
  mediaRoutes,
  natalRoutes,
  notifyRoutes,
  numerologyRoutes,
  onboardingRoutes,
  pairAnnualForecastRoutes,
  pairPreviewRoutes,
  pairRoutes,
  portfolioAuthRoutes,
  portfolioRoutes,
  purchaseRoutes,
  quotaRoutes,
  relationshipTimelineRoutes,
  reportChapterRoutes,
  reportManifestRoutes,
  shareRoutes,
  signalHistoryRoutes,
  signalItemRoutes,
  signalTodayRoutes,
  stellarRoutes,
  timelineRoutes,
  userRoutes,
  visibilityRoutes,
  webhookRoutes,
} from './routes'
import { expireStaleInvitations } from './routes/bonds'
import { devRoutes } from './routes/dev'
import { glossaryRoutes } from './routes/glossary'

type AppEnv = {
  Bindings: CloudflareBindings
  Variables: ContextVariables
}

const app = new Hono<AppEnv>()

// ── CORS — iOS 原生 + 本地开发 + zhop ────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://hexastral.com',
  'https://www.hexastral.com',
  'https://app.hexastral.com',
  'https://zhop.co',
  'https://www.zhop.co',
])

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '' // Reject requests with no Origin (non-browser)
      if (origin.startsWith('http://localhost')) return origin
      if (ALLOWED_ORIGINS.has(origin)) return origin
      return ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Client-Platform',
      'X-Turnstile-Token',
      'X-Hmac-Version',
      'X-Timestamp',
      'X-Body-Hash',
      'X-Signature',
      'X-Target-App',
    ],
    credentials: true,
  })
)

// ── Request ID ────────────────────────────────────────────────
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') ?? crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-ID', requestId)
  // Wire admin notify fetcher so service-clients.ts can auto-alert on 5xx/timeout
  setAdminNotifyFetcher(c.env.SVC_ADMIN_NOTIFY)
  await next()
})

// ── Database — schema-aware Drizzle D1 instance ───────────────
app.use('*', dbMiddleware)

// ── Rate Limiting — Cloudflare Rate Limiting API ──────────────
app.use('*', async (c, next) => {
  if (c.req.path === '/api/health') return next()

  // Use IP-only as rate limit key pre-auth — Authorization header is unverified at this point
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `ip:${ip}` })

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  await next()
})

// ── Security Middleware for Chart Endpoints ───────────────────
// L1: Turnstile (Web) + HMAC (iOS) — anti-automation & anti-replay
// L2: Chart-specific rate limiting — tiered daily limits
const chartSecurityPaths = [
  '/api/stellar/chart',
  '/api/natal',
  '/api/pair',
  '/api/yiching/cast',
  '/api/physiognomy/face-features',
]

const turnstile = createTurnstileMiddleware()
const hmacVerify = createHmacVerifyMiddleware()
const idempotency = createIdempotencyMiddleware()
const chartRateLimit = createChartRateLimitMiddleware()

for (const path of chartSecurityPaths) {
  app.use(`${path}/*`, async (c, next) => {
    // Exempt GET /api/pair/invite/:id
    const isPublicPairInvite =
      c.req.method === 'GET' && /^\/api\/pair\/invite\/[A-Za-z0-9_-]+$/.test(c.req.path)

    if (isPublicPairInvite) return next()

    await turnstile(c, () => Promise.resolve())
    await hmacVerify(c, () => Promise.resolve())

    // Exempt cheap GET reads on face-features (e.g. /current, /palm-current).
    // Only the POST /from-base64 (VLM image processing) is expensive and needs rate-limiting.
    const isCheapFaceRead = c.req.method === 'GET' && path === '/api/physiognomy/face-features'
    if (isCheapFaceRead) return next()

    return chartRateLimit(c, next)
  })
}

// Hehun preview: Turnstile only (public web endpoint, no HMAC/auth)
app.use('/api/pair-preview/*', turnstile)
app.use('/api/portfolio/preview/*', turnstile)

// Onboarding: Turnstile for web callers; iOS skipped by x-client-platform check in middleware
app.use('/api/onboarding/*', turnstile)

// ── HMAC Auth for iOS-only endpoints ─────────────────────────
// Sets c.get('userId') for authenticated iOS requests.
// Route handlers call requireUserId(c) where auth is needed.
//
// ⚠️  Hono's /* wildcard DOES match the trailing slash, so '/api/user/*'
//     also matches '/api/user/' — which is the POST registration endpoint
//     (userRoutes.post('/') → /api/user/).  The registration endpoint must
//     be exempt because deviceSecret is returned BY it; it cannot be used
//     to sign the request that creates it in the first place.
//     Solution: /api/user/* applies HMAC except for POST /api/user[/].
app.use('/api/contacts/*', hmacVerify)
// /api/notify/* is HMAC — EXCEPT /push-targets, which is a service-to-service read
// (the svc-notify daily cron) authenticated by X-Internal-Key in the route handler.
// The cron carries no user HMAC signature, so without this exemption it 403'd every
// night before its own X-Internal-Key check could run.
app.use('/api/notify/*', async (c, next) => {
  if (c.req.path === '/api/notify/push-targets') return next()
  return hmacVerify(c, next)
})

app.use('/api/bonds/*', async (c, next) => {
  const isPublicInviteInfo =
    c.req.method === 'GET' && /^\/api\/bonds\/invite\/[A-Za-z0-9_-]+\/info$/.test(c.req.path)

  if (isPublicInviteInfo) return next()
  return hmacVerify(c, next)
})

// /api/user/* — HMAC required, but exempt:
// 1. POST /api/user[/] (registration)
// 2. GET /api/user/by-username/* (public open graph / profiles)
app.use('/api/user/*', async (c, next) => {
  const isRegistration = c.req.method === 'POST' && /^\/api\/user\/?$/.test(c.req.path)
  const isPublicUsername = c.req.method === 'GET' && /^\/api\/user\/by-username\//.test(c.req.path)

  if (isRegistration || isPublicUsername) return next()
  return hmacVerify(c, next)
})

// (Removed in deep refactor: /api/fortune/* middleware — fortune route deleted;
// daily push now driven by deterministic Almanac engine via svc-signal cron.)

// Media endpoints (auth split):
// GET /api/media/public/* is unauthenticated
// All other /api/media/* routes require HMAC (upload/delete/private reads)
app.use('/api/media/*', async (c, next) => {
  if (c.req.method === 'GET' && c.req.path.startsWith('/api/media/public/')) {
    return next() // Skip HMAC for public avatar proxy
  }
  return hmacVerify(c, next)
})

// Bonds root (GET /api/bonds — list bonds) also needs auth
app.use('/api/bonds', hmacVerify)
app.use('/api/portfolio/linked/*', hmacVerify)
app.use('/api/portfolio/readings/*', hmacVerify)
app.use('/api/portfolio/birth-info', hmacVerify)
app.use('/api/portfolio/memory-preference', hmacVerify)
// Chapter-unlock invite endpoints — POST send invite + GET pending list both
// call requireUserId(). Without HMAC mounted here `c.get('userId')` is undefined
// and every call 401s before reaching the handler.
// Idempotency-Key header (when present) replays cached response for 24h —
// mobile retry-after-timeout cannot send duplicate invitation emails. Order
// MATTERS: hmacVerify must run first so userId is in scope for the key
// scoping inside idempotency.
app.use('/api/portfolio/invite-chapter-unlock', hmacVerify, idempotency)
app.use('/api/portfolio/invite-chapter-unlock/*', hmacVerify, idempotency)

// ── Registration rate limit — prevent coin farming via POST /api/user ──
app.use('/api/user', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `reg:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

// Share: both web (Turnstile) and iOS (HMAC) callers
// Exempt: GET /api/share/:shareId is public (rate-limited below)
app.use('/api/share/*', async (c, next) => {
  const isPublicShare = c.req.method === 'GET' && /^\/api\/share\/[A-Za-z0-9_-]+$/.test(c.req.path)

  if (isPublicShare) return next()

  // iOS native clients send x-signature (HMAC v2); web callers use Turnstile.
  // Never run both — they are mutually exclusive per route.
  const isIos = !!c.req.header('x-signature')
  if (isIos) {
    return hmacVerify(c, next)
  }
  return turnstile(c, next)
})

// Rate limit public share reads to prevent abuse
app.use('/api/share/:shareId', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `share:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

// ── Routes ────────────────────────────────────────────────────
// Shared
app.route('/api/health', healthRoutes)
app.route('/api/user/visibility', visibilityRoutes)
app.route('/api/user', userRoutes)

// 星宫命理
app.route('/api/stellar/chart', stellarRoutes)

// 命格推演
app.route('/api/natal', natalRoutes)

// 数字命理（Numerology — Phase D 卫星 + Web demo）
app.route('/api/numerology', numerologyRoutes)

// (Removed in deep refactor: /api/fate, /api/shuangpan — fate-reading concept replaced
// by /api/signal/* and /api/report/* surface; routes to be added in Phase 3.)

// 合婚
app.route('/api/pair', pairRoutes)
app.route('/api/pair', pairAnnualForecastRoutes)

// 合婚预览 — 公开端点 (Turnstile only, no HMAC/auth)
app.route('/api/pair-preview', pairPreviewRoutes)

// 面相特征提取（R2 + Gemini Vision，隐私优先架构）
app.route('/api/physiognomy/face-features', faceFeaturesRoutes)

// (Removed in deep refactor: /api/fate-report — replaced by versioned /api/report/chapter/* surface.)

// 易经
app.route('/api/yiching/cast', divinationRoutes)
app.route('/api/yiching/hexagrams', hexagramRoutes)

// Growth funnel — anonymous web + app telemetry (validated, no PII requirement)
app.use('/api/growth/events', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `growth-funnel:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})
app.route('/api/growth/events', growthFunnelEventRoutes)

// Discovery — anonymous satellite→flagship routing config; IP rate-limited
app.use('/api/discovery/recommendations', async (c, next) => {
  if (c.req.method !== 'GET') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `discovery:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})
app.route('/api/discovery/recommendations', discoveryRoutes)
// Feature flags / kill-switch (P0-9). Public, IP rate-limited at the edge.
// Cache-Control: 60s public — flag changes propagate within 1 min, vs 24h
// for an App Store build. Ops flip via `wrangler kv:key put`.
app.route('/api/flags', flagsRoutes)

// Auspice — anonymous 黄历 engine (deterministic GET /day,/search + the Pro/lazy LLM
// POST /explain which is K.4-guarded internally). No HMAC, no IAP — Tier 3. IP rate-limited
// on GET + POST (the explain endpoint's per-subject/budget guard is the deeper cost control).
app.use('/api/auspice/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `cycle:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

// Auspice · Life Timeline (Sprint 4, ADR-0020) — deterministic 大运/流年/流月 payload,
// D1-cached for 30 days. ANONYMOUS-CAPABLE (2026-06): the handler never reads userId
// (the request body fully determines the cache key + output), and Auspice is a Tier-3
// satellite with no sign-in flow — gating this with HMAC made the 四柱八字 glossary
// section unreachable for every anonymous user. Falls under the umbrella
// `/api/auspice/*` cycle:IP rate-limiter mounted above as defense-in-depth.
app.route('/api/auspice/timeline', auspiceTimelineRoutes)

app.route('/api/auspice', auspiceRoutes)

// fate/Kindred 命运时间轴节点深度解读 (B-fate.3). Anonymous-capable; the POST /explain
// is K.4-guarded internally (per-subject + global budget). IP rate-limited as defense-in-depth.
app.use('/api/timeline/*', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `timeline:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})
app.route('/api/timeline', timelineRoutes)

// Kindred 关系命运时间轴节点深度解读 (B-yuan.3). Recomputes the node from BOTH charts;
// K.4-guarded internally + IP rate-limited (defense-in-depth).
app.use('/api/relationship-timeline/*', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `rel-timeline:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})
app.route('/api/relationship-timeline', relationshipTimelineRoutes)

// Apple Sign-In for portfolio satellites — public, token-verified, IP rate-limited
app.use('/api/portfolio/auth', async (c, next) => {
  if (c.req.method !== 'POST') return next()
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `portfolio-auth:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})
app.route('/api/portfolio/auth', portfolioAuthRoutes)
app.route('/api/portfolio', portfolioRoutes)

// Rate limit DDL match — prevent fingerprint probing
app.use('/api/ddl/match', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await c.env.RATE_LIMITER.limit({ key: `ddl-match:${ip}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

// DDL — Deferred Deep Link
app.route('/api/ddl', ddlRoutes)

// Onboarding — 公开端点，无 HMAC/Auth，IP 限速（已在全局中间件处理）
// Exception: /api/onboarding/reveal and /api/onboarding/static-traits require
// HMAC (post-auth, write to user row / daily_signals).
//
// IMPORTANT: these MUST be EXACT paths, not a `…*` suffix wildcard. Hono does
// not match a suffix star (`/reveal*`) against the bare path `/reveal`, so the
// previous `…*` mounts silently never ran — hmacVerify was skipped, userId was
// never set, and the handler's requireUserId() 401'd ("Authentication
// required"). (Slash-star `/foo/*` works, but wouldn't match the bare path
// either; these are all single POST endpoints, so exact is correct — mirrors
// the working `app.use('/api/bonds', hmacVerify)`.)
app.use('/api/onboarding/reveal', hmacVerify)
app.use('/api/onboarding/static-traits', hmacVerify)
app.use('/api/onboarding/bootstrap', hmacVerify)
// Provider-link endpoints attach an Apple/Google identity to the current
// (anonymous) user, so they MUST run hmacVerify to put userId in scope —
// each handler calls requireUserId(c). Without this the signed request is
// ignored, userId is undefined, and the route 401s right after the Apple
// sheet returns ("能弹出Apple框但之后报错"). The turnstile mounted above on
// /api/onboarding/* is a no-op for iOS (x-client-platform check).
app.use('/api/onboarding/apple-link', hmacVerify)
app.use('/api/onboarding/google-link', hmacVerify)
app.route('/api/onboarding', onboardingRoutes)

// Daily Signal — iOS only, HMAC required
app.use('/api/signal/*', hmacVerify)
app.route('/api/signal/today', signalTodayRoutes)
app.route('/api/signal/history', signalHistoryRoutes)
app.route('/api/signal/item', signalItemRoutes)

// Versioned Report — iOS only, HMAC required (chapter/reroll additionally CHART_RATE_LIMITER)
app.use('/api/report/*', hmacVerify)
app.route('/api/report', reportManifestRoutes)
app.route('/api/report/chapter', reportChapterRoutes)

// Geocode — 内部代理 svc-geocode
app.route('/api/geocode', geocodeRoutes)

// (Removed in deep refactor: /api/fortune — svc-fortune → svc-signal migration; daily push driven
// by deterministic Almanac engine, in-app signal generated lazily on open.)

// Notify — 内部代理 svc-notify
app.route('/api/notify', notifyRoutes)

// Internal Almanac — svc-signal cron + svc-notify queue consumer (X-Internal-Key auth only)
app.route('/api/internal/almanac', internalAlmanacRoutes)

// Bonds — 关系图谱
app.route('/api/bonds', bondRoutes)
// Kindred relationship push scheduler — internal (X-Internal-Key in-handler),
// consumed by the svc-notify daily cron. Reads the kindred_push_queue (ADR-0025).
app.route('/api/kindred/push', kindredPushRoutes)

// Contacts — 通讯录隐私匹配
app.route('/api/contacts', contactRoutes)

// Life Log — 人生事件日志
app.use('/api/life-events/*', hmacVerify)
app.route('/api/life-events', lifeEventRoutes)

// Chat — 每次阅读后的 AI 对话
app.use('/api/chat/*', hmacVerify)
app.use('/api/chat/*', chartRateLimit)
app.route('/api/chat', chatRoutes)

// Quota — 配额查询（Pro 月度配额 + Free 月度免费配额）
app.use('/api/quota/*', hmacVerify)
app.route('/api/quota', quotaRoutes)

// (Removed in deep refactor: /api/readings/for-others — fate-reading concept dropped.)

// 单次购买查询 & 核销
app.use('/api/purchase/*', hmacVerify)
app.route('/api/purchase', purchaseRoutes)

// Report share — hexastral.com/report/:shareId 分享页数据源
app.route('/api/share', shareRoutes)

// Glossary — 命盘术语长释义（入门模式）
app.use('/api/glossary/*', hmacVerify)
app.route('/api/glossary', glossaryRoutes)

// Media proxy — 用户持久化媒体 (头像、手相照片、风水平面图)
app.route('/api/media', mediaRoutes)

// Fēng — feng-shui flagship (Phase E). HMAC for all sites/jobs routes;
// /api/feng/declination is public (no PII).
app.use('/api/feng/sites/*', hmacVerify)
app.use('/api/feng/sites', hmacVerify)
app.use('/api/feng/jobs/*', hmacVerify)
app.use('/api/feng/maps/*', hmacVerify)
app.use('/api/feng/maps', hmacVerify)
app.use('/api/feng/reports/*', hmacVerify)
app.route('/api/feng/sites', fengSiteRoutes)
app.route('/api/feng/jobs', fengJobRoutes)
app.route('/api/feng/maps', fengMapRoutes)
app.route('/api/feng/reports', fengReportRoutes)
app.route('/api/feng/declination', fengDeclinationRoutes)

// Dev-only — HARD-BLOCKED in production (these routes self-grant pro / full-reset /
// repair-user; previously only hmacVerify-gated, so any signed device could hit them).
app.use('/api/dev/*', async (c, next) => {
  // TEMPORARY (remove before launch): allow the dev Pro-grant (`set-subscription`)
  // on the PROD api too, so the in-app DEV toggle can self-grant `universe_pro`
  // without a staging api — acceptable while there are NO real users (pre-PMF).
  // The destructive routes (wipe / full-reset / repair-user) stay hard-blocked.
  const isDevProGrant = c.req.path.endsWith('/set-subscription')
  if (c.env.ENVIRONMENT === 'production' && !isDevProGrant) {
    return c.json({ error: 'not_found' }, 404)
  }
  return next()
})
app.use('/api/dev/*', hmacVerify)
app.route('/api/dev', devRoutes)

// Webhooks
app.route('/webhooks', webhookRoutes)

// ── Error handler ─────────────────────────────────────────────
//
// Phase F: emits the shared response envelope (`{ ok: false, error: { code, message } }`)
// so HTTPException throws from helpers (checkBondLimit, etc.) produce the same
// shape as direct `jsonErr()` returns from route handlers. The envelope `code`
// is inferred from the HTTP status when not explicitly provided.

function codeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'invalid_input'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 410:
      return 'gone'
    case 422:
      return 'conflict'
    case 429:
      return 'quota_exhausted'
    case 502:
      return 'upstream_unavailable'
    case 504:
      return 'timeout'
    default:
      return status >= 500 ? 'internal_error' : 'invalid_input'
  }
}

app.onError((err, c) => {
  const requestId = c.get('requestId')

  if (err instanceof HTTPException) {
    // 4xx are expected business-logic rejections — log at warn, not error,
    // so they don't pollute error alerting dashboards.
    if (err.status < 500) {
      console.warn(`[${requestId}] ${err.status}: ${err.message}`)
    } else {
      console.error(`[${requestId}] Error:`, err)
    }
    return c.json(
      {
        ok: false,
        error: { code: codeFromStatus(err.status), message: err.message },
      },
      err.status
    )
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    console.warn(`[${requestId}] ZodError: ${err.message}`)
    return c.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Validation error',
          details: { zod: err.message },
        },
      },
      400
    )
  }

  // Genuine unhandled server error — always log as error
  console.error(`[${requestId}] Error:`, err)
  return c.json(
    {
      ok: false,
      error: {
        code: 'internal_error',
        // Pre-PMF debug aid (no real users yet): surface the REAL cause so a
        // deployed 500 is diagnosable in-app without `wrangler tail`. Replace the
        // message with a generic "Internal server error" before launch — leaking
        // raw error text is an info-disclosure smell once there are real users.
        message: err instanceof Error ? err.message : 'Internal server error',
        details: { requestId },
      },
    },
    500
  )
})

// ── 404 ───────────────────────────────────────────────────────
app.notFound((c) => c.json({ ok: false, error: { code: 'not_found', message: 'Not found' } }, 404))

/**
 * Hono RPC type app — consumed by hc<AppType> in packages/hexastral-client and iOS lib/api.ts
 *
 * Uses method chaining so TypeScript captures the full route schema.
 * The actual request handling is done by `app` above (which has all middleware).
 * This is a type-only Hono instance used solely for schema inference.
 */
const _rpcApp = new Hono<AppEnv>()
  .route('/api/health', healthRoutes)
  .route('/api/user/visibility', visibilityRoutes)
  .route('/api/user', userRoutes)
  .route('/api/stellar/chart', stellarRoutes)
  .route('/api/natal', natalRoutes)
  .route('/api/pair', pairRoutes)
  .route('/api/physiognomy/face-features', faceFeaturesRoutes)
  .route('/api/yiching/cast', divinationRoutes)
  .route('/api/yiching/hexagrams', hexagramRoutes)
  .route('/api/portfolio', portfolioRoutes)
  .route('/api/bonds', bondRoutes)
  .route('/api/onboarding', onboardingRoutes)
  .route('/api/signal/today', signalTodayRoutes)
  .route('/api/signal/history', signalHistoryRoutes)
  .route('/api/signal/item', signalItemRoutes)
  .route('/api/report', reportManifestRoutes)
  .route('/api/report/chapter', reportChapterRoutes)
  .route('/api/share', shareRoutes)
  .route('/api/feng/sites', fengSiteRoutes)
  .route('/api/feng/jobs', fengJobRoutes)
  .route('/api/feng/maps', fengMapRoutes)
  .route('/api/feng/reports', fengReportRoutes)
  .route('/api/feng/declination', fengDeclinationRoutes)
  .route('/api/dev', devRoutes)

export type AppType = typeof _rpcApp

/** Domain types — re-exported so hexastral-client can forward them to consumers */
export type * from './types'

export default {
  fetch: app.fetch,

  async queue(
    batch: MessageBatch<FengAnalyzeQueueMessage>,
    env: CloudflareBindings
  ): Promise<void> {
    await processFengAnalyzeQueueBatch(batch, env)
  },

  /** Daily cron (04:00 UTC):
   *  - Expire stale bond invitations
   *  - 立春 annual Fēng refresh — re-synthesize site reports after 流年 rollover
   *
   *  (Removed in deep refactor: archiveOldDailyFortunes — dailyFortunes table dropped;
   *  daily_signals retention will be added when the new signal cron lands in Phase 4.) */
  async scheduled(_event: ScheduledEvent, env: CloudflareBindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const expired = await expireStaleInvitations(env)
          console.info(`[cron] expired=${expired}`)
        } catch (err) {
          console.error('[cron:expire-invitations]', err)
        }
      })()
    )
    ctx.waitUntil(
      (async () => {
        try {
          const result = await runAnnualFengRefresh(env)
          if (result.enqueued > 0) {
            console.info(
              `[cron:feng-annual] fengYear=${result.fengYear} enqueued=${result.enqueued}`
            )
          }
        } catch (err) {
          console.error('[cron:feng-annual]', err)
        }
      })()
    )
    ctx.waitUntil(
      (async () => {
        try {
          const r = await runReconcileSweep(env)
          if (!r.skipped && (r.checked > 0 || r.granted > 0 || r.expired > 0)) {
            console.info(
              `[cron:reconcile] checked=${r.checked} granted=${r.granted} expired=${r.expired}`
            )
          }
        } catch (err) {
          console.error('[cron:reconcile]', err)
        }
      })()
    )
  },
}
