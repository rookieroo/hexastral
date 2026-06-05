import { describe, expect, it } from 'vitest'
import type { PersonalAlmanacSubject } from '../almanac'
import { periodSignals, retrodictionMatch } from '../period-signals'

// 甲 day master; 用神 水, 忌神 金; 本命支 子 (桃花 → 酉, 六冲 → 午).
const subject: PersonalAlmanacSubject = {
  dayMasterStem: '甲',
  favorableElement: '水',
  unfavorableElement: '金',
  birthBranch: '子',
}

describe('periodSignals', () => {
  it('flags the period element as 用神 when it matches favorableElement', () => {
    const s = periodSignals(subject, { element: '水', branch: '寅' })
    expect(s.favorsElement).toBe(true)
    expect(s.harmsElement).toBe(false)
  })

  it('flags the period element as 忌神 when it matches unfavorableElement', () => {
    const s = periodSignals(subject, { element: '金', branch: '寅' })
    expect(s.harmsElement).toBe(true)
    expect(s.favorsElement).toBe(false)
  })

  it('detects 桃花 when the period branch is the subject 本命支 peach-blossom (子 → 酉)', () => {
    expect(periodSignals(subject, { element: '土', branch: '酉' }).taohua).toBe(true)
    expect(periodSignals(subject, { element: '土', branch: '午' }).taohua).toBe(false)
  })

  it('detects 六冲 against the 本命支 (子 ⟷ 午)', () => {
    expect(periodSignals(subject, { element: '火', branch: '午' }).clashesBenming).toBe(true)
    expect(periodSignals(subject, { element: '木', branch: '寅' }).clashesBenming).toBe(false)
  })

  it('degrades 桃花/六冲 to false when 本命支 is unknown', () => {
    const noBranch: PersonalAlmanacSubject = { dayMasterStem: '甲' }
    const s = periodSignals(noBranch, { element: '水', branch: '酉' })
    expect(s.taohua).toBe(false)
    expect(s.clashesBenming).toBe(false)
  })

  it('always carries a fit verdict + reasons from the overlay', () => {
    const s = periodSignals(subject, { element: '水', branch: '酉' })
    expect(s.fit).toBeTruthy()
    expect(Array.isArray(s.reasons)).toBe(true)
  })

  it('detects 驿马 when the period branch is the subject 驿马 (子 → 寅)', () => {
    expect(periodSignals(subject, { element: '木', branch: '寅' }).yima).toBe(true)
    expect(periodSignals(subject, { element: '木', branch: '卯' }).yima).toBe(false)
  })
})

describe('retrodictionMatch', () => {
  it('corroborates a relationship event with 桃花', () => {
    const s = periodSignals(subject, { element: '土', branch: '酉' }) // 桃花
    const m = retrodictionMatch('relationship', s)
    expect(m.hasMatch).toBe(true)
    expect(m.matched).toContain('taohua')
  })

  it('corroborates a travel event with 驿马 only (neutral element)', () => {
    const s = periodSignals(subject, { element: '木', branch: '寅' })
    expect(retrodictionMatch('travel', s).matched).toEqual(['yima'])
  })

  it('corroborates a career event with 用神 (favorable element)', () => {
    const s = periodSignals(subject, { element: '水', branch: '卯' })
    expect(retrodictionMatch('career', s).matched).toEqual(['favorable'])
  })

  it('returns no match when no relevant signal is active', () => {
    const s = periodSignals(subject, { element: '木', branch: '卯' }) // neutral, no 桃花/驿马/冲
    expect(retrodictionMatch('relationship', s).hasMatch).toBe(false)
  })
})
