import { describe, expect, it } from 'bun:test'
import { getTiaohou, hasTiaohouGod } from '../tiaohou'
import type { EarthlyBranch, HeavenlyStem } from '../types'

describe('tiaohou (调候用神)', () => {
  describe('getTiaohou — 基本查表', () => {
    // 冬月甲木: 子月甲木→丁火暖局（穷通宝鉴经典案例）
    it('甲木 + 子月 → 需要丁火（暖局）', () => {
      const result = getTiaohou('甲', '子')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('丁')
      expect(result!.type).toBe('暖局')
    })

    // 夏月甲木: 午月甲木→癸水润局
    it('甲木 + 午月 → 需要癸水（润局）', () => {
      const result = getTiaohou('甲', '午')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('癸')
      expect(result!.type).toBe('润局')
    })

    // 冬月丙火: 子月丙火→壬水（特殊: 冬丙喜壬为映照格）
    it('丙火 + 子月 → 需要壬水', () => {
      const result = getTiaohou('丙', '子')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('壬')
    })

    // 寅月庚金: 春庚需丁火锻炼
    it('庚金 + 寅月 → 需要丁火', () => {
      const result = getTiaohou('庚', '寅')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('丁')
    })

    // 夏月壬水: 午月壬水→辛金为源
    it('壬水 + 午月 → 需要辛金', () => {
      const result = getTiaohou('壬', '午')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('辛')
    })

    // 秋月乙木: 酉月乙木→丙火温暖
    it('乙木 + 酉月 → 需要丙火', () => {
      const result = getTiaohou('乙', '酉')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('丙')
    })

    // 丑月丁火: 冬末丁火→甲木生火
    it('丁火 + 丑月 → 需要甲木', () => {
      const result = getTiaohou('丁', '丑')
      expect(result).not.toBeNull()
      expect(result!.gods).toContain('甲')
    })
  })

  describe('getTiaohou — 返回结构完整性', () => {
    it('返回 gods 应为非空数组', () => {
      const result = getTiaohou('甲', '子')
      expect(result).not.toBeNull()
      expect(result!.gods.length).toBeGreaterThan(0)
    })

    it('返回 type 应为有效类型', () => {
      const result = getTiaohou('甲', '午')
      expect(result).not.toBeNull()
      expect(['暖局', '润局', '通关', '扶抑']).toContain(result!.type)
    })

    it('返回 description 应为非空字符串', () => {
      const result = getTiaohou('甲', '子')
      expect(result).not.toBeNull()
      expect(result!.description.length).toBeGreaterThan(0)
    })
  })

  describe('getTiaohou — 全矩阵覆盖 (10×12=120)', () => {
    const stems: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
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

    it('所有 10×12 组合均有对应结果', () => {
      for (const stem of stems) {
        for (const branch of branches) {
          const result = getTiaohou(stem, branch)
          expect(result).not.toBeNull()
          expect(result!.gods.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('hasTiaohouGod — 化神透干校验', () => {
    it('子月甲木有丁火透干 → satisfied', () => {
      const allStems: HeavenlyStem[] = ['甲', '丙', '丁', '壬']
      const result = hasTiaohouGod('甲', '子', allStems)
      expect(result.satisfied).toBe(true)
      expect(result.matched).toContain('丁')
    })

    it('子月甲木无丁火透干 → unsatisfied', () => {
      const allStems: HeavenlyStem[] = ['甲', '丙', '壬', '癸']
      const result = hasTiaohouGod('甲', '子', allStems)
      expect(result.satisfied).toBe(false)
      expect(result.missing.length).toBeGreaterThan(0)
    })

    it('午月甲木有癸水透干 → satisfied', () => {
      const allStems: HeavenlyStem[] = ['甲', '己', '壬', '癸']
      const result = hasTiaohouGod('甲', '午', allStems)
      expect(result.satisfied).toBe(true)
      expect(result.matched).toContain('癸')
    })

    it('午月甲木无癸水但有丁火 → satisfied (丁也是调候用神)', () => {
      const allStems: HeavenlyStem[] = ['甲', '己', '壬', '丁']
      const result = hasTiaohouGod('甲', '午', allStems)
      // 午月甲木的调候用神列表包含丁和癸，只要命中其中一个就 satisfied
      expect(result.satisfied).toBe(true)
    })
  })

  describe('PRD DoD — 冬月/夏月 20 样本 ≥95%', () => {
    // 冬月(子/丑/亥)样本
    const winterSamples: Array<{
      stem: HeavenlyStem
      branch: EarthlyBranch
      expected: HeavenlyStem[]
    }> = [
      { stem: '甲', branch: '子', expected: ['丁'] },
      { stem: '甲', branch: '丑', expected: ['丁'] },
      { stem: '甲', branch: '亥', expected: ['丁'] },
      { stem: '乙', branch: '子', expected: ['丙'] },
      { stem: '丙', branch: '子', expected: ['壬'] },
      { stem: '丁', branch: '子', expected: ['甲'] },
      { stem: '戊', branch: '子', expected: ['丙'] },
      { stem: '己', branch: '子', expected: ['丙'] },
      { stem: '庚', branch: '子', expected: ['丁'] },
      { stem: '辛', branch: '子', expected: ['壬'] },
    ]

    // 夏月(午/未/巳)样本
    const summerSamples: Array<{
      stem: HeavenlyStem
      branch: EarthlyBranch
      expected: HeavenlyStem[]
    }> = [
      { stem: '甲', branch: '午', expected: ['癸'] },
      { stem: '甲', branch: '巳', expected: ['癸'] },
      { stem: '乙', branch: '午', expected: ['癸'] },
      { stem: '丙', branch: '午', expected: ['壬'] },
      { stem: '丁', branch: '午', expected: ['甲'] },
      { stem: '戊', branch: '午', expected: ['壬'] },
      { stem: '己', branch: '午', expected: ['癸'] },
      { stem: '庚', branch: '午', expected: ['壬'] },
      { stem: '辛', branch: '午', expected: ['壬'] },
      { stem: '壬', branch: '午', expected: ['辛'] },
    ]

    const allSamples = [...winterSamples, ...summerSamples]
    let passed = 0

    for (const sample of allSamples) {
      it(`${sample.stem} + ${sample.branch}月 → 调候含 ${sample.expected.join('/')}`, () => {
        const result = getTiaohou(sample.stem, sample.branch)
        expect(result).not.toBeNull()
        const match = sample.expected.some((exp) => result!.gods.includes(exp))
        if (match) passed++
        expect(match).toBe(true)
      })
    }
  })
})
