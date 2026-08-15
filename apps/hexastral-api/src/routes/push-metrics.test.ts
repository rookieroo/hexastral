/**
 * Push metrics closed loop — delivery/open event tables.
 *
 * Exercises the exported helpers against the REAL schema in an in-memory SQLite
 * db (same harness as purge-user-account.test.ts), plus the pure render-level
 * assertions that `data.bk` / `data.v` match the rendered body.
 */

import { Database } from 'bun:sqlite'
import { beforeAll, describe, expect, test } from 'bun:test'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { count, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'
import {
  applyPushOutcomes,
  metricsDeviceKey,
  purgePushEvents,
  pushBodyKey,
  recordPushOpen,
  recordPushSend,
  renderAuspicePush,
} from './auspice'

describe('push metrics helpers against real SQLite schema', () => {
  let sqlite: Database
  let db: ReturnType<typeof drizzle<typeof schema>>

  beforeAll(async () => {
    const empty = await generateSQLiteDrizzleJson({})
    const target = await generateSQLiteDrizzleJson(schema)
    const ddl = await generateSQLiteMigration(empty, target)
    sqlite = new Database(':memory:')
    sqlite.run('PRAGMA foreign_keys = ON')
    for (const statement of ddl) sqlite.run(statement)
    db = drizzle(sqlite, { schema })
  })

  const sendCount = async (deviceId: string) =>
    (
      await db
        .select({ n: count() })
        .from(schema.auspicePushSends)
        .where(eq(schema.auspicePushSends.deviceId, metricsDeviceKey(deviceId)))
    )[0]?.n ?? 0
  const openCount = async (deviceId: string) =>
    (
      await db
        .select({ n: count() })
        .from(schema.auspicePushOpens)
        .where(eq(schema.auspicePushOpens.deviceId, metricsDeviceKey(deviceId)))
    )[0]?.n ?? 0

  test('recordPushSend is idempotent per (device, date, slot)', async () => {
    const args = {
      deviceId: 'device-a',
      slot: 'daily',
      date: '2026-06-12',
      bodyKey: 'bk-1',
      variant: '3:1:dayGod',
      locale: 'zh-Hans',
      isPro: false,
      timezoneId: 'Asia/Shanghai',
    }
    await recordPushSend(db, args)
    await recordPushSend(db, { ...args, bodyKey: 'bk-2' })
    expect(await sendCount('device-a')).toBe(1)
    const row = await db
      .select()
      .from(schema.auspicePushSends)
      .where(eq(schema.auspicePushSends.deviceId, metricsDeviceKey('device-a')))
    expect(row[0]?.bodyKey).toBe('bk-2') // upsert refreshed the render identity
    expect(row[0]?.status).toBe('sent')
    // De-identified at rest: the raw device id never lands in the metrics table.
    expect(row[0]?.deviceId).toBe(metricsDeviceKey('device-a'))
    expect(row[0]?.deviceId).not.toBe('device-a')
  })

  test('recordPushOpen dedupes the same notification id', async () => {
    const args = {
      deviceId: 'device-b',
      notificationId: 'notif-1',
      type: 'auspice_daily',
      day: '2026-06-12',
      bk: 'bk-1',
    }
    expect(await recordPushOpen(db, args)).toBe('recorded')
    expect(await recordPushOpen(db, args)).toBe('duplicate')
    expect(await openCount('device-b')).toBe(1)
  })

  test('recordPushOpen enforces the per-device daily cap', async () => {
    const deviceId = 'device-c'
    for (let i = 0; i < 20; i++) {
      const outcome = await recordPushOpen(db, {
        deviceId,
        notificationId: `notif-cap-${i}`,
        type: 'auspice_daily',
      })
      expect(outcome).toBe('recorded')
    }
    expect(
      await recordPushOpen(db, {
        deviceId,
        notificationId: 'notif-cap-over',
        type: 'auspice_daily',
      })
    ).toBe('daily_cap')
  })

  test('applyPushOutcomes backfills ticket + delivered status', async () => {
    await recordPushSend(db, {
      deviceId: 'device-d',
      slot: 'evening',
      date: '2026-06-12',
      locale: 'en',
      isPro: false,
      timezoneId: 'America/New_York',
    })
    await applyPushOutcomes(db, [
      {
        deviceId: 'device-d',
        date: '2026-06-12',
        slot: 'evening',
        ticketId: 'ticket-123',
        status: 'delivered',
      },
    ])
    const row = await db
      .select()
      .from(schema.auspicePushSends)
      .where(eq(schema.auspicePushSends.deviceId, metricsDeviceKey('device-d')))
    expect(row[0]?.status).toBe('delivered')
    expect(row[0]?.ticketId).toBe('ticket-123')
  })

  test('purgePushEvents only deletes rows older than the cutoff', async () => {
    const recent = new Date().toISOString()
    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
    await db.insert(schema.auspicePushOpens).values([
      {
        id: 'open-recent',
        deviceId: metricsDeviceKey('device-e'),
        notificationId: 'notif-recent',
        slot: 'daily',
        createdAt: recent,
      },
      {
        id: 'open-old',
        deviceId: metricsDeviceKey('device-e'),
        notificationId: 'notif-old',
        slot: 'daily',
        createdAt: old,
      },
    ])
    await db.insert(schema.auspicePushSends).values([
      {
        id: 'send-old',
        deviceId: metricsDeviceKey('device-e'),
        slot: 'daily',
        date: '2026-03-01',
        createdAt: old,
      },
    ])
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    await purgePushEvents(db, cutoff)
    const opens = await db
      .select()
      .from(schema.auspicePushOpens)
      .where(eq(schema.auspicePushOpens.deviceId, metricsDeviceKey('device-e')))
    expect(opens.map((r) => r.id)).toEqual(['open-recent'])
    const sends = await db.select().from(schema.auspicePushSends)
    expect(sends.some((r) => r.id === 'send-old')).toBe(false)
  })
})

describe('renderAuspicePush metrics plumbing', () => {
  const ymd = { year: 2026, month: 6, day: 12 }

  test('daily data carries bk (body hash) and v (variant tuple)', () => {
    const m = renderAuspicePush('morning', ymd, {
      locale: 'zh-Hans',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-zh',
    })
    expect(m).not.toBeNull()
    expect(m?.data.bk).toBe(pushBodyKey(m?.title ?? '', m?.body ?? ''))
    expect(m?.data.v).toMatch(/^[345]:[01]:(none|dayGod|pengZu|mansion)$/)
  })

  test('evening data carries bk and no v', () => {
    // Jun 19 2026 = 端午 → the event-driven evening fires.
    const m = renderAuspicePush(
      'evening',
      { year: 2026, month: 6, day: 19 },
      { locale: 'zh-Hans', birthDate: '1990-08-15', isPro: true, portfolioUserId: 'u' }
    )
    expect(m).not.toBeNull()
    expect(m?.data.bk).toBe(pushBodyKey(m?.title ?? '', m?.body ?? ''))
    expect(m?.data.v).toBeUndefined()
  })

  test('en signed-in hook path marks v=hook', () => {
    const m = renderAuspicePush('morning', ymd, {
      locale: 'en',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-en',
      portfolioUserId: 'user_test',
    })
    expect(m).not.toBeNull()
    expect(m?.data.v).toBe('hook')
    expect(m?.data.bk).toBe(pushBodyKey(m?.title ?? '', m?.body ?? ''))
  })
})
