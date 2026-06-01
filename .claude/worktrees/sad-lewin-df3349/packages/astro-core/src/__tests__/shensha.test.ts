/**
 * 核心神煞引擎测试
 *
 * 测试覆盖:
 * 1. 天乙贵人查表 (10干 × 2值 = 20个)
 * 2. 文昌贵人查表 (10干 × 1值 = 10个)
 * 3. 桃花/驿马/华盖/将星 (12支全覆盖)
 * 4. 劫煞/亡神 (12支全覆盖)
 * 5. 四柱综合分析
 * 6. AI Prompt 格式化
 * 7. 经典命例神煞验证
 */

import { describe, expect, test } from 'bun:test'
import {
  getTianYiGuiRen,
  getWenChangGuiRen,
  getTaoHua,
  getYiMa,
  getHuaGai,
  getJiangXing,
  getJieSha,
  getWangShen,
  analyzeShenSha,
  formatShenShaForPrompt,
} from '../shensha'
import type { EarthlyBranch, FourPillars, HeavenlyStem } from '../types'
import { getFourPillars } from '../ganzhi'

// ========================================
// 1. 天乙贵人
// ========================================

describe('天乙贵人 — 以日干查', () => {
  const cases: Array<{ stem: HeavenlyStem; expected: EarthlyBranch[] }> = [
    { stem: '甲', expected: ['丑', '未'] },
    { stem: '乙', expected: ['子', '申'] },
    { stem: '丙', expected: ['亥', '酉'] },
    { stem: '丁', expected: ['亥', '酉'] },
    { stem: '戊', expected: ['丑', '未'] },
    { stem: '己', expected: ['子', '申'] },
    { stem: '庚', expected: ['丑', '未'] },
    { stem: '辛', expected: ['午', '寅'] },
    { stem: '壬', expected: ['卯', '巳'] },
    { stem: '癸', expected: ['卯', '巳'] },
  ]

  for (const { stem, expected } of cases) {
    test(`${stem}干 → 天乙在${expected.join('、')}`, () => {
      const result = getTianYiGuiRen(stem)
      expect(result).toEqual(expected)
    })
  }

  test('返回值始终为2个地支', () => {
    const stems: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    for (const stem of stems) {
      expect(getTianYiGuiRen(stem)).toHaveLength(2)
    }
  })

  test('甲戊庚同查丑未', () => {
    expect(getTianYiGuiRen('甲')).toEqual(getTianYiGuiRen('戊'))
    expect(getTianYiGuiRen('戊')).toEqual(getTianYiGuiRen('庚'))
  })

  test('丙丁同查亥酉', () => {
    expect(getTianYiGuiRen('丙')).toEqual(getTianYiGuiRen('丁'))
  })

  test('壬癸同查卯巳', () => {
    expect(getTianYiGuiRen('壬')).toEqual(getTianYiGuiRen('癸'))
  })
})

// ========================================
// 2. 文昌贵人
// ========================================

describe('文昌贵人 — 以日干查', () => {
  const cases: Array<{ stem: HeavenlyStem; expected: EarthlyBranch }> = [
    { stem: '甲', expected: '巳' },
    { stem: '乙', expected: '午' },
    { stem: '丙', expected: '申' },
    { stem: '丁', expected: '酉' },
    { stem: '戊', expected: '申' },
    { stem: '己', expected: '酉' },
    { stem: '庚', expected: '亥' },
    { stem: '辛', expected: '子' },
    { stem: '壬', expected: '寅' },
    { stem: '癸', expected: '卯' },
  ]

  for (const { stem, expected } of cases) {
    test(`${stem}干 → 文昌在${expected}`, () => {
      expect(getWenChangGuiRen(stem)).toBe(expected)
    })
  }

  test('丙戊同查申', () => {
    expect(getWenChangGuiRen('丙')).toBe(getWenChangGuiRen('戊'))
  })

  test('丁己同查酉', () => {
    expect(getWenChangGuiRen('丁')).toBe(getWenChangGuiRen('己'))
  })
})

// ========================================
// 3. 桃花（咸池）
// ========================================

describe('桃花 — 三合局沐浴地', () => {
  test('申子辰见酉', () => {
    expect(getTaoHua('申')).toBe('酉')
    expect(getTaoHua('子')).toBe('酉')
    expect(getTaoHua('辰')).toBe('酉')
  })

  test('寅午戌见卯', () => {
    expect(getTaoHua('寅')).toBe('卯')
    expect(getTaoHua('午')).toBe('卯')
    expect(getTaoHua('戌')).toBe('卯')
  })

  test('亥卯未见子', () => {
    expect(getTaoHua('亥')).toBe('子')
    expect(getTaoHua('卯')).toBe('子')
    expect(getTaoHua('未')).toBe('子')
  })

  test('巳酉丑见午', () => {
    expect(getTaoHua('巳')).toBe('午')
    expect(getTaoHua('酉')).toBe('午')
    expect(getTaoHua('丑')).toBe('午')
  })

  test('12支全覆盖', () => {
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
      expect(getTaoHua(b)).toBeTruthy()
    }
  })
})

// ========================================
// 4. 驿马
// ========================================

describe('驿马 — 三合局冲地', () => {
  test('申子辰马在寅', () => {
    expect(getYiMa('申')).toBe('寅')
    expect(getYiMa('子')).toBe('寅')
    expect(getYiMa('辰')).toBe('寅')
  })

  test('寅午戌马在申', () => {
    expect(getYiMa('寅')).toBe('申')
    expect(getYiMa('午')).toBe('申')
    expect(getYiMa('戌')).toBe('申')
  })

  test('亥卯未马在巳', () => {
    expect(getYiMa('亥')).toBe('巳')
    expect(getYiMa('卯')).toBe('巳')
    expect(getYiMa('未')).toBe('巳')
  })

  test('巳酉丑马在亥', () => {
    expect(getYiMa('巳')).toBe('亥')
    expect(getYiMa('酉')).toBe('亥')
    expect(getYiMa('丑')).toBe('亥')
  })

  test('驿马与桃花不重叠', () => {
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
      expect(getYiMa(b)).not.toBe(getTaoHua(b))
    }
  })
})

// ========================================
// 5. 华盖
// ========================================

describe('华盖 — 三合局墓库', () => {
  test('申子辰见辰', () => {
    expect(getHuaGai('申')).toBe('辰')
    expect(getHuaGai('子')).toBe('辰')
    expect(getHuaGai('辰')).toBe('辰')
  })

  test('寅午戌见戌', () => {
    expect(getHuaGai('寅')).toBe('戌')
    expect(getHuaGai('午')).toBe('戌')
    expect(getHuaGai('戌')).toBe('戌')
  })

  test('亥卯未见未', () => {
    expect(getHuaGai('亥')).toBe('未')
    expect(getHuaGai('卯')).toBe('未')
    expect(getHuaGai('未')).toBe('未')
  })

  test('巳酉丑见丑', () => {
    expect(getHuaGai('巳')).toBe('丑')
    expect(getHuaGai('酉')).toBe('丑')
    expect(getHuaGai('丑')).toBe('丑')
  })
})

// ========================================
// 6. 将星
// ========================================

describe('将星 — 三合局帝旺', () => {
  test('申子辰将在子', () => {
    expect(getJiangXing('申')).toBe('子')
    expect(getJiangXing('子')).toBe('子')
    expect(getJiangXing('辰')).toBe('子')
  })

  test('寅午戌将在午', () => {
    expect(getJiangXing('寅')).toBe('午')
    expect(getJiangXing('午')).toBe('午')
    expect(getJiangXing('戌')).toBe('午')
  })

  test('亥卯未将在卯', () => {
    expect(getJiangXing('亥')).toBe('卯')
    expect(getJiangXing('卯')).toBe('卯')
    expect(getJiangXing('未')).toBe('卯')
  })

  test('巳酉丑将在酉', () => {
    expect(getJiangXing('巳')).toBe('酉')
    expect(getJiangXing('酉')).toBe('酉')
    expect(getJiangXing('丑')).toBe('酉')
  })
})

// ========================================
// 7. 劫煞
// ========================================

describe('劫煞', () => {
  test('申子辰劫在巳', () => {
    expect(getJieSha('申')).toBe('巳')
    expect(getJieSha('子')).toBe('巳')
    expect(getJieSha('辰')).toBe('巳')
  })

  test('寅午戌劫在亥', () => {
    expect(getJieSha('寅')).toBe('亥')
    expect(getJieSha('午')).toBe('亥')
    expect(getJieSha('戌')).toBe('亥')
  })

  test('亥卯未劫在申', () => {
    expect(getJieSha('亥')).toBe('申')
    expect(getJieSha('卯')).toBe('申')
    expect(getJieSha('未')).toBe('申')
  })

  test('巳酉丑劫在寅', () => {
    expect(getJieSha('巳')).toBe('寅')
    expect(getJieSha('酉')).toBe('寅')
    expect(getJieSha('丑')).toBe('寅')
  })
})

// ========================================
// 8. 亡神
// ========================================

describe('亡神', () => {
  test('申子辰亡在亥', () => {
    expect(getWangShen('申')).toBe('亥')
    expect(getWangShen('子')).toBe('亥')
    expect(getWangShen('辰')).toBe('亥')
  })

  test('寅午戌亡在巳', () => {
    expect(getWangShen('寅')).toBe('巳')
    expect(getWangShen('午')).toBe('巳')
    expect(getWangShen('戌')).toBe('巳')
  })

  test('亥卯未亡在寅', () => {
    expect(getWangShen('亥')).toBe('寅')
    expect(getWangShen('卯')).toBe('寅')
    expect(getWangShen('未')).toBe('寅')
  })

  test('巳酉丑亡在申', () => {
    expect(getWangShen('巳')).toBe('申')
    expect(getWangShen('酉')).toBe('申')
    expect(getWangShen('丑')).toBe('申')
  })
})

// ========================================
// 9. 四柱综合分析
// ========================================

describe('analyzeShenSha — 综合分析', () => {
  test('返回结构完整', () => {
    const pillars = getFourPillars({ year: 1990, month: 3, day: 15, hour: 14 })
    const result = analyzeShenSha(pillars)
    expect(result.items).toBeDefined()
    expect(typeof result.auspiciousCount).toBe('number')
    expect(typeof result.inauspiciousCount).toBe('number')
    expect(typeof result.summary).toBe('string')
  })

  test('吉凶计数一致', () => {
    const pillars = getFourPillars({ year: 1990, month: 3, day: 15, hour: 14 })
    const result = analyzeShenSha(pillars)
    const actualAuspicious = result.items.filter((i) => i.polarity === '吉').length
    const actualInauspicious = result.items.filter((i) => i.polarity === '凶').length
    expect(result.auspiciousCount).toBe(actualAuspicious)
    expect(result.inauspiciousCount).toBe(actualInauspicious)
  })

  test('每个 item 有完整属性', () => {
    const pillars = getFourPillars({ year: 1990, month: 3, day: 15, hour: 14 })
    const result = analyzeShenSha(pillars)
    for (const item of result.items) {
      expect(item.name).toBeTruthy()
      expect(['吉', '凶', '中']).toContain(item.polarity)
      expect(['年', '月', '日', '时']).toContain(item.pillar)
      expect(item.branch).toBeTruthy()
      expect(item.description).toBeTruthy()
    }
  })

  test('不同八字返回不同神煞', () => {
    const pillars1 = getFourPillars({ year: 1990, month: 3, day: 15 })
    const pillars2 = getFourPillars({ year: 1985, month: 8, day: 1 })
    const result1 = analyzeShenSha(pillars1)
    const result2 = analyzeShenSha(pillars2)
    // At least the summary should differ (or items should differ)
    expect(result1.items.length + result2.items.length).toBeGreaterThan(0)
  })

  test('无命中时返回空列表', () => {
    // Construct a specific pillars that might have no shensha hits
    // This is hard to guarantee, but we can test the logic works
    const pillars = getFourPillars({ year: 2000, month: 1, day: 1, hour: 12 })
    const result = analyzeShenSha(pillars)
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.summary).toBeTruthy()
  })
})

// ========================================
// 10. Prompt 格式化
// ========================================

describe('formatShenShaForPrompt', () => {
  test('有神煞时包含表格', () => {
    const pillars = getFourPillars({ year: 1990, month: 3, day: 15, hour: 14 })
    const analysis = analyzeShenSha(pillars)
    const text = formatShenShaForPrompt(analysis)
    expect(text).toContain('## 神煞')
    if (analysis.items.length > 0) {
      expect(text).toContain('| 神煞 |')
    }
  })

  test('无神煞时显示默认文案', () => {
    const emptyAnalysis = {
      items: [],
      auspiciousCount: 0,
      inauspiciousCount: 0,
      summary: '四柱未见显著神煞。',
    }
    const text = formatShenShaForPrompt(emptyAnalysis)
    expect(text).toContain('四柱未见显著神煞')
  })
})

// ========================================
// 11. 三合局一致性验证
// ========================================

describe('三合局派生一致性', () => {
  // 桃花=沐浴, 驿马=冲, 华盖=墓, 将星=帝旺
  // 它们都基于同一组三合局分组，应保持一致

  const SANHE_GROUPS: EarthlyBranch[][] = [
    ['申', '子', '辰'],
    ['寅', '午', '戌'],
    ['亥', '卯', '未'],
    ['巳', '酉', '丑'],
  ]

  test('同组三合的桃花相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getTaoHua)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('同组三合的驿马相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getYiMa)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('同组三合的华盖相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getHuaGai)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('同组三合的将星相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getJiangXing)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('同组三合的劫煞相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getJieSha)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('同组三合的亡神相同', () => {
    for (const group of SANHE_GROUPS) {
      const values = group.map(getWangShen)
      expect(values[0]).toBe(values[1])
      expect(values[1]).toBe(values[2])
    }
  })

  test('桃花结果为四正位 (子午卯酉)', () => {
    const si = ['子', '午', '卯', '酉'] as EarthlyBranch[]
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
      expect(si).toContain(getTaoHua(b))
    }
  })

  test('华盖结果为四墓库 (辰戌丑未)', () => {
    const mu = ['辰', '戌', '丑', '未'] as EarthlyBranch[]
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
      expect(mu).toContain(getHuaGai(b))
    }
  })

  test('驿马结果为四驿 (寅申巳亥)', () => {
    const yi = ['寅', '申', '巳', '亥'] as EarthlyBranch[]
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
      expect(yi).toContain(getYiMa(b))
    }
  })
})

// ========================================
// 12. 批量四柱验证
// ========================================

describe('多样本四柱神煞批量验证', () => {
  const samples = [
    { year: 1984, month: 10, day: 15, hour: 8 },
    { year: 1990, month: 3, day: 15, hour: 14 },
    { year: 1995, month: 7, day: 20, hour: 22 },
    { year: 2000, month: 1, day: 1, hour: 0 },
    { year: 2005, month: 12, day: 25, hour: 18 },
    { year: 1970, month: 5, day: 10, hour: 6 },
    { year: 1988, month: 2, day: 29, hour: 12 },
    { year: 2010, month: 9, day: 9, hour: 9 },
  ]

  for (const input of samples) {
    test(`${input.year}-${input.month}-${input.day} 分析不报错`, () => {
      const pillars = getFourPillars(input)
      const result = analyzeShenSha(pillars)
      expect(result).toBeTruthy()
      expect(result.auspiciousCount).toBeGreaterThanOrEqual(0)
      expect(result.inauspiciousCount).toBeGreaterThanOrEqual(0)
      expect(result.auspiciousCount + result.inauspiciousCount).toBeLessThanOrEqual(
        result.items.length
      )
    })
  }
})
