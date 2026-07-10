import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import type { AppDb } from '../infra-types'
import { grantEntitlement } from '../services/entitlements'
import { checkReadingAccess } from './access-check'

function makeDb(): AppDb {
  const sqlite = new Database(':memory:')
  sqlite.exec(`CREATE TABLE user_entitlements (
    user_id text NOT NULL,
    entitlement_key text NOT NULL,
    plan text,
    product_id text,
    activated_at text NOT NULL DEFAULT '',
    expires_at text,
    updated_at text NOT NULL DEFAULT '',
    PRIMARY KEY(user_id, entitlement_key)
  );`)
  sqlite.exec(`CREATE TABLE single_purchases (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    sku_id text NOT NULL,
    status text NOT NULL,
    reading_id text,
    consumed_at text,
    created_at text NOT NULL DEFAULT ''
  );`)
  return drizzle(sqlite) as unknown as AppDb
}

const U = 'user-feng-gate'

describe('checkReadingAccess — Kanyu feng SKUs', () => {
  let db: AppDb

  beforeEach(() => {
    db = makeDb()
  })

  it('denies feng_analysis when user has kindred_pro but no single purchase', async () => {
    await grantEntitlement(db, U, 'kindred_pro', {
      plan: 'monthly',
      productId: 'kindred_pro_monthly',
      expiresAt: null,
    })

    const access = await checkReadingAccess(db, U, 'feng_analysis')
    expect(access.granted).toBe(false)
    if (!access.granted) {
      expect(access.iapProductId).toBe('hexastral_feng_single')
      expect(access.reason).toBe('purchase_required')
    }
  })

  it('grants cast via pro_quota for kindred_pro subscriber', async () => {
    await grantEntitlement(db, U, 'kindred_pro', {
      plan: 'monthly',
      productId: 'kindred_pro_monthly',
      expiresAt: null,
    })

    const access = await checkReadingAccess(db, U, 'cast')
    expect(access).toEqual({ granted: true, via: 'pro_quota' })
  })
})
