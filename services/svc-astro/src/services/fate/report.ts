/**
 * 综合命运报告生成服务
 *
 * 整合: 星宫命盘 + 命格命盘 + 流年大运 + 面相特征（可选）
 *
 * 模型策略 (统一 CF Workers AI 路由, flagship tier — 见 @zhop/ai-vision/router):
 *   主力: Kimi K2.6 (@cf/moonshotai/kimi-k2.6) — 中文最强 (C-Eval 92.5)，长上下文推理
 *   备用: Qwen3-30B → GLM-4.7-Flash — CF hosted，故障/超时自动容灾，日志记录所用模型
 */

import { buildAgeLanguageBlock } from '../../lib/age'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { buildLanguageBlock } from '../../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import { type FateOutput, fateOutputSchema, toJsonSchema } from '../../schemas'

export interface FateReportInput {
  stellarChartData: string
  natalChartData: string
  queryYear: number
  physiognomyFeaturesJson?: string | null
  language?: string
  /** YYYY-M-D solar birth date — used to compute age bracket for prompt framing */
  solarBirthDate?: string
  /** Whether the requesting user has an active Pro subscription */
  isPro?: boolean
}

export interface FateReportContent {
  teaser: string
  yearKeywords: string[]
  fullInterpretation: string
  sections: {
    overall: string
    career: string
    relationship: string
    health: string
    actionGuide: string
  }
}

/** Structured fate report output — validated by Zod */
export type FateReportStructured = FateOutput

export interface FateReportResult {
  content: FateReportContent
  structured?: FateOutput
  usedModel: string
}

function buildFateReportSystemPrompt(language: string): string {
  return [
    getSystemRole('fate'),
    '',
    '**核心原则**:',
    '- 紫微三方四正优先定大格局，八字大运流年定时序节点',
    '- 两盘矛盾时，以紫微为主，八字为辅，相互印证',
    '- 有面相数据时，用面相印证命盘，修正流年细节精准度',
    '- 解读有实质内容，避免车轱辘话，给出具体可操作的建议',
    '- 吉凶并论，不刻意报喜不报忧，帮助用户观照节奏、留意的面向',
    '',
    '**禁止**:',
    '- 给出具体日期的预测（只能说“年中”、“下半年”等模糊时段）',
    '- 输出任何 markdown 格式',
    '',
    buildEnhancedGuardrails('观照自身，不作预测', language),
    buildLanguageBlock(language, 'fate'),
  ].join('\n')
}

function buildFateReportPrompt(input: FateReportInput): string {
  const physiognomySection = input.physiognomyFeaturesJson
    ? `\n\n## 面相修正维度（后天格局）\n${input.physiognomyFeaturesJson}\n（请结合以上面相特征，对流年细节进行精准度修正）`
    : '\n\n（用户暂无面相数据，本次报告基于命盘推演）'

  const ageBlock = input.solarBirthDate
    ? `\n\n${buildAgeLanguageBlock(input.solarBirthDate, input.language ?? 'zh-CN')}`
    : ''

  return `请为用户生成${input.queryYear}年的综合命运报告。
${ageBlock}

## 紫微斗数命盘
${input.stellarChartData}

## 四柱八字命盘
${input.natalChartData}
${physiognomySection}

## 输出要求
请以下方 JSON 格式输出，语言：${input.language ?? 'zh-CN'}：

{
  "lifeSummary": "年度命运总览（2-3句）",
  "dayMasterAnalysis": {
    "element": "日主五行",
    "strength": "日主强弱",
    "personality": "性格特征概述（50字内）"
  },
  "fiveElementBalance": { "metal": 0, "wood": 0, "water": 0, "fire": 0, "earth": 0 },
  "stellarHighlights": {
    "fatePalace": "命宫主星及资讯",
    "bodyPalace": "身宫主星及资讯",
    "majorStars": ["主星1", "主星2"],
    "brightness": "整体亮度格局简述"
  },
  "physiognomyModifiers": [],
  "yearForecast": {
    "career": { "score": 7, "insight": "事业运势小结" },
    "wealth": { "score": 6, "insight": "财运小结" },
    "relationship": { "score": 7, "insight": "感情运小结" },
    "health": { "score": 8, "insight": "健康运小结" }
  },
  "decadeTransits": [
    { "period": "大运区间", "theme": "主题", "opportunity": "机遇", "risk": "风险" }
  ],
  "monthlyHighlights": [
    { "month": 3, "focus": "指导" }
  ],
  "actionAdvice": ["建议1", "建议2", "建议3"],
  "luckyElements": { "colors": [], "directions": [], "numbers": [] },
  "hookLine": "锻中用户的年度关键刺激点（30字内）",
  "shareQuote": "社交分享金句（≤20字）"
}`
}

/**
 * 生成综合命运报告
 *
 * Gemini 3.1 Pro 为主力，DeepSeek-R1 为故障备用。
 * 返回报告内容及实际使用的模型名。
 */
export async function generateFateReport(
  env: AiRouterEnv,
  input: FateReportInput
): Promise<FateReportResult> {
  const language = input.language ?? 'zh-CN'
  const systemPrompt = buildFateReportSystemPrompt(language)
  const userPrompt = buildFateReportPrompt(input)

  // flagship fallback: Kimi K2.6 → Qwen3-30B → GLM-4.7-Flash (CF Workers AI)
  const raw = await callWithFallback(env, systemPrompt, userPrompt, {
    isPro: input.isPro ?? false,
    maxTokens: 4096,
    temperature: 0.7,
    thinkingLevel: 'HIGH',
    jsonMode: true,
    responseSchema: toJsonSchema(fateOutputSchema),
    metricLabel: 'fate-report-legacy',
    locale: language,
  })

  // Validate with Zod — parse() throws on schema mismatch
  const structured = fateOutputSchema.parse(JSON.parse(raw))

  // Back-compat: keep FateReportContent shape for existing routes
  const content: FateReportContent = {
    teaser: structured.hookLine,
    yearKeywords: structured.actionAdvice,
    fullInterpretation: structured.lifeSummary,
    sections: {
      overall: structured.lifeSummary,
      career: structured.yearForecast.career.insight,
      relationship: structured.yearForecast.relationship.insight,
      health: structured.yearForecast.health.insight,
      actionGuide: structured.actionAdvice.join(' '),
    },
  }

  return { content, structured, usedModel: 'ai-router' }
}
