/**
 * 大运计算引擎测试
 *
 * 测试覆盖:
 * 1. 排运方向（阳男阴女顺排/阴男阳女逆排）
 * 2. 起运年龄计算（3天折1年规则）
 * 3. 大运干支序列正确性
 * 4. 查询辅助函数
 * 5. 流年计算
 * 6. 时间轴构建
 * 7. AI Prompt 格式化
 * 8. 边界情况（生于节日当天、年末年初等）
 */

import { describe, expect, test } from 'bun:test'
import type { Gender } from '../dayun'
import {
  buildTimeline,
  calculateDaYun,
  formatDaYunForPrompt,
  getDaYunAtAge,
  getDaYunAtYear,
  getDaYunDirection,
  getLiuNian,
  getLiuNianRange,
} from '../dayun'
import type { HeavenlyStem } from '../types'

// ========================================
// 1. 排运方向
// ========================================

describe('getDaYunDirection — 排运方向', () => {
  test('阳干+男 → 顺排', () => {
    const yangStems: HeavenlyStem[] = ['甲', '丙', '戊', '庚', '壬']
    for (const stem of yangStems) {
      expect(getDaYunDirection(stem, '男')).toBe('顺')
    }
  })

  test('阳干+女 → 逆排', () => {
    const yangStems: HeavenlyStem[] = ['甲', '丙', '戊', '庚', '壬']
    for (const stem of yangStems) {
      expect(getDaYunDirection(stem, '女')).toBe('逆')
    }
  })

  test('阴干+男 → 逆排', () => {
    const yinStems: HeavenlyStem[] = ['乙', '丁', '己', '辛', '癸']
    for (const stem of yinStems) {
      expect(getDaYunDirection(stem, '男')).toBe('逆')
    }
  })

  test('阴干+女 → 顺排', () => {
    const yinStems: HeavenlyStem[] = ['乙', '丁', '己', '辛', '癸']
    for (const stem of yinStems) {
      expect(getDaYunDirection(stem, '女')).toBe('顺')
    }
  })

  test('全部 20 种组合覆盖', () => {
    const allStems: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const genders: Gender[] = ['男', '女']
    let count = 0
    for (const stem of allStems) {
      for (const gender of genders) {
        const dir = getDaYunDirection(stem, gender)
        expect(dir === '顺' || dir === '逆').toBe(true)
        count++
      }
    }
    expect(count).toBe(20)
  })
})

// ========================================
// 2. 大运计算 — 已知案例验证
// ========================================

describe('calculateDaYun — 庚午年男（1990-03-15）', () => {
  // 1990年3月15日 → 年柱 庚午（庚=阳干，男=顺排）
  // 月柱: 3月15日在惊蛰(3/6)后清明(4/5)前 → 卯月
  // 庚年卯月(monthBranchIdx=1): 五虎遁 → 庚年起戊寅 → 卯月=己卯
  const result = calculateDaYun({ year: 1990, month: 3, day: 15, hour: 14 }, '男')

  test('方向为顺排', () => {
    expect(result.direction).toBe('顺')
  })

  test('四柱年柱为庚午', () => {
    expect(result.pillars.year.label).toBe('庚午')
  })

  test('起运年龄为正整数', () => {
    expect(result.startAge.years).toBeGreaterThanOrEqual(0)
    expect(result.startAge.rounded).toBeGreaterThanOrEqual(0)
    expect(result.startAge.rounded).toBeLessThanOrEqual(12)
  })

  test('默认 8 步大运', () => {
    expect(result.steps).toHaveLength(8)
  })

  test('每步大运跨度 10 年', () => {
    for (const step of result.steps) {
      expect(step.endAge - step.startAge).toBe(9) // 0-9 or 5-14 etc.
    }
  })

  test('大运序号连续递增', () => {
    for (let i = 0; i < result.steps.length; i++) {
      expect(result.steps[i]!.index).toBe(i + 1)
    }
  })

  test('大运年龄区间无缝衔接', () => {
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i]!.startAge).toBe(result.steps[i - 1]!.endAge + 1)
    }
  })

  test('顺排干支序列递增', () => {
    const monthIdx = result.pillars.month.index
    for (let i = 0; i < result.steps.length; i++) {
      const expected = ((monthIdx + i) % 60) + 1
      expect(result.steps[i]!.ganZhi.index).toBe(expected)
    }
  })

  test('起运年 = 出生年 + 起运年龄', () => {
    expect(result.startYear).toBe(1990 + result.startAge.rounded)
  })

  test('每步startYear = 出生年 + startAge', () => {
    for (const step of result.steps) {
      expect(step.startYear).toBe(1990 + step.startAge)
    }
  })
})

describe('calculateDaYun — 庚午年女（1990-03-15）', () => {
  const result = calculateDaYun({ year: 1990, month: 3, day: 15, hour: 14 }, '女')

  test('方向为逆排（阳干+女）', () => {
    expect(result.direction).toBe('逆')
  })

  test('逆排干支序列递减', () => {
    const monthIdx = result.pillars.month.index
    for (let i = 0; i < result.steps.length; i++) {
      const rawIdx = monthIdx - (i + 1)
      const expected = ((rawIdx % 60) + 60) % 60 || 60
      expect(result.steps[i]!.ganZhi.index).toBe(expected)
    }
  })
})

describe('calculateDaYun — 辛未年男（1991-08-20）逆排', () => {
  // 1991年8月20日 → 年柱 辛未（辛=阴干，男=逆排）
  const result = calculateDaYun({ year: 1991, month: 8, day: 20, hour: 10 }, '男')

  test('方向为逆排', () => {
    expect(result.direction).toBe('逆')
  })

  test('年柱为辛未', () => {
    expect(result.pillars.year.label).toBe('辛未')
  })

  test('逆排大运干支递减', () => {
    const monthIdx = result.pillars.month.index
    for (let i = 0; i < result.steps.length; i++) {
      const rawIdx = monthIdx - (i + 1)
      const expected = ((rawIdx % 60) + 60) % 60 || 60
      expect(result.steps[i]!.ganZhi.index).toBe(expected)
    }
  })
})

describe('calculateDaYun — 辛未年女（1991-08-20）顺排', () => {
  const result = calculateDaYun({ year: 1991, month: 8, day: 20, hour: 10 }, '女')

  test('方向为顺排（阴干+女）', () => {
    expect(result.direction).toBe('顺')
  })
})

// ========================================
// 3. 起运年龄范围验证
// ========================================

describe('起运年龄范围', () => {
  test('起运年龄不超过 12 岁（理论最大值约 10 岁）', () => {
    // 每两个节之间约 30 天, 30/3 = 10 年, 所以最大约 10
    const cases = [
      { y: 1985, m: 1, d: 1, g: '男' as Gender },
      { y: 1990, m: 6, d: 15, g: '女' as Gender },
      { y: 2000, m: 12, d: 31, g: '男' as Gender },
      { y: 1975, m: 3, d: 8, g: '女' as Gender },
      { y: 2010, m: 9, d: 22, g: '男' as Gender },
    ]
    for (const { y, m, d, g } of cases) {
      const result = calculateDaYun({ year: y, month: m, day: d }, g)
      expect(result.startAge.rounded).toBeGreaterThanOrEqual(0)
      expect(result.startAge.rounded).toBeLessThanOrEqual(12)
    }
  })

  test('起运年龄精确: 余数月 ∈ {0, 4, 8}', () => {
    const cases = [
      { y: 1990, m: 3, d: 15, g: '男' as Gender },
      { y: 1995, m: 7, d: 20, g: '女' as Gender },
      { y: 2000, m: 1, d: 10, g: '男' as Gender },
    ]
    for (const { y, m, d, g } of cases) {
      const result = calculateDaYun({ year: y, month: m, day: d }, g)
      expect([0, 4, 8]).toContain(result.startAge.months)
    }
  })

  test('起运描述文本格式正确', () => {
    const result = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男')
    expect(result.startAge.description).toMatch(/^\d+岁(\d+个月)?$/)
  })
})

// ========================================
// 4. 查询辅助函数
// ========================================

describe('getDaYunAtAge', () => {
  const result = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男')

  test('起运年龄内查到第一步', () => {
    const firstStep = result.steps[0]!
    const found = getDaYunAtAge(result, firstStep.startAge)
    expect(found).toBeTruthy()
    expect(found!.index).toBe(1)
  })

  test('中间年龄查到正确步', () => {
    const step3 = result.steps[2]!
    const midAge = step3.startAge + 5
    const found = getDaYunAtAge(result, midAge)
    expect(found).toBeTruthy()
    expect(found!.index).toBe(3)
  })

  test('年龄过小返回 null', () => {
    const found = getDaYunAtAge(result, 0)
    // Might be null if startAge > 0
    if (result.startAge.rounded > 0) {
      expect(found).toBeNull()
    }
  })

  test('年龄过大返回 null', () => {
    const found = getDaYunAtAge(result, 200)
    expect(found).toBeNull()
  })
})

describe('getDaYunAtYear', () => {
  const result = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男')

  test('当前年份查到正确大运', () => {
    const year2026 = getDaYunAtYear(result, 2026)
    if (year2026) {
      expect(2026).toBeGreaterThanOrEqual(year2026.startYear)
      expect(2026).toBeLessThanOrEqual(year2026.endYear)
    }
  })

  test('出生年查大运', () => {
    const birthYearStep = getDaYunAtYear(result, 1990)
    // May be null if startAge > 0 (first 大运 starts after birth)
    if (birthYearStep) {
      expect(1990).toBeGreaterThanOrEqual(birthYearStep.startYear)
    }
  })
})

// ========================================
// 5. 流年计算
// ========================================

describe('getLiuNian', () => {
  test('2024年甲辰', () => {
    const result = getLiuNian(2024)
    expect(result.label).toBe('甲辰')
  })

  test('2025年乙巳', () => {
    const result = getLiuNian(2025)
    expect(result.label).toBe('乙巳')
  })

  test('2026年丙午', () => {
    const result = getLiuNian(2026)
    expect(result.label).toBe('丙午')
  })

  test('2000年庚辰', () => {
    const result = getLiuNian(2000)
    expect(result.label).toBe('庚辰')
  })

  test('1990年庚午', () => {
    const result = getLiuNian(1990)
    expect(result.label).toBe('庚午')
  })
})

describe('getLiuNianRange', () => {
  test('返回正确数量', () => {
    const range = getLiuNianRange(1990, 2020, 2029)
    expect(range).toHaveLength(10)
  })

  test('虚岁计算正确', () => {
    const range = getLiuNianRange(1990, 2020, 2020)
    expect(range[0]!.age).toBe(31) // 2020 - 1990 + 1
  })

  test('年份连续', () => {
    const range = getLiuNianRange(1990, 2020, 2029)
    for (let i = 0; i < range.length; i++) {
      expect(range[i]!.year).toBe(2020 + i)
    }
  })

  test('干支与 getLiuNian 一致', () => {
    const range = getLiuNianRange(1990, 2024, 2026)
    expect(range[0]!.ganZhi.label).toBe('甲辰')
    expect(range[1]!.ganZhi.label).toBe('乙巳')
    expect(range[2]!.ganZhi.label).toBe('丙午')
  })
})

// ========================================
// 6. 时间轴构建
// ========================================

describe('buildTimeline', () => {
  const daYun = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男')
  const timeline = buildTimeline(daYun, 1990)

  test('条目数 = 大运步数', () => {
    expect(timeline).toHaveLength(daYun.steps.length)
  })

  test('每步大运包含 10 个流年', () => {
    for (const entry of timeline) {
      expect(entry.liuNianList).toHaveLength(10)
    }
  })

  test('每步大运的流年年份范围正确', () => {
    for (const entry of timeline) {
      expect(entry.liuNianList[0]!.year).toBe(entry.daYun.startYear)
      expect(entry.liuNianList[9]!.year).toBe(entry.daYun.endYear)
    }
  })

  test('流年虚岁递增', () => {
    for (const entry of timeline) {
      for (let i = 1; i < entry.liuNianList.length; i++) {
        expect(entry.liuNianList[i]!.age).toBe(entry.liuNianList[i - 1]!.age + 1)
      }
    }
  })
})

// ========================================
// 7. AI Prompt 格式化
// ========================================

describe('formatDaYunForPrompt', () => {
  const daYun = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男')

  test('包含大运标题', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('## 大运排盘')
  })

  test('包含排运方向', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('顺排')
  })

  test('包含起运年龄', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('起运年龄')
  })

  test('高亮当前大运', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('◀ 当前')
  })

  test('包含当前流年', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('丙午')
  })

  test('包含表格', () => {
    const text = formatDaYunForPrompt(daYun, 2026)
    expect(text).toContain('| 序 | 大运 |')
  })
})

// ========================================
// 8. 边界情况
// ========================================

describe('边界情况', () => {
  test('自定义步数: 12 步覆盖 120 年', () => {
    const result = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男', 12)
    expect(result.steps).toHaveLength(12)
  })

  test('自定义步数: 1 步', () => {
    const result = calculateDaYun({ year: 1990, month: 3, day: 15 }, '男', 1)
    expect(result.steps).toHaveLength(1)
  })

  test('年初出生 (1月1日)', () => {
    const result = calculateDaYun({ year: 2000, month: 1, day: 1 }, '男')
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.direction).toBeDefined()
  })

  test('年末出生 (12月31日)', () => {
    const result = calculateDaYun({ year: 2000, month: 12, day: 31 }, '女')
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.direction).toBeDefined()
  })

  test('闰年 2月29日', () => {
    const result = calculateDaYun({ year: 2000, month: 2, day: 29 }, '男')
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.pillars.year.label).toBe('庚辰')
  })

  test('不同世纪: 1950年代', () => {
    const result = calculateDaYun({ year: 1955, month: 6, day: 10 }, '女')
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.startAge.rounded).toBeLessThanOrEqual(12)
  })

  test('不同世纪: 2020年代', () => {
    const result = calculateDaYun({ year: 2023, month: 9, day: 1 }, '男')
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.startAge.rounded).toBeLessThanOrEqual(12)
  })

  test('生于节气当天附近应给出合理起运年龄', () => {
    // 立春 2000 约 2月4日
    const result = calculateDaYun({ year: 2000, month: 2, day: 4 }, '男')
    expect(result.startAge.rounded).toBeGreaterThanOrEqual(0)
    expect(result.startAge.rounded).toBeLessThanOrEqual(11)
  })
})

// ========================================
// 9. 男女对比（同一生辰，方向相反）
// ========================================

describe('同一生辰男女对比', () => {
  const input = { year: 1985, month: 5, day: 20, hour: 8 }
  const male = calculateDaYun(input, '男')
  const female = calculateDaYun(input, '女')

  test('四柱完全相同', () => {
    expect(male.pillars.year.label).toBe(female.pillars.year.label)
    expect(male.pillars.month.label).toBe(female.pillars.month.label)
    expect(male.pillars.day.label).toBe(female.pillars.day.label)
    expect(male.pillars.hour.label).toBe(female.pillars.hour.label)
  })

  test('方向相反', () => {
    expect(male.direction).not.toBe(female.direction)
  })

  test('大运干支序列互为反向', () => {
    // 男顺女逆，或男逆女顺
    // 第 i 步: male.monthIdx + i 与 female.monthIdx - i
    const monthIdx = male.pillars.month.index
    for (let i = 0; i < male.steps.length; i++) {
      const maleExpectedRaw = monthIdx + (male.direction === '顺' ? i + 1 : -(i + 1))
      const femaleExpectedRaw = monthIdx + (female.direction === '顺' ? i + 1 : -(i + 1))
      const maleExpected = ((((maleExpectedRaw - 1) % 60) + 60) % 60) + 1
      const femaleExpected = ((((femaleExpectedRaw - 1) % 60) + 60) % 60) + 1
      expect(male.steps[i]!.ganZhi.index).toBe(maleExpected)
      expect(female.steps[i]!.ganZhi.index).toBe(femaleExpected)
    }
  })
})

// ========================================
// 10. 经典命例
// ========================================

describe('经典命例验证', () => {
  test('甲子年男(1984): 阳干+男=顺排', () => {
    const result = calculateDaYun({ year: 1984, month: 10, day: 15 }, '男')
    expect(result.direction).toBe('顺')
    expect(result.pillars.year.stem).toBe('甲')
  })

  test('乙丑年女(1985): 阴干+女=顺排', () => {
    const result = calculateDaYun({ year: 1985, month: 6, day: 1 }, '女')
    expect(result.direction).toBe('顺')
    expect(result.pillars.year.stem).toBe('乙')
  })

  test('壬申年男(1992): 阳干+男=顺排', () => {
    const result = calculateDaYun({ year: 1992, month: 11, day: 8 }, '男')
    expect(result.direction).toBe('顺')
    expect(result.pillars.year.stem).toBe('壬')
  })

  test('癸酉年女(1993): 阴干+女=顺排', () => {
    const result = calculateDaYun({ year: 1993, month: 4, day: 12 }, '女')
    expect(result.direction).toBe('顺')
    expect(result.pillars.year.stem).toBe('癸')
  })

  test('丁卯年男(1987): 阴干+男=逆排', () => {
    const result = calculateDaYun({ year: 1987, month: 7, day: 25 }, '男')
    expect(result.direction).toBe('逆')
    expect(result.pillars.year.stem).toBe('丁')
  })

  test('戊辰年女(1988): 阳干+女=逆排', () => {
    const result = calculateDaYun({ year: 1988, month: 2, day: 14 }, '女')
    expect(result.direction).toBe('逆')
    expect(result.pillars.year.stem).toBe('戊')
  })
})
