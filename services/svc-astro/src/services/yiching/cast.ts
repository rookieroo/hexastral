/**
 * 占卜服务 — 卦象生成 + AI 解读
 *
 * 1. 前端传入熵源（加速度数据哈希 + 时间戳 + 电量 + 地理位置哈希）
 * 2. 后端用熵源 seed 生成六爻
 * 3. 查询卦象数据
 * 4. Gemini AI 生成现代白话解读
 */

import type { YaoValue } from '@zhop/astro-core'
import { assembleHexagram, formatHexagramForPrompt, getFourPillars } from '@zhop/astro-core'
import type { Hexagram } from '../../data/hexagrams'
import { getHexagramByLines } from '../../data/hexagrams'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import { buildLanguageBlock } from '../../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import type { DivinationReading, HexagramResult } from '../../types'

export interface DivinationInput {
  /** 用户的问题 */
  question: string
  /** 前端生成的熵源（加速度+时间+电量+地理位置哈希） */
  entropy: string
  /** 用户 ID */
  userId: string
  /** 输出语言，如 'zh-CN', 'en', 'ja' */
  language?: string
  /** 起卦方法 */
  method?: 'liuyao' | 'meihua'
  /**
   * 六爻（初爻→上爻），每爻 6/7/8/9。CoinCast 物理摇卦后由客户端传入，与 on-device 卦象一致。
   */
  yaoValues?: YaoValue[]
  /**
   * Optional RAG snippets from prior readings (same user). Must not override computed hexagram lines.
   */
  memoryContext?: string
}

export interface EntropyData {
  /** 加速度数据哈希 */
  accelerometer: string
  /** 时间戳 */
  timestamp: number
  /** 电量百分比 */
  battery?: number
  /** 地理位置哈希 */
  locationHash?: string
}

/**
 * 从熵源生成六爻
 * 使用三变筮法的现代简化版：
 * 每一爻由熵源的部分 hash 决定，产生老阴(6)/少阳(7)/少阴(8)/老阳(9)
 * 6=老阴(变)，7=少阳，8=少阴，9=老阳(变)
 */
export function generateYaoLines(entropy: string): {
  lines: number[]
  changingLines: number[]
  yaoValues: YaoValue[]
} {
  const lines: number[] = []
  const changingLines: number[] = []
  const yaoValues: YaoValue[] = []

  for (let i = 0; i < 6; i++) {
    // 取 entropy 的不同部分生成每一爻
    const segment = entropy.slice(i * 8, (i + 1) * 8) || entropy.slice(i * 4, (i + 1) * 4)
    let hash = 0
    for (const ch of segment) {
      hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
    }
    // 映射到 6/7/8/9（简化三变筮法概率）
    // 老阴(6): 1/16, 少阳(7): 5/16, 少阴(8): 7/16, 老阳(9): 3/16
    const mod = ((hash % 16) + 16) % 16
    let yao: YaoValue
    if (mod < 1)
      yao = 6 // 老阴 → 变
    else if (mod < 6)
      yao = 7 // 少阳
    else if (mod < 13)
      yao = 8 // 少阴
    else yao = 9 // 老阳 → 变

    yaoValues.push(yao)

    // 阳爻=1, 阴爻=0
    lines.push(yao % 2 === 1 ? 1 : 0)

    // 6(老阴) 和 9(老阳) 是变爻
    if (yao === 6 || yao === 9) {
      changingLines.push(i)
    }
  }

  return { lines, changingLines, yaoValues }
}

/**
 * 生成熵源哈希（后端额外混入服务端随机性）
 */
export async function createEntropyHash(clientEntropy: string): Promise<string> {
  const serverSalt = crypto.randomUUID()
  const combined = `${clientEntropy}:${serverSalt}:${Date.now()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 生成卦象结果
 */
export function castHexagram(lines: number[], changingLines: number[]): HexagramResult | null {
  const hexagram = getHexagramByLines(lines)
  if (!hexagram) return null

  return {
    number: hexagram.number,
    name: hexagram.name,
    pinyin: hexagram.pinyin,
    symbol: hexagram.symbol,
    upperTrigram: hexagram.upperTrigram,
    lowerTrigram: hexagram.lowerTrigram,
    judgment: hexagram.judgment,
    image: hexagram.image,
    changingLines,
  }
}

/**
 * 梅花易数先天卦数辅助映射（后端版）
 */
const MEIHUA_NAMES: Record<number, string> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
}
const MEIHUA_SYMBOLS: Record<number, string> = {
  1: '☰',
  2: '☱',
  3: '☲',
  4: '☳',
  5: '☴',
  6: '☵',
  7: '☶',
  8: '☷',
}
const MEIHUA_ELEMENTS: Record<number, string> = {
  1: '金',
  2: '金',
  3: '火',
  4: '木',
  5: '木',
  6: '水',
  7: '土',
  8: '土',
}

/** 从梅花熵字符串解析体用卦数 */
function parseMeihuaEntropy(
  entropy: string
): { upper: number; lower: number; changing: number } | null {
  const parts = entropy.split(':')
  if (parts[0] !== 'meihua' || parts.length < 8) return null
  const upper = Number.parseInt(parts[5]!, 10)
  const lower = Number.parseInt(parts[6]!, 10)
  const changing = Number.parseInt(parts[7]!, 10)
  if (Number.isNaN(upper) || Number.isNaN(lower) || Number.isNaN(changing)) return null
  return { upper, lower, changing }
}

/** 梅花体用五行生克判断 */
function getMeihuaRelation(upper: number, lower: number): { label: string; tendency: string } {
  const body = MEIHUA_ELEMENTS[upper]!
  const use = MEIHUA_ELEMENTS[lower]!
  const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const CON: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  if (body === use) return { label: '比和', tendency: '平稳，无大得失' }
  if (GEN[use] === body) return { label: '用生体', tendency: '大吉，得人相助，事成' }
  if (CON[body] === use) return { label: '体克用', tendency: '吉，主动方可得' }
  if (GEN[body] === use) return { label: '体生用', tendency: '小凶，耗费自身，谨慎' }
  if (CON[use] === body) return { label: '用克体', tendency: '凶，遇阻较急，需化解' }
  return { label: '比和', tendency: '平稳' }
}

/**
 * 构造 AI 解读的 prompt
 */
function buildInterpretationPrompt(
  question: string,
  hexagram: Hexagram,
  changingLines: number[],
  memoryContext: string,
  method: 'liuyao' | 'meihua' = 'liuyao',
  entropy = '',
  naJiaContext = ''
): string {
  const changingLinesText =
    changingLines.length > 0
      ? `变爻位置（从下到上）：${changingLines.map((i) => `第${i + 1}爻 — ${hexagram.lines[i]}`).join('；')}`
      : '无变爻（静卦）'

  // 梅花体用五行段落（仅梅花模式追加）
  let meihuaSection = ''
  if (method === 'meihua') {
    const parsed = parseMeihuaEntropy(entropy)
    if (parsed) {
      const rel = getMeihuaRelation(parsed.upper, parsed.lower)
      const upperName = MEIHUA_NAMES[parsed.upper]!
      const lowerName = MEIHUA_NAMES[parsed.lower]!
      const changingYao = hexagram.lines[parsed.changing - 1] ?? ''

      // 计算互卦 (取本卦二三四爻为互下卦，三四五爻为互上卦)
      // 注意：lines 数组按照初爻到上爻排列即 [初, 2, 3, 4, 5, 上]
      // 由于 getHexagramByLines 需要 0/1 数组，我们先从 hexagram.lines(文本如 '阴'/'阳') 反推或直接通过下方的 logic 传入

      const hs = getHexagramByLines([
        hexagram.lines[1]!.includes('阳') ? 1 : 0,
        hexagram.lines[2]!.includes('阳') ? 1 : 0,
        hexagram.lines[3]!.includes('阳') ? 1 : 0,
        hexagram.lines[2]!.includes('阳') ? 1 : 0,
        hexagram.lines[3]!.includes('阳') ? 1 : 0,
        hexagram.lines[4]!.includes('阳') ? 1 : 0,
      ])
      const nuclearName = hs ? hs.name : '未知'

      meihuaSection = `
## 梅花体用分析（核心判断）
- 体卦（问者）：上卦 ${MEIHUA_SYMBOLS[parsed.upper]}${upperName}（${MEIHUA_ELEMENTS[parsed.upper]}）
- 用卦（所问）：下卦 ${MEIHUA_SYMBOLS[parsed.lower]}${lowerName}（${MEIHUA_ELEMENTS[parsed.lower]}）
- 互卦（过程/内因）：${nuclearName}
- 体用关系：${rel.label} → ${rel.tendency}
- 动爻：第${parsed.changing}爻${changingYao ? ` — ${changingYao}` : ''}
`
    }
  }

  const memorySection =
    memoryContext.trim().length > 0
      ? `
## 过往语境（可选）
${memoryContext.trim()}
- 以上仅作语气与脉络参考；不得改写本卦卦名、卦序、爻位与变爻事实。
`
      : ''

  return `你是一位温厚的山居友伴，融通《周易》与道家「人身小天地」视角：卦象是当下心念与能量结构的显影，不是铁口宿命。
- 用现代人听得懂的话，真诚、具体、可行动。
- 结构自然融合三层：「引」卦辞/象辞或俗谚作轻引子；「转」落到问者自身小宇宙（情志、起居、呼吸、微行动）；「合」以变易智慧收束为 72 小时内可观察的一步。
- 禁止恐吓式断言、医疗诊断与用药建议；三不占仍须先审。
${memorySection}
## 用户的问题
「${question}」

## 卦象信息
- 卦名：${hexagram.name}（${hexagram.pinyin}）— 第${hexagram.number}卦
- 卦象：${hexagram.symbol}
- 上卦 ${hexagram.upperTrigram}，下卦 ${hexagram.lowerTrigram}
- 卦辞：${hexagram.judgment}
- 象辞：${hexagram.image}
- ${changingLinesText}
${
  naJiaContext
    ? `
## 纳甲六爻详解（核心判断依据）
${naJiaContext}
`
    : ''
}${meihuaSection}
## 参考解析
${hexagram.judgmentExplain}

## 三不占审查（必须先于解读执行）
在输出任何解读文字之前，先判断用户的问题是否违反三不占原则（宁严勿滥，边界不清时判为不违反）：
- **不疑不占**：没有真正的疑惑或纯属事实/娱乐（如天气、笑话、测试 AI、无意义闲聊）。
- **不诚不占**：明显戏谑、挑衅、或并非真心求问。
- **不义不占**：赌博求赢、伤害/算计他人、违法犯罪、或明显不道德目的。

若违反任一条：在 JSON 中设置 \`"refused": true\`，\`"refusal_reason"\` 用一句话说明原因（不超过 40 字，与用户语言一致），其余解读字段可为空字符串。
若不违反：设置 \`"refused": false\`，并正常填写解读字段。

## 输出要求
请你用 JSON 格式返回（不要 markdown 代码块包裹）：
{
  "refused": false,
  "refusal_reason": "",
  "interpretation": "200-400字的深度解读，结合卦辞、象辞和变爻，直接针对用户的具体问题（refused 为 true 时可省略）",
  "advice": "3-5条具体可执行的建议，用 1. 2. 3. 格式",
  "summary": "一句话总结（15字以内，朗朗上口）",
  "fortune": "从 great-fortune / fortune / neutral / caution / misfortune 中选一个"
}`
}

/**
 * 调用 Gemini AI 生成解读
 */
export async function generateInterpretation(
  env: AiRouterEnv,
  question: string,
  hexagram: Hexagram,
  changingLines: number[],
  isPro = false,
  language = 'zh-CN',
  method: 'liuyao' | 'meihua' = 'liuyao',
  entropy = '',
  naJiaContext = '',
  memoryContext = ''
): Promise<{
  refused?: boolean
  refusal_reason?: string
  interpretation: string
  advice: string
  summary: string
  fortune: DivinationReading['fortune']
}> {
  const prompt = buildInterpretationPrompt(
    question,
    hexagram,
    changingLines,
    memoryContext ?? '',
    method,
    entropy,
    naJiaContext
  )

  const YICHING_SYSTEM_PROMPT = [
    getSystemRole('yiching'),
    '',
    buildEnhancedGuardrails(),
    buildLanguageBlock(language, 'yiching'),
  ].join('\n')

  const text = await callWithFallback(env, YICHING_SYSTEM_PROMPT, prompt, {
    isPro,
    maxTokens: isPro ? 4096 : 2048,
    thinkingLevel: 'LOW',
    metricLabel: 'yiching',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) {
      throw new Error('No JSON found in AI response')
    }
    const parsed = JSON.parse(jsonStr) as {
      refused?: boolean
      refusal_reason?: string
      interpretation?: string
      advice?: string
      summary?: string
      fortune?: string
    }

    if (parsed.refused === true) {
      const reason =
        typeof parsed.refusal_reason === 'string' && parsed.refusal_reason.trim().length > 0
          ? parsed.refusal_reason.trim().slice(0, 120)
          : 'This question is not suited to divination under traditional principles.'
      return {
        refused: true,
        refusal_reason: reason,
        interpretation: '',
        advice: '',
        summary: '',
        fortune: 'neutral',
      }
    }

    const validFortunes = ['great-fortune', 'fortune', 'neutral', 'caution', 'misfortune'] as const
    const parsedFortune = validFortunes.includes(parsed.fortune as (typeof validFortunes)[number])
      ? (parsed.fortune as DivinationReading['fortune'])
      : hexagram.fortune

    return {
      interpretation: parsed.interpretation ?? hexagram.judgmentExplain,
      advice: parsed.advice ?? '',
      summary: parsed.summary ?? hexagram.keywords.join('·'),
      fortune: parsedFortune,
    }
  } catch (err) {
    console.warn('[yiching] interpretation JSON parse failed', err)
    return {
      interpretation: hexagram.judgmentExplain,
      advice: '',
      summary: hexagram.keywords.join('·'),
      fortune: hexagram.fortune,
    }
  }
}

/**
 * 完整占卜流程
 */
export async function performDivination(
  env: AiRouterEnv,
  input: DivinationInput,
  isPro = false
): Promise<DivinationReading> {
  const isMeihua = input.method === 'meihua'

  // ── 梅花易数：从熵字符串解析预计算的体用卦 ────────────────────
  // 梅花的 lines 由前端 castMeihua() 计算好，编码在 entropy 里
  const MEIHUA_LINE_MAP: Record<number, [number, number, number]> = {
    1: [1, 1, 1], // 乾
    2: [0, 1, 1], // 兑
    3: [1, 0, 1], // 离
    4: [0, 0, 1], // 震
    5: [1, 1, 0], // 巽
    6: [0, 1, 0], // 坎
    7: [1, 0, 0], // 艮
    8: [0, 0, 0], // 坤
  }

  let lines: number[]
  let changingLines: number[]
  let yaoValues: YaoValue[] | undefined

  if (isMeihua) {
    const parsed = parseMeihuaEntropy(input.entropy)
    if (!parsed) throw new Error('Invalid meihua entropy format')
    const lower = MEIHUA_LINE_MAP[parsed.lower]!
    const upper = MEIHUA_LINE_MAP[parsed.upper]!
    lines = [...lower, ...upper]
    changingLines = [parsed.changing - 1] // 0-based
  } else {
    const clientYao = input.yaoValues
    if (
      Array.isArray(clientYao) &&
      clientYao.length === 6 &&
      clientYao.every((v) => v === 6 || v === 7 || v === 8 || v === 9)
    ) {
      yaoValues = clientYao as YaoValue[]
      lines = yaoValues.map((v) => (v % 2 === 1 ? 1 : 0))
      changingLines = yaoValues.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0)
    } else {
      const entropyHash = await createEntropyHash(input.entropy)
      const result = generateYaoLines(entropyHash)
      lines = result.lines
      changingLines = result.changingLines
      yaoValues = result.yaoValues
    }
  }

  // 3. 获取卦象
  const hexagramResult = castHexagram(lines, changingLines)
  if (!hexagramResult) {
    throw new Error('Failed to cast hexagram')
  }

  // 4. 获取完整卦象数据
  const hexagram = getHexagramByLines(lines)
  if (!hexagram) {
    throw new Error('Hexagram data not found')
  }

  // 5. 六爻纳甲装卦（仅六爻模式）
  let naJiaContext = ''
  if (!isMeihua && yaoValues) {
    const now = new Date()
    const pillars = getFourPillars({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
    })
    const fullHex = assembleHexagram(
      yaoValues,
      pillars.day.stem,
      pillars.day.branch,
      pillars.month.branch
    )
    if (fullHex) {
      naJiaContext = formatHexagramForPrompt(fullHex)
    }
  }

  // 6. AI 生成解读
  const aiResult = await generateInterpretation(
    env,
    input.question,
    hexagram,
    changingLines,
    isPro,
    input.language,
    input.method ?? 'liuyao',
    input.entropy,
    naJiaContext,
    input.memoryContext ?? ''
  )

  if (aiResult.refused === true) {
    return {
      refused: true,
      refusal_reason: aiResult.refusal_reason ?? '',
      hexagram: hexagramResult,
      interpretation: '',
      advice: '',
      summary: '',
      fortune: aiResult.fortune,
    }
  }

  return {
    hexagram: hexagramResult,
    interpretation: aiResult.interpretation,
    advice: aiResult.advice,
    summary: aiResult.summary,
    fortune: aiResult.fortune,
  }
}
