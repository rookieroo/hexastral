import { describe, expect, test } from 'bun:test'
import {
  FENG_BASE_PRICE_USD,
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
    expect(q.displayPrice).toBe('$9.99')
  })

  test('multi-floor still quotes single SKU until villa is provisioned', () => {
    expect(VILLA_SKU_PROVISIONED).toBe(false)
    const q = quoteFengAnalysis(3)
    expect(q.productId).toBe('hexastral_feng_single')
    expect(q.displayPrice).toBe('$9.99')
  })
})
