/**
 * Ephemeral face/palm JPEG upload for Syel early-quit.
 * Objects live in FACE_EPHEMERAL_BUCKET until queue extract deletes them
 * (or R2 lifecycle backstop / consent revoke).
 */

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod/v4'
import { users } from '../../db/schema'
import type { AppEnv } from '../../infra-types'
import { requireUserId } from '../../lib/auth'
import { BIOMETRIC_CONSENT_VERSION, hasBiometricConsent } from '../../lib/biometric-consent'
import {
  buildEphemeralObjectKey,
  ephemeralKeyOwnedByUser,
  ephemeralPartSchema,
  FACEORACLE_EPHEMERAL_TTL_MS,
  type EphemeralPart,
} from '../../lib/faceoracle-ephemeral-keys'
import { decodeImageBase64 } from '../../lib/faceoracle-vlm-cache'

const MAX_BYTES = 8 * 1024 * 1024

const uploadSchema = z.object({
  batchId: z.string().min(8).max(48).optional(),
  photos: z
    .array(
      z.object({
        part: ephemeralPartSchema,
        imageBase64: z.string().min(1).max(20_000_000),
        mimeType: z.literal('image/jpeg').default('image/jpeg'),
      })
    )
    .min(1)
    .max(3),
})

export const physiognomyEphemeralPhotosRoutes = new Hono<AppEnv>()

/**
 * POST /api/physiognomy/ephemeral-photos
 * Upload up to 3 JPEGs (palm_l / palm_r / face). Returns R2 keys + expiresAt.
 */
physiognomyEphemeralPhotosRoutes.post('/', async (c) => {
  const userId = requireUserId(c)
  const db = c.get('db')
  const body = uploadSchema.parse(await c.req.json())

  if (!(await hasBiometricConsent(db, userId))) {
    return c.json(
      { error: 'biometric_consent_required', consentVersion: BIOMETRIC_CONSENT_VERSION },
      403
    )
  }

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get()
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const bucket = c.env.FACE_EPHEMERAL_BUCKET
  if (!bucket) {
    throw new HTTPException(503, { message: 'ephemeral_bucket_unavailable' })
  }

  const batchId = body.batchId ?? nanoid()
  const seen = new Set<EphemeralPart>()
  const keys: Partial<Record<EphemeralPart, string>> = {}

  for (const photo of body.photos) {
    if (seen.has(photo.part)) {
      throw new HTTPException(400, { message: `duplicate_part:${photo.part}` })
    }
    seen.add(photo.part)

    let imageBytes: Uint8Array
    try {
      imageBytes = decodeImageBase64(photo.imageBase64)
    } catch {
      throw new HTTPException(400, { message: 'invalid_image_base64' })
    }
    if (imageBytes.byteLength === 0) {
      throw new HTTPException(400, { message: 'empty_image' })
    }
    if (imageBytes.byteLength > MAX_BYTES) {
      throw new HTTPException(413, { message: 'image_too_large' })
    }

    const key = buildEphemeralObjectKey(userId, batchId, photo.part)
    if (!ephemeralKeyOwnedByUser(key, userId)) {
      throw new HTTPException(400, { message: 'invalid_key' })
    }

    await bucket.put(key, imageBytes, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: {
        userId,
        part: photo.part,
        batchId,
        uploadedAt: new Date().toISOString(),
      },
    })
    keys[photo.part] = key
  }

  const expiresAt = new Date(Date.now() + FACEORACLE_EPHEMERAL_TTL_MS).toISOString()
  console.info('[faceoracle.ephemeral] uploaded', {
    userId,
    batchId,
    parts: [...seen],
  })

  return c.json({
    batchId,
    keys,
    expiresAt,
    ttlSeconds: Math.floor(FACEORACLE_EPHEMERAL_TTL_MS / 1000),
  })
})
