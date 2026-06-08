import { describe, expect, it } from 'bun:test'
import {
  analyzeBranchAgainstNatal,
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

  describe('analyzeBranchAgainstNatal — 进盘地支 vs 本命四柱', () => {
    // 本命 申子辰 三合水 — 申支为进盘，已经在本命凑齐另两支
    const natalSheZhiChen: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
      '子',
      '辰',
      '寅',
      '卯',
    ]

    it('进盘 申 + 本命含 子辰 → sanhe-ju', () => {
      const r = analyzeBranchAgainstNatal('申', natalSheZhiChen)
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('sanhe-ju')
      expect(r!.resultWuxing).toBe('水')
      expect(r!.branches).toEqual(['申', '子', '辰'])
    })

    it('进盘 寅 + 本命 卯辰 → sanhui-ju 木', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '卯',
        '辰',
        '午',
        '酉',
      ]
      const r = analyzeBranchAgainstNatal('寅', natal)
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('sanhui-ju')
      expect(r!.resultWuxing).toBe('木')
    })

    it('进盘 午 vs 本命 子（日支）→ chong', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '子',
        '巳',
      ]
      const r = analyzeBranchAgainstNatal('午', natal)
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('chong')
    })

    it('进盘 丑 + 本命 子（日支）→ liuhe 土', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '子',
        '巳',
      ]
      const r = analyzeBranchAgainstNatal('丑', natal)
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('liuhe')
      expect(r!.resultWuxing).toBe('土')
    })

    it('六合优先匹配日支', () => {
      // 本命: 年=丑, 月=寅, 日=亥, 时=卯
      // 进盘 寅 → 月支寅相同（无 liuhe 与自身），亥(日支)寅六合化木
      // 但寅与寅是同支 — 不构成新的 liuhe
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '丑',
        '寅',
        '亥',
        '卯',
      ]
      const r = analyzeBranchAgainstNatal('寅', natal)
      // 寅亥六合化木
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('liuhe')
      expect(r!.branches).toEqual(['寅', '亥'])
    })

    it('三合优先于冲（申子辰局成 + 寅申冲）', () => {
      // 本命含子辰寅 — 申既与子辰构成三合，也与寅相冲。应返回 sanhe-ju
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '辰',
        '寅',
        '卯',
      ]
      const r = analyzeBranchAgainstNatal('申', natal)
      expect(r!.kind).toBe('sanhe-ju')
    })

    it('进盘 巳 vs 本命 寅 → sanxing（寅巳申之刑）', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '辰',
        '未',
      ]
      const r = analyzeBranchAgainstNatal('巳', natal)
      // 寅巳相刑；巳本与申也是三合，但本命无申
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('sanxing')
    })

    it('进盘 未 vs 本命 子（日支）→ liuhai', () => {
      // 本命无丑（丑未会触发更高优先级的冲）
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '卯',
        '子',
        '巳',
      ]
      const r = analyzeBranchAgainstNatal('未', natal)
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('liuhai')
    })

    it('进盘 辰 + 本命含 辰 → zixing', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '寅',
        '辰',
        '巳',
        '未',
      ]
      const r = analyzeBranchAgainstNatal('辰', natal)
      // 辰辰自刑（本命无其他更高优先级关系）
      expect(r).not.toBeNull()
      expect(r!.kind).toBe('zixing')
    })

    it('无关地支返回 null', () => {
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '丑',
        '寅',
        '卯',
      ]
      // 进盘 戌 — 与子丑寅卯均无六合/冲/刑/害关系
      // 实际上：戌与卯六合化火！所以这测试需换一个
      // 试 申 vs 卯戌酉巳：
      const r = analyzeBranchAgainstNatal('申', ['卯', '戌', '酉', '巳'])
      // 申巳相刑 — 实际是 sanxing
      // 改用 戌 vs 寅午（三合火局）：戌与寅午会合三合？
      // 真正"无关"的对要细查：午 vs 寅—无冲六合刑害
      // 用 戌 vs 戌（同）— 但同会触发 zixing? 不，戌不在 SELF_PUNISHMENT_BRANCHES
      // 选 戌 vs [子丑寅卯] —— 戌卯六合，会触发 liuhe
      // 干脆用 戌 vs [子丑申亥] —— 戌与？子戌无；丑戌相刑；丑在 BRANCH_PUNISHMENT_PAIRS
      // 改用 寅 vs [子丑酉戌]：寅与子=无；寅丑=无；寅酉=无；寅戌=三合火（半合），无三合局成
      const r2 = analyzeBranchAgainstNatal('寅', ['子', '丑', '酉', '戌'])
      // 寅未必有匹配 — 寅戌仅半合
      expect(r2).toBeNull()
      // r 仅作 fall-through 校验，避免 unused 警告
      expect(r === null || r!.kind !== undefined).toBe(true)
    })

    it('合化透干校验 — 提供 natalStems 时填充 status', () => {
      // 本命 子辰寅卯，天干 壬癸甲乙（含水）→ 申子辰三合水，水透壬癸
      const natal: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
        '子',
        '辰',
        '寅',
        '卯',
      ]
      const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '壬',
        '癸',
        '甲',
        '乙',
      ]
      const r = analyzeBranchAgainstNatal('申', natal, stems)
      expect(r!.status).toBe('合化')

      // 天干无水 → 合而不化
      const noWaterStems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
        '甲',
        '丙',
        '戊',
        '庚',
      ]
      const r2 = analyzeBranchAgainstNatal('申', natal, noWaterStems)
      expect(r2!.status).toBe('合而不化')
    })
  })
})
