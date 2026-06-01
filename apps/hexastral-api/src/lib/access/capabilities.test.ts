import { describe, expect, it } from 'bun:test'
import type { EntitlementKey } from '../../config/products'
import {
  type Capability,
  FREE_TASTE_MESSAGES_PER_READING,
  hasCapability,
  resolveCapability,
  resolveChatTier,
} from './capabilities'

const ents = (...keys: EntitlementKey[]): EntitlementKey[] => keys

describe('resolveCapability', () => {
  it('maps reading types to the owning app capability', () => {
    expect(resolveCapability('natal')).toBe('fate')
    expect(resolveCapability('stellar')).toBe('fate')
    expect(resolveCapability('report')).toBe('fate')
    expect(resolveCapability('pair')).toBe('yuan')
    expect(resolveCapability('cycle')).toBe('cycle')
    expect(resolveCapability('feng')).toBe('feng')
    expect(resolveCapability('physiognomy')).toBe('face')
    expect(resolveCapability('yiching')).toBe('coincast')
  })

  it('lets a known X-Target-App override the reading-type heuristic', () => {
    // A 'natal' reading opened inside the cycle app is gated as cycle.
    expect(resolveCapability('natal', 'cycle')).toBe('cycle')
    expect(resolveCapability('natal', 'yuan')).toBe('yuan')
    expect(resolveCapability('physiognomy', 'faceoracle')).toBe('face')
    expect(resolveCapability('yiching', 'dreamoracle')).toBe('dream')
    expect(resolveCapability('natal', 'numerology')).toBe('numerology')
  })

  it('falls back to the reading type for an unknown/legacy targetApp', () => {
    expect(resolveCapability('pair', 'hexastral')).toBe('yuan')
    expect(resolveCapability('natal', null)).toBe('fate')
    expect(resolveCapability('cycle', undefined)).toBe('cycle')
  })
})

describe('hasCapability', () => {
  it('universe_pro unlocks every capability', () => {
    const all: Capability[] = [
      'fate',
      'yuan',
      'cycle',
      'feng',
      'face',
      'coincast',
      'dream',
      'numerology',
    ]
    for (const c of all) expect(hasCapability(ents('universe_pro'), c)).toBe(true)
  })

  it('a flagship entitlement unlocks only its own app', () => {
    expect(hasCapability(ents('fate_pro'), 'fate')).toBe(true)
    expect(hasCapability(ents('fate_pro'), 'yuan')).toBe(false)
    expect(hasCapability(ents('yuan_pro'), 'yuan')).toBe(true)
    expect(hasCapability(ents('cycle_pro'), 'cycle')).toBe(true)
    expect(hasCapability(ents('cycle_pro'), 'fate')).toBe(false)
  })

  it('episodic apps are never unlocked by a subscription entitlement (credit-gated)', () => {
    // No per-app sub grants feng/face/coincast/dream/numerology — only universe_pro does.
    expect(hasCapability(ents('fate_pro', 'yuan_pro', 'cycle_pro'), 'feng')).toBe(false)
    expect(hasCapability(ents('fate_pro'), 'face')).toBe(false)
    expect(hasCapability([], 'coincast')).toBe(false)
  })
})

describe('resolveChatTier', () => {
  it('universe_pro → universe tier for any reading', () => {
    const a = resolveChatTier({ entitlements: ents('universe_pro'), readingType: 'feng' })
    expect(a.tier).toBe('universe')
    const b = resolveChatTier({ entitlements: ents('universe_pro'), readingType: 'pair' })
    expect(b.tier).toBe('universe')
  })

  it('the matching flagship entitlement → pro tier (and only for that app)', () => {
    expect(resolveChatTier({ entitlements: ents('fate_pro'), readingType: 'natal' }).tier).toBe(
      'pro'
    )
    // fate_pro does NOT unlock a 緣 (pair) chat → free taste.
    expect(resolveChatTier({ entitlements: ents('fate_pro'), readingType: 'pair' }).tier).toBe(
      'free'
    )
    expect(resolveChatTier({ entitlements: ents('yuan_pro'), readingType: 'pair' }).tier).toBe(
      'pro'
    )
    expect(resolveChatTier({ entitlements: ents('cycle_pro'), readingType: 'cycle' }).tier).toBe(
      'pro'
    )
  })

  it('an unentitled user gets the free-taste tier with the right upsell product', () => {
    const fate = resolveChatTier({ entitlements: [], readingType: 'natal' })
    expect(fate.tier).toBe('free')
    expect(fate.capability).toBe('fate')
    expect(fate.upsellProductId).toBe('universe_pro_monthly')

    const feng = resolveChatTier({ entitlements: [], readingType: 'feng' })
    expect(feng.tier).toBe('free')
    expect(feng.upsellProductId).toBe('hexastral_feng_single')
  })

  it('exposes a small per-reading free-taste cap', () => {
    expect(FREE_TASTE_MESSAGES_PER_READING).toBeGreaterThan(0)
    expect(FREE_TASTE_MESSAGES_PER_READING).toBeLessThanOrEqual(5)
  })
})
