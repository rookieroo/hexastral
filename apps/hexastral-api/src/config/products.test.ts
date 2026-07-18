import { describe, expect, it } from 'bun:test'
import {
  FACEORACLE_PRO_PHOTO_SLOTS_PER_MONTH,
  getProduct,
  isConsumableProduct,
  isSubscriptionProduct,
  ledgerCreditTypeForConsumable,
  UNIVERSE_MONTHLY_ALLOWANCE,
} from './products'

describe('episodic consumable catalog (ADR-0013 P2.2)', () => {
  it('registers the ledger-backed packs with the right credit kind', () => {
    for (const [productId, kind, credits] of [
      ['faceoracle_reading', 'face', 1],
      ['dream_pack_10', 'dream', 10],
      ['numerology_pack_10', 'numerology', 10],
    ] as const) {
      const p = getProduct(productId)
      expect(p).toBeDefined()
      if (!p || !isConsumableProduct(p)) throw new Error(`${productId} is not a consumable`)
      expect(p.consumable.kind).toBe(kind)
      expect(p.consumable.credits).toBe(credits)
    }
  })

  it('registers FaceOracle Pro subscription (ADR-0028)', () => {
    for (const productId of ['faceoracle_pro_monthly', 'faceoracle_pro_annual'] as const) {
      const p = getProduct(productId)
      expect(p).toBeDefined()
      if (!p || !isSubscriptionProduct(p)) throw new Error(`${productId} is not a subscription`)
      expect(p.grantsEntitlements).toContain('faceoracle_pro')
    }
    expect(FACEORACLE_PRO_PHOTO_SLOTS_PER_MONTH).toBe(6)
  })

  it('routes only the new packs to the ledger; legacy kinds stay column-backed', () => {
    expect(ledgerCreditTypeForConsumable('face')).toBe('face')
    expect(ledgerCreditTypeForConsumable('dream')).toBe('dream')
    expect(ledgerCreditTypeForConsumable('numerology')).toBe('numerology')
    expect(ledgerCreditTypeForConsumable('chat')).toBeNull()
    expect(ledgerCreditTypeForConsumable('cast')).toBeNull()
    expect(ledgerCreditTypeForConsumable('coincast_cast')).toBeNull()
  })

  it('defines a positive universe allowance for every credit type', () => {
    for (const [creditType, amount] of Object.entries(UNIVERSE_MONTHLY_ALLOWANCE)) {
      expect(amount, creditType).toBeGreaterThan(0)
    }
  })
})
