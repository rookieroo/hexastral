/**
 * svc-signal — Daily Almanac cron worker
 *
 * 00:00 UTC daily:
 *   1. Paginate eligible users from hexastral-api (GET /api/internal/almanac/eligible-users)
 *      — users with all required static traits (dayMasterStem, favorable/unfavorable element,
 *        birthBranch) and at least one active push token.
 *   2. For each user, compute today's stem/branch in their local timezone via astro-core
 *      `dayGanZhi(year, month, day)` and run `computeAlmanac()` from astro-i18n.
 *      Pure deterministic — no LLM, no external calls per user.
 *   3. POST the result to /api/internal/almanac/upsert.
 *   4. Track total / written / skipped / errored; alert ops if coverage is abnormally low.
 *
 * Push enqueue itself remains owned by svc-notify's hourly cron (it picks up the daily_almanac
 * row via /api/internal/almanac/today when dispatching at 8am local for each timezone). This
 * keeps responsibilities clean: svc-signal owns *what* the message says, svc-notify owns *when*
 * and *how* it's delivered.
 */

import { dayGanZhi } from '@zhop/astro-core'
import type { Branch, Locale, Stem, UserStaticTraits, WuXing } from '@zhop/astro-i18n'
import { computeAlmanac } from '@zhop/astro-i18n'
import { createLogger } from '@zhop/logger'
import { Hono } from 'hono'

const logger = createLogger({ service: 'svc-signal' })

interface Env {
  SVC_API: Fetcher
  SVC_ADMIN_NOTIFY: Fetcher
  INTERNAL_KEY: string
}

// ── Types matching /api/internal/almanac/eligible-users response ──────────

interface EligibleUser {
  userId: string
  locale: string | null
  timezoneId: string | null
  dayMasterStem: string | null
  dayMasterStrength: string | null
  favorableElement: string | null
  unfavorableElement: string | null
  birthBranch: string | null
}

// ── Date helpers ──────────────────────────────────────────────────────────

/**
 * Compute YYYY-MM-DD for "now" in a specific IANA timezone.
 * Falls back to UTC when timezoneId is missing or invalid.
 */
function localDateInTz(tz: string | null | undefined): string {
  const candidate = tz ?? 'UTC'
  try {
    // sv-SE locale is the canonical "YYYY-MM-DD HH:mm:ss" formatter
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: candidate,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function parseYmd(date: string): { year: number; month: number; day: number } {
  const [yStr, mStr, dStr] = date.split('-') as [string, string, string]
  return {
    year: Number.parseInt(yStr, 10),
    month: Number.parseInt(mStr, 10),
    day: Number.parseInt(dStr, 10),
  }
}

const ALL_STEMS: ReadonlySet<string> = new Set([
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
])
const ALL_BRANCHES: ReadonlySet<string> = new Set([
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
])
const ALL_WUXING: ReadonlySet<string> = new Set(['木', '火', '土', '金', '水'])
const SUPPORTED_LOCALES: ReadonlySet<string> = new Set([
  'zh',
  'zh-Hant',
  'en',
  'ja',
  'ko',
  'de',
  'es',
  'vi',
  'th',
])

function pickLocale(raw: string | null | undefined): Locale {
  if (!raw) return 'en'
  if (SUPPORTED_LOCALES.has(raw)) return raw as Locale
  // Tolerate region tags like 'zh-CN' / 'en-US'
  const base = raw.split('-')[0] ?? 'en'
  if (SUPPORTED_LOCALES.has(base)) return base as Locale
  return 'en'
}

// ── Internal API helpers ──────────────────────────────────────────────────

async function fetchEligibleUsers(
  env: Env,
  cursor: string | null,
  limit: number
): Promise<{ data: EligibleUser[]; nextCursor: string | null } | null> {
  const url = `https://hexastral-api.internal/api/internal/almanac/eligible-users?cursor=${cursor ?? '0'}&limit=${limit}`
  try {
    const res = await env.SVC_API.fetch(
      new Request(url, {
        headers: { 'X-Internal-Key': env.INTERNAL_KEY },
        signal: AbortSignal.timeout(10_000),
      })
    )
    if (!res.ok) {
      logger.error('eligible-users fetch failed', {
        status: String(res.status),
        cursor: cursor ?? '0',
      })
      return null
    }
    return (await res.json()) as { data: EligibleUser[]; nextCursor: string | null }
  } catch (err) {
    logger.error('eligible-users fetch threw', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

interface UpsertPayload {
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
}

async function upsertAlmanac(env: Env, payload: UpsertPayload): Promise<boolean> {
  try {
    const res = await env.SVC_API.fetch(
      new Request('https://hexastral-api.internal/api/internal/almanac/upsert', {
        method: 'POST',
        headers: {
          'X-Internal-Key': env.INTERNAL_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
      })
    )
    if (!res.ok) {
      logger.error('upsert failed', {
        userId: payload.userId,
        date: payload.date,
        status: String(res.status),
      })
      return false
    }
    return true
  } catch (err) {
    logger.error('upsert threw', {
      userId: payload.userId,
      err: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

async function alertAdmin(env: Env, title: string, message: string, level: 'warning' | 'error') {
  try {
    await env.SVC_ADMIN_NOTIFY.fetch(
      new Request('https://svc-admin-notify.internal/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, level, source: 'svc-signal' }),
        signal: AbortSignal.timeout(3_000),
      })
    )
  } catch {
    // Best-effort; never let alerting failures abort the cron.
  }
}

// ── Per-user almanac generation ────────────────────────────────────────────

function generateForUser(user: EligibleUser): UpsertPayload | null {
  // All four trait fields are guaranteed by the API filter, but TS narrows
  // through the explicit guard rather than the precondition.
  if (
    !user.dayMasterStem ||
    !user.favorableElement ||
    !user.unfavorableElement ||
    !user.birthBranch
  ) {
    return null
  }
  if (!ALL_STEMS.has(user.dayMasterStem)) return null
  if (!ALL_WUXING.has(user.favorableElement)) return null
  if (!ALL_WUXING.has(user.unfavorableElement)) return null
  if (!ALL_BRANCHES.has(user.birthBranch)) return null

  const localDate = localDateInTz(user.timezoneId)
  const { year, month, day } = parseYmd(localDate)
  const today = dayGanZhi(year, month, day)

  if (!ALL_STEMS.has(today.stem) || !ALL_BRANCHES.has(today.branch)) return null

  const traits: UserStaticTraits = {
    userId: user.userId,
    dayMasterStem: user.dayMasterStem as Stem,
    favorableElement: user.favorableElement as WuXing,
    unfavorableElement: user.unfavorableElement as WuXing,
    birthBranch: user.birthBranch as Branch,
  }

  const locale = pickLocale(user.locale)

  const result = computeAlmanac({
    user: traits,
    day: {
      date: localDate,
      dayStem: today.stem as Stem,
      dayBranch: today.branch as Branch,
    },
    locale,
  })

  return {
    userId: user.userId,
    date: localDate,
    relation: result.relation,
    energyLevel: result.energyLevel,
    headline: result.headline,
    todayLens: result.todayLens,
    watchFor: result.watchFor,
    luckyHour: result.luckyHour ?? null,
    luckyDirection: result.luckyDirection ?? null,
    luckyColor: result.luckyColor ?? null,
    locale,
  }
}

// ── Cron entry point ──────────────────────────────────────────────────────

async function runDailyCron(env: Env): Promise<void> {
  const startedAt = Date.now()
  let total = 0
  let written = 0
  let skipped = 0
  let errored = 0

  let cursor: string | null = '0'
  let pages = 0
  while (cursor !== null) {
    const page = await fetchEligibleUsers(env, cursor, 100)
    if (page === null) {
      // Hard fetch failure — alert and abort the cron run; partial state is acceptable
      // because /upsert is idempotent and the next day's cron will refill any gaps.
      await alertAdmin(
        env,
        'svc-signal: cron pagination failed',
        `eligible-users API returned non-OK at cursor ${cursor} after ${pages} pages`,
        'error'
      )
      break
    }

    pages++
    for (const user of page.data) {
      total++
      let payload: UpsertPayload | null
      try {
        payload = generateForUser(user)
      } catch (err) {
        errored++
        logger.error('generateForUser threw', {
          userId: user.userId,
          err: err instanceof Error ? err.message : String(err),
        })
        continue
      }
      if (!payload) {
        skipped++
        continue
      }

      const ok = await upsertAlmanac(env, payload)
      if (ok) written++
      else errored++
    }

    cursor = page.nextCursor
  }

  const durationMs = Date.now() - startedAt
  logger.info('cron done', {
    total: String(total),
    written: String(written),
    skipped: String(skipped),
    errored: String(errored),
    pages: String(pages),
    durationMs: String(durationMs),
  })

  // Alert on suspicious coverage: if we processed >50 users and >20% errored,
  // something is broken upstream (API DB connection, schema drift, …).
  if (total > 50 && errored > total * 0.2) {
    await alertAdmin(
      env,
      'svc-signal: high almanac error rate',
      `errored=${errored}/${total} (>20%) — investigate /api/internal/almanac/upsert`,
      'warning'
    )
  }
}

// ── Hono app (health + manual trigger) ────────────────────────────────────

const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => c.json({ status: 'ok', service: 'svc-signal' }))

/** Manual trigger for ops / dev — same auth as internal endpoints. */
app.post('/run', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.executionCtx.waitUntil(runDailyCron(c.env))
  return c.json({ ok: true, queued: true })
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyCron(env))
  },
}
