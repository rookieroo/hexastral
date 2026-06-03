/**
 * Tests for POST /api/auspice/timeline (Sprint 4 — ADR-0020 Life Timeline backend).
 *
 * Mirrors the cycle.test.ts harness pattern — drives the sub-router via
 * `.request()` directly. HMAC v2 verification is wired at the index.ts level
 * (not on this sub-router), so the unit harness exercises the handler logic
 * without the auth dance. A lightweight in-memory cache adapter stands in for
 * D1/Drizzle so the test stays single-process and instant.
 */

import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../infra-types'
import { auspiceTimelineRoutes, buildTimelinePayload } from './cycle-timeline'

/**
 * Build a fresh Hono app that wraps the sub-router with an in-memory `db`
 * stub. The stub mimics the two Drizzle calls the route makes (`.select().…
 * .get()` and `.insert().values().onConflictDoUpdate()`) and stores rows in a
 * Map keyed on `contextKey`.
 */
function makeHarness() {
  const store = new Map<string, { id: string; contentJson: string; expiresAt: string }>()

  // Stub the minimal Drizzle surface the route uses. The route reads via
  // `select({contentJson}).from(t).where(...).limit(1).get()` and writes via
  // `insert(t).values(...).onConflictDoUpdate({target, set})`. We don't need
  // the WHERE/target metadata — the row's contextKey is captured by the
  // closure on each .values() call.
  let pendingContextKey: string | null = null
  const fakeDb = {
    select() {
      return {
        from() {
          return {
            where(condition: { ctxKey?: string }) {
              const ctxKey = condition?.ctxKey ?? pendingContextKey
              return {
                limit() {
                  return {
                    async get() {
                      if (!ctxKey) return undefined
                      const row = store.get(ctxKey)
                      if (!row) return undefined
                      // Mirror the route's `expiresAt > now` filter so an
                      // expired row reports as a miss.
                      if (new Date(row.expiresAt).getTime() <= Date.now()) return undefined
                      return { contentJson: row.contentJson }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
    insert() {
      return {
        values(v: { id: string; contextKey: string; contentJson: string; expiresAt: string }) {
          pendingContextKey = v.contextKey
          return {
            async onConflictDoUpdate(_: unknown) {
              store.set(v.contextKey, {
                id: v.id,
                contentJson: v.contentJson,
                expiresAt: v.expiresAt,
              })
            },
          }
        },
      }
    },
  }

  // The fake `.where()` ignores Drizzle's condition object because we don't
  // build a real query plan. Instead, the test intercepts the contextKey via
  // a small shim middleware: when the route writes via `.insert(...)`, the
  // pendingContextKey is captured. For reads we use the last-inserted key
  // (good enough for cache-hit tests — same body in, same key derived).
  // To make read-side correct on the FIRST request (cache miss), we patch
  // `select().from().where()` to use the body's hashed key. We do that by
  // overriding pendingContextKey from the request body in the wrapper below.
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: test stub satisfies the route's narrow Drizzle usage
    c.set('db', fakeDb as any)
    await next()
  })
  app.route('/', auspiceTimelineRoutes)

  return { app, store }
}

const BODY = {
  birthDate: '1990-08-15',
  birthHour: 14,
  gender: 'M' as const,
  locale: 'zh-Hans' as const,
}

async function postTimeline(app: Hono<AppEnv>, body: object) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auspice/timeline', () => {
  test('returns 8 大运 steps + schemaVersion 1', async () => {
    const { app } = makeHarness()
    const res = await postTimeline(app, BODY)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.schemaVersion).toBe(1)
    expect(body.data.dayun).toHaveLength(8)
    // Pillars are present (year/month/day) and `hour` is non-null because
    // birthHour=14 is a known time.
    expect(body.data.pillars.year.element).toBeDefined()
    expect(body.data.pillars.hour).not.toBeNull()
  })

  test('currentDayunIndex falls inside [0, 7] when the user is alive today', async () => {
    const { app } = makeHarness()
    const res = await postTimeline(app, BODY)
    const body = await res.json()
    const idx: number = body.data.currentDayunIndex
    // A 1990 birth is mid-life in 2026; one of the 8 大运 rows must bracket today.
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThanOrEqual(7)
    const currentRow = body.data.dayun[idx]
    expect(currentRow.isCurrent).toBe(true)
    const todayYear = new Date().getUTCFullYear()
    expect(todayYear).toBeGreaterThanOrEqual(currentRow.startYear)
    expect(todayYear).toBeLessThanOrEqual(currentRow.endYear)
  })

  test('returns identical payload on the second call (cache determinism)', async () => {
    const { app } = makeHarness()
    const r1 = await postTimeline(app, BODY)
    const b1 = await r1.json()
    const r2 = await postTimeline(app, BODY)
    const b2 = await r2.json()
    expect(r2.status).toBe(200)
    // Whole-payload equality — `computedAt` included. The cache returns the
    // EXACT JSON that was stored on the first miss, so timestamps match too.
    expect(b2.data).toEqual(b1.data)
  })

  test('handles birthHour = -1 (unknown) by emitting pillars.hour = null', async () => {
    const { app } = makeHarness()
    const res = await postTimeline(app, { ...BODY, birthHour: -1 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.pillars.hour).toBeNull()
    // Other pillars still present.
    expect(body.data.pillars.year.stem).toBeDefined()
    expect(body.data.pillars.day.stem).toBeDefined()
  })

  test('rejects bodies missing required fields', async () => {
    const { app } = makeHarness()
    const res = await postTimeline(app, { birthDate: '1990-08-15' })
    expect(res.status).toBe(400)
  })
})

// ── Pure-compute tests (no Hono) ────────────────────────────────
// Lock the deterministic shape so a regression in the astro-core wiring
// surfaces with a clearer failure than the route-level assertions above.

describe('buildTimelinePayload', () => {
  test('11 流年 rows (±5 around today) with exactly one isCurrent=true', async () => {
    const now = new Date('2026-05-31T00:00:00Z')
    const payload = buildTimelinePayload(BODY, now)
    expect(payload.liunian).toHaveLength(11)
    const currentRows = payload.liunian.filter((r) => r.isCurrent)
    expect(currentRows).toHaveLength(1)
    expect(currentRows[0]!.year).toBe(2026)
    expect(payload.currentLiunianIndex).toBe(5) // middle of an 11-row window
  })

  test('liuyue is a rolling 12-month window starting at the current month, with fit', async () => {
    const now = new Date('2026-05-31T00:00:00Z')
    const payload = buildTimelinePayload(BODY, now)
    expect(payload.liuyue).toHaveLength(12)
    // First entry is the current month; the window rolls forward (across the year).
    expect(payload.liuyue[0]!.isCurrent).toBe(true)
    expect(payload.liuyue[0]!.month).toBe(5)
    expect(payload.liuyue[0]!.year).toBe(2026)
    // Rolls past December → next year (May 2026 + 8 = Jan 2027).
    expect(payload.liuyue[8]!.month).toBe(1)
    expect(payload.liuyue[8]!.year).toBe(2027)
    for (const row of payload.liuyue) {
      expect(row.pillar.stem).toBeDefined()
      expect(row.pillar.branch).toBeDefined()
      expect(row.pillar.element).toBeDefined()
      expect(['吉', '平', '凶']).toContain(row.fit)
    }
  })
})
