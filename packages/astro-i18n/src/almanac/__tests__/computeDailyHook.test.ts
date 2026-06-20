import { describe, expect, it } from 'vitest'
import { type Branch, computeDailyHook, type Relation, type Stem } from '../computeAlmanac'

// 丙(火) day-master so each day-stem below maps to a known wuxing relation (theme);
// 午(火) branch → 火比火 → peer → 'steady' energy, the baseline for the cases below.
const base = {
  seed: '1990-06-18',
  dayMasterStem: '丙' as Stem,
  dayStem: '甲' as Stem, // 甲(木) vs 丙(火) → 木生火 → support (theme, from the stem)
  dayBranch: '午' as Branch, // 午(火) vs 丙(火) → peer → 'steady' (energy, from the branch)
  date: '2026-04-15',
  locale: 'en' as const,
}

describe('computeDailyHook()', () => {
  it('is deterministic — same seed+date yields identical output', () => {
    expect(computeDailyHook(base)).toEqual(computeDailyHook(base))
  })

  it('resolves theme from the day-stem + energy from the day-branch', () => {
    const out = computeDailyHook(base)
    expect(out.relation).toBe('support') // stem 甲(木) → 木生火 → support
    expect(out.energyLevel).toBe('steady') // branch 午(火) → peer → steady
    expect(out.title).toBeTruthy()
    expect(out.lens).toBeTruthy()
    expect(out.hookKey).toMatch(/^support:steady:\d+$/)
  })

  it('energy is driven by the day BRANCH, so it varies day-to-day even when the stem holds', () => {
    // Same 甲 stem (support theme) all three; only the branch differs → a different
    // energy band → a different corpus cell. This is the "跨天不变" fix: before, a
    // push subject (no 用神) was locked to one energy per relation.
    expect(computeDailyHook({ ...base, dayBranch: '午' }).energyLevel).toBe('steady') // 火 → peer
    expect(computeDailyHook({ ...base, dayBranch: '子' }).energyLevel).toBe('volatile') // 水克火 → pressure
    expect(computeDailyHook({ ...base, dayBranch: '寅' }).energyLevel).toBe('rising') // 木生火 → support
  })

  it('rotates the line by calendar day — consecutive days never repeat in the same cell', () => {
    // Same stem (甲) + same branch (午) both days → identical cell (support/steady);
    // only the date advances by 1. The rotation must pick a different title AND lens.
    const d1 = computeDailyHook({ ...base, date: '2026-04-15' })
    const d2 = computeDailyHook({ ...base, date: '2026-04-16' })
    expect(d1.relation).toBe(d2.relation)
    expect(d1.energyLevel).toBe(d2.energyLevel) // same cell…
    expect(d1.title).not.toBe(d2.title) // …but a different line
    expect(d1.lens).not.toBe(d2.lens)
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
