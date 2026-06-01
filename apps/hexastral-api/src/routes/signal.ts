/**
 * GET /api/signal/today
 *
 * Returns the user's daily signal for today (UTC date key in D1).
 *
 * Pipeline (same for Free and Pro subscribers):
 * 1. If `daily_signals` already has today's `isCurrent` row → return it (no LLM).
 * 2. Else lazy-generate: `POST svc-astro /signal/generate` with static chart
 *    traits + optional `daily_almanac` scaffold (deterministic anchors for
 *    headline / lucky fields so push + in-app stay aligned).
 * 3. svc-astro runs `callWithFallback` with **Flash-tier routing** for this
 *    route (hexastral-api does not send `isPro: true`; product differentiation
 *    is in-app, e.g. iOS shows the expandable "Why" reasoning for Pro only).
 * 4. Persist row with `SIGNAL_MODEL` / `SIGNAL_PROMPT_VERSION` from model-registry.
 *
 * Not pure template math: copy is LLM-generated JSON; almanac supplies structure.
 *
 * Relation to other surfaces: **system fate reading** is `report_chapters`
 * (GET /api/report/chapter/:slug). This file is **only** the Fate-tab daily card
 * (`daily_signals`). Onboarding may warm free report chapters in parallel — see
 * `onboarding/bootstrap.ts` and `onboarding/reveal.ts`.
 */

import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { dailyAlmanac, dailySignals, userCharts, users } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { userHasCapability } from '../lib/access/entitlement-access'
import { ApiErrorCode, jsonErr, jsonOk } from '../lib/api-response'
import { requireUserId } from '../lib/auth'
import { withEdgeCache } from '../lib/cache-layer'
import { resolveChartHash } from '../lib/chart-context'
import { buildChartSkeleton } from '../lib/chart-skeleton'
import { SIGNAL_MODEL, SIGNAL_PROMPT_VERSION } from '../lib/model-registry'
import { astroClient } from '../lib/service-clients'

const signalContentSchema = z.object({
  headline: z.string(),
  energy: z.object({
    level: z.enum(['rising', 'steady', 'productive', 'guarded', 'volatile']),
    wuxing: z.enum(['wood', 'fire', 'earth', 'metal', 'water']),
  }),
  todayLens: z.string(),
  watchFor: z.string(),
  lucky: z.object({
    hour: z.string(),
    direction: z.string(),
    color: z.string(),
    advice: z.string(),
  }),
  goldenLine: z.string().optional(),
  reasoningChain: z.string(),
})
type SignalContent = z.infer<typeof signalContentSchema>

interface SignalResponse {
  signalId: string
  date: string
  content: SignalContent
  kind: 'llm' | 'almanac'
  model: string
  promptVersion: string
  generatedAt: string
}

const HONEYMOON_DAYS = 7

function todayInUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function mapAlmanacEnergy(level: string): SignalContent['energy']['level'] {
  if (level === 'rising') return 'rising'
  if (level === 'stable') return 'steady'
  return 'guarded'
}

function buildAlmanacSignal(today: string, row: typeof dailyAlmanac.$inferSelect): SignalResponse {
  const content: SignalContent = {
    headline: row.headline,
    energy: {
      level: mapAlmanacEnergy(row.energyLevel),
      wuxing: 'earth',
    },
    todayLens: row.todayLens,
    watchFor: row.watchFor,
    lucky: {
      hour: row.luckyHour ?? '—',
      direction: row.luckyDirection ?? '—',
      color: row.luckyColor ?? '—',
      advice: row.relation,
    },
    reasoningChain: '',
  }
  return {
    signalId: `almanac:${row.id}`,
    date: today,
    content,
    kind: 'almanac',
    model: 'almanac@v1',
    promptVersion: 'v1.0',
    generatedAt: row.createdAt,
  }
}

export const signalTodayRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const today = todayInUtc()

  // Cache reads for ~5 min — burst absorber, not the canonical store.
  const cacheKey = `signal:today:${userId}:${today}`

  const result = await withEdgeCache<SignalResponse>(c.env, cacheKey, 300, async () => {
    const existing = await db.query.dailySignals.findFirst({
      where: and(
        eq(dailySignals.userId, userId),
        eq(dailySignals.date, today),
        eq(dailySignals.isCurrent, true)
      ),
    })

    if (existing) {
      return {
        signalId: existing.id,
        date: existing.date,
        content: JSON.parse(existing.contentJson) as SignalContent,
        kind: 'llm',
        model: existing.model,
        promptVersion: existing.promptVersion,
        generatedAt: existing.generatedAt,
      }
    }

    // Lazy generate — fetch user + scaffold from daily_almanac.
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const locale = user.locale ?? 'en'

    // Lazy chart-skeleton: if user has birth info but no natal chart row,
    // build it now (idempotent, LLM-free) so resolveChartHash succeeds.
    if (user.birthSolarDate && user.birthTimeIndex != null && user.birthGender) {
      const hasChart = await db.query.userCharts.findFirst({
        where: and(eq(userCharts.userId, userId), eq(userCharts.chartType, 'natal')),
        columns: { id: true },
      })
      if (!hasChart) {
        try {
          await buildChartSkeleton(db, c.env, {
            userId,
            birthSolarDate: user.birthSolarDate,
            birthTimeIndex: user.birthTimeIndex,
            birthGender: user.birthGender as '男' | '女',
            birthCity: user.birthCity,
            birthLongitude: user.birthLongitude,
            birthLatitude: user.birthLatitude,
            birthTimezoneId: user.birthTimezoneId,
            hemisphereReversalEnabled: user.hemisphereReversalEnabled === true,
            language: locale,
          })
        } catch (err) {
          console.error('[signal.today] chart-skeleton lazy-build failed', userId, err)
        }
      }
    }

    const chartHash = await resolveChartHash(db, userId)

    const almanacRow = await db.query.dailyAlmanac.findFirst({
      where: and(eq(dailyAlmanac.userId, userId), eq(dailyAlmanac.date, today)),
    })
    const isPro = await userHasCapability(db, userId, 'fate')
    const createdAtMs = new Date(user.createdAt).getTime()
    const signupAgeDays = Number.isFinite(createdAtMs)
      ? Math.floor((Date.now() - createdAtMs) / 86_400_000)
      : 0
    const inHoneymoon = signupAgeDays < HONEYMOON_DAYS
    if (!isPro && !inHoneymoon && almanacRow) {
      return buildAlmanacSignal(today, almanacRow)
    }
    // Almanac may legitimately be missing if the daily cron hasn't run for this
    // user yet (e.g. brand-new account before first cron tick) — generate
    // without scaffold, the LLM will produce a valid signal regardless.

    const generated = await astroClient.post<unknown>(c.env.SVC_ASTRO, '/signal/generate', {
      chartHash,
      date: today,
      locale,
      explanationMode: 'plain' as const,
      /** Daily card uses Flash-tier LLM routing for all plans; see file header. */
      isPro: false,
      user: {
        dayMasterStem: user.dayMasterStem,
        dayMasterStrength: user.dayMasterStrength,
        favorableElement: user.favorableElement,
        unfavorableElement: user.unfavorableElement,
        ziweiMingPalaceStar: user.ziweiMingPalaceStar,
        birthBranch: user.birthBranch,
      },
      almanac: almanacRow
        ? {
            relation: almanacRow.relation,
            energyLevel: almanacRow.energyLevel,
            headline: almanacRow.headline,
            todayLens: almanacRow.todayLens,
            watchFor: almanacRow.watchFor,
            luckyHour: almanacRow.luckyHour,
            luckyDirection: almanacRow.luckyDirection,
            luckyColor: almanacRow.luckyColor,
          }
        : null,
    })

    const content = signalContentSchema.parse(generated)
    const row = {
      id: crypto.randomUUID(),
      userId,
      date: today,
      chartHash,
      contentJson: JSON.stringify(content),
      locale,
      explanationMode: 'plain',
      model: SIGNAL_MODEL,
      promptVersion: SIGNAL_PROMPT_VERSION,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
    }
    await db.insert(dailySignals).values(row)

    return {
      signalId: row.id,
      date: today,
      content,
      kind: 'llm',
      model: row.model,
      promptVersion: row.promptVersion,
      generatedAt: row.generatedAt,
    }
  })

  return jsonOk(c, result)
})

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
})

export const signalHistoryRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const parsed = historyQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
  if (!parsed.success) {
    return jsonErr(c, 400, ApiErrorCode.invalid_input, 'Invalid query: days must be 1–90')
  }
  const days = parsed.data.days

  // Pro-only beyond 7 days. Free tier capped at 7d.
  const isPro = await userHasCapability(db, userId, 'fate')
  const effectiveDays = isPro ? days : Math.min(days, 7)

  const rows = await db.query.dailySignals.findMany({
    where: and(eq(dailySignals.userId, userId), eq(dailySignals.isCurrent, true)),
    orderBy: [desc(dailySignals.date)],
    limit: effectiveDays,
  })

  return jsonOk(
    c,
    {
      days: effectiveDays,
      proCapped: !isPro && days > 7,
      items: rows.map((r) => ({
        signalId: r.id,
        date: r.date,
        content: JSON.parse(r.contentJson) as SignalContent,
        kind: 'llm' as const,
        model: r.model,
        promptVersion: r.promptVersion,
        generatedAt: r.generatedAt,
      })),
    },
    200,
    { total: rows.length }
  )
})

/** GET /:signalId — single archived Daily Signal row (owner only). */
export const signalItemRoutes = new Hono<AppEnv>()
  .get('/:signalId', async (c) => {
    const userId = requireUserId(c)
    const signalId = c.req.param('signalId')
    if (!signalId) {
      return jsonErr(c, 400, ApiErrorCode.missing_required, 'Missing signal id')
    }
    const db = c.get('db')
    const row = await db.query.dailySignals.findFirst({
      where: and(eq(dailySignals.id, signalId), eq(dailySignals.userId, userId)),
    })
    if (!row) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Signal not found')
    }
    const parsed = signalContentSchema.safeParse(JSON.parse(row.contentJson))
    if (!parsed.success) {
      console.error('[signal.item] corrupt content_json', signalId, parsed.error.flatten())
      return jsonErr(c, 500, ApiErrorCode.internal_error, 'Invalid signal payload')
    }
    const out: SignalResponse = {
      signalId: row.id,
      date: row.date,
      content: parsed.data,
      kind: 'llm',
      model: row.model,
      promptVersion: row.promptVersion,
      generatedAt: row.generatedAt,
    }
    return jsonOk(c, out)
  })
  /** DELETE /:signalId — remove own daily_signals row (history list) */
  .delete('/:signalId', async (c) => {
    const userId = requireUserId(c)
    const signalId = c.req.param('signalId')
    if (!signalId) {
      return jsonErr(c, 400, ApiErrorCode.missing_required, 'Missing signal id')
    }
    const db = c.get('db')
    const row = await db.query.dailySignals.findFirst({
      where: and(eq(dailySignals.id, signalId), eq(dailySignals.userId, userId)),
    })
    if (!row) {
      return jsonErr(c, 404, ApiErrorCode.not_found, 'Signal not found')
    }
    await db
      .delete(dailySignals)
      .where(and(eq(dailySignals.id, signalId), eq(dailySignals.userId, userId)))
    return jsonOk(c, { deleted: true })
  })
