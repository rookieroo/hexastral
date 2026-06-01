import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import type { AppDb } from '../../infra-types'
import {
  getCreditBalance,
  grantPurchasedCredits,
  setMonthlyAllowance,
} from '../../services/credits'
import {
  decideEpisodicQuota,
  EPISODIC_FREE_READINGS_PER_MONTH,
  resolveEpisodicAccess,
} from './episodic'

function makeDb(): AppDb {
  const sqlite = new Database(':memory:')
  sqlite.exec(`CREATE TABLE user_credits (
    user_id text NOT NULL,
    credit_type text NOT NULL,
    source text NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    period_key text,
    created_at text NOT NULL DEFAULT '',
    updated_at text NOT NULL DEFAULT '',
    PRIMARY KEY(user_id, credit_type, source)
  );`)
  return drizzle(sqlite) as unknown as AppDb
}

const U = 'user-1'

describe('resolveEpisodicAccess', () => {
  let db: AppDb
  beforeEach(() => {
    db = makeDb()
  })

  it('grants from a purchased pack and decrements the balance', async () => {
    await grantPurchasedCredits(db, U, 'face', 2)
    const r = await resolveEpisodicAccess(db, U, 'face')
    expect(r).toEqual({ granted: true, via: 'purchased' })
    expect(await getCreditBalance(db, U, 'face')).toBe(1)
  })

  it('spends the universe allowance before purchased credits', async () => {
    await setMonthlyAllowance(db, U, 'face', 1, '2026-05')
    await grantPurchasedCredits(db, U, 'face', 1)
    expect((await resolveEpisodicAccess(db, U, 'face')).valueOf()).toMatchObject({
      granted: true,
      via: 'allowance',
    })
    expect((await resolveEpisodicAccess(db, U, 'face')).valueOf()).toMatchObject({
      granted: true,
      via: 'purchased',
    })
  })

  it('denies with the right upsell product when no credits remain', async () => {
    const r = await resolveEpisodicAccess(db, U, 'face')
    expect(r).toEqual({
      granted: false,
      reason: 'purchase_required',
      upsellProductId: 'faceoracle_reading',
    })
  })

  it('uses the per-app upsell product for each episodic type', async () => {
    expect((await resolveEpisodicAccess(db, U, 'dream')).valueOf()).toMatchObject({
      upsellProductId: 'dream_pack_10',
    })
    expect((await resolveEpisodicAccess(db, U, 'numerology')).valueOf()).toMatchObject({
      upsellProductId: 'numerology_pack_10',
    })
  })
})

describe('decideEpisodicQuota', () => {
  const FREE = EPISODIC_FREE_READINGS_PER_MONTH

  it('is free within the monthly allowance regardless of balance', () => {
    expect(decideEpisodicQuota(0, FREE, 0)).toBe('free')
    expect(decideEpisodicQuota(FREE - 1, FREE, 0)).toBe('free')
  })

  it('requires a credit once the free allowance is used and one is available', () => {
    expect(decideEpisodicQuota(FREE, FREE, 1)).toBe('credit')
    expect(decideEpisodicQuota(FREE + 5, FREE, 10)).toBe('credit')
  })

  it('paywalls when the free allowance is used and no credit remains', () => {
    expect(decideEpisodicQuota(FREE, FREE, 0)).toBe('paywall')
  })
})
