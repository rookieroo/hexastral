/**
 * Account deletion is a one-shot D1 transaction against a schema whose foreign
 * keys are all `ON DELETE no action`, so a single mis-ordered or missing DELETE
 * rolls the whole purge back and the user sees "Delete failed".
 *
 * Two guards here:
 *   1. Graph check — walk every FK in `db/schema.ts` and assert each RESTRICT
 *      child is purged strictly before its parent. Catches new tables.
 *   2. Execution check — build the real schema in SQLite with foreign keys ON,
 *      seed a fully-entangled account (chat, bonds, invites, credits, device
 *      rows, a second user), then run the compiled plan in one transaction.
 */

import { Database } from 'bun:sqlite'
import { beforeAll, describe, expect, test } from 'bun:test'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { getTableName, is, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { getTableConfig, SQLiteSyncDialect, SQLiteTable } from 'drizzle-orm/sqlite-core'
import * as schema from '../db/schema'
import { PURGE_STEPS, type PurgeScope } from './purge-user-account'

const dialect = new SQLiteSyncDialect()

const stepOrder = new Map<string, number>()
PURGE_STEPS.forEach((step, i) => {
  const name = getTableName(step.table)
  if (!stepOrder.has(name)) stepOrder.set(name, i)
})

describe('purge plan vs schema FK graph', () => {
  test('every RESTRICT child is purged before its parent', () => {
    const violations: string[] = []

    for (const value of Object.values(schema)) {
      if (!is(value, SQLiteTable)) continue
      const child = getTableName(value)
      const childIdx = stepOrder.get(child)

      for (const fk of getTableConfig(value).foreignKeys) {
        if (fk.onDelete === 'cascade' || fk.onDelete === 'set null') continue
        const parent = getTableName(fk.reference().foreignTable)
        const parentIdx = stepOrder.get(parent)
        if (parentIdx === undefined) continue

        if (childIdx === undefined) {
          violations.push(`${child} references purged ${parent} but is never purged`)
        } else if (childIdx > parentIdx) {
          violations.push(`${child} is purged after its parent ${parent}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test('users is the last step', () => {
    const last = PURGE_STEPS[PURGE_STEPS.length - 1]
    expect(last && getTableName(last.table)).toBe('users')
  })

  test('no step deletes a table twice', () => {
    const names = PURGE_STEPS.map((s) => getTableName(s.table))
    expect(names.length).toBe(new Set(names).size)
  })
})

const DELETED = 'user_deleted'
const KEEPER = 'user_keeper'
const DEVICE = 'device-1'

describe('purge execution against real SQLite schema', () => {
  let sqlite: Database

  beforeAll(async () => {
    const empty = await generateSQLiteDrizzleJson({})
    const target = await generateSQLiteDrizzleJson(schema)
    const ddl = await generateSQLiteMigration(empty, target)

    sqlite = new Database(':memory:')
    sqlite.run('PRAGMA foreign_keys = ON')
    for (const statement of ddl) sqlite.run(statement)

    const db = drizzle(sqlite, { schema })
    const now = new Date().toISOString()

    await db.insert(schema.users).values([
      { id: DELETED, createdAt: now, updatedAt: now },
      { id: KEEPER, createdAt: now, updatedAt: now },
    ])

    await db.insert(schema.conversations).values({
      id: 'conv-1',
      userId: DELETED,
      readingType: 'natal',
      readingId: 'reading-1',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(schema.conversationMessages).values({
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'hello',
      createdAt: now,
    })

    await db.insert(schema.pairReadings).values({
      id: 'pair-1',
      userId: DELETED,
      personASolarDate: '1990-01-01',
      personATimeIndex: 0,
      personAGender: 'male',
      personBSolarDate: '1992-02-02',
      personBTimeIndex: 1,
      personBGender: 'female',
      score: 80,
      grade: 'A',
      compatibilityData: '{}',
      interpretation: 'x',
      createdAt: now,
    })

    // Own bond points at the pair reading; the keeper's bond points at the
    // deleted user, so both sides must be resolved before `users` drops.
    await db.insert(schema.userBonds).values([
      {
        id: 'bond-own',
        ownerId: DELETED,
        targetName: 'friend',
        relationshipLabel: 'friend',
        hehunReadingId: 'pair-1',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'bond-keeper',
        ownerId: KEEPER,
        targetUserId: DELETED,
        targetName: 'deleted one',
        relationshipLabel: 'friend',
        createdAt: now,
        updatedAt: now,
      },
    ])

    // Invite lineage: one sent by the deleted user, one sent by the keeper on a
    // bond that disappears with the account. Credits hang off both.
    await db.insert(schema.bondInvitations).values([
      {
        id: 'invite-sent',
        bondId: 'bond-own',
        inviterUserId: DELETED,
        targetEmail: 'a@example.com',
        token: 'token-a',
        createdAt: now,
        expiresAt: now,
      },
      {
        id: 'invite-received',
        bondId: 'bond-keeper',
        inviterUserId: KEEPER,
        targetEmail: 'b@example.com',
        token: 'token-b',
        createdAt: now,
        expiresAt: now,
      },
    ])
    await db.insert(schema.bondInviteCredits).values([
      {
        id: 'credit-keeper',
        userId: KEEPER,
        inviteId: 'invite-sent',
        earnedFrom: 'invite_received',
        createdAt: now,
      },
      {
        id: 'credit-own',
        userId: DELETED,
        inviteId: 'invite-received',
        earnedFrom: 'invite_sent',
        createdAt: now,
      },
    ])

    // Device-scoped Auspice rows linked to the account.
    await db.insert(schema.auspicePushSubs).values({
      deviceId: DEVICE,
      token: 'ExponentPushToken[x]',
      timezoneId: 'Asia/Shanghai',
      portfolioUserId: DELETED,
      lastActiveAt: now,
      createdAt: now,
    })
    await db.insert(schema.birthdayReminders).values({
      owner: `device:${DEVICE}`,
      id: 'person-1',
      name: 'mom',
      solarDate: '1965-05-05',
      createdAt: now,
    })
  })

  test('runs to completion and leaves no trace of the account', () => {
    const scope: PurgeScope = {
      userId: DELETED,
      auspiceOwners: [`user:${DELETED}`, `device:${DEVICE}`],
      conversationIds: ['conv-1'],
      bondIds: ['bond-own', 'bond-keeper'],
      bondInvitationIds: ['invite-sent', 'invite-received'],
      pairReadingIds: ['pair-1'],
    }

    sqlite.run('BEGIN')
    for (const step of PURGE_STEPS) {
      const predicate = step.where(scope)
      expect(predicate).toBeDefined()
      const query = dialect.sqlToQuery(sql`delete from ${step.table} where ${predicate}`)
      sqlite.prepare(query.sql).run(...query.params)
    }
    sqlite.run('COMMIT')

    const count = (table: string, where: string) =>
      sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number }

    expect(count('users', `id = '${DELETED}'`).n).toBe(0)
    expect(count('users', `id = '${KEEPER}'`).n).toBe(1)
    expect(count('conversation_messages', '1 = 1').n).toBe(0)
    expect(count('conversations', '1 = 1').n).toBe(0)
    expect(count('pair_readings', '1 = 1').n).toBe(0)
    expect(count('user_bonds', '1 = 1').n).toBe(0)
    expect(count('bond_invitations', '1 = 1').n).toBe(0)
    expect(count('bond_invite_credits', '1 = 1').n).toBe(0)
    expect(count('auspice_push_subs', '1 = 1').n).toBe(0)
    expect(count('birthday_reminders', '1 = 1').n).toBe(0)
  })
})

describe('purge without push subscription (client deviceId)', () => {
  test('device-scoped rows are erased when deviceId is supplied', async () => {
    const empty = await generateSQLiteDrizzleJson({})
    const target = await generateSQLiteDrizzleJson(schema)
    const ddl = await generateSQLiteMigration(empty, target)

    const mem = new Database(':memory:')
    mem.run('PRAGMA foreign_keys = ON')
    for (const statement of ddl) mem.run(statement)

    const db = drizzle(mem, { schema })
    const now = new Date().toISOString()
    const orphanDevice = 'orphan-device'

    await db.insert(schema.users).values({ id: 'orphan_user', createdAt: now, updatedAt: now })
    // No auspice_push_subs row — the pre-fix path that left birthday/make-if behind.
    await db.insert(schema.birthdayReminders).values({
      owner: `device:${orphanDevice}`,
      id: 'person-orphan',
      name: 'dad',
      solarDate: '1960-01-01',
      createdAt: now,
    })
    await db.insert(schema.makeifForks).values({
      owner: `device:${orphanDevice}`,
      id: 'fork-1',
      birthDate: '1990-01-01',
      birthHour: 0,
      gender: 'male',
      event: 'career',
      label: 'x',
      divergeAtAge: 25,
      isPast: false,
      narrative: 'n',
      locale: 'en',
      createdAt: now,
    })

    const scope: PurgeScope = {
      userId: 'orphan_user',
      // Mirrors resolvePurgeScope when opts.deviceId is set and push subs are empty.
      auspiceOwners: ['user:orphan_user', `device:${orphanDevice}`],
      conversationIds: [],
      bondIds: [],
      bondInvitationIds: [],
      pairReadingIds: [],
    }

    mem.run('BEGIN')
    for (const step of PURGE_STEPS) {
      const predicate = step.where(scope)
      expect(predicate).toBeDefined()
      const query = dialect.sqlToQuery(sql`delete from ${step.table} where ${predicate}`)
      mem.prepare(query.sql).run(...query.params)
    }
    mem.run('COMMIT')

    const count = (table: string) =>
      (mem.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n

    expect(count('users')).toBe(0)
    expect(count('birthday_reminders')).toBe(0)
    expect(count('makeif_forks')).toBe(0)
  })
})
