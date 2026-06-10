import { describe, expect, it } from 'bun:test'
import type { TimelinePayload } from '../api'
import {
  buildMakeIfSubject,
  eventToMove,
  forkDivergeFit,
  futureYearWindows,
  MAKEIF_EVENTS,
  rankMakeIfWindows,
} from '../makeIfZeshi'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const BIRTH = { birthDate: '1990-06-15', birthHour: 12, gender: 'M' as const }

// Minimal payload — only `liunian` is read by the 择时 path. Cast through unknown
// since the row's PeriodFit (fit/reasons) is irrelevant here.
const payload = {
  liunian: [
    { year: 2024, age: 34, pillar: { stem: '甲', branch: '辰' }, isCurrent: false },
    { year: 2025, age: 35, pillar: { stem: '乙', branch: '巳' }, isCurrent: true },
    { year: 2026, age: 36, pillar: { stem: '丙', branch: '午' }, isCurrent: false },
    { year: 2027, age: 37, pillar: { stem: '丁', branch: '未' }, isCurrent: false },
  ],
} as unknown as TimelinePayload

describe('buildMakeIfSubject', () => {
  it('builds a valid, deterministic 命主 subject from a birth', () => {
    const a = buildMakeIfSubject(BIRTH)
    const b = buildMakeIfSubject(BIRTH)
    expect(a).toEqual(b) // deterministic
    expect(STEMS).toContain(a.dayMasterStem)
    expect(BRANCHES).toContain(a.birthBranch ?? '')
    // 用神/忌神 are optional but, when present, valid 五行.
    if (a.favorableElement) expect(['木', '火', '土', '金', '水']).toContain(a.favorableElement)
  })

  it('tolerates an unknown birth hour (-1 → noon)', () => {
    expect(() => buildMakeIfSubject({ ...BIRTH, birthHour: -1 })).not.toThrow()
  })
})

describe('eventToMove + MAKEIF_EVENTS', () => {
  it('maps life-decision events to their move archetype', () => {
    expect(eventToMove('business')).toBe('expand')
    expect(eventToMove('signing')).toBe('expand')
    expect(eventToMove('wedding')).toBe('connect')
    expect(eventToMove('move')).toBe('move')
    expect(eventToMove('travel')).toBe('move')
  })

  it('offers no macro 择运 for day-only 黄历 events', () => {
    expect(eventToMove('medical')).toBeNull()
    expect(eventToMove('burial')).toBeNull()
    expect(MAKEIF_EVENTS).not.toContain('burial')
    expect(MAKEIF_EVENTS).toContain('business')
  })
})

describe('futureYearWindows', () => {
  it('keeps the current year forward, in order, keyed by year', () => {
    const w = futureYearWindows(payload)
    expect(w.map((x) => x.key)).toEqual(['2025', '2026', '2027']) // drops 2024 (past)
    expect(w[0]?.period.branch).toBe('巳')
  })

  it('returns [] when no current 流年 is present', () => {
    const none = { liunian: [] } as unknown as TimelinePayload
    expect(futureYearWindows(none)).toEqual([])
  })
})

describe('rankMakeIfWindows', () => {
  it('returns [] for a day-only event (no macro mapping)', () => {
    expect(rankMakeIfWindows(BIRTH, 'medical', payload)).toEqual([])
  })

  it('ranks every future window, highest score first', () => {
    const r = rankMakeIfWindows(BIRTH, 'business', payload)
    expect(r.length).toBe(3) // 2025/2026/2027
    for (let i = 1; i < r.length; i++) {
      expect((r[i - 1]?.score ?? 0) >= (r[i]?.score ?? 0)).toBe(true) // sorted desc
    }
    expect(STEMS.length).toBeGreaterThan(0) // sanity
    expect(['吉', '平', '凶']).toContain(r[0]?.fit)
  })
})

describe('forkDivergeFit', () => {
  const withDayun = {
    dayun: [
      { startAge: 30, endAge: 39, pillar: { stem: '甲', branch: '子' } },
      { startAge: 40, endAge: 49, pillar: { stem: '乙', branch: '丑' } },
    ],
  } as unknown as TimelinePayload

  it('returns the real fit for an age inside the 80-year 大运 coverage', () => {
    const fit = forkDivergeFit(BIRTH, withDayun, 35)
    expect(['吉', '平', '凶']).toContain(fit)
  })

  it('returns undefined for an age outside coverage', () => {
    expect(forkDivergeFit(BIRTH, withDayun, 200)).toBeUndefined()
  })

  it('is deterministic for the same fork', () => {
    expect(forkDivergeFit(BIRTH, withDayun, 42)).toBe(forkDivergeFit(BIRTH, withDayun, 42))
  })
})
