/**
 * 面相/手相特征提取路由 — 隐私优先架构 (ADR-0028)
 *
 * 职责边界:
 *   hexastral-api (本文件):  D1 存储 / 用户状态更新 / VLM content-hash 缓存
 *   svc-astro:               Gemini Vision 结构化特征提取
 *
 * 流程:
 *   iOS 直传 base64 → hash lookup → (miss) svc-astro VLM → D1 存储特征 JSON
 *   原图仅存于请求内存，提取完成后自动回收，不经 R2
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { physiognomyEvents, userPhysiognomyFeatures, users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { userHasAnySubscription } from '../../lib/access/entitlement-access'
import { requireUserId } from '../../lib/auth'
import { BIOMETRIC_CONSENT_VERSION, hasBiometricConsent } from '../../lib/biometric-consent'
import {
  computeFaceoracleVlmContentHash,
  decodeImageBase64,
  FACEORACLE_VLM_MODEL,
  FACEORACLE_VLM_SCHEMA_VERSION,
  type FaceoracleFeatureType,
} from '../../lib/faceoracle-vlm-cache'
import { assessFaceoracleFeatureQuality } from '../../lib/faceoracle-feature-quality'
import { astroClient } from '../../lib/service-clients'
import {
  checkAndConsumePhysiognomyUpload,
  getFaceoracleQuotaBundle,
} from '../../services/quota'

const featureTypeSchema = z.enum(['face', 'palm', 'palm_l', 'palm_r'])

const fromBase64Schema = z.object({
  userId: z.string().min(1),
  imageBase64: z.string().min(1).max(20_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/heic', 'image/webp']).default('image/jpeg'),
  privacyConsentVersion: z.string().default('v1'),
  type: featureTypeSchema.default('face'),
})

function parseFeaturesJson(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>
    }
  } catch {
    // ignore
  }
  return {}
}

function assertFeatureQuality(
  type: FaceoracleFeatureType,
  features: Record<string, string>
): void {
  const q = assessFaceoracleFeatureQuality(type, features)
  if (q.ok) return
  throw new HTTPException(422, {
    message: `${q.code}:${q.detail}`,
  })
}

function extractionPathFor(type: z.infer<typeof featureTypeSchema>): string {
  return type === 'face' ? '/physiognomy/extract-features' : '/physiognomy/extract-palm-features'
}


type Db = AppEnv['Variables']['db']

async function setActiveFeaturePointer(
  db: Db,
  userId: string,
  type: FaceoracleFeatureType,
  featureId: string
): Promise<void> {
  const now = new Date().toISOString()
  if (type === 'face') {
    await db
      .update(users)
      .set({ activePhysiognomyId: featureId, updatedAt: now })
      .where(eq(users.id, userId))
  } else if (type === 'palm_l' || type === 'palm') {
    await db
      .update(users)
      .set({
        activePalmLeftFeatureId: featureId,
        activePalmFeatureId: featureId,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  } else if (type === 'palm_r') {
    await db
      .update(users)
      .set({ activePalmRightFeatureId: featureId, updatedAt: now })
      .where(eq(users.id, userId))
  }
}

async function lookupCachedFeature(
  db: Db,
  opts: {
    userId: string
    type: FaceoracleFeatureType
    contentHash: string
  }
) {
  return db
    .select({
      id: userPhysiognomyFeatures.id,
      featuresJson: userPhysiognomyFeatures.featuresJson,
      extractionModel: userPhysiognomyFeatures.extractionModel,
    })
    .from(userPhysiognomyFeatures)
    .where(
      and(
        eq(userPhysiognomyFeatures.userId, opts.userId),
        eq(userPhysiognomyFeatures.type, opts.type),
        eq(userPhysiognomyFeatures.contentHash, opts.contentHash),
        eq(userPhysiognomyFeatures.schemaVersion, FACEORACLE_VLM_SCHEMA_VERSION)
      )
    )
    .get()
}

export const faceFeaturesRoutes = new Hono<AppEnv>()

  /**
   * POST /face-features/from-base64
   * Mobile 直传 base64 → content-hash cache → (miss) svc-astro VLM
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

    let imageBytes: Uint8Array
    try {
      imageBytes = decodeImageBase64(input.imageBase64)
    } catch {
      throw new HTTPException(400, { message: 'invalid_image_base64' })
    }
    if (imageBytes.byteLength === 0) {
      throw new HTTPException(400, { message: 'empty_image' })
    }

    const contentHash = await computeFaceoracleVlmContentHash({
      imageBytes,
      type: input.type,
    })

    const cached = await lookupCachedFeature(db, {
      userId: input.userId,
      type: input.type,
      contentHash,
    })
    if (cached) {
      const features = parseFeaturesJson(cached.featuresJson)
      const q = assessFaceoracleFeatureQuality(input.type, features)
      if (q.ok) {
        await setActiveFeaturePointer(db, input.userId, input.type, cached.id)
        console.info('[faceoracle.vlm] cache_hit', {
          userId: input.userId,
          type: input.type,
          featureId: cached.id,
        })
        return c.json({
          featureId: cached.id,
          type: input.type,
          imageDeleted: true,
          features,
          cached: true,
          model: cached.extractionModel,
        })
      }
      // Stale thin / mismatched cache — drop so a retake can re-extract.
      console.warn('[faceoracle.vlm] cache_quality_reject', {
        userId: input.userId,
        type: input.type,
        featureId: cached.id,
        code: q.code,
        detail: q.detail,
      })
      await db
        .delete(userPhysiognomyFeatures)
        .where(eq(userPhysiognomyFeatures.id, cached.id))
    }

    // Miss — meter free upload only when we will call VLM.
    const isPro = await userHasAnySubscription(db, input.userId)
    if (!isPro) {
      const { granted } = await checkAndConsumePhysiognomyUpload(db, input.userId)
      if (!granted) {
        throw new HTTPException(403, { message: 'not_pro' })
      }
    }

    let data: { features: Record<string, string>; model?: string }
    try {
      data = await astroClient.postVision<{ features: Record<string, string>; model?: string }>(
        c.env.SVC_ASTRO,
        extractionPathFor(input.type),
        { imageBase64: input.imageBase64, mimeType: input.mimeType }
      )
    } catch (err) {
      if (err instanceof HTTPException) throw err
      const msg = err instanceof Error ? err.message : 'VLM extraction failed'
      throw new HTTPException(502, { message: msg })
    }
    const features = data.features
    const winningModel =
      typeof data.model === 'string' && data.model.length > 0 ? data.model : FACEORACLE_VLM_MODEL
    assertFeatureQuality(input.type, features)

    const featureId = nanoid()
    const now = new Date().toISOString()
    try {
      await db.insert(userPhysiognomyFeatures).values({
        id: featureId,
        userId: input.userId,
        type: input.type,
        featuresJson: JSON.stringify(features),
        vlmNarrative: features.overallAssessment ?? null,
        extractionModel: winningModel,
        contentHash,
        schemaVersion: FACEORACLE_VLM_SCHEMA_VERSION,
        imageDeleted: true,
        privacyConsentVersion: input.privacyConsentVersion,
        createdAt: now,
        updatedAt: now,
      })
    } catch (err) {
      // Race: another request inserted the same content hash — reuse that row.
      console.warn('[faceoracle.vlm] insert_race', err)
      const raced = await lookupCachedFeature(db, {
        userId: input.userId,
        type: input.type,
        contentHash,
      })
      if (raced) {
        let racedFeatures: Record<string, string> = features
        try {
          const parsed: unknown = JSON.parse(raced.featuresJson)
          if (parsed && typeof parsed === 'object') {
            racedFeatures = parsed as Record<string, string>
          }
        } catch {
          // keep VLM features
        }
        assertFeatureQuality(input.type, racedFeatures)
        await setActiveFeaturePointer(db, input.userId, input.type, raced.id)
        return c.json({
          featureId: raced.id,
          type: input.type,
          imageDeleted: true,
          features: racedFeatures,
          cached: true,
          model: raced.extractionModel,
        })
      }
      throw err
    }

    await setActiveFeaturePointer(db, input.userId, input.type, featureId)
    console.info('[faceoracle.vlm] cache_miss', {
      userId: input.userId,
      type: input.type,
      featureId,
      model: winningModel,
    })

    return c.json({
      featureId,
      type: input.type,
      imageDeleted: true,
      features,
      cached: false,
      model: winningModel,
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

  /** GET /face-features/quota — Pro photo + report-regen usage this UTC month */
  .get('/quota', async (c) => {
    const userId = requireUserId(c)
    const bundle = await getFaceoracleQuotaBundle(c.get('db'), userId)
    return c.json({
      // Backward-compatible flat photo fields
      used: bundle.photos.used,
      limit: bundle.photos.limit,
      remaining: bundle.photos.remaining,
      photos: bundle.photos,
      reports: bundle.reports,
    })
  })
