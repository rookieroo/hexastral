/**
 * 紫微 timing signals (ADR-0014 P5) — the pure corroboration the living layer folds
 * into its 八字 ranking. 甲 年/月 四化 = [廉贞化禄, 破军化权, 武曲化科, 太阳化忌];
 * 2024 is a 甲辰 year (stemIndex (2024-4)%10 = 0 → 甲), so we pin signals against it.
 */

import { describe, expect, test } from 'bun:test'
import { getYearlySiHua } from '../sihua'
import {
  labelToBondCategory,
  relationshipBondPalaces,
  SOLO_LIFE_PALACES,
  type ZiweiTimingSummary,
  ziweiRelationMonthSignal,
  ziweiRelationYearSignal,
  ziweiSelfMonthSignal,
  ziweiSelfYearSignal,
} from '../ziwei-timing'

const empty: ZiweiTimingSummary = { starToPalace: {} }

describe('ziweiRelationYearSignal', () => {
  test('2024 (甲) is a 甲 year so 太阳 carries 化忌', () => {
    expect(getYearlySiHua(2024).yearStem).toBe('甲')
    expect(getYearlySiHua(2024).sihua.ji.starName).toBe('太阳')
  })

  test('化忌 star landing in a bond palace → significant + tension', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 太阳: '夫妻' } }
    const sig = ziweiRelationYearSignal(a, empty, 2024)
    expect(sig.significant).toBe(true)
    expect(sig.tone).toBe('tension')
    expect(sig.hitCount).toBe(1)
  })

  test('化禄 star (廉贞) in 命宫 → harmony', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 廉贞: '命宫' } }
    const sig = ziweiRelationYearSignal(a, empty, 2024)
    expect(sig.significant).toBe(true)
    expect(sig.tone).toBe('harmony')
  })

  test('四化 star outside the bond palaces → not significant', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 太阳: '财帛', 廉贞: '官禄' } }
    const sig = ziweiRelationYearSignal(a, empty, 2024)
    expect(sig.significant).toBe(false)
    expect(sig.tone).toBe('neutral')
  })

  test('both people contribute (counts across A and B)', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 廉贞: '命宫' } } // 化禄 harmony
    const b: ZiweiTimingSummary = { starToPalace: { 太阳: '福德' } } // 化忌 tension
    const sig = ziweiRelationYearSignal(a, b, 2024)
    expect(sig.significant).toBe(true)
    expect(sig.hitCount).toBe(2)
    // one harmony + one tension nets to growth
    expect(sig.tone).toBe('growth')
  })

  test('empty summaries → never significant', () => {
    expect(ziweiRelationYearSignal(empty, empty, 2024).significant).toBe(false)
  })
})

describe('ziweiRelationMonthSignal', () => {
  test('a 甲 month lights 廉贞(化禄) in 夫妻 → harmony', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 廉贞: '夫妻' } }
    const sig = ziweiRelationMonthSignal(a, empty, '甲')
    expect(sig.significant).toBe(true)
    expect(sig.tone).toBe('harmony')
  })

  test('a 甲 month with 太阳(化忌) in 命宫 → tension', () => {
    const a: ZiweiTimingSummary = { starToPalace: { 太阳: '命宫' } }
    expect(ziweiRelationMonthSignal(a, empty, '甲').tone).toBe('tension')
  })
})

describe('relationship palace lens', () => {
  test('labelToBondCategory normalizes preset + custom labels', () => {
    expect(labelToBondCategory('配偶')).toBe('spouse')
    expect(labelToBondCategory('老婆')).toBe('spouse')
    expect(labelToBondCategory('Dad')).toBe('parent')
    expect(labelToBondCategory('我女儿')).toBe('child')
    expect(labelToBondCategory('好朋友')).toBe('friend')
    expect(labelToBondCategory('同事')).toBe('colleague')
    expect(labelToBondCategory('我老板')).toBe('boss')
    expect(labelToBondCategory('上下级')).toBe('boss')
    expect(labelToBondCategory('神秘人')).toBeUndefined()
    expect(labelToBondCategory(undefined)).toBeUndefined()
  })

  test('palaces are type-aware, always including 命宫 + 福德', () => {
    expect(relationshipBondPalaces('parent')).toEqual(['命宫', '福德', '父母', '子女'])
    expect(relationshipBondPalaces('friend')).toEqual(['命宫', '福德', '仆役'])
    // unknown → romantic default
    expect(relationshipBondPalaces(undefined)).toEqual(['命宫', '福德', '夫妻'])
  })

  test('lens gates the signal — a 父母宫 landing counts for parent, not for spouse', () => {
    // 2024 甲 year, 化忌 star = 太阳; put it in 父母 (a family palace).
    const a: ZiweiTimingSummary = { starToPalace: { 太阳: '父母' } }
    expect(
      ziweiRelationYearSignal(a, empty, 2024, relationshipBondPalaces('parent')).significant
    ).toBe(true)
    expect(
      ziweiRelationYearSignal(a, empty, 2024, relationshipBondPalaces('spouse')).significant
    ).toBe(false)
  })
})

describe('solo signal (auspice life-line)', () => {
  test('SOLO_LIFE_PALACES covers self / career / wealth / heart / world', () => {
    expect(SOLO_LIFE_PALACES).toEqual(['命宫', '官禄', '财帛', '福德', '迁移'])
  })

  test('流年化忌 in 官禄 → significant + tension (one chart, no double-count)', () => {
    const self: ZiweiTimingSummary = { starToPalace: { 太阳: '官禄' } }
    const sig = ziweiSelfYearSignal(self, 2024)
    expect(sig.significant).toBe(true)
    expect(sig.tone).toBe('tension')
    expect(sig.hitCount).toBe(1) // not 2 — solo counts the chart once
  })

  test('流年化禄 (廉贞) in 财帛 → harmony', () => {
    const self: ZiweiTimingSummary = { starToPalace: { 廉贞: '财帛' } }
    expect(ziweiSelfYearSignal(self, 2024).tone).toBe('harmony')
  })

  test('四化 landing outside life palaces (兄弟) → not significant', () => {
    const self: ZiweiTimingSummary = { starToPalace: { 太阳: '兄弟', 廉贞: '夫妻' } }
    expect(ziweiSelfYearSignal(self, 2024).significant).toBe(false)
  })

  test('solo month signal mirrors the year lens', () => {
    const self: ZiweiTimingSummary = { starToPalace: { 廉贞: '福德' } }
    expect(ziweiSelfMonthSignal(self, '甲').tone).toBe('harmony')
  })
})
