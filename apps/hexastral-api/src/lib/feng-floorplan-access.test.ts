import { describe, expect, test } from 'bun:test'
import {
  assertUserOwnsFloorplanKeys,
  grantFloorplanKey,
  userCanReadFloorplanKey,
} from './feng-floorplan-access'

function mockKv(initial: Record<string, string[]> = {}) {
  const store = new Map<string, string[]>(Object.entries(initial))
  return {
    get: async (key: string, type?: string) => {
      if (type !== 'json') return null
      return store.get(key) ?? null
    },
    put: async (key: string, value: string) => {
      store.set(key, JSON.parse(value) as string[])
    },
  } as unknown as KVNamespace
}

const mockDb = {
  select: () => ({
    from: () => ({
      where: async () => [],
    }),
  }),
} as unknown as import('../infra-types').AppDb

describe('feng-floorplan-access', () => {
  test('grantFloorplanKey allows read via KV grant', async () => {
    const kv = mockKv()
    const userId = 'user-1'
    const key = 'floorplan/abc.jpg'
    await grantFloorplanKey(kv, userId, key)
    const ok = await userCanReadFloorplanKey({ GUARD_KV: kv }, mockDb, userId, key)
    expect(ok).toBe(true)
  })

  test('assertUserOwnsFloorplanKeys rejects foreign key', async () => {
    const kv = mockKv()
    const userId = 'user-1'
    const ownedKey = 'floorplan/owned.jpg'
    const foreignKey = 'floorplan/other.jpg'
    await grantFloorplanKey(kv, userId, ownedKey)
    const result = await assertUserOwnsFloorplanKeys(
      { GUARD_KV: kv },
      mockDb,
      userId,
      [ownedKey, foreignKey]
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.key).toBe(foreignKey)
  })

  test('assertUserOwnsFloorplanKeys passes all owned keys', async () => {
    const kv = mockKv()
    const userId = 'user-1'
    const keys = ['floorplan/a.jpg', 'floorplan/b.jpg']
    for (const key of keys) {
      await grantFloorplanKey(kv, userId, key)
    }
    const result = await assertUserOwnsFloorplanKeys({ GUARD_KV: kv }, mockDb, userId, keys)
    expect(result).toEqual({ ok: true })
  })
})
