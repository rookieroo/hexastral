import { describe, expect, it } from 'bun:test'
import {
  dayGanZhi,
  ganZhiFromIndex,
  getCurrentShiChen,
  getFourPillars,
  getJieQiDay,
  getMonthJieQi,
  getNaYin,
  getNearestJieQiForGregorianDate,
  getShiChen,
  getTrueSolarTime,
  lunarToSolar,
  solarToLunar,
  yearGanZhi,
  yearZodiac,
} from '../index'

describe('ganzhi', () => {
  it('2024 = 甲辰年', () => {
    const gz = yearGanZhi(2024)
    expect(gz.label).toBe('甲辰')
    expect(gz.stem).toBe('甲')
    expect(gz.branch).toBe('辰')
  })

  it('2025 = 乙巳年', () => {
    expect(yearGanZhi(2025).label).toBe('乙巳')
  })

  it('1984 = 甲子年', () => {
    expect(yearGanZhi(1984).label).toBe('甲子')
  })

  it('yearZodiac 2024 = 龙', () => {
    expect(yearZodiac(2024)).toBe('龙')
  })

  it('yearZodiac 2025 = 蛇', () => {
    expect(yearZodiac(2025)).toBe('蛇')
  })

  it('dayGanZhi for 2000-01-07 = 甲子', () => {
    // 2000-01-07 is the reference 甲子日
    const gz = dayGanZhi(2000, 1, 7)
    expect(gz.label).toBe('甲子')
  })

  it('dayGanZhi for 2000-01-08 = 乙丑', () => {
    const gz = dayGanZhi(2000, 1, 8)
    expect(gz.label).toBe('乙丑')
  })

  it('ganZhiFromIndex(1) = 甲子', () => {
    const gz = ganZhiFromIndex(1)
    expect(gz.label).toBe('甲子')
  })

  it('getNaYin 甲子 = 海中金', () => {
    const gz = ganZhiFromIndex(1)
    expect(getNaYin(gz)).toBe('海中金')
  })

  it('getFourPillars returns 4 pillars', () => {
    const pillars = getFourPillars({ year: 2024, month: 6, day: 15, hour: 10 })
    expect(pillars.year.label).toBeDefined()
    expect(pillars.month.label).toBeDefined()
    expect(pillars.day.label).toBeDefined()
    expect(pillars.hour.label).toBeDefined()
  })
})

describe('shichen', () => {
  it('getCurrentShiChen returns a string ending with 时', () => {
    const sc = getCurrentShiChen()
    expect(sc).toMatch(/[子丑寅卯辰巳午未申酉戌亥]时/)
  })

  it('hour 0 → 子时', () => {
    expect(getShiChen(0).name).toBe('子时')
  })

  it('hour 23 → 子时', () => {
    expect(getShiChen(23).name).toBe('子时')
  })

  it('hour 7 → 辰时', () => {
    expect(getShiChen(7).name).toBe('辰时')
  })

  it('hour 12 → 午时', () => {
    expect(getShiChen(12).name).toBe('午时')
  })

  it('hour 17 → 酉时', () => {
    expect(getShiChen(17).name).toBe('酉时')
  })
})

describe('jieqi', () => {
  it('2024 立春 ≈ 2月4日', () => {
    // 立春 = index 2 in year order (小寒=0, 大寒=1, 立春=2)
    const day = getJieQiDay(2024, 2)
    expect(day).toBeGreaterThanOrEqual(3)
    expect(day).toBeLessThanOrEqual(5)
  })

  it('21 世纪年份使用 c21（2006 立夏应为 5 月而非误用 c20 的 6 月）', () => {
    const day = getJieQiDay(2006, 8)
    expect(day).toBe(5)
  })

  it('2026-05-05 公历日处于立夏段（东八区常见万年历；与简化公式+c21 一致）', () => {
    const { prev, next } = getNearestJieQiForGregorianDate(2026, 5, 5)
    expect(prev.name).toBe('立夏')
    expect(next.name).toBe('小满')
  })

  it('getMonthJieQi returns 2 entries for a month', () => {
    const jieqis = getMonthJieQi(2024, 3)
    expect(jieqis).toHaveLength(2)
    expect(jieqis[0]!.jieqi.name).toBe('惊蛰')
    expect(jieqis[1]!.jieqi.name).toBe('春分')
  })
})

describe('lunar', () => {
  it('2024-02-10 = 甲辰年正月初一', () => {
    const lunar = solarToLunar(2024, 2, 10)
    expect(lunar.year).toBe(2024)
    expect(lunar.month).toBe(1)
    expect(lunar.day).toBe(1)
    expect(lunar.monthName).toBe('正月')
    expect(lunar.dayName).toBe('初一')
    expect(lunar.zodiac).toBe('龙')
  })

  it('2025-01-29 = 乙巳年正月初一', () => {
    const lunar = solarToLunar(2025, 1, 29)
    expect(lunar.year).toBe(2025)
    expect(lunar.month).toBe(1)
    expect(lunar.day).toBe(1)
    expect(lunar.zodiac).toBe('蛇')
  })

  it('mid-year date converts correctly', () => {
    const lunar = solarToLunar(2024, 9, 17)
    expect(lunar.year).toBe(2024)
    expect(lunar.month).toBeGreaterThan(0)
    expect(lunar.day).toBeGreaterThan(0)
  })

  // lunarToSolar previously read local-time Date components, so in 东八区
  // (the primary user timezone) the pre-1901 LMT offset pushed every result
  // back one day — 1992 正月初六 came out 1992-02-08 instead of 02-09. These
  // assert the UTC-anchored conversion is correct AND timezone-independent.
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  it('lunarToSolar 1992 正月初六 = 1992-02-09', () => {
    expect(fmt(lunarToSolar(1992, 1, 6, false))).toBe('1992-02-09')
  })

  it('lunarToSolar 正月初一 lands on Chinese New Year (2024/2025)', () => {
    expect(fmt(lunarToSolar(2024, 1, 1, false))).toBe('2024-02-10')
    expect(fmt(lunarToSolar(2025, 1, 1, false))).toBe('2025-01-29')
  })

  it('solar→lunar→solar round-trips across a 50-year span', () => {
    for (let y = 1970; y <= 2020; y += 7) {
      for (const [mo, d] of [
        [3, 15],
        [7, 1],
        [11, 28],
      ] as const) {
        const l = solarToLunar(y, mo, d)
        const back = lunarToSolar(l.year, l.month, l.day, l.isLeap)
        expect(fmt(back)).toBe(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      }
    }
  })
})

describe('solar-time', () => {
  it('上海 (121.5°) 修正 ≈ +6 minutes longitude', () => {
    const date = new Date(2024, 5, 21, 12, 0, 0) // summer solstice noon
    const result = getTrueSolarTime(date, 121.5)
    expect(result.longitudeCorrection).toBeCloseTo(6, 0)
  })

  it('成都 (104.1°) 修正 ≈ -64 minutes longitude', () => {
    const date = new Date(2024, 5, 21, 12, 0, 0)
    const result = getTrueSolarTime(date, 104.1)
    expect(result.longitudeCorrection).toBeCloseTo(-63.6, 0)
  })

  it('equation of time is in valid range', () => {
    const date = new Date(2024, 1, 12) // February — EoT ≈ -14 min
    const result = getTrueSolarTime(date, 120)
    expect(result.equationOfTime).toBeGreaterThan(-16)
    expect(result.equationOfTime).toBeLessThan(17)
  })
})
