import { describe, expect, it } from 'bun:test'
import {
  applySouthernHemisphereAdjustment,
  getSouthernMonthBranch,
  isSouthernHemisphere,
} from '../geo-time/hemisphere'
import { calcGlobalTrueSolarTime, getTimezoneOffset, searchCity } from '../geo-time/solar-time'
import type { FourPillars } from '../types'

// 辅助: 构造一个简单四柱 (只关心 branch)
function makePillars(monthBranch: string): FourPillars {
  return {
    year: { stem: '甲', branch: '子', index: 1, label: '甲子' },
    month: { stem: '丙', branch: monthBranch as any, index: 3, label: `丙${monthBranch}` },
    day: { stem: '壬', branch: '午', index: 19, label: '壬午' },
    hour: { stem: '丁', branch: '未', index: 44, label: '丁未' },
  }
}

describe('hemisphere (南半球月令置换)', () => {
  describe('isSouthernHemisphere', () => {
    it('正纬度 → false', () => {
      expect(isSouthernHemisphere(40.7)).toBe(false)
    })

    it('负纬度 → true', () => {
      expect(isSouthernHemisphere(-33.9)).toBe(true)
    })

    it('赤道 (0) → false', () => {
      expect(isSouthernHemisphere(0)).toBe(false)
    })
  })

  describe('getSouthernMonthBranch — 六冲对换', () => {
    const pairs: Array<[string, string]> = [
      ['子', '午'],
      ['丑', '未'],
      ['寅', '申'],
      ['卯', '酉'],
      ['辰', '戌'],
      ['巳', '亥'],
      ['午', '子'],
      ['未', '丑'],
      ['申', '寅'],
      ['酉', '卯'],
      ['戌', '辰'],
      ['亥', '巳'],
    ]

    for (const [from, to] of pairs) {
      it(`${from} → ${to}`, () => {
        expect(getSouthernMonthBranch(from as any)).toBe(to)
      })
    }
  })

  describe('applySouthernHemisphereAdjustment', () => {
    it('北半球不置换', () => {
      const pillars = makePillars('午')
      const result = applySouthernHemisphereAdjustment(pillars, 40.7)
      expect(result.adjusted).toBe(false)
      expect(result.pillars.month.branch).toBe('午')
      expect(result.note).toBe('')
    })

    it('悉尼 (-33.9) 午月 → 子月', () => {
      const pillars = makePillars('午')
      const result = applySouthernHemisphereAdjustment(pillars, -33.9)
      expect(result.adjusted).toBe(true)
      expect(result.pillars.month.branch).toBe('子')
      expect(result.note).toContain('南半球')
      expect(result.note).toContain('午')
      expect(result.note).toContain('子')
    })

    it('墨尔本 (-37.8) 寅月 → 申月', () => {
      const pillars = makePillars('寅')
      const result = applySouthernHemisphereAdjustment(pillars, -37.8)
      expect(result.adjusted).toBe(true)
      expect(result.pillars.month.branch).toBe('申')
    })

    it('置换只影响月柱，年/日/时不变', () => {
      const pillars = makePillars('午')
      const result = applySouthernHemisphereAdjustment(pillars, -33.9)
      expect(result.pillars.year.branch).toBe('子') // 原本就是子
      expect(result.pillars.day.branch).toBe('午') // 不变
      expect(result.pillars.hour.branch).toBe('未') // 不变
    })

    it('label 更新正确', () => {
      const pillars = makePillars('午')
      const result = applySouthernHemisphereAdjustment(pillars, -33.9)
      expect(result.pillars.month.label).toBe('丙子')
    })
  })
})

describe('geo-time solar-time (全球真太阳时)', () => {
  describe('searchCity', () => {
    it('搜索 "New York" 返回纽约', () => {
      const results = searchCity('New York')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.name).toBe('New York')
    })

    it('搜索 "纽约" 返回纽约', () => {
      const results = searchCity('纽约')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.nameZh).toBe('纽约')
    })

    it('搜索 "sydney" (不区分大小写) 返回悉尼', () => {
      const results = searchCity('sydney')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.nameZh).toBe('悉尼')
      expect(results[0]!.latitude).toBeLessThan(0) // 南半球
    })

    it('搜索空字符串返回空', () => {
      expect(searchCity('')).toHaveLength(0)
    })

    it('按国家码搜索', () => {
      const results = searchCity('SG')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.name).toBe('Singapore')
    })
  })

  describe('getTimezoneOffset', () => {
    it('上海 UTC+8 全年无 DST', () => {
      const winter = new Date(2024, 0, 15, 12, 0, 0)
      const result = getTimezoneOffset(winter, 'Asia/Shanghai')
      expect(result.offsetMinutes).toBe(480) // +8h = 480min
      expect(result.isDST).toBe(false)
    })

    it('纽约冬天 UTC-5 无 DST', () => {
      // 2024-01-15 是冬天
      const winter = new Date(Date.UTC(2024, 0, 15, 17, 0, 0)) // UTC 17:00 = EST 12:00
      const result = getTimezoneOffset(winter, 'America/New_York')
      expect(result.offsetMinutes).toBe(-300) // -5h = -300min
      expect(result.isDST).toBe(false)
    })
  })

  describe('calcGlobalTrueSolarTime', () => {
    it('上海正午修正量很小', () => {
      const result = calcGlobalTrueSolarTime({
        localDatetime: new Date(2024, 5, 21, 12, 0, 0),
        timezoneId: 'Asia/Shanghai',
        longitude: 121.5,
      })
      // 上海经度 121.5°, 标准经线 120° → 修正约 +6 分钟
      expect(result.longitudeCorrectionMinutes).toBeCloseTo(6, 0)
    })

    it('返回 trueSolarTime 为 Date 对象', () => {
      const result = calcGlobalTrueSolarTime({
        localDatetime: new Date(2024, 5, 21, 12, 0, 0),
        timezoneId: 'Asia/Shanghai',
        longitude: 121.5,
      })
      expect(result.trueSolarTime).toBeInstanceOf(Date)
    })

    it('displayNote 包含关键信息', () => {
      const result = calcGlobalTrueSolarTime({
        localDatetime: new Date(2024, 5, 21, 14, 30, 0),
        timezoneId: 'America/New_York',
        longitude: -74.006,
        cityName: 'New York',
      })
      expect(result.displayNote).toContain('New York')
      expect(result.displayNote).toContain('True Solar Time')
    })
  })
})
