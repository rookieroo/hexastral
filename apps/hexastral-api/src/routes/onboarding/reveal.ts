/**
 * POST /api/onboarding/reveal
 *
 * Replaces the deleted /api/onboarding/preview. After the deterministic
 * onboarding reveal screen, the user lands on the auth gate; once
 * authenticated, the app calls this endpoint to produce the first AI signal —
 * which is also persisted as the user's first daily_signals row so it appears
 * in the Fate-tab history scrubber from day 1.
 *
 * Model: Gemini 2.5 Flash Lite (fast first-impression). Output schema-validated.
 *
 * Like bootstrap: `waitUntil` warms free `report_chapters` (ch1, ch2_static, ch3) only.
 */

import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import { dailySignals, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { ApiErrorCode, jsonErr, jsonOk } from '../../lib/api-response'
import { requireUserId } from '../../lib/auth'
import { resolveChartHash } from '../../lib/chart-context'
import { REVEAL_MODEL, REVEAL_PROMPT_VERSION } from '../../lib/model-registry'
import { astroClient } from '../../lib/service-clients'
import { generateChapter } from '../report'

const revealSchema = z.object({
  /** BCP-47 locale, defaults to user's stored preference */
  locale: z.string().min(2).max(8).optional(),
  /** 'term' (jargon-first) or 'plain' (everyday speech) */
  explanationMode: z.enum(['term', 'plain']).default('plain'),
})

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
  reasoningChain: z.string(),
})
type SignalContent = z.infer<typeof signalContentSchema>

export const onboardingRevealRoutes = new Hono<AppEnv>().post(
  '/',
  zValidator('json', revealSchema),
  async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const { locale: localeArg, explanationMode } = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) return jsonErr(c, 404, ApiErrorCode.not_found, 'User not found')

    const locale = localeArg ?? user.locale ?? 'en'
    const chartHash = await resolveChartHash(db, userId)
    const today = new Date().toISOString().slice(0, 10)

    // Idempotent — if the user already has an onboarding reveal row for today,
    // return it. Otherwise generate, write, and return.
    const existing = await db.query.dailySignals.findFirst({
      where: (t, { and, eq: e }) =>
        and(e(t.userId, userId), e(t.date, today), e(t.isCurrent, true)),
    })
    if (existing) {
      return jsonOk(c, {
        signalId: existing.id,
        date: existing.date,
        content: JSON.parse(existing.contentJson) as SignalContent,
        model: existing.model,
        promptVersion: existing.promptVersion,
      })
    }

    const generated = await astroClient.post<unknown>(c.env.SVC_ASTRO, '/signal/generate', {
      chartHash,
      date: today,
      locale,
      explanationMode,
      isOnboardingReveal: true,
      user: {
        dayMasterStem: user.dayMasterStem,
        dayMasterStrength: user.dayMasterStrength,
        favorableElement: user.favorableElement,
        unfavorableElement: user.unfavorableElement,
        ziweiMingPalaceStar: user.ziweiMingPalaceStar,
        birthBranch: user.birthBranch,
      },
    })

    const content = signalContentSchema.parse(generated)

    const row = {
      id: crypto.randomUUID(),
      userId,
      date: today,
      chartHash,
      contentJson: JSON.stringify(content),
      locale,
      explanationMode,
      model: REVEAL_MODEL,
      promptVersion: REVEAL_PROMPT_VERSION,
      isCurrent: true,
      generatedAt: new Date().toISOString(),
    }
    await db.insert(dailySignals).values(row)

    // Warm the free-tier static chapters in the background so the user lands
    // on the report tab with content already generated. We fire-and-forget;
    // failures are swallowed (the lazy-regen path on first GET will retry).
    c.executionCtx.waitUntil(
      Promise.allSettled([
        generateChapter({ c, userId, slug: 'ch1_personality' }),
        generateChapter({ c, userId, slug: 'ch2_dimensions_static' }),
        generateChapter({ c, userId, slug: 'ch3_stellar' }),
      ]).then((results) => {
        for (const r of results) {
          if (r.status === 'rejected') {
            console.error('[reveal] background chapter warm failed', r.reason)
          }
        }
      })
    )

    return jsonOk(c, {
      signalId: row.id,
      date: today,
      content,
      model: REVEAL_MODEL,
      promptVersion: REVEAL_PROMPT_VERSION,
    })
  }
)
