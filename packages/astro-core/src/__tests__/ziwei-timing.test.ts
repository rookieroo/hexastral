/**
 * 紫微 timing signals (ADR-0014 P5) — the pure corroboration the living layer folds
 * into its 八字 ranking. 甲 年/月 四化 = [廉贞化禄, 破军化权, 武曲化科, 太阳化忌];
 * 2024 is a 甲辰 year (stemIndex (2024-4)%10 = 0 → 甲), so we pin signals against it.
 */

import { describe, expect, test } from 'bun:test'
import { getYearlySiHua } from '../sihua'
import {
  type ZiweiTimingSummary,
  ziweiRelationMonthSignal,
  ziweiRelationYearSignal,
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
