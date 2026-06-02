/**
 * 双人合盘路由 — PRD v2.5 裂变核心
 *
 * POST /          — 合盘计算 + AI 解读
 * GET  /history   — 合盘历史
 * GET  /:id       — 单条详情
 * PATCH /:id/bookmark — 收藏
 * PATCH /:id/rating   — 评分
 */

import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { pairReadings, userBonds, userPhysiognomyFeatures, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { userHasCapability } from '../../lib/access/entitlement-access'
import { callAstro } from '../../lib/astro-client'
import { requireUserId } from '../../lib/auth'
import { logEvent } from '../../lib/event-log'
import { solarDateSchema } from '../../lib/validation'
import { checkChartGuard, recordChartSuccess } from '../../services/shared/divination-guard'

const personSchema = z.object({
  solarDate: solarDateSchema,
  timeIndex: z.int().min(0).max(12),
  gender: z.enum(['男', '女']),
  name: z.string().optional(),
})

const HEHUN_RELATIONSHIP_CATEGORIES = [
  'spouse',
  'partner',
  'parent',
  'child',
  'sibling',
  'friend',
  'colleague',
  'boss',
] as const

const pairInputSchema = z.object({
  personA: personSchema,
  personB: personSchema,
  userId: z.string().min(1),
  language: z.string().optional().default('zh-CN'),
  requestId: z.string().min(1),
  relationshipCategory: z.enum(HEHUN_RELATIONSHIP_CATEGORIES).optional(),
  customRelationshipLabel: z.string().max(30).optional(),
})

const bookmarkSchema = z.object({ bookmarked: z.boolean() })
const ratingSchema = z.object({ rating: z.int().min(1).max(5) })

/** POST / — 合盘计算 + AI 解读 */
export const pairRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const body = await c.req.json()
    const input = pairInputSchema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    const user = await db.select().from(users).where(eq(users.id, input.userId)).get()
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const isPro = await userHasCapability(db, input.userId, 'kindred')

    // Fetch current user's physiognomy features (if available) to cross-reference with pair reading
    let physiognomyFeaturesJsonA: string | null = null
    if (user.activePhysiognomyId) {
      const physio = await db
        .select({ featuresJson: userPhysiognomyFeatures.featuresJson })
        .from(userPhysiognomyFeatures)
        .where(eq(userPhysiognomyFeatures.id, user.activePhysiognomyId))
        .get()
      physiognomyFeaturesJsonA = physio?.featuresJson ?? null
    }

    // ── 永久去重：同一用户已有相同组合的合盘记录则返回 409 ────────────────────
    // 双向查询: A+B 和 B+A 均视为重复
    const existingReading = await db
      .select({ id: pairReadings.id })
      .from(pairReadings)
      .where(
        and(
          eq(pairReadings.userId, input.userId),
          or(
            and(
              eq(pairReadings.personASolarDate, input.personA.solarDate),
              eq(pairReadings.personATimeIndex, input.personA.timeIndex),
              eq(pairReadings.personBSolarDate, input.personB.solarDate),
              eq(pairReadings.personBTimeIndex, input.personB.timeIndex)
            ),
            and(
              eq(pairReadings.personASolarDate, input.personB.solarDate),
              eq(pairReadings.personATimeIndex, input.personB.timeIndex),
              eq(pairReadings.personBSolarDate, input.personA.solarDate),
              eq(pairReadings.personBTimeIndex, input.personA.timeIndex)
            )
          )
        )
      )
      .get()

    if (existingReading) {
      return c.json(
        {
          error: 'pair_already_exists',
          existingReadingId: existingReading.id,
          canPurchaseForecast: true,
        },
        409
      )
    }

    // Guard: 防止相同配对 24h 内重复算（防误触）
    const guardKey = [
      input.personA.solarDate,
      input.personA.timeIndex,
      input.personB.solarDate,
      input.personB.timeIndex,
    ].join(':')
    const chartGuard = await checkChartGuard(
      'pair',
      { pair: guardKey },
      input.userId,
      c.env.GUARD_KV
    )
    if (!chartGuard.allowed) {
      return c.json(
        { error: 'guard_blocked', guardKey: chartGuard.guardKey, reason: chartGuard.reason },
        429
      )
    }

    if (!isPro) throw new HTTPException(403, { message: 'pro_required' })

    // 1. 合婚计算 + AI 解读
    const { result, interpretation } = await callAstro<{
      result: {
        compatibility: Record<string, unknown>
        personA: Record<string, unknown>
        personB: Record<string, unknown>
      }
      interpretation: Record<string, string>
    }>(c.env.SVC_ASTRO, '/pair/compute', {
      ...input,
      isPro,
      language: input.language,
      personA: { ...input.personA, physiognomyFeaturesJson: physiognomyFeaturesJsonA },
    })

    // 3. 保存记录（含关系原型字段）
    const readingId = crypto.randomUUID()
    await db.insert(pairReadings).values({
      id: readingId,
      userId: input.userId,
      personASolarDate: input.personA.solarDate,
      personATimeIndex: input.personA.timeIndex,
      personAGender: input.personA.gender,
      personAName: input.personA.name ?? null,
      personBSolarDate: input.personB.solarDate,
      personBTimeIndex: input.personB.timeIndex,
      personBGender: input.personB.gender,
      personBName: input.personB.name ?? null,
      score: result.compatibility.score as number,
      grade: result.compatibility.grade as string,
      archetypeName: interpretation.archetypeName ?? null,
      archetypeTagline: interpretation.archetypeTagline ?? null,
      archetypeCategory:
        (interpretation.archetypeCategory as
          | 'harmony'
          | 'tension'
          | 'growth'
          | 'karmic'
          | 'volatile'
          | undefined) ?? null,
      hookDimension:
        (interpretation.hookDimension as
          | 'long_term'
          | 'communication'
          | 'attraction'
          | 'emotional'
          | undefined) ?? null,
      relationshipCategory: input.relationshipCategory ?? null,
      customRelationshipLabel: input.customRelationshipLabel ?? null,
      compatibilityData: JSON.stringify(result.compatibility),
      interpretation: JSON.stringify(interpretation),
      createdAt: new Date().toISOString(),
    })

    // 4. 更新用户统计
    await db
      .update(users)
      .set({
        totalReadings: (user.totalReadings ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, input.userId))

    c.executionCtx.waitUntil(
      Promise.all([
        recordChartSuccess('pair', { pair: guardKey }, input.userId, c.env.GUARD_KV),
        logEvent(db, input.userId, 'reading_pair', { readingId }),
      ])
    )

    return c.json({
      id: readingId,
      compatibility: {
        score: result.compatibility.score,
        grade: result.compatibility.grade,
        gradeLabel: result.compatibility.gradeLabel,
        dimensions: result.compatibility.dimensions,
        highlights: result.compatibility.highlights,
        warnings: result.compatibility.warnings,
        summary: result.compatibility.summary,
      },
      personA: result.personA,
      personB: result.personB,
      interpretation,
      disclaimer: 'reading_disclaimer',
      meta: { isPro },
      createdAt: new Date().toISOString(),
    })
  })

  /** GET /history — 合盘历史 */
  .get('/history', async (c) => {
    const userId = requireUserId(c)
    const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 100)

    const db = c.get('db')
    const records = await db
      .select({
        id: pairReadings.id,
        personAName: pairReadings.personAName,
        personBName: pairReadings.personBName,
        personASolarDate: pairReadings.personASolarDate,
        personBSolarDate: pairReadings.personBSolarDate,
        score: pairReadings.score,
        grade: pairReadings.grade,
        bookmarked: pairReadings.bookmarked,
        createdAt: pairReadings.createdAt,
      })
      .from(pairReadings)
      .where(eq(pairReadings.userId, userId))
      .orderBy(desc(pairReadings.createdAt))
      .limit(limit)

    return c.json({ records })
  })

  /** GET /:id — 单条详情 */
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const db = c.get('db')

    const record = await db.select().from(pairReadings).where(eq(pairReadings.id, id)).get()

    if (!record) {
      throw new HTTPException(404, { message: 'Pair reading not found' })
    }

    const userId = requireUserId(c)
    if (record.userId !== userId) {
      // A-pays-B-reads: allow B to view a reading that A paid for,
      // as long as A has an active resonance bond to B referencing this reading.
      const sharedBond = await db
        .select({ id: userBonds.id })
        .from(userBonds)
        .where(
          and(
            eq(userBonds.ownerId, record.userId),
            eq(userBonds.targetUserId, userId),
            eq(userBonds.hehunReadingId, id),
            eq(userBonds.status, 'active')
          )
        )
        .get()
      if (!sharedBond) throw new HTTPException(403, { message: 'Forbidden' })
    }

    return c.json({
      id: record.id,
      compatibility: JSON.parse(record.compatibilityData),
      interpretation: JSON.parse(record.interpretation),
      personA: {
        solarDate: record.personASolarDate,
        timeIndex: record.personATimeIndex,
        gender: record.personAGender,
        name: record.personAName,
      },
      personB: {
        solarDate: record.personBSolarDate,
        timeIndex: record.personBTimeIndex,
        gender: record.personBGender,
        name: record.personBName,
      },
      score: record.score,
      grade: record.grade,
      archetypeName: record.archetypeName,
      archetypeTagline: record.archetypeTagline,
      archetypeCategory: record.archetypeCategory,
      hookDimension: record.hookDimension,
      relationshipCategory: record.relationshipCategory,
      customRelationshipLabel: record.customRelationshipLabel,
      bookmarked: record.bookmarked,
      rating: record.rating,
      createdAt: record.createdAt,
    })
  })

  /** PATCH /:id/bookmark — 收藏/取消收藏 */
  .patch('/:id/bookmark', zValidator('json', bookmarkSchema), async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const { bookmarked } = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: pairReadings.userId })
      .from(pairReadings)
      .where(eq(pairReadings.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.update(pairReadings).set({ bookmarked }).where(eq(pairReadings.id, id))
    return c.json({ success: true, bookmarked })
  })

  /** PATCH /:id/rating — 评分 */
  .patch('/:id/rating', zValidator('json', ratingSchema), async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const { rating } = c.req.valid('json')
    const db = c.get('db')

    const record = await db
      .select({ userId: pairReadings.userId })
      .from(pairReadings)
      .where(eq(pairReadings.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    await db.update(pairReadings).set({ rating }).where(eq(pairReadings.id, id))
    return c.json({ success: true, rating })
  })

  /** DELETE /:id — remove own pair reading (blocked if referenced by a Cosmic Bond) */
  .delete('/:id', async (c) => {
    const userId = requireUserId(c)
    const id = c.req.param('id')
    const db = c.get('db')

    const record = await db
      .select({ userId: pairReadings.userId })
      .from(pairReadings)
      .where(eq(pairReadings.id, id))
      .get()
    if (!record) throw new HTTPException(404, { message: 'Reading not found' })
    if (record.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

    const linkedBond = await db
      .select({ id: userBonds.id })
      .from(userBonds)
      .where(
        and(
          eq(userBonds.hehunReadingId, id),
          inArray(userBonds.status, ['active', 'pending_invite'])
        )
      )
      .get()
    if (linkedBond) {
      throw new HTTPException(409, {
        message: 'Pair reading is linked to a Cosmic Bond. Remove the bond first.',
      })
    }

    await db.delete(pairReadings).where(eq(pairReadings.id, id))
    return c.json({ ok: true })
  })
