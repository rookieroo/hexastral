import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import type { AppDb } from '../infra-types'
import {
  clearAllowance,
  consumeCredit,
  getCreditBalance,
  grantPurchasedCredits,
  refundCredit,
  setMonthlyAllowance,
} from './credits'

// In-memory SQLite mirror of the user_credits table (migrations/0002).
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

describe('credit ledger', () => {
  let db: AppDb
  beforeEach(() => {
    db = makeDb()
  })

  it('grants and accumulates purchased credits', async () => {
    expect(await getCreditBalance(db, U, 'face')).toBe(0)
    await grantPurchasedCredits(db, U, 'face', 3)
    expect(await getCreditBalance(db, U, 'face')).toBe(3)
    await grantPurchasedCredits(db, U, 'face', 2)
    expect(await getCreditBalance(db, U, 'face')).toBe(5)
  })

  it('consumes allowance before purchased, then reports empty', async () => {
    await setMonthlyAllowance(db, U, 'feng', 2, '2026-05')
    await grantPurchasedCredits(db, U, 'feng', 3)
    expect(await getCreditBalance(db, U, 'feng')).toBe(5)

    // First two spends draw from the allowance.
    expect(await consumeCredit(db, U, 'feng')).toEqual({ success: true, source: 'allowance' })
    expect(await consumeCredit(db, U, 'feng')).toEqual({ success: true, source: 'allowance' })
    // Next three from purchased.
    expect((await consumeCredit(db, U, 'feng')).source).toBe('purchased')
    expect((await consumeCredit(db, U, 'feng')).source).toBe('purchased')
    expect((await consumeCredit(db, U, 'feng')).source).toBe('purchased')
    expect(await getCreditBalance(db, U, 'feng')).toBe(0)
    // Exhausted.
    expect(await consumeCredit(db, U, 'feng')).toEqual({ success: false })
  })

  it('never over-spends below zero', async () => {
    await grantPurchasedCredits(db, U, 'coincast', 1)
    expect((await consumeCredit(db, U, 'coincast')).success).toBe(true)
    expect((await consumeCredit(db, U, 'coincast')).success).toBe(false)
    expect(await getCreditBalance(db, U, 'coincast')).toBe(0)
  })

  it('resets the allowance on a new period but is idempotent within one', async () => {
    await setMonthlyAllowance(db, U, 'face', 5, '2026-05')
    await consumeCredit(db, U, 'face')
    await consumeCredit(db, U, 'face')
    expect(await getCreditBalance(db, U, 'face')).toBe(3)

    // Same period re-grant (duplicate webhook) must NOT refund.
    await setMonthlyAllowance(db, U, 'face', 5, '2026-05')
    expect(await getCreditBalance(db, U, 'face')).toBe(3)

    // New period resets to the fresh allowance.
    await setMonthlyAllowance(db, U, 'face', 5, '2026-06')
    expect(await getCreditBalance(db, U, 'face')).toBe(5)
  })

  it('clearAllowance zeroes allowance but keeps purchased credits', async () => {
    await setMonthlyAllowance(db, U, 'dream', 4, '2026-05')
    await grantPurchasedCredits(db, U, 'dream', 2)
    expect(await getCreditBalance(db, U, 'dream')).toBe(6)

    await clearAllowance(db, U)
    expect(await getCreditBalance(db, U, 'dream')).toBe(2)
    expect((await consumeCredit(db, U, 'dream')).source).toBe('purchased')
  })

  it('isolates balances by creditType and user', async () => {
    await grantPurchasedCredits(db, U, 'face', 3)
    await grantPurchasedCredits(db, U, 'feng', 1)
    await grantPurchasedCredits(db, 'user-2', 'face', 9)

    expect(await getCreditBalance(db, U, 'face')).toBe(3)
    expect(await getCreditBalance(db, U, 'feng')).toBe(1)
    expect(await getCreditBalance(db, 'user-2', 'face')).toBe(9)

    await consumeCredit(db, U, 'face')
    expect(await getCreditBalance(db, U, 'face')).toBe(2)
    expect(await getCreditBalance(db, U, 'feng')).toBe(1) // untouched
    expect(await getCreditBalance(db, 'user-2', 'face')).toBe(9) // untouched
  })

  it('refundCredit restores a consumed purchased credit to its source', async () => {
    await grantPurchasedCredits(db, U, 'face', 1)
    expect(await consumeCredit(db, U, 'face')).toEqual({ success: true, source: 'purchased' })
    expect(await getCreditBalance(db, U, 'face')).toBe(0)

    await refundCredit(db, U, 'face', 'purchased')
    expect(await getCreditBalance(db, U, 'face')).toBe(1)
  })

  it('refundCredit restores a consumed allowance credit to its source', async () => {
    await setMonthlyAllowance(db, U, 'face', 5, '2026-05')
    expect(await consumeCredit(db, U, 'face')).toEqual({ success: true, source: 'allowance' })
    expect(await getCreditBalance(db, U, 'face')).toBe(4)

    await refundCredit(db, U, 'face', 'allowance')
    expect(await getCreditBalance(db, U, 'face')).toBe(5)
  })
})
