import { describe, expect, it } from 'bun:test'
import { classifySubscriptionEvent } from './webhook'

// Locks the RevenueCat event → webhook action mapping. A wrong string here silently
// locked every new subscriber out of access until their first renewal (the
// `INITIAL_SUBSCRIPTION` blocker); these assertions guard against that regression.
describe('classifySubscriptionEvent', () => {
  it('activates on the real first-purchase + renewal + crossgrade + uncancel events', () => {
    expect(classifySubscriptionEvent('INITIAL_PURCHASE')).toBe('activate')
    expect(classifySubscriptionEvent('RENEWAL')).toBe('activate')
    expect(classifySubscriptionEvent('PRODUCT_CHANGE')).toBe('activate')
    expect(classifySubscriptionEvent('UNCANCELLATION')).toBe('activate')
  })

  it('maps cancel + expire events', () => {
    expect(classifySubscriptionEvent('CANCELLATION')).toBe('cancel')
    expect(classifySubscriptionEvent('EXPIRATION')).toBe('expire')
  })

  it('REGRESSION: the non-existent `INITIAL_SUBSCRIPTION` does NOT activate', () => {
    // RevenueCat never emits this; the old code used it and broke first-purchase grants.
    expect(classifySubscriptionEvent('INITIAL_SUBSCRIPTION')).toBe('skip')
  })

  it('skips unhandled / informational events (no spurious grant or revoke)', () => {
    expect(classifySubscriptionEvent('BILLING_ISSUE')).toBe('skip')
    expect(classifySubscriptionEvent('SUBSCRIPTION_PAUSED')).toBe('skip')
    expect(classifySubscriptionEvent('TRANSFER')).toBe('skip')
    expect(classifySubscriptionEvent('')).toBe('skip')
  })
})
