import { describe, expect, it } from 'bun:test'
import type { ActiveEntitlement } from './entitlements'
import { diffEntitlements, parseRcActiveEntitlements, type RcEntitlement } from './revenuecat'

const NOW = '2026-05-22T00:00:00.000Z'

describe('parseRcActiveEntitlements', () => {
  it('keeps active (future) + lifetime (null) known entitlements; derives plan from product id', () => {
    const json = {
      subscriber: {
        entitlements: {
          fate_pro: {
            expires_date: '2026-06-22T00:00:00Z',
            product_identifier: 'universe_pro_monthly',
          },
          universe_pro: { expires_date: null, product_identifier: 'universe_pro_annual' },
        },
      },
    }
    const out = parseRcActiveEntitlements(json, NOW)
    expect(out).toContainEqual({
      key: 'fate_pro',
      expiresAt: '2026-06-22T00:00:00Z',
      productId: 'universe_pro_monthly',
      plan: 'monthly',
    })
    expect(out).toContainEqual({
      key: 'universe_pro',
      expiresAt: null,
      productId: 'universe_pro_annual',
      plan: 'annual',
    })
  })

  it('drops expired entitlements and unknown keys', () => {
    const json = {
      subscriber: {
        entitlements: {
          cycle_pro: {
            expires_date: '2026-01-01T00:00:00Z',
            product_identifier: 'cycle_pro_monthly',
          },
          bogus_pro: { expires_date: '2099-01-01T00:00:00Z', product_identifier: 'x' },
        },
      },
    }
    expect(parseRcActiveEntitlements(json, NOW)).toEqual([])
  })

  it('returns [] for malformed payloads', () => {
    expect(parseRcActiveEntitlements(null, NOW)).toEqual([])
    expect(parseRcActiveEntitlements({}, NOW)).toEqual([])
    expect(parseRcActiveEntitlements({ subscriber: {} }, NOW)).toEqual([])
  })
})

describe('diffEntitlements', () => {
  const mkRc = (key: RcEntitlement['key'], expiresAt: string | null): RcEntitlement => ({
    key,
    expiresAt,
    productId: `${key}_monthly`,
    plan: 'monthly',
  })
  const mkOurs = (key: ActiveEntitlement['key'], expiresAt: string | null): ActiveEntitlement => ({
    key,
    plan: 'monthly',
    productId: `${key}_monthly`,
    activatedAt: NOW,
    expiresAt,
  })

  it('grants an RC-active entitlement missing locally (missed activation)', () => {
    const { toGrant, toExpire } = diffEntitlements({
      rcActive: [mkRc('fate_pro', '2026-07-01T00:00:00Z')],
      ours: [],
    })
    expect(toGrant.map((g) => g.key)).toEqual(['fate_pro'])
    expect(toExpire).toEqual([])
  })

  it('re-grants when the expiry differs (missed renewal) but not when identical', () => {
    const renewed = diffEntitlements({
      rcActive: [mkRc('cycle_pro', '2026-08-01T00:00:00Z')],
      ours: [mkOurs('cycle_pro', '2026-07-01T00:00:00Z')],
    })
    expect(renewed.toGrant.map((g) => g.key)).toEqual(['cycle_pro'])

    const same = diffEntitlements({
      rcActive: [mkRc('cycle_pro', '2026-07-01T00:00:00Z')],
      ours: [mkOurs('cycle_pro', '2026-07-01T00:00:00Z')],
    })
    expect(same.toGrant).toEqual([])
    expect(same.toExpire).toEqual([])
  })

  it('expires a locally-active entitlement RC no longer reports (missed cancellation)', () => {
    const { toGrant, toExpire } = diffEntitlements({
      rcActive: [],
      ours: [mkOurs('yuan_pro', '2026-09-01T00:00:00Z')],
    })
    expect(toGrant).toEqual([])
    expect(toExpire).toEqual(['yuan_pro'])
  })
})
