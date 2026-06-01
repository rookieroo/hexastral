/**
 * 面相/手相特征提取路由 — 隐私优先架构
 *
 * 职责边界:
 *   hexastral-api (本文件):  D1 存储 / 用户状态更新
 *   svc-astro:               @google/genai Gemini 3.1 Pro Vision 结构化特征提取
 *
 * 流程:
 *   iOS 直传 base64 → hexastral-api → svc-astro VLM → D1 存储
 *   原图仅存于请求内存，提取完成后自动回收，不经 R2，隐私更优
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { userPhysiognomyFeatures, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { userHasAnySubscription } from '../../lib/access/entitlement-access'
import { requireUserId } from '../../lib/auth'
import { astroClient } from '../../lib/service-clients'
import { checkAndConsumePhysiognomyUpload } from '../../services/quota'

// ── Schema ──────────────────────────────────────────────────────────────────

const fromBase64Schema = z.object({
  userId: z.string().min(1),
  imageBase64: z.string().min(1).max(20_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/heic', 'image/webp']).default('image/jpeg'),
  privacyConsentVersion: z.string().default('v1'),
  type: z.enum(['face', 'palm']).default('face'),
})

// ── 路由 ─────────────────────────────────────────────────────────────────────

export const faceFeaturesRoutes = new Hono<AppEnv>()

  /**
   * POST /face-features/from-base64
   * Mobile 直传 base64 → svc-astro VLM 提取（不经 R2，隐私更优）
   * 原图仅存于请求内存，提取完成后自动回收
   */
  .post('/from-base64', async (c) => {
    const body = await c.req.json()
    const input = fromBase64Schema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    // Subscribers upload freely; others capped at physiognomyMonthly/month
    const isPro = await userHasAnySubscription(db, input.userId)
    if (!isPro) {
      const { granted } = await checkAndConsumePhysiognomyUpload(db, input.userId)
      if (!granted) {
        throw new HTTPException(403, { message: 'not_pro' })
      }
    }

    // 委托 svc-astro: Gemini 3.1 Pro Vision 结构化特征提取
    const extractionPath =
      input.type === 'palm' ? '/physiognomy/extract-palm-features' : '/physiognomy/extract-features'
    let data: { features: Record<string, string> }
    try {
      data = await astroClient.post<{ features: Record<string, string> }>(
        c.env.SVC_ASTRO,
        extractionPath,
        { imageBase64: input.imageBase64, mimeType: input.mimeType }
      )
    } catch {
      throw new HTTPException(502, { message: 'VLM extraction failed' })
    }
    const features = data.features

    const featureId = nanoid()
    await db.insert(userPhysiognomyFeatures).values({
      id: featureId,
      userId: input.userId,
      type: input.type,
      featuresJson: JSON.stringify(features),
      vlmNarrative: features.overallAssessment ?? null,
      extractionModel: 'gemini-3.1-pro-preview',
      imageDeleted: true,
      privacyConsentVersion: input.privacyConsentVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const updateField =
      input.type === 'palm'
        ? { activePalmFeatureId: featureId }
        : { activePhysiognomyId: featureId }
    await db
      .update(users)
      .set({ ...updateField, updatedAt: new Date().toISOString() })
      .where(eq(users.id, input.userId))

    return c.json({
      featureId,
      imageDeleted: true,
    })
  })

  /**
   * GET /face-features/current
   * 获取用户当前激活的面相特征摘要
   */
  .get('/current', async (c) => {
    const userId = requireUserId(c)

    const db = c.get('db')

    const user = await db
      .select({ activePhysiognomyId: users.activePhysiognomyId })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) throw new HTTPException(404, { message: 'User not found' })
    if (!user.activePhysiognomyId) return c.json({ hasPhysiognomy: false })

    const feature = await db
      .select({
        id: userPhysiognomyFeatures.id,
        vlmNarrative: userPhysiognomyFeatures.vlmNarrative,
        extractionModel: userPhysiognomyFeatures.extractionModel,
        createdAt: userPhysiognomyFeatures.createdAt,
      })
      .from(userPhysiognomyFeatures)
      .where(eq(userPhysiognomyFeatures.id, user.activePhysiognomyId))
      .get()

    return c.json({ hasPhysiognomy: true, feature })
  })

  /**
   * GET /face-features/palm-current
   * 获取用户当前激活的手相特征摘要
   */
  .get('/palm-current', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const user = await db
      .select({ activePalmFeatureId: users.activePalmFeatureId })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) throw new HTTPException(404, { message: 'User not found' })
    if (!user.activePalmFeatureId) return c.json({ hasPalm: false })

    const feature = await db
      .select({
        id: userPhysiognomyFeatures.id,
        vlmNarrative: userPhysiognomyFeatures.vlmNarrative,
        extractionModel: userPhysiognomyFeatures.extractionModel,
        createdAt: userPhysiognomyFeatures.createdAt,
      })
      .from(userPhysiognomyFeatures)
      .where(eq(userPhysiognomyFeatures.id, user.activePalmFeatureId))
      .get()

    return c.json({ hasPalm: true, feature })
  })
