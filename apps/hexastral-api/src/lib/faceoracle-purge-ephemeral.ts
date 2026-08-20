/**
 * Delete pending ephemeral face/palm objects for a user (consent revoke / account purge).
 */

import { and, eq, inArray } from 'drizzle-orm'
import { faceoracleJobs } from '../db/schema'
import type { AppDb, CloudflareBindings } from '../infra-types'
import {
  deleteEphemeralObjects,
  ephemeralKeyList,
  parseEphemeralKeysJson,
} from './faceoracle-ephemeral-keys'

const ACTIVE = ['extracting', 'queued', 'interpreting'] as const

export async function purgeUserEphemeralFacePhotos(
  env: CloudflareBindings,
  db: AppDb,
  userId: string
): Promise<void> {
  const bucket = env.FACE_EPHEMERAL_BUCKET
  if (!bucket) return

  const rows = await db
    .select({
      id: faceoracleJobs.id,
      ephemeralKeysJson: faceoracleJobs.ephemeralKeysJson,
    })
    .from(faceoracleJobs)
    .where(
      and(eq(faceoracleJobs.userId, userId), inArray(faceoracleJobs.stage, [...ACTIVE]))
    )

  const allKeys: string[] = []
  for (const row of rows) {
    const keys = parseEphemeralKeysJson(row.ephemeralKeysJson)
    if (keys) allKeys.push(...ephemeralKeyList(keys))
  }
  if (allKeys.length > 0) {
    await deleteEphemeralObjects(bucket, allKeys)
  }
  if (rows.length > 0) {
    await db
      .update(faceoracleJobs)
      .set({ ephemeralKeysJson: null })
      .where(
        and(eq(faceoracleJobs.userId, userId), inArray(faceoracleJobs.stage, [...ACTIVE]))
      )
  }
}
