/**
 * D1.1 二星组合断事 + D1.4 月紫白 tests.
 */

import { describe, expect, test } from 'bun:test'
import { monthlyCenterStar, monthlyChart } from '../../feng/flying-stars'
import { describePalaceCombination, lookupCombination } from '../../feng/flying-stars-combinations'

describe('lookupCombination (order-independent)', () => {
  test('一四同宫 = 文昌', () => {
    const c = lookupCombination(1, 4)
    expect(c?.name).toBe('文昌（四一同宫）')
    expect(lookupCombination(4, 1)).toBe(c) // sorted, same entry
  })
  test('二五交加 = 病符大凶', () => {
    expect(lookupCombination(2, 5)?.name).toBe('二五交加')
    expect(lookupCombination(5, 2)?.domain).toContain('病')
  })
  test('六七 = 交剑煞', () => expect(lookupCombination(6, 7)?.name).toBe('交剑煞'))
  test('二三 = 斗牛煞', () => expect(lookupCombination(2, 3)?.name).toBe('斗牛煞'))
  test('三七 = 穿心煞', () => expect(lookupCombination(3, 7)?.name).toBe('穿心煞'))
  test('七九 = 七九合辙', () => expect(lookupCombination(7, 9)?.name).toBe('七九合辙'))
  test('no entry for an un-canonical pair → null', () => {
    expect(lookupCombination(3, 8)).toBeNull()
  })
})

describe('describePalaceCombination (phase by 旺衰)', () => {
  test('8运 8-8 当令 → 旺读 (大旺财丁)', () => {
    const d = describePalaceCombination(8, 8, 8)
    expect(d.phase).toBe('旺')
    expect(d.reading).toContain('财丁')
  })
  test('8运 2-5 失令 → 衰读 (病符大凶)', () => {
    const d = describePalaceCombination(2, 5, 8)
    expect(d.name).toBe('二五交加')
    expect(d.phase).toBe('衰')
    expect(d.reading).toContain('大凶')
  })
  test('9运 2-5 → 衰读 (煞组合: 2虽生气但5黄非当令,不作旺)', () => {
    // malefic combo: 旺 only on true 当令; in 9运 neither 2 nor 5 is 当令.
    const d = describePalaceCombination(2, 5, 9)
    expect(d.phase).toBe('衰')
    expect(d.reading).toContain('大凶')
  })
  test('9运 7-9 → 旺读 (七九合辙, 9当令故旺财)', () => {
    const d = describePalaceCombination(7, 9, 9)
    expect(d.phase).toBe('旺')
    expect(d.reading).toContain('旺财')
  })
})

describe('月紫白 (三元月白诀)', () => {
  // 子午卯酉年 正月八白入中 ; 辰戌丑未年 正月五黄 ; 寅申巳亥年 正月二黑.
  test('辰年 (甲辰 2024) 正月 五黄入中', () => {
    expect(monthlyCenterStar(4, 1)).toBe(5) // 辰 = branch index 4
  })
  test('午年 正月 八白入中', () => {
    expect(monthlyCenterStar(6, 1)).toBe(8) // 午 = 6
  })
  test('巳年 正月 二黑入中', () => {
    expect(monthlyCenterStar(5, 1)).toBe(2) // 巳 = 5
  })
  test('逐月递减 (正月8 → 二月7 → 八月1 → 九月9)', () => {
    expect(monthlyCenterStar(6, 1)).toBe(8)
    expect(monthlyCenterStar(6, 2)).toBe(7)
    expect(monthlyCenterStar(6, 8)).toBe(1)
    expect(monthlyCenterStar(6, 9)).toBe(9) // wrap 0 → 9
  })
  test('monthlyChart 顺飞 from center', () => {
    const c = monthlyChart(4, 1) // 五黄入中
    expect(c['中']).toBe(5)
    expect(c['乾']).toBe(6) // 5 + 1
  })
})
