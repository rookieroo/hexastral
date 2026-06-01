/**
 * 梅花易数排卦算法
 *
 * 起卦依据邵雍「先天八卦数」时间起卦法：
 *   上卦 = (月 + 日 + 时辰) % 8        → 结果为 0 取 8
 *   下卦 = (月 + 日 + 时辰 + 观察数) % 8 → 结果为 0 取 8
 *   动爻 = (月 + 日 + 时辰 + 观察数) % 6 → 结果为 0 取 6
 *
 * 先天卦数: 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8
 *
 * 体卦 vs 用卦（PRD v2.1 修正）:
 *   动爻所在卦 = 用卦（所问之事）
 *   不动之卦 = 体卦（问卦者自身）
 *   动爻 1-3 在下卦 → 下卦=用, 上卦=体
 *   动爻 4-6 在上卦 → 上卦=用, 下卦=体
 *   五行生克决定吉凶：用生体>大吉，体克用>得，体生用>耗，用克体>凶，同类>平
 *
 * 互卦（Nuclear Hexagram）:
 *   取原卦第 2,3,4 爻为下互卦，第 3,4,5 爻为上互卦，合成六爻
 */

export interface MeihuaInput {
  /** 用户所见之数（可选，0 = 不叠加，纯用时间起卦） */
  observedNumber?: number
}

export interface MeihuaCastResult {
  /** 6 爻，从下至上，阳=1 阴=0 */
  lines: number[]
  /** 动爻索引（0-based from bottom），梅花只有一个动爻 */
  changingLines: number[]
  /** 传给后端 API 的熵字符串 */
  entropy: string
  /** 上卦先天数（1-8） */
  upperNumber: number
  /** 下卦先天数（1-8） */
  lowerNumber: number
  /** 动爻（1-6，从下往上） */
  changingLineNumber: number
  /** 体卦先天数（不含动爻的那一卦） */
  bodyTrigramNumber: number
  /** 用卦先天数（含动爻的那一卦） */
  useTrigramNumber: number
  /** 互卦（Nuclear Hexagram）— 取 2,3,4 爻为下, 3,4,5 爻为上 */
  nuclearHexagram: {
    lines: number[]
    upperNumber: number
    lowerNumber: number
  }
  /** 推算过程（用于 UI 展示） */
  process: {
    month: number
    day: number
    hourIndex: number
    observedNumber: number
    upperSum: number
    lowerSum: number
  }
}

/**
 * 先天卦数 → 三爻 (index 0=初爻/底, 1=中爻, 2=上爻/顶，阳=1 阴=0)
 *
 * 先天数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8
 * 以先天方位二进制排列：乾(111) 兑(110) 离(101) 震(100) 巽(011) 坎(010) 艮(001) 坤(000)
 */
export const TRIGRAM_LINES: Record<number, [number, number, number]> = {
  1: [1, 1, 1], // 乾 ☰
  2: [0, 1, 1], // 兑 ☱
  3: [1, 0, 1], // 离 ☲
  4: [0, 0, 1], // 震 ☳
  5: [1, 1, 0], // 巽 ☴
  6: [0, 1, 0], // 坎 ☵
  7: [1, 0, 0], // 艮 ☶
  8: [0, 0, 0], // 坤 ☷
}

export const TRIGRAM_NAMES: Record<number, string> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
}

export const TRIGRAM_SYMBOLS: Record<number, string> = {
  1: '☰',
  2: '☱',
  3: '☲',
  4: '☳',
  5: '☴',
  6: '☵',
  7: '☶',
  8: '☷',
}

/** 先天卦数对应五行 */
export const TRIGRAM_ELEMENT: Record<number, string> = {
  1: '金', // 乾
  2: '金', // 兑
  3: '火', // 离
  4: '木', // 震
  5: '木', // 巽
  6: '水', // 坎
  7: '土', // 艮
  8: '土', // 坤
}

/**
 * 三爻 → 先天卦数（反查）
 *
 * 将三爻数组 [初爻, 中爻, 上爻] 转换为先天八卦数 (1-8)
 */
export function trigramLinesToNumber(trigramLines: number[]): number {
  for (const [num, lines] of Object.entries(TRIGRAM_LINES)) {
    if (
      lines[0] === trigramLines[0] &&
      lines[1] === trigramLines[1] &&
      lines[2] === trigramLines[2]
    ) {
      return Number(num)
    }
  }
  return 8 // fallback 坤
}

/**
 * 五行生克简判 — 根据体卦/用卦判断吉凶
 *
 * PRD v2.1 修正：调用方应传入正确的 bodyNumber/useNumber
 * （由 castMeihua 根据动爻位置自动计算）
 */
export function assessBodyUseRelation(
  bodyNumber: number,
  useNumber: number
): { label: string; fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune' } {
  const bodyElement = TRIGRAM_ELEMENT[bodyNumber]!
  const useElement = TRIGRAM_ELEMENT[useNumber]!

  if (bodyElement === useElement) return { label: '比和', fortune: 'neutral' }

  const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

  if (GENERATES[useElement] === bodyElement) return { label: '用生体', fortune: 'great-fortune' }
  if (CONTROLS[bodyElement] === useElement) return { label: '体克用', fortune: 'fortune' }
  if (GENERATES[bodyElement] === useElement) return { label: '体生用', fortune: 'caution' }
  if (CONTROLS[useElement] === bodyElement) return { label: '用克体', fortune: 'misfortune' }

  return { label: '比和', fortune: 'neutral' }
}

/**
 * 当前时辰索引（1-12）
 * 子=1(23-0), 丑=2(1-2), 寅=3(3-4), ... 亥=12(21-22)
 */
function getCurrentHourIndex(): number {
  const hour = new Date().getHours()
  if (hour === 23 || hour === 0) return 1
  return Math.floor(hour / 2) + 1
}

/**
 * 梅花易数起卦
 */
export function castMeihua(input: MeihuaInput = {}): MeihuaCastResult {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const hourIndex = getCurrentHourIndex()
  const observedNumber = input.observedNumber ?? 0

  const upperSum = month + day + hourIndex
  const upperNumber = upperSum % 8 || 8

  const lowerSum = upperSum + observedNumber
  const lowerNumber = lowerSum % 8 || 8

  const changingNumber = lowerSum % 6 || 6
  const changingLineNumber = changingNumber

  // 下卦在 [0..2]，上卦在 [3..5]（从下往上）
  const lower = TRIGRAM_LINES[lowerNumber]!
  const upper = TRIGRAM_LINES[upperNumber]!
  const lines: number[] = [...lower, ...upper]
  const changingLines = [changingLineNumber - 1] // 0-based

  // ── 体卦/用卦判定（PRD v2.1 修正） ──
  // 动爻在下卦(1-3) → 下卦=用, 上卦=体
  // 动爻在上卦(4-6) → 上卦=用, 下卦=体
  const changingInLower = changingLineNumber <= 3
  const bodyTrigramNumber = changingInLower ? upperNumber : lowerNumber
  const useTrigramNumber = changingInLower ? lowerNumber : upperNumber

  // ── 互卦（Nuclear Hexagram） ──
  // 取原卦第 2,3,4 爻为下互卦三爻，第 3,4,5 爻为上互卦三爻
  // 0-based: lines[1],lines[2],lines[3] = 下互, lines[2],lines[3],lines[4] = 上互
  const nuclearLowerLines = [lines[1]!, lines[2]!, lines[3]!]
  const nuclearUpperLines = [lines[2]!, lines[3]!, lines[4]!]
  const nuclearLines = [...nuclearLowerLines, ...nuclearUpperLines]
  const nuclearLowerNumber = trigramLinesToNumber(nuclearLowerLines)
  const nuclearUpperNumber = trigramLinesToNumber(nuclearUpperLines)

  // 生成熵字符串（>= 16 chars，满足 API schema min length）
  const entropy = `meihua:${month}:${day}:${hourIndex}:${observedNumber}:${upperNumber}:${lowerNumber}:${changingLineNumber}`

  return {
    lines,
    changingLines,
    entropy,
    upperNumber,
    lowerNumber,
    changingLineNumber,
    bodyTrigramNumber,
    useTrigramNumber,
    nuclearHexagram: {
      lines: nuclearLines,
      upperNumber: nuclearUpperNumber,
      lowerNumber: nuclearLowerNumber,
    },
    process: { month, day, hourIndex, observedNumber, upperSum, lowerSum },
  }
}
