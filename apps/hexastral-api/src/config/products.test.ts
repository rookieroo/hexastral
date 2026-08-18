import { describe, expect, it } from 'bun:test'
import {
  FACEORACLE_PRO_PHOTO_SLOTS_PER_MONTH,
  FACEORACLE_PRO_REPORT_REGENS_PER_MONTH,
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
    expect(FACEORACLE_PRO_REPORT_REGENS_PER_MONTH).toBe(3)
  })

  it('routes only the new packs to the ledger; legacy kinds stay column-backed', () => {
    expect(ledgerCreditTypeForConsumable('face')).toBe('face')
    expect(ledgerCreditTypeForConsumable('dream')).toBe('dream')
    expect(ledgerCreditTypeForConsumable('numerology')).toBe('numerology')
    expect(ledgerCreditTypeForConsumable('chat')).toBeNull()
    expect(ledgerCreditTypeForConsumable('cast')).toBeNull()
    expect(ledgerCreditTypeForConsumable('coincast_cast')).toBeNull()
  })

  it('registers Lantai buyouts; reserved pro SKUs do not include unlock', () => {
    const unlock = getProduct('lantai_unlock')
    expect(unlock).toBeDefined()
    if (!unlock || unlock.kind !== 'single_purchase') throw new Error('lantai_unlock')
    expect(unlock.grantsEntitlements).toEqual(['lantai_unlock'])

    const workspaces = getProduct('lantai_workspaces')
    expect(workspaces).toBeDefined()
    if (!workspaces || workspaces.kind !== 'single_purchase') throw new Error('lantai_workspaces')
    expect(workspaces.grantsEntitlements).toContain('lantai_unlock')
    expect(workspaces.grantsEntitlements).toContain('lantai_workspaces')

    for (const productId of ['lantai_pro_monthly', 'lantai_pro_annual'] as const) {
      const p = getProduct(productId)
      expect(p).toBeDefined()
      if (!p || !isSubscriptionProduct(p)) throw new Error(productId)
      expect(p.grantsEntitlements).toEqual(['lantai_pro'])
      expect(p.grantsEntitlements).not.toContain('lantai_unlock')
    }
  })

  it('defines a positive universe allowance for every credit type', () => {
    for (const [creditType, amount] of Object.entries(UNIVERSE_MONTHLY_ALLOWANCE)) {
      expect(amount, creditType).toBeGreaterThan(0)
    }
  })
})
