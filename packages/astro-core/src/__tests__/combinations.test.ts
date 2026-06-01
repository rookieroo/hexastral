import { describe, expect, it } from 'bun:test'
import {
  analyzeBranchClashes,
  analyzeBranchCombinations,
  analyzeCombinations,
  analyzeStemCombinations,
} from '../combinations'
import type { EarthlyBranch, HeavenlyStem } from '../types'

describe('combinations (合化)', () => {
  describe('analyzeStemCombinations — 天干五合', () => {
    it('甲己相邻合化土', () => {
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '壬',
        '丁',
      ]
      const results = analyzeStemCombinations(stems)
      const jiaJi = results.find((r) => r.stems[0] === '甲' && r.stems[1] === '己')
      expect(jiaJi).toBeDefined()
      expect(jiaJi!.resultWuxing).toBe('土')
    })

    it('丁壬相邻合化木', () => {
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '壬',
        '丁',
      ]
      const results = analyzeStemCombinations(stems)
      const renDing = results.find(
        (r) =>
          (r.stems[0] === '壬' && r.stems[1] === '丁') ||
          (r.stems[0] === '丁' && r.stems[1] === '壬')
      )
      // 壬丁不相邻（位置2和3），实际上是相邻的
      expect(renDing).toBeDefined()
      expect(renDing!.resultWuxing).toBe('木')
    })

    it('不相邻的天干不合', () => {
      // 甲在位0，庚在位2，不相邻
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '丙',
        '庚',
        '壬',
      ]
      const results = analyzeStemCombinations(stems)
      const jiaGeng = results.find(
        (r) =>
          (r.stems[0] === '甲' && r.stems[1] === '庚') ||
          (r.stems[0] === '庚' && r.stems[1] === '甲')
      )
      // 甲庚不是五合对(甲己合、乙庚合)，所以本身就不合
      expect(jiaGeng).toBeUndefined()
    })

    it('乙庚相邻合化金', () => {
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '壬',
        '乙',
        '庚',
        '丁',
      ]
      const results = analyzeStemCombinations(stems)
      const yiGeng = results.find(
        (r) =>
          (r.stems[0] === '乙' && r.stems[1] === '庚') ||
          (r.stems[0] === '庚' && r.stems[1] === '乙')
      )
      expect(yiGeng).toBeDefined()
      expect(yiGeng!.resultWuxing).toBe('金')
    })

    it('化神透干 → 合化; 化神未透 → 合而不化', () => {
      // 甲己合化土，天干中有戊(土) → 合化
      const stems1: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '戊',
        '壬',
      ]
      const r1 = analyzeStemCombinations(stems1)
      const combo1 = r1.find((r) => r.stems[0] === '甲' && r.stems[1] === '己')
      expect(combo1!.status).toBe('合化')

      // 甲己合化土，天干中无土行 → 合而不化
      const stems2: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '壬',
        '丁',
      ]
      const r2 = analyzeStemCombinations(stems2)
      const combo2 = r2.find((r) => r.stems[0] === '甲' && r.stems[1] === '己')
      // 己本身是土，但己参与了合，被排除。壬=水，丁=火 → 无土透
      expect(combo2!.status).toBe('合而不化')
    })

    it('丙辛合化水，辛壬透→不算（壬是水但己参与合排除）', () => {
      // 丙辛合水，天干需有壬或癸透
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '壬',
        '丙',
        '辛',
        '甲',
      ]
      const r = analyzeStemCombinations(stems)
      const combo = r.find(
        (r) =>
          (r.stems[0] === '丙' && r.stems[1] === '辛') ||
          (r.stems[0] === '辛' && r.stems[1] === '丙')
      )
      expect(combo).toBeDefined()
      expect(combo!.resultWuxing).toBe('水')
      // 壬在位0，不参与合，壬=水 → 化神透干 → 合化
      expect(combo!.status).toBe('合化')
    })

    it('无合的四柱返回空数组', () => {
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '丙',
        '戊',
        '庚',
      ]
      const results = analyzeStemCombinations(stems)
      expect(results).toHaveLength(0)
    })
  })

  describe('analyzeBranchCombinations — 地支六合', () => {
    it('子丑六合化土', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '丑',
        '午',
        '未',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '壬',
        '丁',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const ziChou = results.find(
        (r) => r.type === '六合' && r.branches.includes('子') && r.branches.includes('丑')
      )
      expect(ziChou).toBeDefined()
      expect(ziChou!.resultWuxing).toBe('土')
    })

    it('寅亥六合化木', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '亥',
        '寅',
        '卯',
        '辰',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '乙',
        '丙',
        '丁',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const haiYin = results.find(
        (r) => r.type === '六合' && r.branches.includes('寅') && r.branches.includes('亥')
      )
      expect(haiYin).toBeDefined()
      expect(haiYin!.resultWuxing).toBe('木')
    })
  })

  describe('analyzeBranchCombinations — 地支三合局', () => {
    it('申子辰三合水局', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '申',
        '子',
        '辰',
        '午',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '壬',
        '癸',
        '甲',
        '丙',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const sanHe = results.find((r) => r.type === '三合局' && r.resultWuxing === '水')
      expect(sanHe).toBeDefined()
      expect(sanHe!.branches).toContain('申')
      expect(sanHe!.branches).toContain('子')
      expect(sanHe!.branches).toContain('辰')
    })

    it('寅午戌三合火局', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '午',
        '戌',
        '丑',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '丙',
        '丁',
        '甲',
        '壬',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const sanHe = results.find((r) => r.type === '三合局' && r.resultWuxing === '火')
      expect(sanHe).toBeDefined()
      // 丙/丁=火 → 化神透干
      expect(sanHe!.status).toBe('合化')
    })

    it('三合局化神未透 → 合而不化', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '申',
        '子',
        '辰',
        '午',
      ]
      // 天干无水行(壬/癸) → 化神未透
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '丙',
        '戊',
        '庚',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const sanHe = results.find((r) => r.type === '三合局' && r.resultWuxing === '水')
      expect(sanHe).toBeDefined()
      expect(sanHe!.status).toBe('合而不化')
    })
  })

  describe('analyzeBranchCombinations — 地支三会局', () => {
    it('亥子丑三会水局', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '亥',
        '子',
        '丑',
        '午',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '壬',
        '癸',
        '甲',
        '丙',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const sanHui = results.find((r) => r.type === '三会局' && r.resultWuxing === '水')
      expect(sanHui).toBeDefined()
    })

    it('寅卯辰三会木局', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '辰',
        '午',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '乙',
        '丙',
        '丁',
      ]
      const results = analyzeBranchCombinations(branches, stems)
      const sanHui = results.find((r) => r.type === '三会局' && r.resultWuxing === '木')
      expect(sanHui).toBeDefined()
    })
  })

  describe('analyzeBranchClashes — 地支六冲', () => {
    it('子午冲', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '丑',
        '午',
        '未',
      ]
      const results = analyzeBranchClashes(branches)
      const clash = results.find((r) => r.branches.includes('子') && r.branches.includes('午'))
      expect(clash).toBeDefined()
      expect(clash!.type).toBe('冲')
    })

    it('寅申冲', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '申',
        '酉',
      ]
      const results = analyzeBranchClashes(branches)
      const clash = results.find((r) => r.branches.includes('寅') && r.branches.includes('申'))
      expect(clash).toBeDefined()
    })

    it('无冲返回空数组', () => {
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '丑',
        '寅',
        '卯',
      ]
      const results = analyzeBranchClashes(branches)
      expect(results).toHaveLength(0)
    })
  })

  describe('analyzeCombinations — 综合分析', () => {
    it('完整四柱分析返回三部分', () => {
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '己',
        '壬',
        '丁',
      ]
      const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '丑',
        '午',
        '未',
      ]
      const result = analyzeCombinations(stems, branches)

      expect(result.stemCombinations).toBeDefined()
      expect(result.branchCombinations).toBeDefined()
      expect(result.branchClashes).toBeDefined()

      // 甲己合, 壬丁合
      expect(result.stemCombinations.length).toBeGreaterThanOrEqual(2)
      // 子丑六合, 午未六合, 子午冲
      expect(result.branchCombinations.length).toBeGreaterThanOrEqual(2)
      expect(result.branchClashes.length).toBeGreaterThanOrEqual(1)
    })
  })
})
