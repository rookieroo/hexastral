import { describe, expect, test } from 'bun:test'
import {
  FENG_BASE_PRICE_USD,
  FENG_PREMIUM_PRICE_USD,
  fengSkuForResidence,
  fengStreetViewEnabled,
  normalizeResidenceType,
  PREMIUM_SKU_PROVISIONED,
  quoteFengAnalysis,
  YUEL_COMPATIBILITY_PRICE_USD,
} from './feng-pricing'

describe('quoteFengAnalysis (residence-type tiers)', () => {
  test('base price is above Yuel compatibility floor', () => {
    expect(FENG_BASE_PRICE_USD).toBeGreaterThan(YUEL_COMPATIBILITY_PRICE_USD)
  })

  test('premium is roughly double the base', () => {
    expect(FENG_PREMIUM_PRICE_USD).toBeGreaterThan(FENG_BASE_PRICE_USD * 1.8)
  })

  test('apartment quotes the single tier at $9.99, no street view', () => {
    const q = quoteFengAnalysis('apartment')
    expect(q.billingTier).toBe('single')
    expect(q.productId).toBe('hexastral_feng_single')
    expect(q.singleSku).toBe('feng_analysis')
    expect(q.displayPrice).toBe('$9.99')
    expect(q.streetView).toBe(false)
  })

  test('flat/villa still quote the single SKU until premium is provisioned', () => {
    expect(PREMIUM_SKU_PROVISIONED).toBe(false)
    for (const t of ['flat', 'villa'] as const) {
      const q = quoteFengAnalysis(t)
      expect(q.productId).toBe('hexastral_feng_single')
      expect(q.singleSku).toBe('feng_analysis')
      expect(q.displayPrice).toBe('$9.99')
    }
  })

  test('street view is enabled for premium residence types (flat/villa), not apartment', () => {
    expect(fengStreetViewEnabled('apartment')).toBe(false)
    expect(fengStreetViewEnabled('flat')).toBe(true)
    expect(fengStreetViewEnabled('villa')).toBe(true)
  })

  test('fengSkuForResidence matches the quoted SKU', () => {
    for (const t of ['apartment', 'flat', 'villa'] as const) {
      expect(fengSkuForResidence(t)).toBe(quoteFengAnalysis(t).singleSku)
    }
  })

  test('normalizeResidenceType coerces junk to apartment', () => {
    expect(normalizeResidenceType('villa')).toBe('villa')
    expect(normalizeResidenceType('flat')).toBe('flat')
    expect(normalizeResidenceType('mansion')).toBe('apartment')
    expect(normalizeResidenceType(undefined)).toBe('apartment')
    expect(normalizeResidenceType(42)).toBe('apartment')
  })
})
