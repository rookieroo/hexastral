/**
 * Shared VLM extract from image bytes — used by sync from-base64 and queue R2 path.
 * Content-hash cache in D1; never persists the image.
 */

import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { userPhysiognomyFeatures, users } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import { assessFaceoracleFeatureQuality } from './faceoracle-feature-quality'
import { parseLandmarksJson } from './faceoracle-landmarks'
import {
  computeFaceoracleVlmContentHash,
  FACEORACLE_VLM_MODEL,
  FACEORACLE_VLM_SCHEMA_VERSION,
  type FaceoracleFeatureType,
} from './faceoracle-vlm-cache'
import { astroClient } from './service-clients'

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

function extractionPathFor(type: FaceoracleFeatureType): string {
  return type === 'face' ? '/physiognomy/extract-features' : '/physiognomy/extract-palm-features'
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function setActiveFeaturePointer(
  db: AppDb,
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
  db: AppDb,
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
      landmarksJson: userPhysiognomyFeatures.landmarksJson,
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

export type ExtractFromBytesResult = {
  featureId: string
  features: Record<string, string>
  landmarks: ReturnType<typeof parseLandmarksJson>
  cached: boolean
  model: string | null
}

export class FaceoracleExtractError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number = 502
  ) {
    super(message)
    this.name = 'FaceoracleExtractError'
  }
}

/**
 * Extract features from raw image bytes (cache hit or svc-astro VLM).
 * Does not meter free-upload quota — caller decides billing at job enqueue.
 */
export async function extractFaceoracleFeaturesFromBytes(
  env: CloudflareBindings,
  db: AppDb,
  opts: {
    userId: string
    type: FaceoracleFeatureType
    imageBytes: Uint8Array
    mimeType: 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp'
    privacyConsentVersion: string
  }
): Promise<ExtractFromBytesResult> {
  if (opts.imageBytes.byteLength === 0) {
    throw new FaceoracleExtractError('empty_image', 400)
  }

  const contentHash = await computeFaceoracleVlmContentHash({
    imageBytes: opts.imageBytes,
    type: opts.type,
  })

  const cached = await lookupCachedFeature(db, {
    userId: opts.userId,
    type: opts.type,
    contentHash,
  })
  if (cached) {
    const features = parseFeaturesJson(cached.featuresJson)
    const q = assessFaceoracleFeatureQuality(opts.type, features)
    if (q.ok) {
      await setActiveFeaturePointer(db, opts.userId, opts.type, cached.id)
      console.info('[faceoracle.vlm] cache_hit', {
        userId: opts.userId,
        type: opts.type,
        featureId: cached.id,
      })
      return {
        featureId: cached.id,
        features,
        landmarks: cached.landmarksJson
          ? parseLandmarksJson(JSON.parse(cached.landmarksJson) as unknown)
          : {},
        cached: true,
        model: cached.extractionModel,
      }
    }
    console.warn('[faceoracle.vlm] cache_quality_reject', {
      userId: opts.userId,
      type: opts.type,
      featureId: cached.id,
      code: q.code,
      detail: q.detail,
    })
    await db.delete(userPhysiognomyFeatures).where(eq(userPhysiognomyFeatures.id, cached.id))
  }

  let data: {
    features: Record<string, string>
    landmarks?: Record<string, { x: number; y: number }>
    model?: string
  }
  try {
    data = await astroClient.postVision<{
      features: Record<string, string>
      landmarks?: Record<string, { x: number; y: number }>
      model?: string
    }>(env.SVC_ASTRO, extractionPathFor(opts.type), {
      imageBase64: bytesToBase64(opts.imageBytes),
      mimeType: opts.mimeType,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'VLM extraction failed'
    throw new FaceoracleExtractError(msg, 502)
  }

  const features = data.features
  const landmarks = parseLandmarksJson(data.landmarks ?? {})
  const winningModel =
    typeof data.model === 'string' && data.model.length > 0 ? data.model : FACEORACLE_VLM_MODEL
  const q = assessFaceoracleFeatureQuality(opts.type, features)
  if (!q.ok) {
    throw new FaceoracleExtractError(`${q.code}:${q.detail}`, 422)
  }

  const featureId = nanoid()
  if (opts.type === 'face' && Object.keys(landmarks).length === 0) {
    console.warn('[faceoracle.vlm] landmarks_empty', {
      userId: opts.userId,
      type: opts.type,
      featureId,
      model: winningModel,
    })
  }
  const now = new Date().toISOString()
  try {
    await db.insert(userPhysiognomyFeatures).values({
      id: featureId,
      userId: opts.userId,
      type: opts.type,
      featuresJson: JSON.stringify(features),
      landmarksJson: JSON.stringify(landmarks),
      vlmNarrative: features.overallAssessment ?? null,
      extractionModel: winningModel,
      contentHash,
      schemaVersion: FACEORACLE_VLM_SCHEMA_VERSION,
      imageDeleted: true,
      privacyConsentVersion: opts.privacyConsentVersion,
      createdAt: now,
      updatedAt: now,
    })
  } catch (err) {
    console.warn('[faceoracle.vlm] insert_race', err)
    const raced = await lookupCachedFeature(db, {
      userId: opts.userId,
      type: opts.type,
      contentHash,
    })
    if (raced) {
      const racedFeatures = parseFeaturesJson(raced.featuresJson)
      const rq = assessFaceoracleFeatureQuality(opts.type, racedFeatures)
      if (!rq.ok) {
        throw new FaceoracleExtractError(`${rq.code}:${rq.detail}`, 422)
      }
      await setActiveFeaturePointer(db, opts.userId, opts.type, raced.id)
      return {
        featureId: raced.id,
        features: racedFeatures,
        landmarks: raced.landmarksJson
          ? parseLandmarksJson(JSON.parse(raced.landmarksJson) as unknown)
          : {},
        cached: true,
        model: raced.extractionModel,
      }
    }
    throw err
  }

  await setActiveFeaturePointer(db, opts.userId, opts.type, featureId)
  console.info('[faceoracle.vlm] cache_miss', {
    userId: opts.userId,
    type: opts.type,
    featureId,
    model: winningModel,
  })

  return {
    featureId,
    features,
    landmarks,
    cached: false,
    model: winningModel,
  }
}
