/**
 * 纳甲六爻装卦引擎测试
 *
 * 覆盖:
 * - lookupHexagram: 六爻阴阳 → 卦名/宫位
 * - calcLiuQin: 六亲推导
 * - calcLiuShen: 六神排列
 * - calcWangXiu: 旺相休囚死
 * - calcKongWang / getXunKong: 旬空
 * - calcNuclearHexagram: 互卦
 * - calcDerivedHexagram: 变卦
 * - assembleHexagram: 完整装卦
 * - formatHexagramForPrompt: 格式化
 */

import { describe, expect, test } from 'bun:test'
import {
  assembleHexagram,
  calcDerivedHexagram,
  calcKongWang,
  calcLiuQin,
  calcLiuShen,
  calcNuclearHexagram,
  calcWangXiu,
  formatHexagramForPrompt,
  getXunKong,
  isChangingYao,
  lookupByName,
  lookupHexagram,
  NAJIA_TABLE,
  TRIGRAM_PAIR_TO_HEXAGRAM,
  yaoToYinYang,
} from '../liuyao'

describe('纳甲六爻装卦引擎', () => {
  // ==================== 基础辅助 ====================

  describe('yaoToYinYang', () => {
    test('7(少阳) → 1', () => expect(yaoToYinYang(7)).toBe(1))
    test('9(老阳) → 1', () => expect(yaoToYinYang(9)).toBe(1))
    test('8(少阴) → 0', () => expect(yaoToYinYang(8)).toBe(0))
    test('6(老阴) → 0', () => expect(yaoToYinYang(6)).toBe(0))
  })

  describe('isChangingYao', () => {
    test('6(老阴) = 变爻', () => expect(isChangingYao(6)).toBe(true))
    test('9(老阳) = 变爻', () => expect(isChangingYao(9)).toBe(true))
    test('7(少阳) = 非变爻', () => expect(isChangingYao(7)).toBe(false))
    test('8(少阴) = 非变爻', () => expect(isChangingYao(8)).toBe(false))
  })

  // ==================== 步骤 1: 查卦 ====================

  describe('lookupHexagram', () => {
    test('乾为天: [1,1,1,1,1,1]', () => {
      const hex = lookupHexagram([1, 1, 1, 1, 1, 1])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('乾为天')
      expect(hex!.palace).toBe('乾')
    })

    test('坤为地: [0,0,0,0,0,0]', () => {
      const hex = lookupHexagram([0, 0, 0, 0, 0, 0])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('坤为地')
      expect(hex!.palace).toBe('坤')
    })

    test('坎为水: [0,1,0,0,1,0]', () => {
      const hex = lookupHexagram([0, 1, 0, 0, 1, 0])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('坎为水')
      expect(hex!.palace).toBe('坎')
    })

    test('离为火: [1,0,1,1,0,1]', () => {
      const hex = lookupHexagram([1, 0, 1, 1, 0, 1])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('离为火')
      expect(hex!.palace).toBe('离')
    })

    test('天地否: 内坤外乾 [0,0,0,1,1,1]', () => {
      const hex = lookupHexagram([0, 0, 0, 1, 1, 1])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('天地否')
      expect(hex!.palace).toBe('乾')
    })

    test('地天泰: 内乾外坤 [1,1,1,0,0,0]', () => {
      const hex = lookupHexagram([1, 1, 1, 0, 0, 0])
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('地天泰')
      expect(hex!.palace).toBe('坤')
    })

    test('无效长度返回 undefined', () => {
      expect(lookupHexagram([1, 1, 1])).toBeUndefined()
    })
  })

  describe('lookupByName', () => {
    test('乾为天', () => {
      const hex = lookupByName('乾为天')
      expect(hex).toBeDefined()
      expect(hex!.shiLine).toBe(6)
      expect(hex!.yingLine).toBe(3)
    })

    test('不存在的卦名', () => {
      expect(lookupByName('不存在')).toBeUndefined()
    })
  })

  // ==================== 步骤 3: 六亲 ====================

  describe('calcLiuQin — 六亲推导', () => {
    test('同我→兄弟: 木见木', () => {
      expect(calcLiuQin('木', '木')).toBe('兄弟')
    })
    test('我生→子孙: 木生火', () => {
      expect(calcLiuQin('木', '火')).toBe('子孙')
    })
    test('我克→妻财: 木克土', () => {
      expect(calcLiuQin('木', '土')).toBe('妻财')
    })
    test('克我→官鬼: 金克木', () => {
      expect(calcLiuQin('木', '金')).toBe('官鬼')
    })
    test('生我→父母: 水生木', () => {
      expect(calcLiuQin('木', '水')).toBe('父母')
    })

    // 火日主
    test('火日主: 火见水=官鬼', () => {
      expect(calcLiuQin('火', '水')).toBe('官鬼')
    })
    test('火日主: 火见金=妻财', () => {
      expect(calcLiuQin('火', '金')).toBe('妻财')
    })
  })

  // ==================== 步骤 4: 六神 ====================

  describe('calcLiuShen — 六神排列', () => {
    test('甲日初爻起青龙', () => {
      expect(calcLiuShen('甲', 1)).toBe('青龙')
    })
    test('甲日二爻朱雀', () => {
      expect(calcLiuShen('甲', 2)).toBe('朱雀')
    })
    test('甲日上爻(6)玄武', () => {
      expect(calcLiuShen('甲', 6)).toBe('玄武')
    })
    test('丙日初爻起朱雀', () => {
      expect(calcLiuShen('丙', 1)).toBe('朱雀')
    })
    test('壬日初爻起玄武', () => {
      expect(calcLiuShen('壬', 1)).toBe('玄武')
    })
    test('壬日二爻青龙', () => {
      expect(calcLiuShen('壬', 2)).toBe('青龙')
    })
  })

  // ==================== 步骤 6: 旺相休囚死 ====================

  describe('calcWangXiu — 旺衰判定', () => {
    // 月建为寅(木), 木旺/火相/水休/金囚/土死
    test('寅月木旺', () => expect(calcWangXiu('寅', '木')).toBe('旺'))
    test('寅月火相', () => expect(calcWangXiu('寅', '火')).toBe('相'))
    test('寅月水休', () => expect(calcWangXiu('寅', '水')).toBe('休'))
    test('寅月金囚', () => expect(calcWangXiu('寅', '金')).toBe('囚'))
    test('寅月土死', () => expect(calcWangXiu('寅', '土')).toBe('死'))

    // 月建为午(火), 火旺/土相/木休/水囚/金死
    test('午月火旺', () => expect(calcWangXiu('午', '火')).toBe('旺'))
    test('午月土相', () => expect(calcWangXiu('午', '土')).toBe('相'))
  })

  // ==================== 步骤 7: 旬空 ====================

  describe('getXunKong — 旬空查表', () => {
    test('甲子旬: 戌亥空', () => {
      const [k1, k2] = getXunKong('甲', '子')
      expect(k1).toBe('戌')
      expect(k2).toBe('亥')
    })
    test('甲戌旬: 申酉空', () => {
      const [k1, k2] = getXunKong('甲', '戌')
      expect(k1).toBe('申')
      expect(k2).toBe('酉')
    })
    test('甲午旬: 辰巳空', () => {
      const [k1, k2] = getXunKong('甲', '午')
      expect(k1).toBe('辰')
      expect(k2).toBe('巳')
    })
    // 乙丑 在甲子旬（乙是甲后一位，丑是子后一位）
    test('乙丑 → 甲子旬: 戌亥空', () => {
      const [k1, k2] = getXunKong('乙', '丑')
      expect(k1).toBe('戌')
      expect(k2).toBe('亥')
    })
    // 丙寅 在甲子旬
    test('丙寅 → 甲子旬: 戌亥空', () => {
      const [k1, k2] = getXunKong('丙', '寅')
      expect(k1).toBe('戌')
      expect(k2).toBe('亥')
    })
  })

  describe('calcKongWang', () => {
    test('甲子日, 戌爻 = 空亡', () => {
      expect(calcKongWang('甲', '子', '戌')).toBe(true)
    })
    test('甲子日, 亥爻 = 空亡', () => {
      expect(calcKongWang('甲', '子', '亥')).toBe(true)
    })
    test('甲子日, 午爻 ≠ 空亡', () => {
      expect(calcKongWang('甲', '子', '午')).toBe(false)
    })
  })

  // ==================== 步骤 8: 互卦 ====================

  describe('calcNuclearHexagram — 互卦', () => {
    test('乾为天 互卦 = 乾为天', () => {
      // 乾: [1,1,1,1,1,1]
      // 下互: [1,1,1], 上互: [1,1,1] → 乾-乾 = 乾为天
      const result = calcNuclearHexagram([1, 1, 1, 1, 1, 1])
      expect(result).toBeDefined()
      expect(result!.name).toBe('乾为天')
    })

    test('坤为地 互卦 = 坤为地', () => {
      const result = calcNuclearHexagram([0, 0, 0, 0, 0, 0])
      expect(result).toBeDefined()
      expect(result!.name).toBe('坤为地')
    })

    test('天地否 [0,0,0,1,1,1] 互卦', () => {
      // 下互: [0,0,1]=艮, 上互: [0,1,1]=巽 → 巽-艮 = 风山渐
      const result = calcNuclearHexagram([0, 0, 0, 1, 1, 1])
      expect(result).toBeDefined()
      expect(result!.name).toBe('风山渐')
    })
  })

  // ==================== 步骤 9: 变卦 ====================

  describe('calcDerivedHexagram — 变卦', () => {
    test('乾为天 初爻老阳(9) → 变天风姤', () => {
      // 乾: [9,7,7,7,7,7] → 初爻变 → [0,1,1,1,1,1]
      // 内卦: [0,1,1]=巽, 外卦: [1,1,1]=乾 → 乾-巽 = 天风姤
      const result = calcDerivedHexagram([9, 7, 7, 7, 7, 7])
      expect(result).toBeDefined()
      expect(result!.name).toBe('天风姤')
    })

    test('无变爻返回 undefined', () => {
      expect(calcDerivedHexagram([7, 7, 7, 7, 7, 7])).toBeUndefined()
    })

    test('老阴(6) 变阳', () => {
      // 坤: [6,8,8,8,8,8] → 初爻变 → [1,0,0,0,0,0]
      // 内卦: [1,0,0]=震, 外卦: [0,0,0]=坤 → 坤-震 = 地雷复
      const result = calcDerivedHexagram([6, 8, 8, 8, 8, 8])
      expect(result).toBeDefined()
      expect(result!.name).toBe('地雷复')
    })
  })

  // ==================== 完整装卦 ====================

  describe('assembleHexagram — 完整装卦', () => {
    test('乾为天 静卦装卦', () => {
      // 全少阳, 甲日, 甲子日, 寅月
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')
      expect(hex).toBeDefined()
      expect(hex!.name).toBe('乾为天')
      expect(hex!.palace).toBe('乾')
      expect(hex!.shiLine).toBe(6)
      expect(hex!.yingLine).toBe(3)
      expect(hex!.lines).toHaveLength(6)
      expect(hex!.changingLines).toHaveLength(0)
      expect(hex!.derivedHexagram).toBeUndefined()
    })

    test('乾为天 六爻纳甲正确', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      // 乾纳甲(内): 甲子/甲寅/甲辰
      // 乾纳壬(外): 壬午/壬申/壬戌
      expect(hex.lines[0]!.ganZhi).toBe('甲子')
      expect(hex.lines[1]!.ganZhi).toBe('甲寅')
      expect(hex.lines[2]!.ganZhi).toBe('甲辰')
      expect(hex.lines[3]!.ganZhi).toBe('壬午')
      expect(hex.lines[4]!.ganZhi).toBe('壬申')
      expect(hex.lines[5]!.ganZhi).toBe('壬戌')
    })

    test('乾为天 世应爻标记正确', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      expect(hex.lines[5]!.isShiYao).toBe(true) // 上爻=世
      expect(hex.lines[2]!.isYingYao).toBe(true) // 三爻=应
      // 其他非世非应
      expect(hex.lines[0]!.isShiYao).toBe(false)
      expect(hex.lines[0]!.isYingYao).toBe(false)
    })

    test('六亲计算正确 (甲日主=木)', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      // 甲=木日主
      // 初爻 甲子→子=水 → 生我 → 父母
      expect(hex.lines[0]!.liuQin).toBe('父母')
      // 二爻 甲寅→寅=木 → 同我 → 兄弟
      expect(hex.lines[1]!.liuQin).toBe('兄弟')
      // 三爻 甲辰→辰=土 → 我克 → 妻财
      expect(hex.lines[2]!.liuQin).toBe('妻财')
      // 四爻 壬午→午=火 → 我生 → 子孙
      expect(hex.lines[3]!.liuQin).toBe('子孙')
      // 五爻 壬申→申=金 → 克我 → 官鬼
      expect(hex.lines[4]!.liuQin).toBe('官鬼')
      // 上爻 壬戌→戌=土 → 我克 → 妻财
      expect(hex.lines[5]!.liuQin).toBe('妻财')
    })

    test('六神排列正确 (甲日起青龙)', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      expect(hex.lines[0]!.liuShen).toBe('青龙')
      expect(hex.lines[1]!.liuShen).toBe('朱雀')
      expect(hex.lines[2]!.liuShen).toBe('勾陈')
      expect(hex.lines[3]!.liuShen).toBe('腾蛇')
      expect(hex.lines[4]!.liuShen).toBe('白虎')
      expect(hex.lines[5]!.liuShen).toBe('玄武')
    })

    test('旺衰判定正确 (寅月)', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      // 寅月=木月: 木旺/火相/水休/金囚/土死
      // 初爻 子=水 → 休
      expect(hex.lines[0]!.wangXiu).toBe('休')
      // 二爻 寅=木 → 旺
      expect(hex.lines[1]!.wangXiu).toBe('旺')
      // 三爻 辰=土 → 死
      expect(hex.lines[2]!.wangXiu).toBe('死')
      // 四爻 午=火 → 相
      expect(hex.lines[3]!.wangXiu).toBe('相')
      // 五爻 申=金 → 囚
      expect(hex.lines[4]!.wangXiu).toBe('囚')
    })

    test('旬空判定正确 (甲子日: 戌亥空)', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      // 甲子旬: 戌亥空
      // 上爻 壬戌 → 戌=空
      expect(hex.lines[5]!.isEmpty).toBe(true)
      // 初爻 甲子 → 子≠空
      expect(hex.lines[0]!.isEmpty).toBe(false)
    })

    test('有动爻时生成变卦', () => {
      // 乾为天 初爻老阳 → 天风姤
      const hex = assembleHexagram([9, 7, 7, 7, 7, 7], '甲', '子', '寅')
      expect(hex).toBeDefined()
      expect(hex!.changingLines).toHaveLength(1)
      expect(hex!.changingLines[0]!.index).toBe(1)
      expect(hex!.derivedHexagram).toBeDefined()
      expect(hex!.derivedHexagram!.name).toBe('天风姤')
    })

    test('有互卦', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      expect(hex.nuclearHexagram).toBeDefined()
      expect(hex.nuclearHexagram!.name).toBe('乾为天')
    })

    test('无效输入返回 undefined', () => {
      expect(assembleHexagram([7, 7, 7], '甲', '子', '寅')).toBeUndefined()
    })
  })

  // ==================== 格式化 ====================

  describe('formatHexagramForPrompt', () => {
    test('输出包含核心信息', () => {
      const hex = assembleHexagram([7, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      const text = formatHexagramForPrompt(hex)

      expect(text).toContain('乾为天')
      expect(text).toContain('属乾宫')
      expect(text).toContain('世爻')
      expect(text).toContain('应爻')
      expect(text).toContain('六爻表')
      expect(text).toContain('甲子')
      expect(text).toContain('壬戌')
      expect(text).toContain('青龙')
      expect(text).toContain('父母')
      expect(text).toContain('互卦')
    })

    test('有变卦时输出变卦', () => {
      const hex = assembleHexagram([9, 7, 7, 7, 7, 7], '甲', '子', '寅')!
      const text = formatHexagramForPrompt(hex)

      expect(text).toContain('变卦')
      expect(text).toContain('天风姤')
      expect(text).toContain('动')
    })
  })

  // ==================== 数据完整性 ====================

  describe('NAJIA_TABLE 数据完整性', () => {
    test('共 64 卦', () => {
      expect(Object.keys(NAJIA_TABLE)).toHaveLength(64)
    })

    test('每卦有 6 爻纳甲', () => {
      for (const [name, hex] of Object.entries(NAJIA_TABLE)) {
        expect(hex.naJia).toHaveLength(6)
        for (const gz of hex.naJia) {
          expect(gz.length).toBe(2)
        }
      }
    })

    test('每卦世应爻位在 1-6', () => {
      for (const hex of Object.values(NAJIA_TABLE)) {
        expect(hex.shiLine).toBeGreaterThanOrEqual(1)
        expect(hex.shiLine).toBeLessThanOrEqual(6)
        expect(hex.yingLine).toBeGreaterThanOrEqual(1)
        expect(hex.yingLine).toBeLessThanOrEqual(6)
        expect(hex.shiLine).not.toBe(hex.yingLine)
      }
    })

    test('八宫每宫有 8 卦', () => {
      const palaces: Record<string, number> = {}
      for (const hex of Object.values(NAJIA_TABLE)) {
        palaces[hex.palace] = (palaces[hex.palace] ?? 0) + 1
      }
      for (const [palace, count] of Object.entries(palaces)) {
        expect(count).toBe(8)
      }
      expect(Object.keys(palaces)).toHaveLength(8)
    })
  })

  describe('TRIGRAM_PAIR_TO_HEXAGRAM 完整性', () => {
    test('共 64 条', () => {
      expect(Object.keys(TRIGRAM_PAIR_TO_HEXAGRAM)).toHaveLength(64)
    })

    test('所有卦名在 NAJIA_TABLE 中存在', () => {
      for (const hexName of Object.values(TRIGRAM_PAIR_TO_HEXAGRAM)) {
        expect(NAJIA_TABLE[hexName]).toBeDefined()
      }
    })
  })
})
