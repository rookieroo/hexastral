import { describe, expect, test } from 'bun:test'
import {
  FENG_BASE_PRICE_USD,
  FENG_TIERS,
  fengSkuForImageCount,
  MAX_FLOORPLAN_IMAGES,
  normalizeImageCount,
  quoteFengAnalysis,
  VILLA_SKU_PROVISIONED,
  YUEL_COMPATIBILITY_PRICE_USD,
} from './feng-pricing'

describe('quoteFengAnalysis', () => {
  test('base price is above Yuel compatibility floor', () => {
    expect(FENG_BASE_PRICE_USD).toBeGreaterThan(YUEL_COMPATIBILITY_PRICE_USD)
  })

  test('single floor quotes standard tier at $9.99', () => {
    const q = quoteFengAnalysis(1)
    expect(q.tier).toBe('standard')
    expect(q.productId).toBe('hexastral_feng_single')
    expect(q.singleSku).toBe('feng_analysis')
    expect(q.displayPrice).toBe('$9.99')
  })

  test('multi-floor still quotes standard SKU until villa is provisioned', () => {
    expect(VILLA_SKU_PROVISIONED).toBe(false)
    for (const n of [2, 3, 4, 6]) {
      const q = quoteFengAnalysis(n)
      expect(q.productId).toBe('hexastral_feng_single')
      expect(q.singleSku).toBe('feng_analysis')
      expect(q.displayPrice).toBe('$9.99')
    }
  })

  test('image count is clamped into the billable [1, MAX] range', () => {
    expect(normalizeImageCount(0)).toBe(1)
    expect(normalizeImageCount(99)).toBe(MAX_FLOORPLAN_IMAGES)
    expect(normalizeImageCount(Number.NaN)).toBe(1)
  })

  test('fengSkuForImageCount matches the quoted SKU', () => {
    for (const n of [1, 2, 3, 4, 6]) {
      expect(fengSkuForImageCount(n)).toBe(quoteFengAnalysis(n).singleSku)
    }
  })

  test('tier table is contiguous and covers [1, MAX]', () => {
    expect(FENG_TIERS[0].minImages).toBe(1)
    expect(FENG_TIERS[FENG_TIERS.length - 1].maxImages).toBe(MAX_FLOORPLAN_IMAGES)
    for (let i = 1; i < FENG_TIERS.length; i++) {
      expect(FENG_TIERS[i].minImages).toBe(FENG_TIERS[i - 1].maxImages + 1)
    }
  })
})
