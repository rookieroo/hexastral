/**
 * Syel push-retention: replace dated fuel from the latest Pro reading.
 * Prefer structured events; optional LLM windows via SVC_ASTRO when available.
 * Send path never calls LLM.
 */
import { and, eq } from 'drizzle-orm'
import { faceoraclePushQueue } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import { callAstro } from './astro-client'

const HEALTH_DENY =
  /确诊|癌症|肿瘤|糖尿病|处方|用药|针灸治疗|心脏病|肝炎|肝硬化|你有.*病/i

export type FacePushWindowIn = {
  fireOn: string
  localHour: number
  priority: number
  kind: 'qi' | 'rest' | 'observe' | 'recapture' | 'other'
  title: string
  body: string
  data?: Record<string, string>
  expiresAt?: string | null
}

function sanitize(body: string): string | null {
  const t = body.trim()
  if (!t || HEALTH_DENY.test(t)) return null
  return t.slice(0, 180)
}

/** Whether queue rows already cover this month's event rule-fallback window. */
export function userIdsWithMonthEventCoverage(
  rows: Array<{
    userId: string
    fireOn: string
    dataJson: string | null
    status: string
  }>,
  month: string
): Set<string> {
  const out = new Set<string>()
  const monthStart = `${month}-01`
  for (const r of rows) {
    if (r.status !== 'queued' && r.status !== 'sent') continue
    if (r.fireOn === monthStart || r.dataJson?.includes(`"startMonth":"${month}"`)) {
      out.add(r.userId)
    }
  }
  return out
}

/** Build rule-based windows from physiognomy events (no LLM). */
export function windowsFromEvents(
  events: Array<{ startMonth?: string; theme?: string; note?: string }>,
  locale: string
): FacePushWindowIn[] {
  const base = locale.toLowerCase()
  const hant = base.includes('hant') || base === 'zh-tw' || base === 'zh-hk'
  const ja = base.startsWith('ja')
  const title = hant
    ? '宜留意的時間窗'
    : locale.startsWith('zh')
      ? '宜留意的时间窗'
      : ja
        ? '意識したい時間窓'
        : 'A window worth noting'
  const out: FacePushWindowIn[] = []
  for (const ev of events.slice(0, 8)) {
    const sm = ev.startMonth
    if (!sm || !/^\d{4}-\d{2}$/.test(sm)) continue
    const fireOn = `${sm}-01`
    const body = sanitize(`${ev.theme ?? ''}${ev.note ? ` — ${ev.note}` : ''}`)
    if (!body) continue
    out.push({
      fireOn,
      localHour: 9,
      priority: 40,
      kind: 'qi',
      title,
      body,
      data: { kind: 'event', startMonth: sm, targetApp: 'faceoracle' },
    })
  }
  return out
}

/** Normalize a rest theme key for ≥3d cooldown (Compliance). */
export function faceoracleRestThemeKey(title: string, themeHint?: string | null): string {
  const raw = (themeHint?.trim() || title.trim()).slice(0, 48).toLowerCase()
  return raw || 'rest'
}

/** Optional LLM harvest — empty on failure (non-fatal). */
export async function llmHarvestFacePushWindows(
  env: CloudflareBindings,
  input: {
    locale: string
    events: Array<{ startMonth?: string; theme?: string; note?: string }>
    chapterHints?: string
  }
): Promise<FacePushWindowIn[]> {
  try {
    const res = await callAstro<{
      windows?: Array<{
        fireOn?: string
        localHour?: number
        priority?: number
        kind?: string
        title?: string
        body?: string
      }>
    }>(env.SVC_ASTRO, '/physiognomy/harvest-push', {
      locale: input.locale,
      events: input.events,
      chapterHints: input.chapterHints ?? '',
    })
    const windows = Array.isArray(res.windows) ? res.windows : []
    const out: FacePushWindowIn[] = []
    for (const w of windows) {
      const fireOn =
        typeof w.fireOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.fireOn) ? w.fireOn : null
      const body = typeof w.body === 'string' ? sanitize(w.body) : null
      const title = typeof w.title === 'string' ? w.title.trim().slice(0, 40) : ''
      if (!fireOn || !body || !title) continue
      const kindRaw = typeof w.kind === 'string' ? w.kind : 'other'
      const kind: FacePushWindowIn['kind'] =
        kindRaw === 'qi' ||
        kindRaw === 'rest' ||
        kindRaw === 'observe' ||
        kindRaw === 'recapture'
          ? kindRaw
          : 'other'
      const localHour =
        kind === 'rest'
          ? 21
          : typeof w.localHour === 'number' && w.localHour >= 0 && w.localHour <= 23
            ? Math.floor(w.localHour)
            : 9
      const priority =
        kind === 'rest' || kind === 'observe'
          ? 80
          : kind === 'qi'
            ? 50
            : typeof w.priority === 'number'
              ? w.priority
              : 10
      out.push({
        fireOn,
        localHour,
        priority,
        kind,
        title,
        body,
        data: {
          kind:
            kind === 'rest'
              ? 'rest'
              : kind === 'qi'
                ? 'event'
                : kind === 'observe'
                  ? 'observe'
                  : kind === 'recapture'
                    ? 'recapture'
                    : 'timeline',
          targetApp: 'faceoracle',
          ...(kind === 'rest' ? { themeKey: faceoracleRestThemeKey(title) } : {}),
        },
      })
      if (out.length >= 12) break
    }
    return out
  } catch {
    return []
  }
}

/**
 * Replace queued fuel for user with `windows`.
 * Empty windows must NOT wipe prior queue (failed harvest must not erase fuel).
 */
export async function replaceFaceoraclePushFuel(
  db: AppDb,
  opts: {
    userId: string
    sourceReadingId: string
    locale: string
    windows: FacePushWindowIn[]
  }
): Promise<number> {
  const rows = opts.windows.slice(0, 16)
  if (rows.length === 0) {
    console.warn('[faceoracle-push] skip empty replace; keeping prior queued fuel', {
      userId: opts.userId,
      sourceReadingId: opts.sourceReadingId,
    })
    return 0
  }

  await db
    .update(faceoraclePushQueue)
    .set({ status: 'expired' })
    .where(
      and(eq(faceoraclePushQueue.userId, opts.userId), eq(faceoraclePushQueue.status, 'queued'))
    )

  await db.insert(faceoraclePushQueue).values(
    rows.map((w) => ({
      id: crypto.randomUUID(),
      userId: opts.userId,
      sourceReadingId: opts.sourceReadingId,
      locale: opts.locale,
      fireOn: w.fireOn,
      localHour: w.localHour,
      priority: w.priority,
      kind: w.kind,
      title: w.title,
      body: w.body,
      dataJson: w.data ? JSON.stringify(w.data) : null,
      expiresAt: w.expiresAt ?? null,
      status: 'queued' as const,
    }))
  )
  return rows.length
}
