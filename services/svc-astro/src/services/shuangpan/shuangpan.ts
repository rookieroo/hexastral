/**
 * 双盘合参服务 — PRD §六 P2
 *
 * 命格 × 星宫 双系统共识引擎:
 * 1. generateNatalChart() → 命格命盘 (格局 + 调候 + 合化)
 * 2. iztro.bySolar()     → 星宫命盘 (宫位 + 流年四化)
 * 3. runShuangPan()      → 共识判定 (同向顺/同向逆/反向)
 * 4. AI 三段 Prompt      → 最终解读
 */

import { analyzeShenSha, calculateDaYun, type Gender, getDaYunAtYear } from '@zhop/astro-core'
import { buildAgeLanguageBlock } from '../../lib/age'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import { buildLanguageBlock } from '../../lib/i18n-prompt'
import { buildEnhancedCrisisFraming, buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import type { PalaceSummary } from '../../types'
import type { NatalChart, NatalInput } from '../natal/natal'

// ========================================
// 类型定义
// ========================================

/** 共识置信度 */
export type ConsensusConfidence = 'high' | 'medium' | 'conflict'

/** 共识方向 */
export type ConsensusDirection = '同向顺' | '同向逆' | '反向'

/** 单维度共识判定 */
export interface ConsensusInsight {
  /** 分析维度 */
  dimension: '财运' | '事业' | '感情' | '健康'
  /** 命格信号 */
  natalSignal: string
  /** 星宫信号 */
  stellarSignal: string
  /** 共识方向 */
  direction: ConsensusDirection
  /** 置信度 */
  confidence: ConsensusConfidence
  /** 简述 */
  summary: string
}

/** 双盘共识结果 */
export interface ShuangPanConsensus {
  /** 总体置信度 */
  overallConfidence: ConsensusConfidence
  /** 命格底色概要 */
  natalSummary: string
  /** 星宫流年概要 */
  stellarSummary: string
  /** 各维度共识 */
  insights: ConsensusInsight[]
  /** 融合结论 */
  fusedConclusion: string
  /** 大运信息（P2 增强） */
  daYunContext?: string
  /** 神煞信息（P2 增强） */
  shenShaContext?: string
}

/** 双盘合参输入 */
export interface ShuangPanInput extends NatalInput {
  /** 查询流年 */
  queryYear: number
  /** 面相特征 JSON（可选，当用户有激活面相时传入） */
  physiognomyFeaturesJson?: string | null
}

/** 双盘合参最终结果 */
export interface ShuangPanResult {
  /** 命格排盘 */
  natalChart: NatalChart
  /** 星宫宫位 */
  stellarPalaces: PalaceSummary[]
  /** 星宫元数据 */
  stellarMeta: Record<string, string>
  /** 共识判定 */
  consensus: ShuangPanConsensus
  /** AI 最终解读（raw JSON string） */
  aiReading: string
  /** Punchy one-liner for social share card (≤20 chars, no fate claim) */
  shareQuote?: string
  /** Reading IDs */
  natalId: string
  stellarId: string
}

// ========================================
// iztro 类型（从 stellar.ts 提取）
// ========================================

interface IztroStar {
  name: string
  type: string
  brightness?: string
  mutagen?: string
}

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

// ========================================
// 核心函数
// ========================================

/**
 * 从星宫命盘提取流年四化信号
 */
function extractStellarYearlySignals(palaces: IztroPalace[]): {
  huaLuPalaces: string[]
  huaJiPalaces: string[]
} {
  const huaLuPalaces: string[] = []
  const huaJiPalaces: string[] = []

  for (const palace of palaces) {
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen === '禄') {
        huaLuPalaces.push(palace.name)
      }
      if (star.mutagen === '忌') {
        huaJiPalaces.push(palace.name)
      }
    }
  }

  return { huaLuPalaces, huaJiPalaces }
}

/**
 * 共识引擎 — PRD §六 共识判定
 *
 * | 八字判断       | 紫微判断         | 共识     | 置信度 |
 * |---------------|-----------------|---------|--------|
 * | 喜用神得令     | 财帛/官禄化禄    | 同向顺   | 高     |
 * | 忌神当令       | 命宫/财帛化忌    | 同向逆   | 高     |
 * | 喜用神得令     | 化忌入命/财      | 反向     | 中     |
 * | 忌神当令       | 化禄入官        | 反向     | 中     |
 */
export function runShuangPan(
  natalChart: NatalChart,
  palaces: IztroPalace[],
  queryYear: number,
  birthInfo?: { year: number; month: number; day: number }
): ShuangPanConsensus {
  const { huaLuPalaces, huaJiPalaces } = extractStellarYearlySignals(palaces)
  const insights: ConsensusInsight[] = []

  const favorable = natalChart.geju.favorableElement
  const unfavorable = natalChart.geju.unfavorableElement
  const dayStrength = natalChart.geju.dayMasterStrength

  // 调候信息
  const tiaohouStr = natalChart.tiaohou
    ? `调候需${natalChart.tiaohou.gods.join('/')}（${natalChart.tiaohou.type}），${natalChart.tiaohouSatisfied ? '已满足' : '未满足'}`
    : ''

  // ==============================
  // P2 增强: 大运 + 神煞
  // ==============================
  let daYunContext: string | undefined
  let shenShaContext: string | undefined

  try {
    if (birthInfo) {
      const gender = natalChart.gender === '男' ? '男' : '女'
      const daYunResult = calculateDaYun(
        { year: birthInfo.year, month: birthInfo.month, day: birthInfo.day },
        gender as Gender
      )
      const currentDaYun = getDaYunAtYear(daYunResult, queryYear)
      if (currentDaYun) {
        daYunContext = `当前大运：${currentDaYun.ganZhi.label}（${currentDaYun.startAge}-${currentDaYun.startAge + 9}岁）`
      }
    }
  } catch {
    // 大运计算失败不影响主流程
  }

  try {
    const shenShaAnalysis = analyzeShenSha(natalChart.pillars)
    if (shenShaAnalysis.items.length > 0) {
      const top3 = shenShaAnalysis.items.slice(0, 3)
      shenShaContext = `命带神煞：${top3.map((s) => `${s.name}(${s.pillar})`).join('、')}`
      if (shenShaAnalysis.items.length > 3) {
        shenShaContext += `等${shenShaAnalysis.items.length}项`
      }
    }
  } catch {
    // 神煞计算失败不影响主流程
  }

  // ---- 财运维度 ----
  const caiBaoHuaLu = huaLuPalaces.includes('财帛')
  const caiBaoHuaJi = huaJiPalaces.includes('财帛')

  if (caiBaoHuaLu) {
    insights.push({
      dimension: '财运',
      natalSignal: `喜用${favorable}，日主${dayStrength}`,
      stellarSignal: '财帛宫化禄',
      direction: '同向顺',
      confidence: 'high',
      summary: `${queryYear}年财帛宫化禄，与命格喜用方向一致，财运看好。`,
    })
  } else if (caiBaoHuaJi) {
    insights.push({
      dimension: '财运',
      natalSignal: `忌神${unfavorable}`,
      stellarSignal: '财帛宫化忌',
      direction: '同向逆',
      confidence: 'high',
      summary: `${queryYear}年财帛宫化忌，需谨慎理财，避免大额投资。`,
    })
  }

  // ---- 事业维度 ----
  const guanLuHuaLu = huaLuPalaces.includes('官禄')
  const guanLuHuaJi = huaJiPalaces.includes('官禄')

  if (guanLuHuaLu) {
    insights.push({
      dimension: '事业',
      natalSignal: `喜用${favorable}`,
      stellarSignal: '官禄宫化禄',
      direction: '同向顺',
      confidence: 'high',
      summary: `${queryYear}年官禄宫化禄，事业发展顺利，可积极拓展。`,
    })
  } else if (guanLuHuaJi) {
    const isFavorableActive = dayStrength === '偏强' || dayStrength === '极强'
    insights.push({
      dimension: '事业',
      natalSignal: isFavorableActive ? `日主偏强，喜用${favorable}泄身` : `忌神${unfavorable}`,
      stellarSignal: '官禄宫化忌',
      direction: isFavorableActive ? '反向' : '同向逆',
      confidence: isFavorableActive ? 'medium' : 'high',
      summary: isFavorableActive
        ? `${queryYear}年官禄化忌但命格日主偏强，挑战中有转机，宜内部巩固而非外扩。`
        : `${queryYear}年官禄化忌且命格忌神当令，事业宜守不宜攻。`,
    })
  }

  // ---- 感情维度 ----
  const fuQiHuaLu = huaLuPalaces.includes('夫妻')
  const fuQiHuaJi = huaJiPalaces.includes('夫妻')

  if (fuQiHuaLu || fuQiHuaJi) {
    insights.push({
      dimension: '感情',
      natalSignal: `日主${natalChart.pillars.day.stem}（${natalChart.dayMasterWuXing}）`,
      stellarSignal: fuQiHuaLu ? '夫妻宫化禄' : '夫妻宫化忌',
      direction: fuQiHuaLu ? '同向顺' : '同向逆',
      confidence: fuQiHuaLu ? 'high' : 'medium',
      summary: fuQiHuaLu
        ? `${queryYear}年夫妻宫化禄，感情运势平顺，利于表白或婚姻。`
        : `${queryYear}年夫妻宫化忌，感情需多沟通包容，避免冲突升级。`,
    })
  }

  // 总体置信度
  const highCount = insights.filter((i) => i.confidence === 'high').length
  const conflictCount = insights.filter((i) => i.direction === '反向').length
  const overallConfidence: ConsensusConfidence =
    conflictCount > highCount ? 'conflict' : highCount >= 2 ? 'high' : 'medium'

  // 命格底色
  const natalSummary = [
    `日主 ${natalChart.pillars.day.stem}${natalChart.dayMasterWuXing}，${natalChart.pillars.month.branch}月生`,
    `格局：${natalChart.geju.primary}，日主${dayStrength}`,
    tiaohouStr,
    `喜用：${favorable}，忌神：${unfavorable}`,
  ]
    .filter(Boolean)
    .join('\n')

  // 星宫概要
  const stellarSummary = [
    huaLuPalaces.length > 0 ? `化禄入${huaLuPalaces.join('、')}` : '',
    huaJiPalaces.length > 0 ? `化忌入${huaJiPalaces.join('、')}` : '',
  ]
    .filter(Boolean)
    .join('，')

  // 融合结论
  const fusedParts = insights.map((i) => i.summary)
  const fusedConclusion =
    fusedParts.length > 0
      ? fusedParts.join(' ')
      : `${queryYear}年命格与星宫信号平稳，无明显冲突，整体运势平顺。`

  return {
    overallConfidence,
    natalSummary,
    stellarSummary: stellarSummary || '无显著四化信号',
    insights,
    fusedConclusion,
    daYunContext,
    shenShaContext,
  }
}

/**
 * 构建双盘合参 AI 三段式 Prompt — PRD §六
 */
export function buildShuangPanPrompt(
  consensus: ShuangPanConsensus,
  queryYear: number,
  options?: { language?: string; solarBirthDate?: string; physiognomyFeaturesJson?: string | null }
): string {
  const insightsStr = consensus.insights
    .map(
      (i) =>
        `- ${i.dimension}: 八字(${i.natalSignal}) + 紫微(${i.stellarSignal}) → ${i.direction}，置信度${i.confidence === 'high' ? '高' : i.confidence === 'medium' ? '中' : '冲突'}`
    )
    .join('\n')

  const ageBlock = options?.solarBirthDate
    ? `\n${buildAgeLanguageBlock(options.solarBirthDate, options?.language ?? 'zh-CN')}\n`
    : ''

  const physiognomySection = options?.physiognomyFeaturesJson
    ? `\n\n## 面相修正维度（后天格局）\n${options.physiognomyFeaturesJson}\n（请结合以上面相特征，对流年细节进行精准度修正）`
    : ''

  return `[\u6bb5\u4e00 \u2014 \u516b\u5b57\u5e95\u8272]
${consensus.natalSummary}
${consensus.daYunContext ? `\n${consensus.daYunContext}` : ''}
${consensus.shenShaContext ? `${consensus.shenShaContext}` : ''}
${physiognomySection}
${ageBlock}
[\u6bb5\u4e8c \u2014 \u7d2b\u5fae\u6d41\u5e74]
${queryYear}\u5e74\u6d41\u5e74\u4fe1\u53f7\uff1a${consensus.stellarSummary}

[\u6bb5\u4e09 \u2014 \u5408\u53c2\u6307\u4ee4]
\u4e24\u5957\u7cfb\u7edf\u5171\u8bc6\u5206\u6790\uff1a
${insightsStr || '- \u65e0\u663e\u8457\u51b2\u7a81\u4fe1\u53f7\uff0c\u6574\u4f53\u5e73\u7a33'}
\u2192 \u603b\u4f53\u7f6e\u4fe1\u5ea6\uff1a${consensus.overallConfidence === 'high' ? '\u9ad8' : consensus.overallConfidence === 'medium' ? '\u4e2d' : '\u51b2\u7a81'}

\u8bf7\u57fa\u4e8e\u4ee5\u4e0a\u53cc\u76d8\u5408\u53c2\u4fe1\u606f\uff0c\u751f\u6210\u4e00\u4efd ${queryYear} \u5e74\u5ea6\u8fd0\u52bf\u62a5\u544a\u3002

\u8f93\u51fa\u8981\u6c42\uff08JSON \u683c\u5f0f\uff09:
{
  "yearOverview": "\u5e74\u5ea6\u603b\u89c8\uff08200\u5b57\uff0c\u878d\u5408\u516b\u5b57\u5e95\u8272\u548c\u7d2b\u5fae\u6d41\u5e74\u4fe1\u53f7\uff09",
  "career": "\u4e8b\u4e1a\u8fd0\u52bf\uff08100\u5b57\uff09",
  "wealth": "\u8d22\u8fd0\u5206\u6790\uff08100\u5b57\uff09",
  "relationship": "\u611f\u60c5\u8fd0\u52bf\uff08100\u5b57\uff09",
  "health": "\u5065\u5eb7\u63d0\u9192\uff0880\u5b57\uff09",
  "monthlyHighlights": "\u91cd\u70b9\u6708\u4efd\u63d0\u9192\uff08\u5217\u51fa 2-3 \u4e2a\u5173\u952e\u6708\u4efd\u548c\u6ce8\u610f\u4e8b\u9879\uff09",
  "advice": "\u5e74\u5ea6\u5f00\u8fd0\u5efa\u8bae\uff08100\u5b57\uff0c\u5177\u4f53\u53ef\u6267\u884c\uff09",
  "confidence": "\u672c\u6b21\u5206\u6790\u7f6e\u4fe1\u5ea6\u8bf4\u660e\uff0830\u5b57\uff09",
  "shareQuote": "\u793e\u4ea4\u5206\u4eab\u91d1\u53e5\uff08\u226420\u5b57\uff0c\u6717\u6717\u4e0a\u53e3\uff0c\u4e0d\u542b\u5409\u51f6\u65ad\u8a00\uff0c\u9002\u5408\u622a\u56fe\u5206\u4eab\u5361\u7247\uff09"
}

\u53ea\u8f93\u51fa\u7eaf JSON\uff0c\u4e0d\u8981\u4efb\u4f55\u5176\u4ed6\u5185\u5bb9\u3002`
}

/**
 * AI 生成双盘合参解读
 */
export async function generateShuangPanReading(
  env: AiRouterEnv,
  consensus: ShuangPanConsensus,
  queryYear: number,
  isPro: boolean,
  language: string,
  options?: { solarBirthDate?: string; physiognomyFeaturesJson?: string | null }
): Promise<{ aiReading: string; shareQuote?: string }> {
  const prompt = buildShuangPanPrompt(consensus, queryYear, {
    language,
    solarBirthDate: options?.solarBirthDate,
    physiognomyFeaturesJson: options?.physiognomyFeaturesJson,
  })

  const systemPrompt = [
    getSystemRole('shuangpan'),
    '',
    '## 双盘合参原则',
    '- “同向顺”（两套系统指向相同吉方）→ 置信度高，给出积极建议',
    '- “同向逆”（两套系统指向相同凶方）→ 置信度高，给出防御策略和化解之道',
    '- “反向”（两套系统矛盾）→ 置信度中，说明“机遇与风险并存”，不偏向任何一方',
    '',
    buildEnhancedGuardrails(),
    '',
    buildEnhancedCrisisFraming(),
    buildLanguageBlock(language, 'shuangpan'),
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro,
    maxTokens: isPro ? 4096 : 2048,
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    metricLabel: 'fate-legacy',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found in ShuangPan AI response')
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    return {
      aiReading: jsonStr,
      shareQuote: typeof parsed.shareQuote === 'string' ? parsed.shareQuote : undefined,
    }
  } catch (err) {
    throw new Error(
      `ShuangPan reading generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
