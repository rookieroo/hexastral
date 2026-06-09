/**
 * Report surface — versioned, append-only, lazy-regen-on-read.
 *
 * Routes:
 *   GET  /api/report                       — manifest of all chapters for the user
 *   GET  /api/report/chapter/:slug         — current version (lazy-regen on context_hash mismatch)
 *   GET  /api/report/chapter/:slug/history — all versions for that chapter
 *   POST /api/report/chapter/:slug/reroll  — Pro-only "change perspective" re-roll
 *
 * Free tier: ch1_personality, ch2_dimensions_static, ch3_stellar.
 * Pro tier: + ch2_dimensions_dynamic, ch4_timeline, ch5_hidden, ch6_action.
 *
 * Lazy regen: on each GET, recompute the expected contextHash from the current
 * chart + liunian/dayun + prompt/model registry. If the stored is_current=1
 * row's context_hash matches → return as-is. If it differs → generate a new
 * version via svc-astro and atomically flip+insert via markCurrentAndInsert.
 *
 * Distinct from the Fate-tab **daily signal** (`GET /api/signal/today`, `daily_signals`).
 */

import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { reportChapters, userCharts, users } from '../db/schema'
import type { AppDb, AppEnv } from '../infra-types'
import { userHasCapability } from '../lib/access/entitlement-access'
import { requireUserId } from '../lib/auth'
import { CHAPTER_UNLOCK_CAP, chapterUnlockPosition, isChapterUnlocked } from '../lib/chapter-access'
import {
  CHAPTER_SLUGS,
  type ChapterSlug,
  computeContextHash,
  loadChartContext,
  STATIC_CHAPTERS,
} from '../lib/chart-context'
import { buildChartSkeleton } from '../lib/chart-skeleton'
import { CHAPTER_MODEL_REGISTRY } from '../lib/model-registry'
import { astroClient } from '../lib/service-clients'
import { markCurrentAndInsert } from '../lib/versioned-store'

const slugSchema = z.enum(CHAPTER_SLUGS)

interface ChapterRowOut {
  id: string
  slug: ChapterSlug
  contentJson: unknown
  chartHash: string
  contextHash: string
  model: string
  promptVersion: string
  perspectiveSeed: string | null
  generatedAt: string
}

function rowToOut(r: typeof reportChapters.$inferSelect): ChapterRowOut {
  return {
    id: r.id,
    slug: r.chapter as ChapterSlug,
    contentJson: JSON.parse(r.contentJson),
    chartHash: r.chartHash,
    contextHash: r.contextHash,
    model: r.model,
    promptVersion: r.promptVersion,
    perspectiveSeed: r.perspectiveSeed,
    generatedAt: r.generatedAt,
  }
}

const stylePresetSchema = z.enum(['direct', 'coach', 'gentle'])

function buildPerspectiveSeed(input: {
  perspectiveSeed?: string
  stylePreset?: z.infer<typeof stylePresetSchema>
  styleSeed?: string
}): string | undefined {
  const perspective = input.perspectiveSeed?.trim() ?? ''
  const preset = input.stylePreset?.trim() ?? ''
  const style = input.styleSeed?.trim() ?? ''
  const merged = [preset ? `preset:${preset}` : '', style ? `style:${style}` : '', perspective]
    .filter(Boolean)
    .join(' | ')
  return merged || undefined
}

/**
 * Gate a chapter fetch by the invite-driven unlock count.
 *
 * - Pro users (fate capability) bypass the cap entirely.
 * - Free users may read chapters whose position in `CHAPTER_UNLOCK_ORDER` is
 *   less than `unlockedCount`.
 * - Chapters outside the unlock order (currently only `ch2_dimensions_dynamic`)
 *   are Pro-only — the unlock mechanic does not reach them.
 *
 * Throws 403 with a structured payload so the client can render the right
 * unlock affordance (invite vs upsell) without a follow-up call.
 */
function assertChapterAccess(slug: ChapterSlug, unlockedCount: number, isPro: boolean) {
  if (isPro) return
  if (isChapterUnlocked(slug, unlockedCount)) return
  const position = chapterUnlockPosition(slug)
  throw new HTTPException(403, {
    message: 'Chapter locked — invite a friend to unlock or upgrade to HexAstral Pro.',
    res: new Response(
      JSON.stringify({
        error: 'Chapter locked — invite a friend to unlock or upgrade.',
        code: position == null ? 'CHAPTER_PRO_ONLY' : 'CHAPTER_INVITE_LOCKED',
        slug,
        position,
        unlockedCount,
        cap: CHAPTER_UNLOCK_CAP,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ),
  })
}

/** Read `users.unlockedChapterCount` for a single user (clamped to the cap). */
async function getUnlockedCount(db: AppDb, userId: string): Promise<number> {
  const row = await db
    .select({ count: users.unlockedChapterCount })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return Math.min(row?.count ?? 0, CHAPTER_UNLOCK_CAP)
}

/**
 * Generate (and persist) a new chapter version. Atomic flip-prior + insert via
 * markCurrentAndInsert. Returns the freshly-written row. Static chapters omit
 * liunian/dayun from contextHash; time-bound chapters include them.
 *
 * Exported so the onboarding reveal flow can warm the free-tier chapters in
 * the background after the first signal is generated.
 */
export async function generateChapter(ctx: {
  c: Context<AppEnv>
  userId: string
  slug: ChapterSlug
  perspectiveSeed?: string
  stylePreset?: z.infer<typeof stylePresetSchema>
  styleSeed?: string
}) {
  const { c, userId, slug, perspectiveSeed, stylePreset, styleSeed } = ctx
  const db = c.get('db')
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const locale = user.locale ?? 'en'
  const { chartHash, currentLiunian, currentDayun } = await loadChartContext(db, userId)
  const { model, promptVersion } = CHAPTER_MODEL_REGISTRY[slug]

  const mergedPerspectiveSeed = buildPerspectiveSeed({ perspectiveSeed, stylePreset, styleSeed })

  const isStatic = STATIC_CHAPTERS.has(slug)
  const contextHash = await computeContextHash({
    chartHash,
    slug,
    promptVersion,
    model,
    currentLiunian: isStatic ? undefined : currentLiunian,
    currentDayun: isStatic ? undefined : currentDayun,
    perspectiveSeed: mergedPerspectiveSeed,
  })

  const generated = await astroClient.post<unknown>(c.env.SVC_ASTRO, '/report/chapter', {
    slug,
    chartHash,
    contextHash,
    locale,
    explanationMode: 'plain' as const,
    perspectiveSeed: mergedPerspectiveSeed,
    stylePreset,
    styleSeed,
    isPro: await userHasCapability(c.get('db'), userId, 'fate'),
    user: {
      dayMasterStem: user.dayMasterStem,
      dayMasterStrength: user.dayMasterStrength,
      favorableElement: user.favorableElement,
      unfavorableElement: user.unfavorableElement,
      ziweiMingPalaceStar: user.ziweiMingPalaceStar,
      birthBranch: user.birthBranch,
    },
    // Raw birth inputs so svc-astro can rebuild the full Ba Zi + 紫微 chart
    // and supply rich facts to the chapter prompt (eliminates `[具体X]`
    // placeholder leak). Omitted when birth info missing — svc-astro falls
    // back to the thin static-traits block.
    birth:
      user.birthSolarDate && user.birthTimeIndex != null && user.birthGender
        ? {
            solarDate: user.birthSolarDate,
            timeIndex: user.birthTimeIndex,
            gender: user.birthGender as '男' | '女',
            longitude: user.birthLongitude != null ? Number(user.birthLongitude) : undefined,
            latitude: user.birthLatitude != null ? Number(user.birthLatitude) : undefined,
            timezoneId: user.birthTimezoneId ?? undefined,
            city: user.birthCity ?? undefined,
          }
        : undefined,
    timeContext: isStatic ? null : { liunian: currentLiunian, dayun: currentDayun },
  })

  const row = {
    id: crypto.randomUUID(),
    userId,
    chapter: slug,
    chartHash,
    contextHash,
    contentJson: JSON.stringify(generated),
    locale,
    explanationMode: 'plain',
    model,
    promptVersion,
    perspectiveSeed: mergedPerspectiveSeed ?? null,
    isCurrent: true,
    generatedAt: new Date().toISOString(),
  }
  await markCurrentAndInsert(
    db,
    reportChapters,
    and(
      eq(reportChapters.userId, userId),
      eq(reportChapters.chapter, slug),
      eq(reportChapters.isCurrent, true)
    )!,
    row
  )

  return rowToOut(row as unknown as typeof reportChapters.$inferSelect)
}

// ============================================================================
// Manifest
// ============================================================================

export const reportManifestRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')

  const isPro = await userHasCapability(db, userId, 'fate')
  const unlockedCount = await getUnlockedCount(db, userId)
  // Surface email-bound state + birth-edit quota so the client can pick
  // "bind email first" vs "send invite" in the unlock UI, and gate the Me-tab
  // edit affordance, without separate round-trips.
  const userMetaRow = await db
    .select({ email: users.email, birthEditUsed: users.birthEditUsed })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  const hasEmail = !!userMetaRow?.email
  const birthEditUsed = !!userMetaRow?.birthEditUsed

  const currentRows = await db.query.reportChapters.findMany({
    where: and(eq(reportChapters.userId, userId), eq(reportChapters.isCurrent, true)),
  })
  const versionsByChapter = new Map<ChapterSlug, number>()
  const allRows = await db
    .select({ chapter: reportChapters.chapter })
    .from(reportChapters)
    .where(eq(reportChapters.userId, userId))
  for (const r of allRows) {
    const k = r.chapter as ChapterSlug
    versionsByChapter.set(k, (versionsByChapter.get(k) ?? 0) + 1)
  }

  const chapters = CHAPTER_SLUGS.map((slug) => {
    const cur = currentRows.find((r) => r.chapter === slug)
    const generatedAt = cur?.generatedAt ?? null
    /** UTC minute bucket — client may collapse chapters generated in the same batch window. */
    const generationBatchId =
      generatedAt && generatedAt.length >= 16 ? generatedAt.slice(0, 16) : null
    const position = chapterUnlockPosition(slug)
    const accessible = isPro || isChapterUnlocked(slug, unlockedCount)
    return {
      slug,
      isStatic: STATIC_CHAPTERS.has(slug),
      /** 1-based position in the unlock order; null for Pro-only chapters. */
      unlockPosition: position,
      accessible,
      hasCurrent: !!cur,
      generatedAt,
      generationBatchId,
      model: cur?.model ?? CHAPTER_MODEL_REGISTRY[slug].model,
      promptVersion: cur?.promptVersion ?? CHAPTER_MODEL_REGISTRY[slug].promptVersion,
      versions: versionsByChapter.get(slug) ?? 0,
    }
  })

  // Best-effort background warm: any accessible chapter still missing gets
  // retried whenever the user opens the TOC. This covers free chapters that
  // failed during onboarding AND Pro chapters (ch4-6) that are never
  // pre-generated. Failures are logged but do not block the manifest response.
  const missing = chapters.filter((ch) => ch.accessible && !ch.hasCurrent)
  if (missing.length > 0) {
    c.executionCtx.waitUntil(
      Promise.allSettled(missing.map((ch) => generateChapter({ c, userId, slug: ch.slug }))).then(
        (results) => {
          for (const r of results) {
            if (r.status === 'rejected') {
              console.error('[report-manifest] background warm failed', r.reason)
            }
          }
        }
      )
    )
  }

  return c.json({
    isPro,
    /**
     * Invite-driven unlock state. The client renders progressive affordance
     * ("X / Y chapters unlocked — invite a friend for the next one") without
     * having to iterate `chapters[]`. Pro users see `unlockedChapterCount`
     * already equal to `chapterUnlockCap` because `accessible` bypasses the
     * cap, but the count itself reflects raw invite-redeem progress.
     */
    unlockedChapterCount: unlockedCount,
    chapterUnlockCap: CHAPTER_UNLOCK_CAP,
    /** True iff `users.email` is set — drives the "bind email first" UX gate. */
    hasEmail,
    /** True once the lifetime free birth-info correction has been consumed. */
    birthEditUsed,
    chapters,
  })
})

// ============================================================================
// Chapter (current + lazy regen)
// ============================================================================

/**
 * Self-heal a missing natal chart before a report read.
 *
 * The report reads `user_charts`; if that row is missing — a failed onboarding
 * bootstrap, or a destructive `rebuildUserCharts` that deleted then failed to
 * re-insert — `loadChartContext` 404s and the client falls back to a placeholder
 * forever (2026-06 device QA: the solo report "won't come out"). Rebuild the
 * skeleton (idempotent, LLM-free, from the user's stored birth info) so the read
 * proceeds. Mirrors the self-heal in GET /api/user/:id. No-op when a chart
 * already exists or the user has no birth info on file.
 */
async function ensureUserChart(c: Context<AppEnv>, userId: string): Promise<void> {
  const db = c.get('db')
  const existing = await db
    .select({ chartType: userCharts.chartType })
    .from(userCharts)
    .where(eq(userCharts.userId, userId))
    .limit(1)
  if (existing.length > 0) return

  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user?.birthSolarDate || user.birthTimeIndex == null || !user.birthGender) return

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
      language: user.locale ?? 'zh-CN',
    })
  } catch (err) {
    console.error('[report.chapter] chart-skeleton self-heal failed', userId, err)
  }
}

export const reportChapterRoutes = new Hono<AppEnv>()
  .get('/:slug', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const slugParse = slugSchema.safeParse(c.req.param('slug'))
    if (!slugParse.success) throw new HTTPException(400, { message: 'Invalid chapter slug' })
    const slug = slugParse.data

    const isPro = await userHasCapability(db, userId, 'fate')
    const unlockedCount = await getUnlockedCount(db, userId)
    assertChapterAccess(slug, unlockedCount, isPro)

    // Self-heal a missing natal chart so the read never dead-ends on a 404 →
    // client placeholder (2026-06 device QA, solo report "won't come out").
    await ensureUserChart(c, userId)

    const { chartHash, currentLiunian, currentDayun } = await loadChartContext(db, userId)
    const { model, promptVersion } = CHAPTER_MODEL_REGISTRY[slug]

    const isStatic = STATIC_CHAPTERS.has(slug)

    const expected = await computeContextHash({
      chartHash,
      slug,
      promptVersion,
      model,
      currentLiunian: isStatic ? undefined : currentLiunian,
      currentDayun: isStatic ? undefined : currentDayun,
    })

    const cur = await db.query.reportChapters.findFirst({
      where: and(
        eq(reportChapters.userId, userId),
        eq(reportChapters.chapter, slug),
        eq(reportChapters.isCurrent, true)
      ),
    })

    if (cur && cur.contextHash === expected) {
      return c.json(rowToOut(cur))
    }

    // Free tier: one onboarding-backed generation per chapter. If birth chart
    // identity drifted (new chartHash) but a current row exists, do not burn LLM —
    // user must subscribe Pro (client also gates birth-info edits).
    if (!(await userHasCapability(db, userId, 'fate')) && cur && cur.chartHash !== chartHash) {
      return c.json(
        {
          error:
            'Your birth chart changed after this chapter was generated. Regenerating requires HexAstral Pro.',
          code: 'REPORT_REGEN_REQUIRES_PRO',
        },
        403
      )
    }

    // Either no current row, or contextHash drifted (prompt/model bump,
    // year/dayun rollover) → lazy regen.
    const fresh = await generateChapter({ c, userId, slug })
    return c.json(fresh)
  })
  .get('/:slug/history', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const slugParse = slugSchema.safeParse(c.req.param('slug'))
    if (!slugParse.success) throw new HTTPException(400, { message: 'Invalid chapter slug' })
    const slug = slugParse.data

    if (!(await userHasCapability(db, userId, 'fate'))) {
      throw new HTTPException(403, { message: 'History drawer is Pro-only' })
    }
    // History view is Pro-only by design — pass cap + isPro=true to bypass.
    assertChapterAccess(slug, CHAPTER_UNLOCK_CAP, true)

    const rows = await db.query.reportChapters.findMany({
      where: and(eq(reportChapters.userId, userId), eq(reportChapters.chapter, slug)),
      orderBy: [desc(reportChapters.generatedAt)],
      limit: 20,
    })

    return c.json({ slug, items: rows.map(rowToOut) })
  })
  .post(
    '/:slug/reroll',
    zValidator(
      'json',
      z.object({
        perspectiveSeed: z.string().min(1).max(64).optional(),
        stylePreset: stylePresetSchema.optional(),
        styleSeed: z.string().min(1).max(64).optional(),
      })
    ),
    async (c) => {
      const userId = requireUserId(c)
      const db = c.get('db')
      const slugParse = slugSchema.safeParse(c.req.param('slug'))
      if (!slugParse.success) throw new HTTPException(400, { message: 'Invalid chapter slug' })
      const slug = slugParse.data

      if (!(await userHasCapability(db, userId, 'fate'))) {
        throw new HTTPException(403, { message: 'Re-roll is Pro-only' })
      }

      const { perspectiveSeed, stylePreset, styleSeed } = c.req.valid('json')
      const mergedPerspectiveSeed = buildPerspectiveSeed({
        perspectiveSeed,
        stylePreset,
        styleSeed,
      })
      if (!mergedPerspectiveSeed) {
        throw new HTTPException(400, { message: 'Perspective or style seed is required' })
      }

      // True monthly window: query the most recent re-roll (perspectiveSeed != null)
      // for this (user, chapter) and reject if within 30 days. Cloudflare RL is a
      // sliding-second window and can't express "1 per 30 days" naturally.
      const lastReroll = await db.query.reportChapters.findFirst({
        where: and(
          eq(reportChapters.userId, userId),
          eq(reportChapters.chapter, slug),
          isNotNull(reportChapters.perspectiveSeed)
        ),
        orderBy: [desc(reportChapters.generatedAt)],
      })
      if (lastReroll) {
        const lastMs = Date.parse(lastReroll.generatedAt)
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
        if (Number.isFinite(lastMs) && Date.now() - lastMs < thirtyDaysMs) {
          const nextEligibleAt = new Date(lastMs + thirtyDaysMs).toISOString()
          throw new HTTPException(429, {
            message: `Re-roll available once per chapter per month. Next available at ${nextEligibleAt}`,
          })
        }
      }

      const fresh = await generateChapter({
        c,
        userId,
        slug,
        perspectiveSeed,
        stylePreset,
        styleSeed,
      })
      return c.json(fresh)
    }
  )
