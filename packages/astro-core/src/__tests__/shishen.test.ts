import { describe, expect, it } from 'bun:test'
import {
  analyzeShiShenStrength,
  BRANCH_HIDDEN_STEMS,
  countShiShen,
  getFourPillarsShiShen,
  getShiShen,
} from '../shishen'
import type { EarthlyBranch, FourPillars, HeavenlyStem } from '../types'

// Helper: build a FourPillars struct
function makePillars(
  yearStem: HeavenlyStem,
  yearBranch: EarthlyBranch,
  monthStem: HeavenlyStem,
  monthBranch: EarthlyBranch,
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
  hourStem: HeavenlyStem,
  hourBranch: EarthlyBranch
): FourPillars {
  return {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    hour: { stem: hourStem, branch: hourBranch },
  }
}

describe('十神 (ShiShen)', () => {
  describe('getShiShen — 基础关系', () => {
    it('同我同阴阳 → 比肩', () => {
      const info = getShiShen('甲', '甲')
      expect(info.name).toBe('比肩')
      expect(info.category).toBe('比劫')
      expect(info.relation).toBe('同我')
    })

    it('同我异阴阳 → 劫财', () => {
      const info = getShiShen('甲', '乙')
      expect(info.name).toBe('劫财')
    })

    it('我生同阴阳 → 食神', () => {
      // 甲(木)生丙(火)，同为阳
      const info = getShiShen('甲', '丙')
      expect(info.name).toBe('食神')
      expect(info.category).toBe('食伤')
    })

    it('我生异阴阳 → 伤官', () => {
      const info = getShiShen('甲', '丁')
      expect(info.name).toBe('伤官')
    })

    it('我克同阴阳 → 偏财', () => {
      // 甲(木)克戊(土)，同为阳
      const info = getShiShen('甲', '戊')
      expect(info.name).toBe('偏财')
    })

    it('我克异阴阳 → 正财', () => {
      const info = getShiShen('甲', '己')
      expect(info.name).toBe('正财')
    })

    it('克我同阴阳 → 七杀', () => {
      // 庚(金)克甲(木)，同为阳
      const info = getShiShen('甲', '庚')
      expect(info.name).toBe('七杀')
    })

    it('克我异阴阳 → 正官', () => {
      const info = getShiShen('甲', '辛')
      expect(info.name).toBe('正官')
    })

    it('生我同阴阳 → 偏印', () => {
      // 壬(水)生甲(木)，同为阳
      const info = getShiShen('甲', '壬')
      expect(info.name).toBe('偏印')
    })

    it('生我异阴阳 → 正印', () => {
      const info = getShiShen('甲', '癸')
      expect(info.name).toBe('正印')
    })
  })

  describe('BRANCH_HIDDEN_STEMS — 藏干表完整性', () => {
    it('子 仅藏 癸（1个）', () => {
      expect(BRANCH_HIDDEN_STEMS['子']).toEqual(['癸'])
    })

    it('丑 藏 己/癸/辛（3个）', () => {
      expect(BRANCH_HIDDEN_STEMS['丑']).toEqual(['己', '癸', '辛'])
    })

    it('寅 藏 甲/丙/戊（3个）', () => {
      expect(BRANCH_HIDDEN_STEMS['寅']).toEqual(['甲', '丙', '戊'])
    })

    it('卯 仅藏 乙（1个）', () => {
      expect(BRANCH_HIDDEN_STEMS['卯']).toEqual(['乙'])
    })

    it('酉 仅藏 辛（1个）', () => {
      expect(BRANCH_HIDDEN_STEMS['酉']).toEqual(['辛'])
    })

    it('所有12地支均有藏干', () => {
      const branches: EarthlyBranch[] = [
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
      for (const b of branches) {
        expect(BRANCH_HIDDEN_STEMS[b].length).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('countShiShen — 藏干权重修正', () => {
    // 甲日主，年甲寅、月丙午、日甲子、时庚申
    const pillars = makePillars('甲', '寅', '丙', '午', '甲', '子', '庚', '申')
    const shishen = getFourPillarsShiShen(pillars)
    const counts = countShiShen(shishen)

    it('天干权重均为 1.0', () => {
      // 年甲→比肩(1), 月丙→食神(1), 时庚→七杀(1) — 各 1.0
      expect(counts['比肩']).toBeGreaterThanOrEqual(1)
      expect(counts['食神']).toBeGreaterThanOrEqual(1)
      expect(counts['七杀']).toBeGreaterThanOrEqual(1)
    })

    it('单藏干地支（子/卯/酉）权重为 1.0', () => {
      // 日支子藏癸 → 正印，单藏干取 1.0
      // 子=[癸]: getShiShen(甲, 癸) → 正印
      expect(counts['正印']).toBeGreaterThanOrEqual(1.0)
    })

    it('多藏干地支按 0.6/0.2/0.1 加权', () => {
      // 年支寅=[甲,丙,戊]: 甲→比肩(0.6), 丙→食神(0.2), 戊→偏财(0.1)
      // 比肩 = 天干甲(1) + 寅藏甲(0.6) = 1.6
      expect(counts['比肩']).toBeCloseTo(1.6, 5)
    })

    it('双藏干地支按 0.6/0.2 加权', () => {
      // 月支午=[丁,己]: 丁→伤官(0.6), 己→正财(0.2)
      expect(counts['伤官']).toBeCloseTo(0.6, 5)
      expect(counts['正财']).toBeCloseTo(0.2, 5)
    })

    it('三藏干地支（时支申=[庚,壬,戊]）', () => {
      // 庚→七杀(0.6), 壬→偏印(0.2), 戊→偏财(0.1)
      // 七杀 = 天干庚(1) + 申藏庚(0.6) = 1.6
      expect(counts['七杀']).toBeCloseTo(1.6, 5)
      expect(counts['偏印']).toBeCloseTo(0.2, 5)
    })

    it('偏财 = 寅藏戊(0.1) + 申藏戊(0.1) = 0.2', () => {
      expect(counts['偏财']).toBeCloseTo(0.2, 5)
    })

    it('总权重合: 天干3 + 地支加权约5.8', () => {
      // 天干: 比肩(1) + 食神(1) + 七杀(1) = 3
      // 年寅: 比肩(0.6) + 食神(0.2) + 偏财(0.1) = 0.9
      // 月午: 伤官(0.6) + 正财(0.2) = 0.8
      // 日子: 正印(1.0) = 1.0 (单藏干)
      // 时申: 七杀(0.6) + 偏印(0.2) + 偏财(0.1) = 0.9
      // total = 3 + 0.9 + 0.8 + 1.0 + 0.9 = 6.6
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(6.6, 5)
    })
  })

  describe('analyzeShiShenStrength — 强弱分析', () => {
    it('返回正确的最强/最弱分类', () => {
      const mockCounts: Record<string, number> = {
        比肩: 3,
        劫财: 1,
        食神: 0,
        伤官: 0,
        偏财: 2,
        正财: 1,
        七杀: 0,
        正官: 0,
        偏印: 0,
        正印: 0,
      }
      // @ts-expect-error — simplified mock
      const result = analyzeShiShenStrength(mockCounts)
      expect(result.strongest).toBe('比劫') // 3+1=4
      expect(result.categoryStrength['比劫']).toBe(4)
      expect(result.categoryStrength['财星']).toBe(3)
    })
  })
})
