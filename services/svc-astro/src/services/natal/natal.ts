/**
 * 命格排盘服务
 *
 * 1. @zhop/astro-core 计算四柱 + 十神 + 格局 + 调候 + 合化
 * 2. @zhop/astro-core/geo-time 全球真太阳时 + 南半球置换
 * 3. Gemini AI 生成自然语言解读
 */

import {
  analyzeCombinations,
  analyzeGeJu,
  analyzeShenSha,
  applySouthernHemisphereAdjustment,
  type CombinationAnalysis,
  calculateDaYun,
  type DaYunResult,
  type EarthlyBranch,
  type FourPillars,
  type FourPillarsShiShen,
  formatDaYunForPrompt,
  formatShenShaForPrompt,
  type GeJuAnalysis,
  type Gender,
  type GlobalSolarTimeResult,
  getCityLongitude,
  getFourPillars,
  getFourPillarsShiShen,
  getNaYin,
  getTiaohou,
  type HeavenlyStem,
  type HemisphereAdjustmentResult,
  hasTiaohouGod,
  resolveBirthHour,
  type ShenShaAnalysis,
  STEM_WUXING,
  type TiaohouResult,
  type WuXing,
} from '@zhop/astro-core'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import {
  buildCrossChartContext,
  buildLanguageBlock,
  type StellarCrossRef,
} from '../../lib/i18n-prompt'
import { buildEnhancedCrisisFraming, buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'

export interface NatalInput {
  /** 公历出生日期 YYYY-M-D */
  solarDate: string
  /** 时辰序号 0-12（0=早子时, 1=丑, ..., 12=晚子时）。clockMinutes 存在时忽略此值。 */
  timeIndex: number
  /** 精确出生时间：当天 00:00 起的分钟数 0-1439。存在 = 精确模式，启用真太阳时校准。 */
  clockMinutes?: number
  /** 是否对精确钟点做真太阳时校准（默认 true）。仅精确模式 + 有经度时生效。 */
  calibrate?: boolean
  /** 性别 */
  gender: '男' | '女'
  /** 经度（可选, 用于真太阳时修正） */
  longitude?: number
  /** 纬度（可选, 用于南半球置换） */
  latitude?: number
  /** IANA 时区 ID (如 "America/New_York")，用于全球真太阳时引擎 */
  timezoneId?: string
  /** 出生城市（可选, 用于查经纬度+时区） */
  city?: string
  /** 用户 ID */
  userId: string
  /** 语言 */
  language?: string
}

export interface NatalChart {
  /** 四柱 */
  pillars: FourPillars
  /** 四柱纳音 */
  nayin: {
    year: string
    month: string
    day: string
    hour: string
  }
  /** 十神 */
  shishen: FourPillarsShiShen
  /** 格局 */
  geju: GeJuAnalysis
  /** 调候用神 — PRD §5.1 P0 */
  tiaohou: TiaohouResult | null
  /** 调候用神透干满足度 */
  tiaohouSatisfied: boolean
  /** 合化冲分析 — PRD §5.2 P0 (化神透干校验) */
  combinations: CombinationAnalysis
  /** 日主五行 */
  dayMasterWuXing: WuXing
  /** 性别 */
  gender: '男' | '女'
  /** 全球真太阳时校准结果（v2 出海） */
  solarTimeResult?: GlobalSolarTimeResult
  /** 南半球月令置换结果（v2 出海） */
  hemisphereResult?: HemisphereAdjustmentResult
  /** 大运 — P2 */
  daYun?: DaYunResult
  /** 神煞 — P2 */
  shenSha?: ShenShaAnalysis
}

export interface NatalInterpretation {
  /** 命格概述 */
  overview: string
  /** 性格分析 */
  personality: string
  /** 事业方向 */
  career: string
  /** 财运分析 */
  wealth: string
  /** 感情婚姻 */
  relationship: string
  /** 健康提醒 */
  health: string
  /** 开运建议 */
  advice: string
  /** 一句话总结 */
  summary: string
  /** Punchy one-liner for social share card (≤20 chars, no fate claim) */
  shareQuote?: string
}

/** 钩子摘要 — 免费用户可见，用于驱动下载/付费转化 */
export interface NatalHooks {
  /** 一句话性格洞察（扎心/共鸣，20-30字） */
  personality_hook: string
  /** 命运走向暗示（制造悬念，20-30字） */
  destiny_hook: string
  /** 当前运势线索（引发好奇，20-30字） */
  fate_cycle_hook: string
  /** 命格金句（用于分享卡片，10-15字） */
  one_liner: string
}

/** 两层输出结构：hooks（免费可见）+ full_reading（付费解锁） */
export interface NatalReadingOutput {
  hooks: NatalHooks
  full_reading: NatalInterpretation
}

/**
 * 生成命格命盘（v2: 全球真太阳时 + 南半球置换 + 调候 + 合化）
 */
export function generateNatalChart(input: NatalInput): NatalChart {
  // 解析日期
  const [yearStr, monthStr, dayStr] = input.solarDate.split('-')
  const year = Number.parseInt(yearStr!, 10)
  const month = Number.parseInt(monthStr!, 10)
  const day = Number.parseInt(dayStr!, 10)

  // ==============================
  // 出生时刻解析（时辰中点 / 精确钟点 + 真太阳时校准）
  // ==============================
  // 单一入口 resolveBirthHour 决定排盘小时:
  //  - 时辰模式（无 clockMinutes）: 用时辰「中点」，永不做真太阳时校准 —— 经度对一个已经
  //    粗粒度化的时辰没有意义，旧实现对左边界做修正会系统性把时辰推前一格。
  //  - 精确模式（有 clockMinutes）: 钟点 + 经度/时差/DST 校准（calibrate 默认开）。
  // 校准跨午夜时返回位移后的日历日期，日柱随之正确。
  const longitude = input.longitude ?? (input.city ? getCityLongitude(input.city) : undefined)
  const resolved = resolveBirthHour({
    year,
    month,
    day,
    timeIndex: input.timeIndex,
    clockMinutes: input.clockMinutes,
    calibrate: input.calibrate,
    longitude,
    timezoneId: input.timezoneId,
    city: input.city,
  })
  const correctedHour = resolved.hour
  const solarTimeResult: GlobalSolarTimeResult | undefined = resolved.solarTimeResult

  // 生成四柱（使用校准后的真太阳时日历日期）
  let pillars = getFourPillars({
    year: resolved.year,
    month: resolved.month,
    day: resolved.day,
    hour: correctedHour,
  })

  // ==============================
  // 南半球月令置换（v2 出海核心）
  // ==============================
  let hemisphereResult: HemisphereAdjustmentResult | undefined

  if (input.latitude !== undefined) {
    hemisphereResult = applySouthernHemisphereAdjustment(pillars, input.latitude)
    if (hemisphereResult.adjusted) {
      pillars = hemisphereResult.pillars
    }
  }

  // 纳音
  const nayin = {
    year: getNaYin(pillars.year),
    month: getNaYin(pillars.month),
    day: getNaYin(pillars.day),
    hour: getNaYin(pillars.hour),
  }

  // 十神
  const shishen = getFourPillarsShiShen(pillars)

  // 格局
  const geju = analyzeGeJu(pillars, shishen)

  // 日主五行
  const dayMasterWuXing = STEM_WUXING[pillars.day.stem as HeavenlyStem]

  // ==============================
  // 调候用神 — PRD §5.1 P0
  // ==============================
  const dayMaster = pillars.day.stem as HeavenlyStem
  const monthBranch = pillars.month.branch as EarthlyBranch
  const tiaohou = getTiaohou(dayMaster, monthBranch)

  // 调候透干校验: 四柱天干中是否命中调候用神
  const allStems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.day.stem,
    pillars.hour.stem,
  ] as HeavenlyStem[]
  const tiaohouCheck = tiaohou ? hasTiaohouGod(dayMaster, monthBranch, allStems) : null
  const tiaohouSatisfied = tiaohouCheck?.satisfied ?? false

  // ==============================
  // 合化冲分析 — PRD §5.2 P0 (化神透干校验)
  // ==============================
  const stems: [HeavenlyStem, HeavenlyStem, HeavenlyStem, HeavenlyStem] = [
    pillars.year.stem as HeavenlyStem,
    pillars.month.stem as HeavenlyStem,
    pillars.day.stem as HeavenlyStem,
    pillars.hour.stem as HeavenlyStem,
  ]
  const branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
    pillars.year.branch as EarthlyBranch,
    pillars.month.branch as EarthlyBranch,
    pillars.day.branch as EarthlyBranch,
    pillars.hour.branch as EarthlyBranch,
  ]
  const combinations = analyzeCombinations(stems, branches)

  // ==============================
  // 大运 + 神煞 — PRD P2
  // ==============================
  let daYun: DaYunResult | undefined
  try {
    daYun = calculateDaYun(
      { year: resolved.year, month: resolved.month, day: resolved.day, hour: correctedHour },
      input.gender as Gender
    )
  } catch {
    // 大运计算失败不影响主流程
  }

  let shenSha: ShenShaAnalysis | undefined
  try {
    shenSha = analyzeShenSha(pillars)
  } catch {
    // 神煞计算失败不影响主流程
  }

  return {
    pillars,
    nayin,
    shishen,
    geju,
    tiaohou,
    tiaohouSatisfied,
    combinations,
    dayMasterWuXing,
    gender: input.gender,
    solarTimeResult,
    hemisphereResult,
    daYun,
    shenSha,
  }
}

/**
 * 构建命格解读 Prompt（v2: 含调候 + 合化 + 出海校准 + 星宫交叉验证）
 */
function buildNatalPrompt(chart: NatalChart, stellarContext?: StellarCrossRef): string {
  const p = chart.pillars
  const s = chart.shishen

  const pillarsStr = `${p.year.label} ${p.month.label} ${p.day.label} ${p.hour.label}`
  const nayinStr = `${chart.nayin.year} ${chart.nayin.month} ${chart.nayin.day} ${chart.nayin.hour}`

  // 十神排列
  const tianganShishen = `${s.year.abbr} ${s.month.abbr} 日 ${s.hour.abbr}`

  // 调候用神段落
  let tiaohouSection = ''
  if (chart.tiaohou) {
    const godsStr = chart.tiaohou.gods.join('、')
    const satisfiedStr = chart.tiaohouSatisfied
      ? '✅ 调候用神已透干，命局气候调和'
      : '⚠️ 调候用神未透干，命局偏寒/偏燥需化解'
    tiaohouSection = `
## 调候用神（穷通宝鉴）
- 类型: ${chart.tiaohou.type}
- 所需用神: ${godsStr}
- 说明: ${chart.tiaohou.description}
- 透干状态: ${satisfiedStr}
`
  }

  // 合化冲段落
  let combinationsSection = ''
  const { stemCombinations, branchCombinations, branchClashes } = chart.combinations

  if (stemCombinations.length > 0 || branchCombinations.length > 0 || branchClashes.length > 0) {
    const parts: string[] = []
    for (const sc of stemCombinations) {
      parts.push(`- 天干: ${sc.description}`)
    }
    for (const bc of branchCombinations) {
      parts.push(`- 地支: ${bc.description}`)
    }
    for (const clash of branchClashes) {
      parts.push(`- 地支: ${clash.description}`)
    }
    combinationsSection = `
## 合化冲分析
${parts.join('\n')}
`
  }

  // 出海校准说明
  let geoTimeSection = ''
  if (chart.solarTimeResult) {
    geoTimeSection += `\n## 真太阳时校准\n${chart.solarTimeResult.displayNote}\n`
  }
  if (chart.hemisphereResult?.adjusted) {
    geoTimeSection += `\n## 南半球节气校准\n${chart.hemisphereResult.note}\n`
  }

  // 大运段落（P2 增强）
  let daYunSection = ''
  if (chart.daYun) {
    const currentYear = new Date().getFullYear()
    daYunSection = `\n${formatDaYunForPrompt(chart.daYun, currentYear)}\n`
  }

  // 神煞段落（P2 增强）
  let shenShaSection = ''
  if (chart.shenSha && chart.shenSha.items.length > 0) {
    shenShaSection = `\n${formatShenShaForPrompt(chart.shenSha)}\n`
  }

  return `你是一位精通子平八字的 AI 命理师。请根据以下八字信息，生成一份专业且通俗易懂的命理分析。

## 八字四柱
${pillarsStr}

## 纳音
${nayinStr}

## 十神（天干）
${tianganShishen}

## 格局判定
- 主格局: ${chart.geju.primary}
- 日主强弱: ${chart.geju.dayMasterStrength}
- 喜用神: ${chart.geju.favorableElement}
- 忌神: ${chart.geju.unfavorableElement}
- 格局品质: ${chart.geju.quality}
${tiaohouSection}${combinationsSection}${daYunSection}${shenShaSection}${geoTimeSection}
## 基本信息
- 日主: ${p.day.stem}（${chart.dayMasterWuXing}）
- 性别: ${chart.gender}
${stellarContext ? buildCrossChartContext('natal', stellarContext) : ''}
## 输出要求
请用 JSON 格式输出以下两层结构（hooks = 免费用户可见的钩子摘要，full_reading = 完整付费解读）:
{
  "hooks": {
    "personality_hook": "一句话性格洞察（20-30字，要扎心、有共鸣、像镜子一样照见灵魂——类似'你骨子里是匹野马，但现实把你圈养了'）",
    "destiny_hook": "命运走向暗示（20-30字，制造悬念——类似'你的命盘藏着一个还没被打开的开关'）",
    "fate_cycle_hook": "当前运势线索（20-30字，引发好奇——类似'2024年的困难不是偶然，你正处于一个关键的转折'）",
    "one_liner": "命格金句（10-15字，适合分享——类似'烈火锻金，百炼成钢'）"
  },
  "full_reading": {
    "overview": "命格总览（200-250字，必须融入调候用神分析和合化判断，说明命局冷暖燥湿）",
    "personality": "性格分析（100字，基于日主和十神配置）",
    "career": "事业方向（100字，结合格局、用神和合化关系）",
    "wealth": "财运分析（80字，结合财星和用神）",
    "relationship": "感情婚姻（100字，基于性别和十神）",
    "health": "健康提醒（80字，基于五行偏枯和调候失衡方向）",
    "advice": "开运建议（100字，优先补救调候缺失的五行）",
    "summary": "一句话总结（15字以内）",
    "shareQuote": "社交分享金句（≤20字，朗朗上口，不含吉凶断言，适合截图分享卡片，类似‘木火通明，热烈结出\u2019）"
  }
}

重要:
- hooks 必须是独立的文案，不能是 full_reading 的截断
- hooks.personality_hook 要像心理咨询师说出的一句话：精准、扎心、引发"被看见"的共鸣
- hooks.destiny_hook 要制造悬念但不能给出答案，让用户想看完整解读
- hooks.fate_cycle_hook 要结合当前年份（大运/流年信息），让用户觉得"说的就是我"
- hooks.one_liner 要朗朗上口，适合截图分享
- 使用现代白话文，避免晦涩古文
- 给出具体可操作的建议
- 保持客观中立，不做极端吉凶判断
- 如果调候用神未满足，重点提出化解建议
- 如果有合化成功，说明对命局的增益
- 只输出 JSON，不要任何其他内容`
}

/**
 * AI 生成命格解读（两层结构：hooks + full_reading）
 */
export async function generateNatalInterpretation(
  env: AiRouterEnv,
  chart: NatalChart,
  isPro = false,
  language = 'zh-CN',
  stellarContext?: StellarCrossRef
): Promise<NatalReadingOutput> {
  const prompt = buildNatalPrompt(chart, stellarContext)

  const NATAL_SYSTEM_PROMPT = [
    getSystemRole('natal'),
    '',
    buildEnhancedGuardrails(),
    '',
    buildEnhancedCrisisFraming(),
    '',
    '## hooks（钩子摘要）写作原则',
    '- personality_hook: 像心理咨询师的金句——"你骨子里是匹野马，但现实把你圈养了"。精准刻画用户的核心矛盾或特质',
    '- destiny_hook: 制造信息缺口（Information Gap）——给出暗示但不给答案，让用户必须看完整解读',
    '- fate_cycle_hook: 结合当前年份和大运/流年信息，让用户产生"说的就是我"的巴纳姆效应共鸣',
    '- one_liner: 四字或八字格言式金句，朗朗上口，适合截图分享。避免直白的吉凶判断',
    '',
    '## 调候用神优先级',
    '- 当命局提供了调候用神信息时，调候分析必须出现在 overview 的前 1/3 篇幅',
    '- 调候用神未满足时，advice 字段必须优先给出补救调候的建议',
    buildLanguageBlock(language, 'natal'),
  ].join('\n')

  // Pro 与 Free 采用不同 tier1 模型，thinkingLevel 限制 token 预算
  const text = await callWithFallback(env, NATAL_SYSTEM_PROMPT, prompt, {
    isPro,
    maxTokens: 4096,
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    metricLabel: 'natal',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonStr) as Partial<{
      hooks: Partial<NatalHooks>
      full_reading: Partial<NatalInterpretation>
    }>

    if (
      !parsed.hooks?.personality_hook ||
      !parsed.hooks?.destiny_hook ||
      !parsed.hooks?.fate_cycle_hook ||
      !parsed.hooks?.one_liner ||
      !parsed.full_reading?.overview ||
      !parsed.full_reading?.personality ||
      !parsed.full_reading?.career ||
      !parsed.full_reading?.summary
    ) {
      throw new Error('Incomplete natal reading: missing required fields')
    }

    const hooks: NatalHooks = {
      personality_hook: parsed.hooks!.personality_hook!,
      destiny_hook: parsed.hooks!.destiny_hook!,
      fate_cycle_hook: parsed.hooks!.fate_cycle_hook!,
      one_liner: parsed.hooks!.one_liner!,
    }

    const fullReading: NatalInterpretation = {
      overview: parsed.full_reading!.overview!,
      personality: parsed.full_reading!.personality!,
      career: parsed.full_reading!.career!,
      wealth: parsed.full_reading!.wealth ?? parsed.full_reading!.career!,
      relationship: parsed.full_reading!.relationship ?? '',
      health: parsed.full_reading!.health ?? '',
      advice: parsed.full_reading!.advice ?? '',
      summary: parsed.full_reading!.summary!,
      shareQuote: parsed.full_reading!.shareQuote ?? parsed.hooks!.one_liner,
    }

    return { hooks, full_reading: fullReading }
  } catch (err) {
    throw new Error(
      `Natal interpretation generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
