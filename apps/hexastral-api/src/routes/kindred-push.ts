/**
 * GET /api/kindred/push/targets — the deterministic daily relationship-push
 * scheduler (ADR-0025 read-path). The svc-notify cron calls this per timezone;
 * for each user it runs the Layer-1 daily synastry over their active Threads,
 * picks the single strongest bond, matches a QUEUED `kindred_push_queue` snippet
 * (dated fireOn=today, or conditional triggerKind=today's synastry status), and
 * returns pre-rendered Expo messages. NO LLM at send time — the copy was
 * harvested at report time (ADR-0025 Layer 2). The chosen rows are marked 'sent'
 * so they don't re-fire. Internal-only (X-Internal-Key); mirrors the auspice
 * timeline push-targets pattern.
 *
 * NOTE: opt-in is implied by "has a push token" — kindred push registration
 * (the greenfield write-path) only registers a token when the user opted in, so
 * there's no separate server flag to gate here yet.
 */
import {
  calculateDailySynastry,
  dayGanZhi,
  type FourPillars,
  type GanZhi,
  getFourPillars,
} from '@zhop/astro-core'
import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { kindredPushQueue, pushTokens, userBonds, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { userHasCapability } from '../lib/access/entitlement-access'
import { jsonOk } from '../lib/api-response'

export const kindredPushRoutes = new Hono<AppEnv>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Synastry only reads year/day branches + day stem — all hour-independent — so
 *  noon is a safe pillar hour for every chart (matches the auspice nudge). */
const SYNASTRY_HOUR = 12

function parseYmd(s: string): { year: number; month: number; day: number } | null {
  if (!DATE_RE.test(s)) return null
  const [year, month, day] = s.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  return { year, month, day }
}

/** Rank by intensity — strong tension can beat mild resonance (not status-tier locks). */
function synastryRank(s: { status: string; synergy: number; friction: number }): number {
  if (s.status === 'resonance') return 1000 + Math.max(0, s.synergy) * 10
  if (s.status === 'tension') return 1000 + Math.max(0, s.friction) * 10
  return 500 + Math.max(0, s.synergy) * 5
}

export interface BondPillar {
  bondId: string
  pillars: FourPillars
}

/** Rank a queued snippet for same-day pick (higher wins).
 * Matching conditional (today's energy) outranks calendar dated when both apply. */
export function scoreKindredSnippet(
  q: {
    kind: string
    fireOn: string | null
    triggerKind: string | null
    bondId: string | null
  },
  date: string,
  strongest: { bondId: string; status: string } | null
): number {
  let score = 0
  const matchingCond =
    q.kind === 'conditional' && strongest && q.triggerKind === strongest.status
  const datedToday = q.kind === 'dated' && q.fireOn === date
  if (matchingCond) score += 700
  else if (datedToday) score += 400
  else return -1
  if (q.triggerKind === 'tension') score += 80
  else if (q.triggerKind === 'resonance') score += 40
  if (strongest && q.bondId === strongest.bondId) score += 100
  if (q.bondId) score += 20
  return score
}

/**
 * Pure — pick the single strongest bond for the day (the one whose daily synastry
 * ranks highest). Exported for unit tests; no DB, no I/O.
 */
export function pickStrongestBond(
  selfPillars: FourPillars,
  bonds: BondPillar[],
  todayGanZhi: GanZhi,
  date: string
): { bondId: string; status: 'resonance' | 'tension' | 'neutral' } | null {
  let best: { bondId: string; status: 'resonance' | 'tension' | 'neutral'; rank: number } | null =
    null
  for (const b of bonds) {
    const syn = calculateDailySynastry(selfPillars, b.pillars, todayGanZhi, date)
    const rank = synastryRank(syn)
    if (!best || rank > best.rank) best = { bondId: b.bondId, status: syn.status, rank }
  }
  return best ? { bondId: best.bondId, status: best.status } : null
}

kindredPushRoutes.get('/targets', async (c) => {
  const key = c.req.header('X-Internal-Key')
  if (!key || key !== c.env.INTERNAL_KEY) throw new HTTPException(401, { message: 'Unauthorized' })
  const timezoneId = c.req.query('timezoneId')
  const date = c.req.query('date')
  if (!timezoneId || !date || !DATE_RE.test(date)) {
    throw new HTTPException(400, { message: 'timezoneId + date=YYYY-MM-DD required' })
  }
  const [yy, mm, dd] = date.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  const db = c.get('db')
  if (!db) return jsonOk(c, { messages: [], hasMore: false, nextCursor: null })

  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '200', 10) || 200, 500)
  const offset = Number.parseInt(c.req.query('cursor') ?? '0', 10)
  const todayGz = dayGanZhi(yy, mm, dd)

  // Candidate devices: a push token in this timezone, joined to the owner's self
  // birth (needed for synastry). Paginated over the token registry.
  const page0 = await db
    .select({
      token: pushTokens.token,
      userId: pushTokens.userId,
      birthSolarDate: users.birthSolarDate,
    })
    .from(pushTokens)
    .innerJoin(users, eq(users.id, pushTokens.userId))
    .where(eq(pushTokens.timezoneId, timezoneId))
    .limit(limit + 1)
    .offset(offset)
  const hasMore = page0.length > limit
  const page = hasMore ? page0.slice(0, limit) : page0

  const messages: Array<{
    userId: string
    token: string
    title: string
    body: string
    data: Record<string, string>
  }> = []
  const consumed: string[] = []
  const seenUsers = new Set<string>()

  for (const row of page) {
    if (seenUsers.has(row.userId)) continue // one nudge per user/day (multi-device)
    seenUsers.add(row.userId)

    // Pro gate — free tokens must not receive relationship cron (shared push_tokens).
    if (!(await userHasCapability(db, row.userId, 'kindred'))) continue

    const selfYmd = row.birthSolarDate ? parseYmd(row.birthSolarDate) : null
    if (!selfYmd) continue

    // Queued snippets for this user — skip the synastry compute if there are none.
    const queued = await db
      .select()
      .from(kindredPushQueue)
      .where(and(eq(kindredPushQueue.userId, row.userId), eq(kindredPushQueue.status, 'queued')))
    if (queued.length === 0) continue

    // Active Threads with a solar target birth → daily synastry → strongest bond.
    const bonds = await db
      .select({ bondId: userBonds.id, targetDate: userBonds.targetBirthSolarDate })
      .from(userBonds)
      .where(and(eq(userBonds.ownerId, row.userId), eq(userBonds.status, 'active')))
    const selfPillars = getFourPillars({ ...selfYmd, hour: SYNASTRY_HOUR })
    const bondPillars: BondPillar[] = []
    for (const b of bonds) {
      const by = b.targetDate ? parseYmd(b.targetDate) : null
      if (!by) continue
      bondPillars.push({
        bondId: b.bondId,
        pillars: getFourPillars({ ...by, hour: SYNASTRY_HOUR }),
      })
    }
    const strongest =
      bondPillars.length > 0 ? pickStrongestBond(selfPillars, bondPillars, todayGz, date) : null

    let pick: (typeof queued)[number] | undefined
    let bestScore = -1
    for (const q of queued) {
      const s = scoreKindredSnippet(q, date, strongest)
      if (s > bestScore) {
        bestScore = s
        pick = q
      }
    }
    if (!pick || bestScore < 0) continue

    // Resolve null bondId via sourceReadingId → userBonds.hehunReadingId (playbook ⑫/㉙).
    let bondId = pick.bondId ?? strongest?.bondId ?? null
    if (!bondId && pick.sourceReadingId) {
      const linked = await db
        .select({ id: userBonds.id })
        .from(userBonds)
        .where(
          and(
            eq(userBonds.ownerId, row.userId),
            eq(userBonds.hehunReadingId, pick.sourceReadingId),
            eq(userBonds.status, 'active')
          )
        )
        .get()
      bondId = linked?.id ?? null
      if (bondId) {
        await db
          .update(kindredPushQueue)
          .set({ bondId })
          .where(eq(kindredPushQueue.id, pick.id))
      }
    }
    messages.push({
      userId: row.userId,
      token: row.token,
      title: pick.title,
      body: pick.body,
      data: {
        type: 'kindred_synastry',
        route: bondId ? `/(bonds)/${bondId}` : '/(reading)/summary',
        ...(bondId ? { bondId } : {}),
        ...(pick.triggerKind ? { trigger: pick.triggerKind } : {}),
      },
    })
    consumed.push(pick.id)
  }

  // Mark the chosen snippets sent so the next cron pass doesn't re-fire them.
  // Optimistic: a delivery failure loses that snippet — acceptable for a nudge,
  // the queue holds more (and re-harvests on the next report).
  if (consumed.length > 0) {
    await db
      .update(kindredPushQueue)
      .set({ status: 'sent', sentAt: new Date().toISOString() })
      .where(inArray(kindredPushQueue.id, consumed))
  }

  return jsonOk(c, { messages, hasMore, nextCursor: hasMore ? offset + limit : null })
})
