import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { faceoraclePushQueue, kindredPushQueue } from '../db/schema'
import type { AppDb } from '../infra-types'
import {
  replaceFaceoraclePushFuel,
  userIdsWithMonthEventCoverage,
} from './faceoracle-push-harvest'
import { expireKindredPushForBond, harvestKindredPushSnippets } from './kindred-push-harvest'
import { normalizePushLocale, pushLocalesEqual } from './push-locale'

function makePushDb(): AppDb {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE kindred_push_queue (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      bond_id text,
      source_reading_id text,
      locale text NOT NULL DEFAULT 'zh-CN',
      kind text NOT NULL DEFAULT 'conditional',
      trigger_kind text,
      fire_on text,
      title text NOT NULL,
      body text NOT NULL,
      source text NOT NULL DEFAULT 'report',
      status text NOT NULL DEFAULT 'queued',
      created_at text DEFAULT (datetime('now')),
      sent_at text
    );
    CREATE TABLE faceoracle_push_queue (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      source_reading_id text,
      locale text NOT NULL DEFAULT 'zh',
      fire_on text NOT NULL,
      local_hour integer NOT NULL DEFAULT 9,
      priority integer NOT NULL DEFAULT 0,
      kind text NOT NULL DEFAULT 'other',
      title text NOT NULL,
      body text NOT NULL,
      data_json text,
      expires_at text,
      status text NOT NULL DEFAULT 'queued',
      created_at text DEFAULT (datetime('now')),
      sent_at text
    );
  `)
  return drizzle(sqlite) as unknown as AppDb
}

describe('pushLocalesEqual / normalizePushLocale', () => {
  test('collapses zh variants to the same bucket', () => {
    expect(normalizePushLocale('zh')).toBe('zh-CN')
    expect(normalizePushLocale('zh-CN')).toBe('zh-CN')
    expect(normalizePushLocale('zh-Hans')).toBe('zh-CN')
    expect(pushLocalesEqual('zh', 'zh-CN')).toBe(true)
    expect(pushLocalesEqual('zh-TW', 'zh-Hant')).toBe(true)
    expect(pushLocalesEqual('zh-CN', 'zh-TW')).toBe(false)
    expect(pushLocalesEqual('en', 'en-US')).toBe(true)
    expect(pushLocalesEqual('en', 'ja')).toBe(false)
  })
})

describe('userIdsWithMonthEventCoverage', () => {
  test('covers month-start fireOn and startMonth in data', () => {
    const set = userIdsWithMonthEventCoverage(
      [
        {
          userId: 'u1',
          fireOn: '2026-07-01',
          dataJson: null,
          status: 'sent',
        },
        {
          userId: 'u2',
          fireOn: '2026-07-15',
          dataJson: '{"kind":"event","startMonth":"2026-07"}',
          status: 'queued',
        },
        {
          userId: 'u3',
          fireOn: '2026-07-20',
          dataJson: '{"kind":"rest"}',
          status: 'queued',
        },
        {
          userId: 'u4',
          fireOn: '2026-07-01',
          dataJson: null,
          status: 'expired',
        },
      ],
      '2026-07'
    )
    expect(set.has('u1')).toBe(true)
    expect(set.has('u2')).toBe(true)
    expect(set.has('u3')).toBe(false)
    expect(set.has('u4')).toBe(false)
  })
})

describe('replaceFaceoraclePushFuel', () => {
  let db: AppDb
  beforeEach(() => {
    db = makePushDb()
  })

  test('empty windows does not expire prior queued rows', async () => {
    await db.insert(faceoraclePushQueue).values({
      id: 'old-1',
      userId: 'u1',
      sourceReadingId: 'r0',
      locale: 'zh',
      fireOn: '2026-08-01',
      localHour: 9,
      priority: 40,
      kind: 'qi',
      title: '旧',
      body: '保留',
      status: 'queued',
    })
    const n = await replaceFaceoraclePushFuel(db, {
      userId: 'u1',
      sourceReadingId: 'r1',
      locale: 'zh',
      windows: [],
    })
    expect(n).toBe(0)
    const row = await db
      .select()
      .from(faceoraclePushQueue)
      .where(eq(faceoraclePushQueue.id, 'old-1'))
      .get()
    expect(row?.status).toBe('queued')
  })

  test('non-empty windows expires prior and inserts', async () => {
    await db.insert(faceoraclePushQueue).values({
      id: 'old-2',
      userId: 'u1',
      sourceReadingId: 'r0',
      locale: 'zh',
      fireOn: '2026-08-01',
      localHour: 9,
      priority: 40,
      kind: 'qi',
      title: '旧',
      body: '替换',
      status: 'queued',
    })
    const n = await replaceFaceoraclePushFuel(db, {
      userId: 'u1',
      sourceReadingId: 'r1',
      locale: 'zh',
      windows: [
        {
          fireOn: '2026-08-10',
          localHour: 21,
          priority: 80,
          kind: 'rest',
          title: '新',
          body: '养气',
        },
      ],
    })
    expect(n).toBe(1)
    const old = await db
      .select()
      .from(faceoraclePushQueue)
      .where(eq(faceoraclePushQueue.id, 'old-2'))
      .get()
    expect(old?.status).toBe('expired')
    const queued = await db
      .select()
      .from(faceoraclePushQueue)
      .where(
        and(eq(faceoraclePushQueue.userId, 'u1'), eq(faceoraclePushQueue.status, 'queued'))
      )
    expect(queued.length).toBe(1)
    expect(queued[0]?.title).toBe('新')
  })
})

describe('expireKindredPushForBond', () => {
  let db: AppDb
  beforeEach(() => {
    db = makePushDb()
  })

  test('expires only the target bond queued rows', async () => {
    await harvestKindredPushSnippets(db, {
      userId: 'u1',
      bondId: 'bond-a',
      sourceReadingId: 'r1',
      locale: 'zh-CN',
      snippets: [{ trigger: 'resonance', title: 'A', body: 'keep relation A' }],
    })
    await harvestKindredPushSnippets(db, {
      userId: 'u1',
      bondId: 'bond-b',
      sourceReadingId: 'r2',
      locale: 'zh-CN',
      snippets: [{ trigger: 'tension', title: 'B', body: 'keep relation B' }],
    })
    const n = await expireKindredPushForBond(db, 'bond-a')
    expect(n).toBe(1)
    const rows = await db.select().from(kindredPushQueue).where(eq(kindredPushQueue.userId, 'u1'))
    const byBond = Object.fromEntries(rows.map((r) => [r.bondId, r.status]))
    expect(byBond['bond-a']).toBe('expired')
    expect(byBond['bond-b']).toBe('queued')
  })
})
