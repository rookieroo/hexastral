/**
 * Track user-owned floorplan R2 keys (upload session + site-bound) for GET authorization.
 */

import { and, eq, isNull } from 'drizzle-orm'
import type { AppDb } from '../infra-types'
import { fengSites } from '../db/schema'
import { collectFloorplanKeys } from './feng-interior-compute'

const KV_PREFIX = 'feng:fp:'
const MAX_KEYS = 24
const TTL_SECONDS = 7 * 86_400

export async function grantFloorplanKey(
  kv: KVNamespace,
  userId: string,
  key: string
): Promise<void> {
  const storeKey = `${KV_PREFIX}${userId}`
  const existing = (await kv.get<string[]>(storeKey, 'json')) ?? []
  const next = [...existing.filter((k) => k !== key), key].slice(-MAX_KEYS)
  await kv.put(storeKey, JSON.stringify(next), { expirationTtl: TTL_SECONDS })
}

export async function userHasFloorplanGrant(
  kv: KVNamespace,
  userId: string,
  key: string
): Promise<boolean> {
  const existing = (await kv.get<string[]>(`${KV_PREFIX}${userId}`, 'json')) ?? []
  return existing.includes(key)
}

export async function userSiteOwnsFloorplanKey(
  db: AppDb,
  userId: string,
  key: string
): Promise<boolean> {
  const rows = await db
    .select({ floorplanKey: fengSites.floorplanKey, floorplanJson: fengSites.floorplanJson })
    .from(fengSites)
    .where(and(eq(fengSites.userId, userId), isNull(fengSites.deletedAt)))
  for (const row of rows) {
    if (collectFloorplanKeys(row).includes(key)) return true
  }
  return false
}

export async function userCanReadFloorplanKey(
  env: { GUARD_KV: KVNamespace },
  db: AppDb,
  userId: string,
  key: string
): Promise<boolean> {
  if (await userHasFloorplanGrant(env.GUARD_KV, userId, key)) return true
  return userSiteOwnsFloorplanKey(db, userId, key)
}

export async function assertUserOwnsFloorplanKeys(
  env: { GUARD_KV: KVNamespace },
  db: AppDb,
  userId: string,
  keys: string[]
): Promise<{ ok: true } | { ok: false; key: string }> {
  for (const key of keys) {
    const allowed = await userCanReadFloorplanKey(env, db, userId, key)
    if (!allowed) return { ok: false, key }
  }
  return { ok: true }
}
