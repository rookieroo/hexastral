import { describe, expect, it } from 'vitest'
import { computeAlmanac } from '../computeAlmanac'
import type { Locale } from '../../types'

const baseUser = {
  userId: 'user-test-001',
  dayMasterStem: '丙' as const,
  favorableElement: '木' as const,
  unfavorableElement: '水' as const,
  birthBranch: '寅' as const,
}

const day = { date: '2026-04-15', dayStem: '甲' as const, dayBranch: '辰' as const }

describe('computeAlmanac()', () => {
  it('is deterministic — same input yields identical output', () => {
    const a = computeAlmanac({ user: baseUser, day, locale: 'en' })
    const b = computeAlmanac({ user: baseUser, day, locale: 'en' })
    expect(a).toEqual(b)
  })

  it('different userId on the same day picks (potentially) different templates', () => {
    const a = computeAlmanac({ user: { ...baseUser, userId: 'a' }, day, locale: 'en' })
    const b = computeAlmanac({ user: { ...baseUser, userId: 'z' }, day, locale: 'en' })
    // Same relation/energy/lucky derivations
    expect(a.relation).toBe(b.relation)
    expect(a.energyLevel).toBe(b.energyLevel)
    expect(a.luckyDirection).toBe(b.luckyDirection)
    // But the template strings differ across many users (sanity — at least 1 differs).
    expect([a.headline, a.todayLens, a.watchFor]).not.toEqual([
      b.headline,
      b.todayLens,
      b.watchFor,
    ])
  })

  it('renders for all 9 locales', () => {
    const locales: Locale[] = ['zh', 'zh-Hant', 'en', 'ja', 'ko', 'de', 'es', 'vi', 'th']
    for (const locale of locales) {
      const out = computeAlmanac({ user: baseUser, day, locale })
      expect(out.headline).toBeTruthy()
      expect(out.todayLens).toBeTruthy()
      expect(out.watchFor).toBeTruthy()
      expect(out.luckyHour).toMatch(/\d\d:\d\d/)
    }
  })

  it('correctly classifies wuxing relations', () => {
    // 丙(火) day-master with 甲(木) day → 木生火 → support
    const a = computeAlmanac({
      user: baseUser,
      day: { date: '2026-04-15', dayStem: '甲', dayBranch: '辰' },
      locale: 'en',
    })
    expect(a.relation).toBe('support')

    // 丙(火) day-master with 庚(金) day → 火克金 → wealth
    const b = computeAlmanac({
      user: baseUser,
      day: { date: '2026-04-16', dayStem: '庚', dayBranch: '辰' },
      locale: 'en',
    })
    expect(b.relation).toBe('wealth')

    // 丙(火) day-master with 壬(水) day → 水克火 → pressure
    const c = computeAlmanac({
      user: baseUser,
      day: { date: '2026-04-17', dayStem: '壬', dayBranch: '辰' },
      locale: 'en',
    })
    expect(c.relation).toBe('pressure')
  })

  it('snapshot — 12 day fixtures × en', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
    const fixtures = stems.slice(0, 12).map((s, i) => ({
      date: `2026-04-${String(15 + i).padStart(2, '0')}`,
      dayStem: s,
      dayBranch: '辰' as const,
    }))
    const snap = fixtures.map((f) => computeAlmanac({ user: baseUser, day: f, locale: 'en' }))
    expect(snap).toMatchSnapshot()
  })
})
