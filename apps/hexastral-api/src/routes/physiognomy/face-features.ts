/**
 * 面相/手相特征提取路由 — 隐私优先架构 (ADR-0028)
 *
 * 职责边界:
 *   hexastral-api (本文件):  D1 存储 / 用户状态更新
 *   svc-astro:               Gemini Vision 结构化特征提取
 *
 * 流程:
 *   iOS 直传 base64 → hexastral-api → svc-astro VLM → D1 存储特征 JSON
 *   原图仅存于请求内存，提取完成后自动回收，不经 R2
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { physiognomyEvents, userPhysiognomyFeatures, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { userHasAnySubscription } from '../../lib/access/entitlement-access'
import { requireUserId } from '../../lib/auth'
import { BIOMETRIC_CONSENT_VERSION, hasBiometricConsent } from '../../lib/biometric-consent'
import { astroClient } from '../../lib/service-clients'
import {
  checkAndConsumePhysiognomyUpload,
  getFaceoraclePhotoSlotUsage,
} from '../../services/quota'

const featureTypeSchema = z.enum(['face', 'palm', 'palm_l', 'palm_r'])

const fromBase64Schema = z.object({
  userId: z.string().min(1),
  imageBase64: z.string().min(1).max(20_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/heic', 'image/webp']).default('image/jpeg'),
  privacyConsentVersion: z.string().default('v1'),
  type: featureTypeSchema.default('face'),
})

function extractionPathFor(type: z.infer<typeof featureTypeSchema>): string {
  return type === 'face' ? '/physiognomy/extract-features' : '/physiognomy/extract-palm-features'
}

export const faceFeaturesRoutes = new Hono<AppEnv>()

  /**
   * POST /face-features/from-base64
   * Mobile 直传 base64 → svc-astro VLM 提取（不经 R2）
   */
  .post('/from-base64', async (c) => {
    const body = await c.req.json()
    const input = fromBase64Schema.parse(body)
    input.userId = requireUserId(c)
    const db = c.get('db')

    if (!(await hasBiometricConsent(db, input.userId))) {
      return c.json(
        { error: 'biometric_consent_required', consentVersion: BIOMETRIC_CONSENT_VERSION },
        403
      )
    }

    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .get()
    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const isPro = await userHasAnySubscription(db, input.userId)
    if (!isPro) {
      const { granted } = await checkAndConsumePhysiognomyUpload(db, input.userId)
      if (!granted) {
        throw new HTTPException(403, { message: 'not_pro' })
      }
    }

    let data: { features: Record<string, string> }
    try {
      data = await astroClient.post<{ features: Record<string, string> }>(
        c.env.SVC_ASTRO,
        extractionPathFor(input.type),
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

    const now = new Date().toISOString()
    if (input.type === 'face') {
      await db
        .update(users)
        .set({ activePhysiognomyId: featureId, updatedAt: now })
        .where(eq(users.id, input.userId))
    } else if (input.type === 'palm_l' || input.type === 'palm') {
      await db
        .update(users)
        .set({
          activePalmLeftFeatureId: featureId,
          activePalmFeatureId: featureId,
          updatedAt: now,
        })
        .where(eq(users.id, input.userId))
    } else if (input.type === 'palm_r') {
      await db
        .update(users)
        .set({ activePalmRightFeatureId: featureId, updatedAt: now })
        .where(eq(users.id, input.userId))
    }

    return c.json({
      featureId,
      type: input.type,
      imageDeleted: true,
      features,
    })
  })

  /**
   * GET /face-features/current — face summary
   */
  .get('/current', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const user = await db
      .select({
        activePhysiognomyId: users.activePhysiognomyId,
        activePalmLeftFeatureId: users.activePalmLeftFeatureId,
        activePalmRightFeatureId: users.activePalmRightFeatureId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) throw new HTTPException(404, { message: 'User not found' })

    const load = async (id: string | null) => {
      if (!id) return null
      return db
        .select({
          id: userPhysiognomyFeatures.id,
          type: userPhysiognomyFeatures.type,
          vlmNarrative: userPhysiognomyFeatures.vlmNarrative,
          extractionModel: userPhysiognomyFeatures.extractionModel,
          createdAt: userPhysiognomyFeatures.createdAt,
        })
        .from(userPhysiognomyFeatures)
        .where(eq(userPhysiognomyFeatures.id, id))
        .get()
    }

    const face = await load(user.activePhysiognomyId)
    const palmLeft = await load(user.activePalmLeftFeatureId)
    const palmRight = await load(user.activePalmRightFeatureId)

    return c.json({
      hasPhysiognomy: Boolean(face),
      hasBaseline: Boolean(face && palmLeft && palmRight),
      face,
      palmLeft,
      palmRight,
      feature: face,
    })
  })

  /**
   * GET /face-features/palm-current — legacy single-palm summary
   */
  .get('/palm-current', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const user = await db
      .select({
        activePalmFeatureId: users.activePalmFeatureId,
        activePalmLeftFeatureId: users.activePalmLeftFeatureId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!user) throw new HTTPException(404, { message: 'User not found' })
    const palmId = user.activePalmLeftFeatureId ?? user.activePalmFeatureId
    if (!palmId) return c.json({ hasPalm: false })

    const feature = await db
      .select({
        id: userPhysiognomyFeatures.id,
        vlmNarrative: userPhysiognomyFeatures.vlmNarrative,
        extractionModel: userPhysiognomyFeatures.extractionModel,
        createdAt: userPhysiognomyFeatures.createdAt,
      })
      .from(userPhysiognomyFeatures)
      .where(eq(userPhysiognomyFeatures.id, palmId))
      .get()

    return c.json({ hasPalm: true, feature })
  })

  /** GET /face-features/events — active forward event table for push */
  .get('/events', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')
    const row = await db
      .select()
      .from(physiognomyEvents)
      .where(eq(physiognomyEvents.userId, userId))
      .get()
    if (!row) return c.json({ hasEvents: false, events: [] })
    let events: unknown[] = []
    try {
      const parsed: unknown = JSON.parse(row.eventsJson)
      events = Array.isArray(parsed) ? parsed : []
    } catch {
      events = []
    }
    return c.json({
      hasEvents: true,
      readingId: row.readingId,
      horizonMonths: row.horizonMonths,
      events,
      updatedAt: row.updatedAt,
    })
  })

  /** GET /face-features/quota — Pro photo-slot usage this UTC month */
  .get('/quota', async (c) => {
    const userId = requireUserId(c)
    const usage = await getFaceoraclePhotoSlotUsage(c.get('db'), userId)
    return c.json(usage)
  })
