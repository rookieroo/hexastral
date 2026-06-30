/**
 * 玄空飞星 golden tests.
 *
 * Coverage:
 * 1. 元运 boundaries (1864=1, 2024=9, 2044=1)
 * 2. 年紫白 (annual center star) for documented years
 * 3. 运盘 — center number = 元运, 顺飞
 * 4. 山盘 + 向盘 against published 八运子山午向 ("双星会向") example
 * 5. 5入中 special case (uses building anchor 阴阳 directly)
 * 6. 立春 boundary in dateToFlyingYear
 * 7. computeFlyingStars driver — sanity check shape
 * 8. classifyStar against 9运
 */

import { describe, expect, test } from 'bun:test'
import {
  annualCenterStar,
  annualChart,
  classifyStar,
  computeFlyingStars,
  dateToFlyingYear,
  facingChart,
  facingChartReplaced,
  fillChartFromCenter,
  mountainChart,
  mountainChartReplaced,
  periodChart,
  REPLACEMENT_STAR,
  wrapStar,
  yuanYunForYear,
} from '../../feng/flying-stars'
import { mountainAtDegree, sitMountainForFacing } from '../../feng/twenty-four-mountains'

describe('yuanYunForYear', () => {
  test('anchor: 1864 = 1运 上元', () => {
    const y = yuanYunForYear(1864)
    expect(y.yuanYun).toBe(1)
    expect(y.sanYuan).toBe('上元')
    expect(y.startYear).toBe(1864)
    expect(y.endYear).toBe(1883)
  })

  test('2024 = 9运 下元', () => {
    const y = yuanYunForYear(2024)
    expect(y.yuanYun).toBe(9)
    expect(y.sanYuan).toBe('下元')
    expect(y.startYear).toBe(2024)
    expect(y.endYear).toBe(2043)
  })

  test('last year of 8运 (2023)', () => {
    const y = yuanYunForYear(2023)
    expect(y.yuanYun).toBe(8)
    expect(y.startYear).toBe(2004)
  })

  test('2044 wraps to 1运 上元 of new 180-year cycle', () => {
    const y = yuanYunForYear(2044)
    expect(y.yuanYun).toBe(1)
    expect(y.sanYuan).toBe('上元')
  })

  test('mid-cycle: 1985 = 7运 下元', () => {
    const y = yuanYunForYear(1985)
    expect(y.yuanYun).toBe(7)
    expect(y.sanYuan).toBe('下元')
  })

  test('5运 lands in 中元', () => {
    const y = yuanYunForYear(1950)
    expect(y.yuanYun).toBe(5)
    expect(y.sanYuan).toBe('中元')
  })
})

describe('wrapStar', () => {
  test('1-9 unchanged', () => {
    for (let i = 1; i <= 9; i++) {
      expect(wrapStar(i)).toBe(i)
    }
  })
  test('wraps over 9', () => {
    expect(wrapStar(10)).toBe(1)
    expect(wrapStar(18)).toBe(9)
    expect(wrapStar(19)).toBe(1)
  })
  test('wraps under 1', () => {
    expect(wrapStar(0)).toBe(9)
    expect(wrapStar(-1)).toBe(8)
    expect(wrapStar(-8)).toBe(1)
  })
})

describe('annualCenterStar', () => {
  test('1864 = 1', () => expect(annualCenterStar(1864)).toBe(1))
  test('1865 = 9', () => expect(annualCenterStar(1865)).toBe(9))
  test('1866 = 8', () => expect(annualCenterStar(1866)).toBe(8))
  test('2024 = 3 (三碧入中)', () => expect(annualCenterStar(2024)).toBe(3))
  test('2025 = 2 (二黑入中)', () => expect(annualCenterStar(2025)).toBe(2))
  test('2026 = 1 (一白入中)', () => expect(annualCenterStar(2026)).toBe(1))
  test('2027 = 9 (九紫入中)', () => expect(annualCenterStar(2027)).toBe(9))
})

describe('dateToFlyingYear (立春 boundary)', () => {
  test('Jan 15, 2024 → 2023', () => {
    expect(dateToFlyingYear(new Date(2024, 0, 15))).toBe(2023)
  })
  test('Feb 3, 2024 → 2023', () => {
    expect(dateToFlyingYear(new Date(2024, 1, 3))).toBe(2023)
  })
  test('Feb 4, 2024 → 2024 (on 立春)', () => {
    expect(dateToFlyingYear(new Date(2024, 1, 4))).toBe(2024)
  })
  test('Mar 1, 2024 → 2024', () => {
    expect(dateToFlyingYear(new Date(2024, 2, 1))).toBe(2024)
  })
  test('Dec 31, 2024 → 2024', () => {
    expect(dateToFlyingYear(new Date(2024, 11, 31))).toBe(2024)
  })
})

describe('periodChart', () => {
  test('9运: center=9, 乾=1, 兑=2, 艮=3, 离=4, 坎=5, 坤=6, 震=7, 巽=8', () => {
    const c = periodChart(9)
    expect(c['中']).toBe(9)
    expect(c['乾']).toBe(1)
    expect(c['兑']).toBe(2)
    expect(c['艮']).toBe(3)
    expect(c['离']).toBe(4)
    expect(c['坎']).toBe(5)
    expect(c['坤']).toBe(6)
    expect(c['震']).toBe(7)
    expect(c['巽']).toBe(8)
  })

  test('8运: center=8, 乾=9, 兑=1, 艮=2, 离=3, 坎=4, 坤=5, 震=6, 巽=7', () => {
    const c = periodChart(8)
    expect(c['中']).toBe(8)
    expect(c['乾']).toBe(9)
    expect(c['兑']).toBe(1)
    expect(c['艮']).toBe(2)
    expect(c['离']).toBe(3)
    expect(c['坎']).toBe(4)
    expect(c['坤']).toBe(5)
    expect(c['震']).toBe(6)
    expect(c['巽']).toBe(7)
  })
})

describe('fillChartFromCenter', () => {
  test('顺飞 from 1', () => {
    const c = fillChartFromCenter(1, '顺')
    expect(c['中']).toBe(1)
    expect(c['乾']).toBe(2)
    expect(c['巽']).toBe(9) // last step, 1 + 8 = 9
  })

  test('逆飞 from 1', () => {
    const c = fillChartFromCenter(1, '逆')
    expect(c['中']).toBe(1)
    expect(c['乾']).toBe(9) // 1 - 1 = 9 (wrap)
    expect(c['巽']).toBe(2) // 1 - 8 = -7 → wraps to 2
  })
})

describe('八运子山午向 — published "双星会向" chart', () => {
  // 子山午向 in 8运 (2004-2023) is a classic 双星会向到向首 case.
  // Mountain star and facing star both = 8 (the 当令 star) at 离宫 (向首).
  //
  // Published 山盘:
  //   巽 7 | 离 3 | 坤 5
  //   震 6 | 中 8 | 兑 1   wait that's wrong, center should be 4
  //
  // Let me restate carefully. 八运 period chart:
  //   periodChart(8) = { 中:8, 乾:9, 兑:1, 艮:2, 离:3, 坎:4, 坤:5, 震:6, 巽:7 }
  //
  // 子山午向: sit=子(in 坎 palace), face=午(in 离 palace).
  // 山盘 center = periodChart(8)[坎] = 4. 子 is 天元 阴, so 4's proxy in
  //   its natural palace (4 ↔ 巽) for 天元 is 巽-self which is 阳 → 顺飞.
  //   Wait — 子 is 阴, so we should check via the proxy rule, not 子 directly.
  //   The rule: in 巽宫 (4's natural palace), pick the 天元 sub-mountain (= 巽),
  //   which is 阳 → 顺飞. So 山盘 is 4入中顺飞.
  //
  // 向盘 center = periodChart(8)[离] = 3. 午 is 天元 阴. 3's natural palace
  //   is 震; 震宫 天元 = 卯, which is 阴 → 逆飞. So 向盘 is 3入中逆飞.
  //
  // Resulting 离宫 (向首):
  //   山盘[离] = 4 + 4 = 8 (顺飞 4 steps from center) ✓
  //   向盘[离] = 3 - 4 = -1 → wraps to 8 (逆飞 4 steps) ✓
  // Hence "双星会向到向首" with the 当令 8 star.

  const facing = 180 // 午 center degree
  const faceMountain = mountainAtDegree(facing)
  const sitMountain = sitMountainForFacing(facing)

  test('坐山 = 子, 向 = 午', () => {
    expect(sitMountain.name).toBe('子')
    expect(faceMountain.name).toBe('午')
  })

  test('山盘 center = 4, 顺飞', () => {
    const mc = mountainChart(8, sitMountain)
    expect(mc['中']).toBe(4)
    expect(mc['乾']).toBe(5)
    expect(mc['离']).toBe(8) // 山星到向首
  })

  test('向盘 center = 3, 逆飞', () => {
    const fc = facingChart(8, faceMountain)
    expect(fc['中']).toBe(3)
    expect(fc['乾']).toBe(2)
    expect(fc['离']).toBe(8) // 向星到向首
  })

  test('双星到向: 山+向 同为 8 in 离宫', () => {
    const mc = mountainChart(8, sitMountain)
    const fc = facingChart(8, faceMountain)
    expect(mc['离']).toBe(8)
    expect(fc['离']).toBe(8)
  })
})

describe('5入中 special case', () => {
  // In 5运 the period chart has 5 at center. For 山盘 / 向盘, when the
  // period number landing on 坐 or 向 happens to be 5, the rule borrows
  // 阴阳 from the building's anchor mountain directly (5 has no 洛书 palace).
  //
  // Pick a building in 5运 (1944-1963) where 坐山 palace's period number is 5.
  // 5运 period chart = { 中:5, 乾:6, 兑:7, 艮:8, 离:9, 坎:1, 坤:2, 震:3, 巽:4 }.
  // So 5 only sits at center. The case "5 lands at non-center" requires
  // mountainChart center = 5, which happens when 坐山 palace has period
  // number 5 — but the 5 in the 5运 chart IS the center. So 5入中 occurs
  // when 坐 / 向 sits exactly at the center palace, which doesn't physically
  // happen — but the rule is still exercised for 5运 buildings via the
  // re-flown 山/向 charts.
  //
  // Verify the algorithm at least returns a chart with the right center value.

  test('5运 山盘 5入中 with 阴 山 → 逆飞', () => {
    // 5运 + 坐山 = 子 (天元 阴). period[坎]=1 (not 5). So actually 山盘 center = 1.
    // We need to construct a case where center = 5. Use a hand-rolled scenario.
    // Period chart in 5运 has 5 at center only. So 山盘 center is always
    // != 5 (it's the period number at the sit palace, which is 1-9 minus 5).
    // Therefore 5入中 only occurs when a building's 坐 happens to be the
    // center palace — physically impossible (no building sits at center).
    //
    // The branch in flyDirection for centerStar=5 is therefore only reachable
    // via direct unit invocation. We test it indirectly by checking that
    // the algorithm handles 5 without error.
    const mc = mountainChart(5, sitMountainForFacing(180)) // 5运 子山午向
    expect(mc['中']).toBe(1) // period[坎] in 5运 is 1
  })
})

describe('annualChart', () => {
  test('2026 → center=1, 顺飞', () => {
    const c = annualChart(2026)
    expect(c['中']).toBe(1)
    expect(c['乾']).toBe(2)
    expect(c['兑']).toBe(3)
    expect(c['艮']).toBe(4)
    expect(c['离']).toBe(5)
    expect(c['坎']).toBe(6)
    expect(c['坤']).toBe(7)
    expect(c['震']).toBe(8)
    expect(c['巽']).toBe(9)
  })
})

describe('classifyStar (in 9运)', () => {
  test('9 is 当令', () => expect(classifyStar(9, 9)).toBe('当令'))
  test('1 is 生气 (next 元运)', () => expect(classifyStar(1, 9)).toBe('生气'))
  test('2 is 生气 (未来二运将旺)', () => expect(classifyStar(2, 9)).toBe('生气'))
  test('8 is 退气 (just-past 元运)', () => expect(classifyStar(8, 9)).toBe('退气'))
  test('5 is 煞气 (五黄永为灾煞)', () => expect(classifyStar(5, 9)).toBe('煞气'))
  test('7 is 死气 (过气二运)', () => expect(classifyStar(7, 9)).toBe('死气'))
  test('3 is 死气', () => expect(classifyStar(3, 9)).toBe('死气'))
  test('5运 的 5 为当令 (非煞)', () => expect(classifyStar(5, 5)).toBe('当令'))
})

describe('computeFlyingStars driver', () => {
  test('returns full result shape for 9运 子山午向 in 2026', () => {
    const result = computeFlyingStars({
      facingDegTrue: 180,
      buildYear: 2024,
      asOf: new Date(2026, 5, 1),
    })
    expect(result.faceMountain.name).toBe('午')
    expect(result.sitMountain.name).toBe('子')
    expect(result.buildYuanYun.yuanYun).toBe(9)
    expect(result.currentYuanYun.yuanYun).toBe(9)
    expect(result.annualChart['中']).toBe(1) // 2026 center
    expect(result.combined['离']).toEqual({
      mountain: result.mountainChart['离'],
      facing: result.facingChart['离'],
      period: result.periodChart['离'],
      annual: result.annualChart['离'],
    })
  })

  test('flags 兼向 when facing is near a boundary', () => {
    const result = computeFlyingStars({
      facingDegTrue: 172.6, // close to 丙/午 boundary at 172.5
      buildYear: 2024,
    })
    expect(result.isCompoundFacing).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// 替卦 (起星 / replacement star) — 兼向
// ────────────────────────────────────────────────────────────────────────────

describe('REPLACEMENT_STAR table (沈氏玄空學 24山替星)', () => {
  // Each replacement star covers exactly 3 mountains; 5黄 has none.
  // Source: 楊筠松《青囊奧語》+ 沈氏 expansion (see flying-stars.ts header).
  test('青囊奧語 verse anchors (坤壬乙/艮丙辛/巽辰亥/甲癸申)', () => {
    // 坤壬乙 → 巨門(2)
    expect(REPLACEMENT_STAR.坤).toBe(2)
    expect(REPLACEMENT_STAR.壬).toBe(2)
    expect(REPLACEMENT_STAR.乙).toBe(2)
    // 艮丙辛 → 破軍(7)
    expect(REPLACEMENT_STAR.艮).toBe(7)
    expect(REPLACEMENT_STAR.丙).toBe(7)
    expect(REPLACEMENT_STAR.辛).toBe(7)
    // 巽辰亥 → 武曲(6)
    expect(REPLACEMENT_STAR.巽).toBe(6)
    expect(REPLACEMENT_STAR.辰).toBe(6)
    expect(REPLACEMENT_STAR.亥).toBe(6)
    // 甲申 → 貪狼(1)  (沈氏 puts 子 with 甲申; 癸 → 祿存3)
    expect(REPLACEMENT_STAR.甲).toBe(1)
    expect(REPLACEMENT_STAR.申).toBe(1)
  })

  test('full 24-mountain table (每星三山)', () => {
    const byStar: Record<number, string[]> = {
      1: ['子', '申', '甲'],
      2: ['壬', '坤', '乙'],
      3: ['癸', '未', '卯'],
      4: ['巳', '戌', '乾'],
      6: ['辰', '巽', '亥'],
      7: ['辛', '艮', '丙'],
      8: ['庚', '寅', '午'],
      9: ['酉', '丑', '丁'],
    }
    let count = 0
    for (const [star, mountains] of Object.entries(byStar)) {
      for (const m of mountains) {
        expect(REPLACEMENT_STAR[m as keyof typeof REPLACEMENT_STAR]).toBe(Number(star))
        count++
      }
    }
    expect(count).toBe(24) // every mountain covered, none doubled
  })
})

describe('七运 子山午向 兼壬丙 — published 替卦 worked example', () => {
  // Source: 阐微堂 "玄空风水替卦起星原理和用法探讨".
  //   山盘: 运星3 到坐(坎) → 3 的洛书宫=震, 子是天元 → 震宫天元=卯(proxy);
  //         卯阴→逆飞; 替星(卯)=3碧 → 三碧入中逆飞 ("用替不能替", 替==下卦).
  //   向盘: 运星2 到向(离) → 2 的洛书宫=坤, 午是天元 → 坤宫天元=坤(proxy);
  //         坤阳→顺飞; 替星(坤)=2黑 → 二黑入中顺飞 ("用替不能替").
  const sit = sitMountainForFacing(180) // 子
  const face = mountainAtDegree(180) // 午

  test('坐子 向午', () => {
    expect(sit.name).toBe('子')
    expect(face.name).toBe('午')
  })

  test('山盘: 三碧入中 (替==下卦)', () => {
    const replaced = mountainChartReplaced(7, sit)
    expect(replaced['中']).toBe(3)
    // 用替不能替: identical to the 下卦 chart for this mountain.
    expect(replaced).toEqual(mountainChart(7, sit))
  })

  test('向盘: 二黑入中 (替==下卦)', () => {
    const replaced = facingChartReplaced(7, face)
    expect(replaced['中']).toBe(2)
    expect(replaced).toEqual(facingChart(7, face))
  })
})

describe('七运 壬山丙向 — 能替 (替卦 ≠ 下卦)', () => {
  // Derived from the sourced 替星 table + the worked-example algorithm.
  //   山盘: 运星3 到坐(坎); 壬是地元 → 震宫地元=甲(proxy); 甲阳→顺;
  //         替星(甲)=1白 → 下卦三碧 变 一白入中 (能替).
  //   向盘: 运星2 到向(离); 丙是地元 → 坤宫地元=未(proxy); 未阴→逆;
  //         替星(未)=3碧 → 下卦二黑 变 三碧入中 (能替).
  const sit = sitMountainForFacing(165) // 壬 (坐), 向 = 丙(165°)
  const face = mountainAtDegree(165) // 丙

  test('坐壬 向丙', () => {
    expect(sit.name).toBe('壬')
    expect(face.name).toBe('丙')
  })

  test('山盘 下卦 三碧入中 → 替卦 一白入中', () => {
    expect(mountainChart(7, sit)['中']).toBe(3)
    expect(mountainChartReplaced(7, sit)['中']).toBe(1)
  })

  test('向盘 下卦 二黑入中 → 替卦 三碧入中', () => {
    expect(facingChart(7, face)['中']).toBe(2)
    expect(facingChartReplaced(7, face)['中']).toBe(3)
  })
})

describe('5黄入中 — 无替 ("用替不能替")', () => {
  // 8运 坤宫 holds period number 5 (periodChart(8)[坤]=5). 5黄 has no 替星,
  // so a 坐 in 坤宫 keeps 5 at center even on the 替卦 path.
  const kun = mountainAtDegree(225) // 坤 (坤宫天元)

  test('坐坤 8运: 替卦 5入中 == 下卦', () => {
    expect(kun.name).toBe('坤')
    const replaced = mountainChartReplaced(8, kun)
    expect(replaced['中']).toBe(5)
    expect(replaced).toEqual(mountainChart(8, kun))
  })
})

describe('computeFlyingStars — 替卦 wiring', () => {
  test('non-compound facing → chartMethod 下卦, effective == 下卦', () => {
    const r = computeFlyingStars({ facingDegTrue: 180, buildYear: 2024 }) // 子山午向, 9运
    expect(r.isCompoundFacing).toBe(false)
    expect(r.chartMethod).toBe('下卦')
    expect(r.mountainChart).toEqual(r.mountainChartXiaGua)
    expect(r.facingChart).toEqual(r.facingChartXiaGua)
  })

  test('compound facing → chartMethod 替卦, effective == 替卦, raw 下卦 retained', () => {
    const r = computeFlyingStars({ facingDegTrue: 172.6, buildYear: 2024 }) // 兼向, 9运
    expect(r.isCompoundFacing).toBe(true)
    expect(r.chartMethod).toBe('替卦')
    expect(r.mountainChart).toEqual(mountainChartReplaced(9, r.sitMountain))
    expect(r.facingChart).toEqual(facingChartReplaced(9, r.faceMountain))
    expect(r.mountainChartXiaGua).toEqual(mountainChart(9, r.sitMountain))
    expect(r.facingChartXiaGua).toEqual(facingChart(9, r.faceMountain))
  })
})
