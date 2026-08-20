/**
 * Ephemeral R2 keys for Syel early-quit upload → queue extract.
 * Keys never enter portfolio_readings.resultJson.
 */

import { z } from 'zod/v4'

export const FACEORACLE_EPHEMERAL_PREFIX = 'faceoracle'
/** Soft app ceiling before lifecycle backstop (R2 expire is days-granular). */
export const FACEORACLE_EPHEMERAL_TTL_MS = 60 * 60 * 1000

export const ephemeralPartSchema = z.enum(['palm_l', 'palm_r', 'face'])
export type EphemeralPart = z.infer<typeof ephemeralPartSchema>

export const ephemeralKeysSchema = z
  .object({
    palm_l: z.string().min(1).optional(),
    palm_r: z.string().min(1).optional(),
    face: z.string().min(1).optional(),
    batchId: z.string().min(1).optional(),
  })
  .refine((o) => Boolean(o.palm_l || o.palm_r || o.face), {
    message: 'at_least_one_ephemeral_key',
  })

export type EphemeralKeys = z.infer<typeof ephemeralKeysSchema>

export function parseEphemeralKeysJson(raw: string | null | undefined): EphemeralKeys | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const r = ephemeralKeysSchema.safeParse(parsed)
    return r.success ? r.data : null
  } catch {
    return null
  }
}

export function ephemeralKeyList(keys: EphemeralKeys): string[] {
  return [keys.palm_l, keys.palm_r, keys.face].filter(
    (k): k is string => typeof k === 'string' && k.length > 0
  )
}

/** Keys must be under faceoracle/{userId}/… */
export function ephemeralKeyOwnedByUser(key: string, userId: string): boolean {
  const prefix = `${FACEORACLE_EPHEMERAL_PREFIX}/${userId}/`
  return key.startsWith(prefix) && !key.includes('..')
}

export function buildEphemeralObjectKey(
  userId: string,
  batchId: string,
  part: EphemeralPart
): string {
  return `${FACEORACLE_EPHEMERAL_PREFIX}/${userId}/${batchId}/${part}.jpg`
}

export async function deleteEphemeralObjects(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  const uniq = [...new Set(keys.filter(Boolean))]
  await Promise.all(
    uniq.map(async (key) => {
      try {
        await bucket.delete(key)
      } catch (err) {
        console.warn('[faceoracle.ephemeral] delete_failed', { key, err })
      }
    })
  )
}
