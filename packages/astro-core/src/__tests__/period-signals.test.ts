import { describe, expect, it } from 'vitest'
import type { PersonalAlmanacSubject } from '../almanac'
import {
  favoredMove,
  type MoveWindow,
  periodSignals,
  type RetrodictionSignals,
  rankWindowsForMove,
  retrodictionMatch,
} from '../period-signals'

const SIG = (over: Partial<RetrodictionSignals> = {}): RetrodictionSignals => ({
  taohua: false,
  yima: false,
  favorsElement: false,
  harmsElement: false,
  clashesBenming: false,
  ...over,
})

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

describe('favoredMove', () => {
  it('holds on a defensive window (忌神 / 冲), even if other signals are on', () => {
    expect(favoredMove(SIG({ clashesBenming: true, favorsElement: true })).primary).toBe('hold')
    expect(favoredMove(SIG({ harmsElement: true, yima: true })).primary).toBe('hold')
    expect(favoredMove(SIG({ clashesBenming: true, harmsElement: true })).reasons).toEqual([
      'clash',
      'unfavorable',
    ])
  })

  it('favors move on 驿马, connect on 桃花, expand on 用神 (no defensive signal)', () => {
    expect(favoredMove(SIG({ yima: true })).primary).toBe('move')
    expect(favoredMove(SIG({ taohua: true })).primary).toBe('connect')
    expect(favoredMove(SIG({ favorsElement: true })).primary).toBe('expand')
  })

  it('ranks move over connect over expand when several are on', () => {
    expect(favoredMove(SIG({ yima: true, taohua: true, favorsElement: true })).primary).toBe('move')
    expect(favoredMove(SIG({ taohua: true, favorsElement: true })).primary).toBe('connect')
  })

  it('holds on a neutral window with no reasons', () => {
    const r = favoredMove(SIG())
    expect(r.primary).toBe('hold')
    expect(r.reasons).toEqual([])
  })
})

describe('rankWindowsForMove', () => {
  // subject: 甲, 用神 水, 忌神 金, 本命支 子 (桃花 → 酉, 冲 → 午, 驿马 → 寅).
  const W = {
    fav: { key: 'fav', period: { element: '水', branch: '卯' } }, // 用神
    harm: { key: 'harm', period: { element: '金', branch: '卯' } }, // 忌神
    clash: { key: 'clash', period: { element: '木', branch: '午' } }, // 冲
    neutral: { key: 'neutral', period: { element: '木', branch: '卯' } },
    taohua: { key: 'taohua', period: { element: '土', branch: '酉' } }, // 桃花
    yima: { key: 'yima', period: { element: '木', branch: '寅' } }, // 驿马
  } satisfies Record<string, MoveWindow>

  it('ranks an expand move: 用神 window first, 忌神/冲 windows last', () => {
    const r = rankWindowsForMove(subject, 'expand', [W.neutral, W.fav, W.harm, W.clash])
    expect(r.map((x) => x.key)).toEqual(['fav', 'neutral', 'harm', 'clash'])
    expect(r[0]?.reasons).toContain('favorable')
  })

  it('folds a 紫微 tone into the score and carries it through (±1 corroboration)', () => {
    const base = { key: 'n', period: { element: '木', branch: '卯' } } satisfies MoveWindow
    const harmony: MoveWindow = { ...base, key: 'harm+', ziwei: { tone: 'harmony' } }
    const tension: MoveWindow = { ...base, key: 'tens-', ziwei: { tone: 'tension' } }
    const r = rankWindowsForMove(subject, 'expand', [base, harmony, tension])
    // identical 八字 → 紫微 harmony ranks above neutral above 紫微 tension.
    expect(r.map((x) => x.key)).toEqual(['harm+', 'n', 'tens-'])
    expect(r[0]?.ziwei?.tone).toBe('harmony')
    const neutralScore = r.find((x) => x.key === 'n')?.score ?? 0
    expect(r.find((x) => x.key === 'harm+')?.score).toBe(neutralScore + 1)
    expect(r.find((x) => x.key === 'tens-')?.score).toBe(neutralScore - 1)
  })

  it('boosts the 桃花 window for a connect move', () => {
    const r = rankWindowsForMove(subject, 'connect', [W.fav, W.taohua])
    expect(r[0]?.key).toBe('taohua')
    expect(r[0]?.reasons).toContain('taohua')
  })

  it('boosts the 驿马 window for a move', () => {
    const r = rankWindowsForMove(subject, 'move', [W.fav, W.yima])
    expect(r[0]?.key).toBe('yima')
    expect(r[0]?.reasons).toContain('yima')
  })

  it('surfaces a clash as a negative-scoring reason', () => {
    const r = rankWindowsForMove(subject, 'expand', [W.clash])
    expect(r[0]?.reasons).toContain('clash')
    expect(r[0]?.score).toBeLessThan(0)
  })

  it('keeps caller order on ties (stable, chronological)', () => {
    const a: MoveWindow = { key: 'a', period: { element: '木', branch: '卯' } }
    const b: MoveWindow = { key: 'b', period: { element: '木', branch: '卯' } }
    expect(rankWindowsForMove(subject, 'expand', [a, b]).map((x) => x.key)).toEqual(['a', 'b'])
  })
})
