import { describe, expect, it } from 'bun:test'
import { computeLlmGuardDecision, type LlmGuardConfig, resolveLlmGuardSubject } from './llm-guard'

// Mirrors the config the Cycle plan supplies for /cycle/explain.
const config: LlmGuardConfig = {
  app: 'cycle',
  dailyLimitAnon: 1,
  dailyLimitSigned: 3,
  lifetimePeakPass: 1,
  globalDailyBudget: 1000,
  noRollover: true,
  noPeriodicRefill: true,
}

const user = { kind: 'user' as const, id: 'u1' }
const anon = { kind: 'ip' as const, id: 'ip1' }

describe('resolveLlmGuardSubject', () => {
  it('prefers userId > deviceId > ipHash', () => {
    expect(resolveLlmGuardSubject({ userId: 'u', deviceId: 'd', ipHash: 'i' })).toEqual({
      kind: 'user',
      id: 'u',
    })
    expect(resolveLlmGuardSubject({ deviceId: 'd', ipHash: 'i' })).toEqual({
      kind: 'device',
      id: 'd',
    })
    expect(resolveLlmGuardSubject({ ipHash: 'i' })).toEqual({ kind: 'ip', id: 'i' })
    expect(resolveLlmGuardSubject({})).toBeNull()
  })
})

describe('computeLlmGuardDecision', () => {
  it('allows the LLM within the daily limit (default tier)', () => {
    const r = computeLlmGuardDecision({
      subject: user,
      config,
      counts: { subjectDailyUsed: 0, globalDailyUsed: 0, peakPassUsed: 0 },
    })
    expect(r.decision).toBe('allow_llm')
    expect(r.tier).toBe('default')
    expect(r.consumesPeakPass).toBe(false)
  })

  it('applies the lower anonymous daily limit', () => {
    const r = computeLlmGuardDecision({
      subject: anon,
      config: { ...config, lifetimePeakPass: 0 },
      counts: { subjectDailyUsed: 1, globalDailyUsed: 0, peakPassUsed: 0 },
    })
    expect(r.decision).toBe('allow_template')
    expect(r.upsellAfterExhaust).toBe(true)
  })

  it('spends the one-time lifetime peak pass when over the daily limit (deep tier)', () => {
    const r = computeLlmGuardDecision({
      subject: user,
      config,
      counts: { subjectDailyUsed: 3, globalDailyUsed: 0, peakPassUsed: 0 },
    })
    expect(r.decision).toBe('allow_llm')
    expect(r.tier).toBe('deep')
    expect(r.consumesPeakPass).toBe(true)
  })

  it('serves a template once the daily limit and peak pass are exhausted', () => {
    const r = computeLlmGuardDecision({
      subject: user,
      config,
      counts: { subjectDailyUsed: 3, globalDailyUsed: 0, peakPassUsed: 1 },
    })
    expect(r.decision).toBe('allow_template')
    expect(r.fallback).toBe('template')
    expect(r.upsellAfterExhaust).toBe(true)
  })

  it('degrades to cache when the global daily budget is exhausted (even under the subject limit)', () => {
    const r = computeLlmGuardDecision({
      subject: user,
      config: { ...config, globalDailyBudget: 5 },
      counts: { subjectDailyUsed: 0, globalDailyUsed: 5, peakPassUsed: 0 },
    })
    expect(r.decision).toBe('allow_cached')
    expect(r.fallback).toBe('cache')
  })
})
