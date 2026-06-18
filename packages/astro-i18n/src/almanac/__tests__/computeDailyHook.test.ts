import { describe, expect, it } from 'vitest'
import { computeDailyHook, type Relation, type Stem } from '../computeAlmanac'

// 丙(火) day-master so each day-stem below maps to a known wuxing relation.
const base = {
  seed: '1990-06-18',
  dayMasterStem: '丙' as Stem,
  dayStem: '甲' as Stem, // 甲(木) vs 丙(火) → 木生火 → support
  date: '2026-04-15',
  locale: 'en' as const,
}

describe('computeDailyHook()', () => {
  it('is deterministic — same seed+date yields identical output', () => {
    expect(computeDailyHook(base)).toEqual(computeDailyHook(base))
  })

  it('resolves relation + energy with no 用神 (favorable absent)', () => {
    const out = computeDailyHook(base)
    expect(out.relation).toBe('support')
    expect(out.energyLevel).toBe('steady') // no favorable → no boost band
    expect(out.title).toBeTruthy()
    expect(out.lens).toBeTruthy()
    expect(out.hookKey).toMatch(/^support:steady:\d+$/)
  })

  it('用神 boost lifts the band when favorable === day element', () => {
    // support + (day element 木 === favorable 木) → rising, vs steady without.
    expect(computeDailyHook({ ...base, favorableElement: '木' }).energyLevel).toBe('rising')
  })

  it('varies the picked line across seeds (the A/B surface is live)', () => {
    const titles = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => computeDailyHook({ ...base, seed: s }).title)
    )
    expect(titles.size).toBeGreaterThan(1)
  })

  it('en corpus is non-empty for every relation', () => {
    const cases: Array<[Stem, Relation]> = [
      ['甲', 'support'], // 木生火
      ['丙', 'peer'], // 火比火
      ['戊', 'output'], // 火生土
      ['庚', 'wealth'], // 火克金
      ['壬', 'pressure'], // 水克火
    ]
    for (const [dayStem, relation] of cases) {
      const out = computeDailyHook({ ...base, dayStem })
      expect(out.relation).toBe(relation)
      expect(out.title).toBeTruthy()
      expect(out.lens).toBeTruthy()
    }
  })
})
