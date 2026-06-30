/**
 * 玄空飞星 格局识别 golden tests.
 *
 * The four 山向 dispositions are checked against published 八运 charts:
 *   - 子山午向 → 双星会向 (到向首)
 *   - 午山子向 → 双星会坐 (到坐山)
 *   - 巽山乾向 → 旺山旺向
 *   - 戌山辰向 → 上山下水
 * 合十 / 三般卦 / 反伏吟 predicates are verified on constructed charts.
 */

import { describe, expect, test } from 'bun:test'
import type { NineChart, YuanYun } from '../../feng/flying-stars'
import { computeFlyingStars } from '../../feng/flying-stars'
import { detectPatterns, type FlyingStarPatternKind } from '../../feng/flying-stars-patterns'

function kindsFor(facingDegTrue: number, buildYear: number): FlyingStarPatternKind[] {
  const r = computeFlyingStars({ facingDegTrue, buildYear })
  return detectPatterns({
    yuanYun: r.buildYuanYun.yuanYun,
    sitPalace: r.sitMountain.palace,
    facePalace: r.faceMountain.palace,
    periodChart: r.periodChart,
    mountainChart: r.mountainChart,
    facingChart: r.facingChart,
  }).map((p) => p.kind)
}

describe('山向 disposition (published 八运 charts)', () => {
  test('子山午向 (180°) → 双星会向', () => {
    const kinds = kindsFor(180, 2010)
    expect(kinds).toContain('双星会向')
    expect(kinds).not.toContain('旺山旺向')
    expect(kinds).not.toContain('上山下水')
  })

  test('午山子向 (0°) → 双星会坐', () => {
    expect(kindsFor(0, 2010)).toContain('双星会坐')
  })

  test('巽山乾向 (315°) → 旺山旺向', () => {
    const kinds = kindsFor(315, 2010)
    expect(kinds).toContain('旺山旺向')
    expect(kinds).not.toContain('上山下水')
  })

  test('戌山辰向 (120°) → 上山下水', () => {
    const kinds = kindsFor(120, 2010)
    expect(kinds).toContain('上山下水')
    expect(kinds).not.toContain('旺山旺向')
  })
})

describe('合十 / 三般卦 / 反伏吟 (predicate logic)', () => {
  const mk = (vals: Record<string, number>): NineChart<YuanYun> => vals as NineChart<YuanYun>

  test('合十(山盘): 山盘 + 运盘 每宫为 10', () => {
    const period = mk({ 巽: 8, 离: 4, 坤: 6, 震: 7, 中: 9, 兑: 2, 艮: 3, 坎: 5, 乾: 1 }) // 9运
    const mountain = mk({ 巽: 2, 离: 6, 坤: 4, 震: 3, 中: 1, 兑: 8, 艮: 7, 坎: 5, 乾: 9 }) // 10 - period
    const kinds = detectPatterns({
      yuanYun: 9,
      sitPalace: '坎',
      facePalace: '离',
      periodChart: period,
      mountainChart: mountain,
      facingChart: period,
    }).map((p) => p.kind)
    expect(kinds).toContain('合十')
  })

  test('父母三般卦: 每宫 {山,向,运} ∈ {147 | 258 | 369}', () => {
    // Construct a chart where every palace holds one full 三般 group.
    const period = mk({ 巽: 1, 离: 4, 坤: 7, 震: 1, 中: 4, 兑: 7, 艮: 1, 坎: 4, 乾: 7 })
    const mountain = mk({ 巽: 4, 离: 7, 坤: 1, 震: 4, 中: 7, 兑: 1, 艮: 4, 坎: 7, 乾: 1 })
    const facing = mk({ 巽: 7, 离: 1, 坤: 4, 震: 7, 中: 1, 兑: 4, 艮: 7, 坎: 1, 乾: 4 })
    const kinds = detectPatterns({
      yuanYun: 1,
      sitPalace: '坎',
      facePalace: '离',
      periodChart: period,
      mountainChart: mountain,
      facingChart: facing,
    }).map((p) => p.kind)
    expect(kinds).toContain('父母三般卦')
  })

  test('全盘伏吟(山盘): 山盘 == 元旦盘', () => {
    const yuanDan = mk({ 坎: 1, 坤: 2, 震: 3, 巽: 4, 中: 5, 乾: 6, 兑: 7, 艮: 8, 离: 9 })
    const kinds = detectPatterns({
      yuanYun: 9,
      sitPalace: '坎',
      facePalace: '离',
      periodChart: yuanDan,
      mountainChart: yuanDan,
      facingChart: yuanDan,
    }).map((p) => p.kind)
    expect(kinds).toContain('全盘伏吟')
  })
})
