/**
 * 星宫排盘服务
 *
 * 1. iztro 排盘 → 结构化命盘 JSON
 * 2. @zhop/astro-core 补充真太阳时修正
 * 3. Gemini AI 生成自然语言解读
 */

import type { YearlySiHuaResult } from '@zhop/astro-core'
import { getCityLongitude, getTrueSolarHour, getYearlySiHua, parseMutagen } from '@zhop/astro-core'
import { astro } from 'iztro'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import {
  buildCrossChartContext,
  buildLanguageBlock,
  type NatalCrossRef,
} from '../../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import type { ChartInput, ChartInterpretation, PalaceSummary } from '../../types'

/** iztro 星曜对象 */
interface IztroStar {
  name: string
  type: string
  brightness?: string
  mutagen?: string
}

/** iztro 宫位对象 */
interface IztroPalace {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace: boolean
  majorStars: IztroStar[]
  minorStars: IztroStar[]
  decadal: { range: [number, number]; heavenlyStem: string; earthlyBranch: string }
  ages: number[]
}

/** iztro 命盘对象 */
interface IztroAstrolabe {
  solarDate: string
  lunarDate: string
  chineseDate: string
  time: string
  timeRange: string
  sign: string
  zodiac: string
  earthlyBranchOfSoulPalace: string
  earthlyBranchOfBodyPalace: string
  soul: string
  body: string
  fiveElementsClass: string
  palaces: IztroPalace[]
  horoscope: (
    date?: string,
    timeIndex?: number
  ) => {
    decadal: unknown
    yearly: unknown
    age: unknown
  }
}

/**
 * 生成星宫命盘
 */
export function generateChart(input: ChartInput): {
  chart: IztroAstrolabe
  palaces: PalaceSummary[]
  meta: {
    solarDate: string
    lunarDate: string
    chineseDate: string
    fiveElementsClass: string
    soul: string
    body: string
    sign: string
    zodiac: string
    time: string
    timeRange: string
    earthlyBranchOfSoulPalace: string
    earthlyBranchOfBodyPalace: string
  }
} {
  const { solarDate, timeIndex, gender, longitude, city } = input

  // 真太阳时修正: 如果提供了经度/城市, 修正时辰
  let adjustedTimeIndex = timeIndex
  if (longitude ?? city) {
    const lng = longitude ?? getCityLongitude(city ?? '')
    if (lng !== undefined) {
      const [yearStr, monthStr, dayStr] = solarDate.split('-')
      const year = Number.parseInt(yearStr!, 10)
      const month = Number.parseInt(monthStr!, 10)
      const day = Number.parseInt(dayStr!, 10)

      const approxHour = timeIndex === 0 ? 0 : timeIndex === 12 ? 23 : timeIndex * 2 - 1
      const birthDate = new Date(year, month - 1, day, approxHour, 0, 0)

      const trueSolarHour = getTrueSolarHour(birthDate, lng)

      if (trueSolarHour >= 23 || trueSolarHour < 1) {
        adjustedTimeIndex = trueSolarHour >= 23 ? 12 : 0
      } else {
        adjustedTimeIndex = Math.floor((trueSolarHour + 1) / 2)
      }
    }
  }

  const chart = astro.bySolar(
    solarDate,
    adjustedTimeIndex,
    gender,
    true,
    'zh-CN'
  ) as unknown as IztroAstrolabe

  const palaces: PalaceSummary[] = chart.palaces.map((p) => ({
    index: p.index,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    isBodyPalace: p.isBodyPalace,
    majorStars: p.majorStars.map((s) => ({
      name: s.name,
      brightness: s.brightness ?? '',
      mutagen: s.mutagen ?? '',
      siHua: parseMutagen(s.mutagen),
    })),
    minorStars: p.minorStars.map((s) => ({
      name: s.name,
      type: s.type,
      brightness: s.brightness,
      mutagen: s.mutagen,
    })),
    decadal: p.decadal,
    ages: p.ages,
  }))

  const meta = {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    chineseDate: chart.chineseDate,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    sign: chart.sign,
    zodiac: chart.zodiac,
    time: chart.time,
    timeRange: chart.timeRange,
    earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
  }

  return { chart, palaces, meta }
}

/**
 * 获取当前运势（大限 + 流年）含结构化流年四化
 */
export function getHoroscope(
  chart: IztroAstrolabe,
  date?: string
): {
  decadal: unknown
  yearly: unknown
  age: unknown
  yearlySiHua: YearlySiHuaResult | null
} {
  const now = date ?? new Date().toISOString().split('T')[0]!
  const horoscope = chart.horoscope(now)

  // 提取流年年份并计算四化
  const year = Number.parseInt(now.split('-')[0]!, 10)
  const yearlySiHua = Number.isNaN(year) ? null : getYearlySiHua(year)

  return {
    ...horoscope,
    yearlySiHua,
  }
}

/**
 * 构建命盘解读 Prompt
 */
function buildInterpretationPrompt(
  palaces: PalaceSummary[],
  meta: {
    fiveElementsClass: string
    soul: string
    body: string
    chineseDate: string
    zodiac: string
  },
  natalContext?: NatalCrossRef
): string {
  const soulPalace = palaces.find((p) => p.name === '命宫')
  const careerPalace = palaces.find((p) => p.name === '官禄')
  const wealthPalace = palaces.find((p) => p.name === '财帛')
  const spousePalace = palaces.find((p) => p.name === '夫妻')
  const healthPalace = palaces.find((p) => p.name === '疾厄')
  const fortunePalace = palaces.find((p) => p.name === '福德')

  const formatPalace = (p: PalaceSummary | undefined): string => {
    if (!p) return '（无数据）'
    const majors = p.majorStars
      .map((s) => {
        let str = s.name
        if (s.brightness) str += `(${s.brightness})`
        if (s.mutagen) str += `[${s.mutagen}]`
        return str
      })
      .join('、')
    const minors = p.minorStars
      .slice(0, 4)
      .map((s) => s.name)
      .join('、')
    return `主星: ${majors || '无主星（空宫）'}${minors ? `; 辅星: ${minors}` : ''}`
  }

  return `你是一位精通紫微斗数的东方智慧顾问。请根据以下命盘信息，生成一份专业且通俗易懂的文化解读。

## 基本信息
- 四柱: ${meta.chineseDate}
- 五行局: ${meta.fiveElementsClass}
- 命主星: ${meta.soul}
- 身主星: ${meta.body}
- 生肖: ${meta.zodiac}

## 十二宫
- 命宫: ${formatPalace(soulPalace)}
- 官禄宫: ${formatPalace(careerPalace)}
- 财帛宫: ${formatPalace(wealthPalace)}
- 夫妻宫: ${formatPalace(spousePalace)}
- 疾厄宫: ${formatPalace(healthPalace)}
- 福德宫: ${formatPalace(fortunePalace)}
${natalContext ? buildCrossChartContext('stellar', natalContext) : ''}
## 要求
请用 JSON 格式输出以下字段:
{
  "overview": "总体命格评述（200-300字，分析命宫主星格局）",
  "career": "事业运分析（150字，结合官禄宫）",
  "relationship": "感情运分析（150字，结合夫妻宫）",
  "wealth": "财运分析（100字，结合财帛宫）",
  "health": "健康提醒（100字，结合疾厄宫）",
  "currentYear": "近期运势（100字）",
  "summary": "一句话总结（20字以内）",
  "shareQuote": "社交分享金句（≤20字，朗朗上口，不含吉凶断言，适合截图分享卡片）"
}

重要:
- 使用现代白话文，避免晦涩古文
- 给出具体可操作的建议
- 保持客观中立，不做极端吉凶判断
- 只输出 JSON，不要任何其他内容`
}

/**
 * AI 生成命盘解读
 */
export async function generateInterpretation(
  env: AiRouterEnv,
  palaces: PalaceSummary[],
  meta: {
    fiveElementsClass: string
    soul: string
    body: string
    chineseDate: string
    zodiac: string
  },
  isPro = false,
  language = 'zh-CN',
  natalContext?: NatalCrossRef
): Promise<ChartInterpretation> {
  const prompt = buildInterpretationPrompt(palaces, meta, natalContext)

  const STELLAR_SYSTEM_PROMPT = [
    getSystemRole('stellar'),
    '',
    buildEnhancedGuardrails(),
    buildLanguageBlock(language, 'stellar'),
  ].join('\n')

  const text = await callWithFallback(env, STELLAR_SYSTEM_PROMPT, prompt, {
    isPro,
    maxTokens: isPro ? 4096 : 2048,
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    metricLabel: 'stellar',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonStr) as Partial<ChartInterpretation>

    if (!parsed.overview || !parsed.summary) {
      throw new Error('Incomplete stellar reading: missing required fields')
    }

    return {
      overview: parsed.overview,
      career: parsed.career ?? '',
      relationship: parsed.relationship ?? '',
      wealth: parsed.wealth ?? '',
      health: parsed.health ?? '',
      currentYear: parsed.currentYear ?? '',
      summary: parsed.summary,
      shareQuote: parsed.shareQuote,
    }
  } catch (err) {
    throw new Error(
      `Stellar interpretation generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
