import { describe, expect, test } from 'bun:test'
import {
  calculateDailyAlmanac,
  dayClash,
  huangHeiDao,
  jianChu,
  LUMINARY_WEEKDAY,
  OFFICER_YIJI,
  pengZuTaboo,
  personalAlmanacOverlay,
  TWELVE_OFFICERS,
  TWENTY_EIGHT_MANSIONS,
  twentyEightMansions,
} from '../almanac'
import { getFourPillars } from '../ganzhi'
import { getMonthByJie } from '../jieqi'
import type { EarthlyBranch } from '../types'

const BRANCHES: EarthlyBranch[] = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]

/** 节-based 月建 地支 for a Gregorian date (matches calculateDailyAlmanac). */
function monthBranchByJie(year: number, month: number, day: number): EarthlyBranch {
  return BRANCHES[(getMonthByJie(year, month, day) + 2) % 12]!
}

describe('建除十二神 (jianChu)', () => {
  test('建 falls on the day whose 地支 matches the 月建', () => {
    expect(jianChu('寅', '寅')).toBe('建')
    expect(jianChu('子', '子')).toBe('建')
    expect(jianChu('午', '午')).toBe('建')
  })

  test('officers advance one per 地支 step', () => {
    expect(jianChu('寅', '卯')).toBe('除')
    expect(jianChu('寅', '辰')).toBe('满')
    expect(jianChu('寅', '丑')).toBe('闭') // the 地支 one step before 建
  })

  test('a full 12-officer cycle for 寅月', () => {
    const seq = Array.from({ length: 12 }, (_, i) => jianChu('寅', BRANCHES[(2 + i) % 12]!))
    expect(seq).toEqual([...TWELVE_OFFICERS])
  })
})

describe('二十八宿 (twentyEightMansions)', () => {
  test('the table has 28 mansions in 值日 order, 4 quadrants × 7', () => {
    expect(TWENTY_EIGHT_MANSIONS).toHaveLength(28)
    expect(TWENTY_EIGHT_MANSIONS[0]!.name).toBe('角')
    expect(TWENTY_EIGHT_MANSIONS[27]!.name).toBe('轸')
    const quadrants = [...new Set(TWENTY_EIGHT_MANSIONS.map((m) => m.quadrant))]
    expect(quadrants).toEqual(['青龙', '玄武', '白虎', '朱雀'])
    expect(TWENTY_EIGHT_MANSIONS.filter((m) => m.quadrant === '青龙')).toHaveLength(7)
  })

  test('verified anchors against published sources', () => {
    // 1998-03-15 = 房 (CSDN 二十八宿值日 formula worked example).
    const fang = twentyEightMansions({ year: 1998, month: 3, day: 15 })
    expect(fang.name).toBe('房')
    expect(fang.index).toBe(3)
    expect(fang.animal).toBe('兔') // 房日兔

    // 2026-06-12 = 娄 (huangli.com: 西方娄金狗).
    const lou = twentyEightMansions({ year: 2026, month: 6, day: 12 })
    expect(lou.name).toBe('娄')
    expect(lou.quadrant).toBe('白虎')
    expect(lou.luminary).toBe('金')
    expect(lou.animal).toBe('狗')

    // 2000-01-01 = 胃 (土曜, the day was a Saturday).
    expect(twentyEightMansions({ year: 2000, month: 1, day: 1 }).name).toBe('胃')
  })

  test('advances exactly one mansion per day and repeats every 28 days', () => {
    let cursor = new Date(Date.UTC(2026, 0, 1))
    let prevIdx = twentyEightMansions({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
    }).index
    for (let i = 0; i < 60; i++) {
      const next = new Date(cursor)
      next.setUTCDate(next.getUTCDate() + 1)
      const idx = twentyEightMansions({
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
      }).index
      expect(idx).toBe((prevIdx + 1) % 28)

      const plus28 = new Date(cursor)
      plus28.setUTCDate(plus28.getUTCDate() + 28)
      expect(
        twentyEightMansions({
          year: plus28.getUTCFullYear(),
          month: plus28.getUTCMonth() + 1,
          day: plus28.getUTCDate(),
        }).name
      ).toBe(
        twentyEightMansions({
          year: cursor.getUTCFullYear(),
          month: cursor.getUTCMonth() + 1,
          day: cursor.getUTCDate(),
        }).name
      )

      prevIdx = idx
      cursor = next
    }
  })

  test('七曜 is locked to the Gregorian weekday (the 日月火水木金土 origin)', () => {
    // This invariant catches any future drift of the anchor offset.
    const cursor = new Date(Date.UTC(2026, 5, 1))
    for (let i = 0; i < 90; i++) {
      const d = {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
      }
      const mansion = twentyEightMansions(d)
      expect(LUMINARY_WEEKDAY[mansion.luminary]).toBe(cursor.getUTCDay())
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  })
})

describe('建除 → 宜忌 preset (OFFICER_YIJI)', () => {
  test('canonical rows are present for all 12 officers', () => {
    expect(Object.keys(OFFICER_YIJI)).toHaveLength(12)
    expect(OFFICER_YIJI['成'].good).toContain('嫁娶')
    expect(OFFICER_YIJI['成'].good).toContain('开市')
    expect(OFFICER_YIJI['闭'].good).toContain('安葬')
    expect(OFFICER_YIJI['闭'].bad).toContain('开市')
    expect(OFFICER_YIJI['破'].bad).toContain('嫁娶')
  })
})

describe('日冲煞 (dayClash)', () => {
  test('六冲生肖 + 三煞方位', () => {
    // 子日冲午(马); 申子辰日 煞南
    expect(dayClash('子')).toEqual({ clash: { branch: '午', zodiac: '马' }, evilDirection: '南' })
    // 午日冲子(鼠); 寅午戌日 煞北
    expect(dayClash('午')).toEqual({ clash: { branch: '子', zodiac: '鼠' }, evilDirection: '北' })
    // 卯日冲酉(鸡); 亥卯未日 煞西
    expect(dayClash('卯')).toEqual({ clash: { branch: '酉', zodiac: '鸡' }, evilDirection: '西' })
  })
})

describe('calculateDailyAlmanac', () => {
  test('dayOfficer uses the 节-based 月建 (not the Gregorian month)', () => {
    const date = { year: 2026, month: 6, day: 12 }
    const pillars = getFourPillars({ ...date, hour: 0 })
    const almanac = calculateDailyAlmanac(date)
    const expectedOfficer = jianChu(
      monthBranchByJie(date.year, date.month, date.day),
      pillars.day.branch
    )
    expect(almanac.dayOfficer).toBe(expectedOfficer)
    expect(TWELVE_OFFICERS).toContain(almanac.dayOfficer)
  })

  test('assembles 二十八宿 / 建除宜忌 / 日冲 for a known day', () => {
    const almanac = calculateDailyAlmanac({ year: 2026, month: 6, day: 12 })
    expect(almanac.todayGanZhi).toBe('丁巳') // huangli.com: 丁巳日
    expect(almanac.mansion.name).toBe('娄')
    expect(almanac.dayOfficer).toBe('闭') // 午月 (芒种后) + 巳日 → 建前一位 = 闭
    // 丁巳日 → 巳 冲 亥(猪); 巳酉丑日 煞东
    expect(almanac.clash).toEqual({ branch: '亥', zodiac: '猪' })
    expect(almanac.evilDirection).toBe('东')
    // goodFor/avoid mirror the 建除 preset for that day's officer
    expect(almanac.goodFor).toEqual([...OFFICER_YIJI[almanac.dayOfficer].good])
    expect(almanac.avoid).toEqual([...OFFICER_YIJI[almanac.dayOfficer].bad])
  })

  test('exposes the day branch (日支)', () => {
    expect(calculateDailyAlmanac({ year: 2026, month: 6, day: 12 }).dayBranch).toBe('巳') // 丁巳日
  })
})

describe('对你而言 personal overlay (personalAlmanacOverlay)', () => {
  test('五行 relation drives the base fit verdict', () => {
    // 日主 庚(金): 土生金 → 生我 → 吉
    expect(
      personalAlmanacOverlay({ dayMasterStem: '庚' }, { dayElement: '土', dayBranch: '辰' })
    ).toMatchObject({
      relation: '生我',
      fit: '吉',
    })
    // 火克金 → 克我 → 凶
    expect(
      personalAlmanacOverlay({ dayMasterStem: '庚' }, { dayElement: '火', dayBranch: '午' })
    ).toMatchObject({
      relation: '克我',
      fit: '凶',
    })
    // 金克木 → 我克 → 平
    expect(
      personalAlmanacOverlay({ dayMasterStem: '庚' }, { dayElement: '木', dayBranch: '寅' })
    ).toMatchObject({
      relation: '我克',
      fit: '平',
    })
  })

  test('用神/忌神 override the raw relation', () => {
    const favored = personalAlmanacOverlay(
      { dayMasterStem: '庚', favorableElement: '木' },
      { dayElement: '木', dayBranch: '寅' }
    )
    expect(favored.fit).toBe('吉') // was 我克/平, lifted by 用神
    expect(favored.favorsToday).toBe(true)
    expect(favored.reasons).toContain('favorable_element_present')

    const harmed = personalAlmanacOverlay(
      { dayMasterStem: '庚', unfavorableElement: '土' },
      { dayElement: '土', dayBranch: '辰' }
    )
    expect(harmed.fit).toBe('凶') // was 生我/吉, dropped by 忌神
    expect(harmed.harmsToday).toBe(true)
    expect(harmed.reasons).toContain('unfavorable_element_present')
  })

  test('favorsToday/harmsToday are null when 用神 unknown', () => {
    const o = personalAlmanacOverlay({ dayMasterStem: '甲' }, { dayElement: '水', dayBranch: '子' })
    expect(o.favorsToday).toBeNull()
    expect(o.harmsToday).toBeNull()
  })

  test('personal 六冲 (day branch 冲 本命支)', () => {
    const clash = personalAlmanacOverlay(
      { dayMasterStem: '甲', birthBranch: '子' },
      { dayElement: '火', dayBranch: '午' }
    )
    expect(clash.personalClash).toBe(true) // 子午冲
    expect(clash.reasons).toContain('personal_clash')

    const noClash = personalAlmanacOverlay(
      { dayMasterStem: '甲', birthBranch: '子' },
      { dayElement: '火', dayBranch: '巳' }
    )
    expect(noClash.personalClash).toBe(false)
  })

  test('integrates with calculateDailyAlmanac (2026-06-12 = 丁巳)', () => {
    const a = calculateDailyAlmanac({ year: 2026, month: 6, day: 12 })
    const o = personalAlmanacOverlay(
      { dayMasterStem: '庚', birthBranch: '亥' },
      { dayElement: a.todayElement, dayBranch: a.dayBranch }
    )
    expect(o.relation).toBe('克我') // 丁(火) 克 庚(金)
    expect(o.fit).toBe('凶')
    expect(o.personalClash).toBe(true) // 亥 冲 巳
  })
})

describe('黄道黑道十二神 (huangHeiDao)', () => {
  test('2026-06-12 (午月 巳日) = 玄武 黑道 (汉程/知之黄历: 值神 玄武 凶)', () => {
    expect(huangHeiDao('午', '巳')).toEqual({ name: '玄武', lucky: false })
  })

  test('青龙 starts on the 月支-specific 地支 and is 黄道 (口诀: 子午临申地 / 寅申须加子)', () => {
    expect(huangHeiDao('午', '申')).toEqual({ name: '青龙', lucky: true })
    expect(huangHeiDao('寅', '子')).toEqual({ name: '青龙', lucky: true })
  })

  test('every 月支 has exactly 6 黄道 + 6 黑道 across the 12 日支', () => {
    for (const m of BRANCHES) {
      const luckyDays = BRANCHES.filter((d) => huangHeiDao(m, d).lucky).length
      expect(luckyDays).toBe(6)
    }
  })

  test('calculateDailyAlmanac surfaces the 值神', () => {
    expect(calculateDailyAlmanac({ year: 2026, month: 6, day: 12 }).dayGod).toEqual({
      name: '玄武',
      lucky: false,
    })
  })
})

describe('彭祖百忌 (pengZuTaboo)', () => {
  test('2026-06-12 丁巳日 = 丁不剃头 / 巳不远行 (汉程黄历)', () => {
    const expected = { stem: '丁不剃头头必生疮', branch: '巳不远行财物伏藏' }
    expect(pengZuTaboo('丁', '巳')).toEqual(expected)
    expect(calculateDailyAlmanac({ year: 2026, month: 6, day: 12 }).pengZu).toEqual(expected)
  })

  test('甲子日 = 甲不开仓 / 子不问卜', () => {
    expect(pengZuTaboo('甲', '子')).toEqual({
      stem: '甲不开仓财物耗散',
      branch: '子不问卜自惹祸殃',
    })
  })
})
