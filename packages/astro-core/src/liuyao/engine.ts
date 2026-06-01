/**
 * @zhop/astro-core — 纳甲六爻装卦引擎
 *
 * 完整九步装卦流程:
 * 1. lookupHexagram()  → 本卦名 + 宫位
 * 2. lookupNaJia()     → 六爻干支
 * 3. calcLiuQin()      → 六亲（根据日主五行）
 * 4. calcLiuShen()     → 六神（根据日干）
 * 5. calcShiYing()     → 世应爻位（查表）
 * 6. calcWangXiu()     → 旺相休囚死（根据月建）
 * 7. calcKongWang()    → 空亡（根据日干旬空）
 * 8. calcNuclear()     → 互卦（取 2-5 爻）
 * 9. calcDerived()     → 变卦（老阴/老阳变爻）
 */

import { BRANCH_WUXING, EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_WUXING } from '../constants'
import type { EarthlyBranch, HeavenlyStem, WuXing } from '../types'
import { LINES_TO_TRIGRAM, NAJIA_TABLE, TRIGRAM_PAIR_TO_HEXAGRAM } from './najia-table'
import type {
  FullHexagram,
  LiuQin,
  LiuShen,
  NaJiaHexagramData,
  PalaceName,
  WangXiu,
  YaoIndex,
  YaoLine,
  YaoValue,
} from './types'

// ==================== 辅助函数 ====================

/** 解析干支字符串为 [天干, 地支] */
function parseGanZhi(gz: string): [HeavenlyStem, EarthlyBranch] {
  return [gz[0] as HeavenlyStem, gz[1] as EarthlyBranch]
}

/** 爻值(6/7/8/9) → 阴阳 (1=阳, 0=阴) */
export function yaoToYinYang(value: YaoValue): 0 | 1 {
  // 7=少阳(1), 9=老阳(1 → 变), 8=少阴(0), 6=老阴(0 → 变)
  return value % 2 === 1 ? 1 : 0
}

/** 爻值是否为变爻 (6=老阴, 9=老阳) */
export function isChangingYao(value: YaoValue): boolean {
  return value === 6 || value === 9
}

/** 三爻线条(bottom-to-top) → 经卦名称 */
function linesToTrigram(lines: readonly (0 | 1)[]): string {
  const key = `${lines[0]},${lines[1]},${lines[2]}`
  return LINES_TO_TRIGRAM[key] ?? '坤'
}

// ==================== 步骤 1: 查卦 ====================

/**
 * 从六爻阴阳 → 查找卦名和纳甲数据
 *
 * @param lines 六爻阴阳值 [初爻..上爻], 1=阳, 0=阴
 */
export function lookupHexagram(lines: readonly (0 | 1)[]): NaJiaHexagramData | undefined {
  if (lines.length !== 6) return undefined

  // 分内卦(1-3爻) + 外卦(4-6爻)
  const lower = linesToTrigram([lines[0]!, lines[1]!, lines[2]!])
  const upper = linesToTrigram([lines[3]!, lines[4]!, lines[5]!])

  const hexName = TRIGRAM_PAIR_TO_HEXAGRAM[`${upper}-${lower}`]
  if (!hexName) return undefined

  return NAJIA_TABLE[hexName]
}

/**
 * 直接按卦名查找纳甲数据
 */
export function lookupByName(name: string): NaJiaHexagramData | undefined {
  return NAJIA_TABLE[name]
}

// ==================== 步骤 3: 六亲 ====================

/**
 * 五行 → 五行 的六亲关系
 *
 * 以日主五行为"我":
 * - 同我 → 兄弟
 * - 我生 → 子孙
 * - 我克 → 妻财
 * - 克我 → 官鬼
 * - 生我 → 父母
 */
const WUXING_GENERATES: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}
const WUXING_CONTROLS: Record<WuXing, WuXing> = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
}

export function calcLiuQin(dayMasterWuXing: WuXing, lineWuXing: WuXing): LiuQin {
  if (dayMasterWuXing === lineWuXing) return '兄弟'
  if (WUXING_GENERATES[dayMasterWuXing] === lineWuXing) return '子孙'
  if (WUXING_CONTROLS[dayMasterWuXing] === lineWuXing) return '妻财'
  if (WUXING_CONTROLS[lineWuXing] === dayMasterWuXing) return '官鬼'
  // 生我 → 父母
  return '父母'
}

// ==================== 步骤 4: 六神 ====================

/**
 * 六神排列顺序: 青龙→朱雀→勾陈→腾蛇→白虎→玄武
 *
 * 甲乙日起青龙, 丙丁日起朱雀, 戊日起勾陈, 己日起腾蛇, 庚辛日起白虎, 壬癸日起玄武
 */
const LIUSHEN_ORDER: readonly LiuShen[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']

/** 日干 → 六神起始索引 */
const LIUSHEN_START: Record<HeavenlyStem, number> = {
  甲: 0,
  乙: 0, // 青龙
  丙: 1,
  丁: 1, // 朱雀
  戊: 2, // 勾陈
  己: 3, // 腾蛇
  庚: 4,
  辛: 4, // 白虎
  壬: 5,
  癸: 5, // 玄武
}

export function calcLiuShen(dayStem: HeavenlyStem, yaoIndex: YaoIndex): LiuShen {
  const start = LIUSHEN_START[dayStem]
  // yaoIndex 1-6 对应从初爻到上爻
  return LIUSHEN_ORDER[(start + yaoIndex - 1) % 6]!
}

// ==================== 步骤 6: 旺相休囚死 ====================

/**
 * 月令(月建地支五行) → 各五行旺衰
 *
 * 旺: 与月令同五行
 * 相: 月令所生
 * 休: 生月令者
 * 囚: 克月令者
 * 死: 月令所克
 */
export function calcWangXiu(monthBranch: EarthlyBranch, lineWuXing: WuXing): WangXiu {
  const monthWuXing = BRANCH_WUXING[monthBranch]

  if (monthWuXing === lineWuXing) return '旺'
  if (WUXING_GENERATES[monthWuXing] === lineWuXing) return '相'
  if (WUXING_GENERATES[lineWuXing] === monthWuXing) return '休'
  if (WUXING_CONTROLS[lineWuXing] === monthWuXing) return '囚'
  return '死'
}

// ==================== 步骤 7: 旬空（空亡） ====================

/**
 * 六十甲子旬空表：
 * 每一旬(10天干 × 同一组地支)有两个地支空亡。
 *
 * 旬:      甲子旬 → 戌亥空
 *          甲戌旬 → 申酉空
 *          甲申旬 → 午未空
 *          甲午旬 → 辰巳空
 *          甲辰旬 → 寅卯空
 *          甲寅旬 → 子丑空
 */
const XUN_KONG: Record<string, readonly [EarthlyBranch, EarthlyBranch]> = {
  甲子: ['戌', '亥'],
  甲戌: ['申', '酉'],
  甲申: ['午', '未'],
  甲午: ['辰', '巳'],
  甲辰: ['寅', '卯'],
  甲寅: ['子', '丑'],
}

/**
 * 根据日干支确定日柱所在的旬，返回旬空的两个地支
 */
export function getXunKong(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch
): readonly [EarthlyBranch, EarthlyBranch] {
  const stemIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const branchIdx = EARTHLY_BRANCHES.indexOf(dayBranch)

  // 旬首: 从日柱往前推到甲X
  // stemIdx 步数回到甲 = stemIdx 本身
  // 旬首地支 = branchIdx - stemIdx (mod 12)
  const xunBranchIdx = (((branchIdx - stemIdx) % 12) + 12) % 12
  const xunKey = `甲${EARTHLY_BRANCHES[xunBranchIdx]}`

  return XUN_KONG[xunKey] ?? ['戌', '亥']
}

export function calcKongWang(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
  lineBranch: EarthlyBranch
): boolean {
  const [k1, k2] = getXunKong(dayStem, dayBranch)
  return lineBranch === k1 || lineBranch === k2
}

// ==================== 步骤 8: 互卦 ====================

/**
 * 互卦: 取 2-5 爻组成新卦
 * 下互卦: 2-3-4 爻 (index 1-2-3)
 * 上互卦: 3-4-5 爻 (index 2-3-4)
 */
export function calcNuclearHexagram(lines: readonly (0 | 1)[]): { name: string } | undefined {
  if (lines.length !== 6) return undefined

  const lowerLines = [lines[1]!, lines[2]!, lines[3]!] as const
  const upperLines = [lines[2]!, lines[3]!, lines[4]!] as const

  const lower = linesToTrigram(lowerLines)
  const upper = linesToTrigram(upperLines)

  const hexName = TRIGRAM_PAIR_TO_HEXAGRAM[`${upper}-${lower}`]
  if (!hexName) return undefined

  return { name: hexName }
}

// ==================== 步骤 9: 变卦 ====================

/**
 * 变卦: 老阴(6) → 阳(1), 老阳(9) → 阴(0)
 * 其余不变
 */
export function calcDerivedHexagram(
  yaoValues: readonly YaoValue[]
): { name: string; palace: PalaceName; lines: readonly (0 | 1)[] } | undefined {
  // 检查是否有变爻
  const hasChanging = yaoValues.some(isChangingYao)
  if (!hasChanging) return undefined

  const derivedLines: (0 | 1)[] = yaoValues.map((v) => {
    if (v === 6) return 1 // 老阴变阳
    if (v === 9) return 0 // 老阳变阴
    return yaoToYinYang(v)
  })

  const hexData = lookupHexagram(derivedLines)
  if (!hexData) return undefined

  return {
    name: hexData.name,
    palace: hexData.palace,
    lines: derivedLines,
  }
}

// ==================== 主函数: 完整装卦 ====================

/**
 * 纳甲六爻完整装卦
 *
 * @param yaoValues 六爻值 [初爻..上爻], 每爻为 6/7/8/9
 * @param dayStem 日干 (六神用)
 * @param dayBranch 日支 (旬空用)
 * @param monthBranch 月建地支 (旺衰用)
 * @returns 完整装卦结果
 */
export function assembleHexagram(
  yaoValues: readonly YaoValue[],
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
  monthBranch: EarthlyBranch
): FullHexagram | undefined {
  if (yaoValues.length !== 6) return undefined

  // 步骤 1: 爻值 → 阴阳 → 查卦
  const binaryLines: (0 | 1)[] = yaoValues.map(yaoToYinYang)
  const hexData = lookupHexagram(binaryLines)
  if (!hexData) return undefined

  // 日主五行 (用于六亲)
  const dayMasterWuXing = STEM_WUXING[dayStem]

  // 步骤 2-7: 逐爻装配
  const lines: YaoLine[] = hexData.naJia.map((gz, idx) => {
    const yaoIndex = (idx + 1) as YaoIndex
    const [stem, branch] = parseGanZhi(gz)
    const lineWuXing = BRANCH_WUXING[branch]

    return {
      index: yaoIndex,
      ganZhi: gz,
      stem,
      branch,
      wuXing: lineWuXing,
      liuQin: calcLiuQin(dayMasterWuXing, lineWuXing),
      liuShen: calcLiuShen(dayStem, yaoIndex),
      isChanging: isChangingYao(yaoValues[idx]!),
      isShiYao: yaoIndex === hexData.shiLine,
      isYingYao: yaoIndex === hexData.yingLine,
      wangXiu: calcWangXiu(monthBranch, lineWuXing),
      isEmpty: calcKongWang(dayStem, dayBranch, branch),
    }
  })

  const changingLines = lines.filter((l) => l.isChanging)

  // 步骤 8: 互卦
  const nuclearHexagram = calcNuclearHexagram(binaryLines)

  // 步骤 9: 变卦
  const derived = calcDerivedHexagram(yaoValues)
  let derivedHexagram: FullHexagram['derivedHexagram']
  if (derived) {
    const derivedData = lookupHexagram(derived.lines)
    if (derivedData) {
      const derivedLines: YaoLine[] = derivedData.naJia.map((gz, idx) => {
        const yaoIndex = (idx + 1) as YaoIndex
        const [stem, branch] = parseGanZhi(gz)
        const lineWuXing = BRANCH_WUXING[branch]
        return {
          index: yaoIndex,
          ganZhi: gz,
          stem,
          branch,
          wuXing: lineWuXing,
          liuQin: calcLiuQin(dayMasterWuXing, lineWuXing),
          liuShen: calcLiuShen(dayStem, yaoIndex),
          isChanging: false,
          isShiYao: yaoIndex === derivedData.shiLine,
          isYingYao: yaoIndex === derivedData.yingLine,
          wangXiu: calcWangXiu(monthBranch, lineWuXing),
          isEmpty: calcKongWang(dayStem, dayBranch, branch),
        }
      })
      derivedHexagram = {
        name: derived.name,
        palace: derived.palace,
        lines: derivedLines,
      }
    }
  }

  return {
    name: hexData.name,
    palace: hexData.palace,
    lines,
    changingLines,
    derivedHexagram,
    nuclearHexagram: nuclearHexagram ?? undefined,
    shiLine: hexData.shiLine,
    yingLine: hexData.yingLine,
    dayStem,
    monthBranch,
    dayBranch,
  }
}

/**
 * 格式化完整卦为 AI Prompt 文本
 *
 * 输出示例:
 * ```
 * 本卦：乾为天 属乾宫
 * 世爻：第6爻 壬戌 [兄弟] [青龙] 旺
 * 应爻：第3爻 甲辰 [子孙] [腾蛇] 相
 * ```
 */
export function formatHexagramForPrompt(hex: FullHexagram): string {
  const parts: string[] = []

  parts.push(`本卦：${hex.name} 属${hex.palace}宫`)

  const shiYao = hex.lines.find((l) => l.isShiYao)
  const yingYao = hex.lines.find((l) => l.isYingYao)

  if (shiYao) {
    parts.push(
      `世爻：第${shiYao.index}爻 ${shiYao.ganZhi} [${shiYao.liuQin}] [${shiYao.liuShen}] ${shiYao.wangXiu}${shiYao.isEmpty ? ' 空' : ''}`
    )
  }
  if (yingYao) {
    parts.push(
      `应爻：第${yingYao.index}爻 ${yingYao.ganZhi} [${yingYao.liuQin}] [${yingYao.liuShen}] ${yingYao.wangXiu}${yingYao.isEmpty ? ' 空' : ''}`
    )
  }

  parts.push('')
  parts.push('六爻表：')

  // 从上爻到初爻排列（传统显示方式）
  for (let i = 5; i >= 0; i--) {
    const l = hex.lines[i]!
    const position = i === 5 ? '上爻' : i === 0 ? '初爻' : `${['', '二', '三', '四', '五'][i]}爻`
    const marks: string[] = []
    if (l.isShiYao) marks.push('世')
    if (l.isYingYao) marks.push('应')
    if (l.isChanging) marks.push('动')
    if (l.isEmpty) marks.push('空')

    parts.push(
      `${position} ${l.ganZhi} [${l.liuQin}] [${l.liuShen}] ${l.wangXiu}${marks.length > 0 ? ` ${marks.join(' ')}` : ''}`
    )
  }

  if (hex.nuclearHexagram) {
    parts.push(`\n互卦：${hex.nuclearHexagram.name}`)
  }
  if (hex.derivedHexagram) {
    parts.push(`变卦：${hex.derivedHexagram.name} 属${hex.derivedHexagram.palace}宫`)
  }

  return parts.join('\n')
}
