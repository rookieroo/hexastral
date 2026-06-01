/**
 * POST /api/onboarding/bootstrap
 *
 * Atomic onboarding fan-out: validates birth info, builds the chart skeleton
 * (LLM-free pillars + ziwei main star), persists static traits + ziwei main
 * star to users, and produces the first daily_signals row via svc-astro
 * (Gemini 2.5 Flash Lite, REVEAL_MODEL).
 *
 * On any failure, returns a structured error code so the iOS client can show
 * an inline retry sheet WITHOUT marking onboarding complete. This is the
 * single source of truth for "user is ready to use the app" state.
 *
 * Idempotent — safe to call multiple times. Subsequent calls reuse the cached
 * chart skeleton and (if today's signal exists) the existing daily_signals row.
 *
 * After the first signal, `waitUntil` warms **free** `report_chapters` only
 * (ch1, ch2_static, ch3). Pro chapters stay lazy-on-read on first GET.
 */

import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { dailySignals, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { requireUserId } from '../../lib/auth'
import { buildChartSkeleton } from '../../lib/chart-skeleton'
import { REVEAL_MODEL, REVEAL_PROMPT_VERSION } from '../../lib/model-registry'
import { astroClient } from '../../lib/service-clients'
import { generateChapter } from '../report'

const bootstrapSchema = z.object({
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

export const onboardingBootstrapRoutes = new Hono<AppEnv>().post(
  '/',
  zValidator('json', bootstrapSchema),
  async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const { locale: localeArg, explanationMode } = c.req.valid('json')

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    // ── Step 1: validate birth info on file ──
    if (!user.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) {
      return c.json({ ok: false, code: 'MISSING_BIRTH_INFO', step: 'validate' }, 400)
    }

    const locale = localeArg ?? user.locale ?? 'en'

    // ── Step 2: build (or reuse) the chart skeleton ──
    let skeleton: Awaited<ReturnType<typeof buildChartSkeleton>>
    try {
      skeleton = await buildChartSkeleton(db, c.env, {
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
      console.error('[onboarding.bootstrap] chart-skeleton failed', userId, err)
      return c.json({ ok: false, code: 'CHART_SKELETON_FAILED', step: 'chart' }, 502)
    }

    // ── Step 3: produce first daily_signals row ──
    const today = new Date().toISOString().slice(0, 10)
    const existingSignal = await db.query.dailySignals.findFirst({
      where: and(
        eq(dailySignals.userId, userId),
        eq(dailySignals.date, today),
        eq(dailySignals.isCurrent, true)
      ),
    })

    let signalContent: SignalContent
    let signalId: string
    let signalModel: string
    let signalPromptVersion: string

    if (existingSignal) {
      signalContent = JSON.parse(existingSignal.contentJson) as SignalContent
      signalId = existingSignal.id
      signalModel = existingSignal.model
      signalPromptVersion = existingSignal.promptVersion
    } else {
      try {
        const generated = await astroClient.post<unknown>(c.env.SVC_ASTRO, '/signal/generate', {
          chartHash: skeleton.inputHash,
          date: today,
          locale,
          explanationMode,
          isOnboardingReveal: true,
          user: {
            dayMasterStem: skeleton.dayMasterStem,
            dayMasterStrength: skeleton.dayMasterStrength,
            favorableElement: skeleton.favorableElement,
            unfavorableElement: skeleton.unfavorableElement,
            ziweiMingPalaceStar: skeleton.ziweiMingPalaceStar,
            birthBranch: skeleton.birthBranch,
          },
        })
        signalContent = signalContentSchema.parse(generated)
        signalId = crypto.randomUUID()
        signalModel = REVEAL_MODEL
        signalPromptVersion = REVEAL_PROMPT_VERSION
        await db.insert(dailySignals).values({
          id: signalId,
          userId,
          date: today,
          chartHash: skeleton.inputHash,
          contentJson: JSON.stringify(signalContent),
          locale,
          explanationMode,
          model: signalModel,
          promptVersion: signalPromptVersion,
          isCurrent: true,
          generatedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('[onboarding.bootstrap] signal generation failed', userId, err)
        // Chart skeleton already persisted — partial success. Return the
        // skeleton + structured error so the client can retry just the signal
        // step (next call will reuse the cached skeleton).
        return c.json(
          {
            ok: false,
            code: 'SIGNAL_FAILED',
            step: 'signal',
            traits: skeleton,
          },
          502
        )
      }
    }

    // ── Step 4: warm free-tier static chapters in background ──
    c.executionCtx.waitUntil(
      Promise.allSettled([
        generateChapter({ c, userId, slug: 'ch1_personality' }),
        generateChapter({ c, userId, slug: 'ch2_dimensions_static' }),
        generateChapter({ c, userId, slug: 'ch3_stellar' }),
      ]).then((results) => {
        for (const r of results) {
          if (r.status === 'rejected') {
            console.error('[bootstrap] background chapter warm failed', r.reason)
          }
        }
      })
    )

    return c.json({
      ok: true,
      traits: {
        dayMasterStem: skeleton.dayMasterStem,
        dayMasterStrength: skeleton.dayMasterStrength,
        favorableElement: skeleton.favorableElement,
        unfavorableElement: skeleton.unfavorableElement,
        birthBranch: skeleton.birthBranch,
        ziweiMingPalaceStar: skeleton.ziweiMingPalaceStar,
      },
      signal: {
        signalId,
        date: today,
        content: signalContent,
        model: signalModel,
        promptVersion: signalPromptVersion,
      },
    })
  }
)
