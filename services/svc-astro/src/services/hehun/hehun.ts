/**
 * 合婚服务 — PRD v2.5 #1 搜索量 + 裂变引擎
 *
 * 1. 解析双方生辰 → 四柱
 * 2. @zhop/astro-core calculateHeHun → 四维评分
 * 3. astro-core 大运+神煞增强 prompt
 * 4. Gemini AI 生成自然语言解读
 */

import {
  analyzeGeJu,
  analyzeShenSha,
  calculateHeHun,
  type FourPillars,
  formatHeHunForPrompt,
  getFourPillars,
  getFourPillarsShiShen,
  type HeavenlyStem,
  type HeHunResult,
  STEM_WUXING,
  type WuXing,
} from '@zhop/astro-core'
import { calculateAge } from '../../lib/age'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import { buildLanguageBlock } from '../../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'

// ========================================
// Types
// ========================================

export interface HeHunPersonInput {
  /** 公历出生日期 YYYY-M-D */
  solarDate: string
  /** 时辰序号 0-12 */
  timeIndex: number
  /** 性别 */
  gender: '男' | '女'
  /** 姓名/昵称（可选，用于 prompt 称呼） */
  name?: string
  /** 面相特征 JSON（可选，来自 userPhysiognomyFeatures.featuresJson） */
  physiognomyFeaturesJson?: string | null
}

export type HehunRelationshipCategory =
  | 'spouse'
  | 'partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'friend'
  | 'colleague'
  | 'boss'

export interface HeHunInput {
  personA: HeHunPersonInput
  personB: HeHunPersonInput
  userId: string
  language?: string
  /** 关系类型 — 影响 buildHeHunPrompt 解读基调 */
  relationshipCategory?: HehunRelationshipCategory
  /** 用户自定义关系描述，作为 prompt 补充语境 */
  customRelationshipLabel?: string
}

export interface HeHunChartSummary {
  pillarsLabel: string
  dayMaster: string
  dayMasterWuXing: WuXing
  gejuPrimary: string
  dayMasterStrength: string
}

export interface HeHunFullResult {
  /** 合婚评分结果 */
  compatibility: HeHunResult
  /** 甲方概要 */
  personA: HeHunChartSummary
  /** 乙方概要 */
  personB: HeHunChartSummary
}

export interface HeHunInterpretation {
  overview: string
  dayMasterRelation: string
  yearBranch: string
  monthBranch: string
  dayBranch: string
  highlights: string
  warnings: string
  advice: string
  summary: string
  /** Viral relationship label — e.g. "The Karmic Anchor", "Mutual Destruction" */
  archetypeName: string
  /** Snarky one-liner tagline in the user's locale */
  archetypeTagline: string
  /** Relationship energy archetype — always one of the five English enum values */
  archetypeCategory: 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile'
  /** The dimension with the most extreme score deviation — always one of the four English enum values */
  hookDimension: 'long_term' | 'communication' | 'attraction' | 'emotional'
  /** Punchy one-liner for social share card (≤20 chars, no fate claim) */
  shareQuote?: string
}

// ========================================
// 核心计算
// ========================================

function parseSolarDate(
  solarDate: string,
  timeIndex: number
): { year: number; month: number; day: number; hour: number } {
  const [yearStr, monthStr, dayStr] = solarDate.split('-')
  const year = Number.parseInt(yearStr!, 10)
  const month = Number.parseInt(monthStr!, 10)
  const day = Number.parseInt(dayStr!, 10)
  let hour: number
  if (timeIndex === 0) hour = 0
  else if (timeIndex === 12) hour = 23
  else hour = timeIndex * 2 - 1
  return { year, month, day, hour }
}

function buildChartSummary(pillars: FourPillars): HeHunChartSummary {
  const shishen = getFourPillarsShiShen(pillars)
  const geju = analyzeGeJu(pillars, shishen)
  const dayMasterWuXing = STEM_WUXING[pillars.day.stem as HeavenlyStem]
  return {
    pillarsLabel: `${pillars.year.label} ${pillars.month.label} ${pillars.day.label} ${pillars.hour.label}`,
    dayMaster: pillars.day.stem,
    dayMasterWuXing,
    gejuPrimary: geju.primary,
    dayMasterStrength: geju.dayMasterStrength,
  }
}

/**
 * 执行合婚计算
 */
export function computeHeHun(input: HeHunInput): HeHunFullResult {
  const dateA = parseSolarDate(input.personA.solarDate, input.personA.timeIndex)
  const dateB = parseSolarDate(input.personB.solarDate, input.personB.timeIndex)

  const pillarsA = getFourPillars(dateA)
  const pillarsB = getFourPillars(dateB)

  const compatibility = calculateHeHun(pillarsA, pillarsB)

  return {
    compatibility,
    personA: buildChartSummary(pillarsA),
    personB: buildChartSummary(pillarsB),
  }
}

// ========================================
// AI Prompt
// ========================================

function buildPairFacts(result: HeHunFullResult, input: HeHunInput): string {
  const { compatibility, personA, personB } = result
  const nameA = input.personA.name ?? '甲方'
  const nameB = input.personB.name ?? '乙方'

  const compatText = formatHeHunForPrompt(compatibility)

  // 神煞补充（双方）
  const dateA = parseSolarDate(input.personA.solarDate, input.personA.timeIndex)
  const dateB = parseSolarDate(input.personB.solarDate, input.personB.timeIndex)
  const shenShaA = analyzeShenSha(getFourPillars(dateA))
  const shenShaB = analyzeShenSha(getFourPillars(dateB))
  const shenShaAStr =
    shenShaA.items.length > 0
      ? shenShaA.items
          .slice(0, 3)
          .map((s) => `${s.name}(${s.pillar})`)
          .join('、')
      : '无显著神煞'
  const shenShaBStr =
    shenShaB.items.length > 0
      ? shenShaB.items
          .slice(0, 3)
          .map((s) => `${s.name}(${s.pillar})`)
          .join('、')
      : '无显著神煞'

  const RELATIONSHIP_FRAMING: Partial<Record<HehunRelationshipCategory, string>> = {
    spouse: '【关系类型：夫妻/婚恋】分析视角聚焦婚姻缘分，涉及桃花星、红鸾天喜、感情宫位互配。',
    partner: '【关系类型：恋人】分析视角聚焦恋爱情感共鸣，涉及吸引力与桃花互动。',
    parent:
      '【关系类型：父母与子女】分析视角聚焦父母宫—子女宫互动、印星与食伤星传承；避免桃花/婚嫁意象。',
    child:
      '【关系类型：子女与父母】分析视角聚焦子女宫—父母宫互动、成长支持与家族缘分；避免桃花/婚嫁意象。',
    sibling:
      '【关系类型：兄弟姐妹】分析视角聚焦比劫星手足缘分、竞合与扶持关系；避免桃花/婚嫁意象。',
    friend:
      '【关系类型：朋友】分析视角聚焦交友宫与驿马，强调投缘程度与共同行动力；避免桃花/婚嫁意象。',
    colleague:
      '【关系类型：同事】分析视角聚焦官禄宫合作能量、职场协作与比劫竞争；避免桃花/婚嫁意象。',
    boss: '【关系类型：上下级】分析视角聚焦官杀星权威结构与官禄宫职场缘分；避免桃花/婚嫁意象。',
  }
  const relFraming = input.relationshipCategory
    ? (RELATIONSHIP_FRAMING[input.relationshipCategory] ?? '')
    : ''
  const relContext = [
    relFraming,
    input.customRelationshipLabel ? `具体关系描述：${input.customRelationshipLabel}` : '',
  ]
    .filter(Boolean)
    .join('  ')

  // Age blocks
  const ageA = calculateAge(input.personA.solarDate)
  const ageB = calculateAge(input.personB.solarDate)

  // Physiognomy cross-reference sections (optional)
  const physioSectionA = input.personA.physiognomyFeaturesJson
    ? `- 面相特征：${input.personA.physiognomyFeaturesJson}`
    : ''
  const physioSectionB = input.personB.physiognomyFeaturesJson
    ? `- 面相特征：${input.personB.physiognomyFeaturesJson}`
    : ''
  const physioCrossRef =
    input.personA.physiognomyFeaturesJson || input.personB.physiognomyFeaturesJson
      ? `\n\n## 面相互补分析（后天修正）\n${physioSectionA}\n${physioSectionB}\n请分析双方面相特征的互补性和冲突点，作为关系和谐度的后天修正维度（如双方均无面相数据则略去此段）。`
      : ''

  return `${relContext ? `${relContext}\n\n` : ''}## 甲方（${nameA}）
- 四柱：${personA.pillarsLabel}
- 日主：${personA.dayMaster}（${personA.dayMasterWuXing}），${personA.dayMasterStrength}
- 格局：${personA.gejuPrimary}
- 性别：${input.personA.gender}
- 年龄：${ageA}岁
- 命带神煞：${shenShaAStr}
${physioSectionA}

## 乙方（${nameB}）
- 四柱：${personB.pillarsLabel}
- 日主：${personB.dayMaster}（${personB.dayMasterWuXing}），${personB.dayMasterStrength}
- 格局：${personB.gejuPrimary}
- 性别：${input.personB.gender}
- 年龄：${ageB}岁
- 命带神煞：${shenShaBStr}
${physioSectionB}
${physioCrossRef}

${compatText}`
}

function buildHeHunPrompt(result: HeHunFullResult, input: HeHunInput): string {
  return `你是一位精通命盘配对的 AI 命理师。请根据以下双方八字合盘分析，生成一份专业且温暖的配对解读。

${buildPairFacts(result, input)}

## 输出要求（JSON 格式）
{
  "overview": "总体配对评价（200字，融合五行互补和地支关系分析）",
  "dayMasterRelation": "日主互补分析（100字，五行生克关系对感情的影响）",
  "yearBranch": "年支缘分解读（80字，前世情缘/家族缘分角度）",
  "monthBranch": "月支生活解读（80字，日常相处/价值观角度）",
  "dayBranch": "日支亲密解读（80字，内心世界/私密关系角度）",
  "highlights": "亮点总结（50字，最大优势）",
  "warnings": "注意事项（50字，需要经营的方面）",
  "advice": "开运建议（100字，具体化解和增进感情的方法）",
  "summary": "一句话总结（15字以内）",
  "archetypeName": "Edgy viral relationship label in the user's language — e.g. '宿命捆绑', 'The Karmic Anchor', '相爱相杀', 'Mutual Destruction'. MUST be 2-8 words, punchy and shareable.",
  "archetypeTagline": "Snarky one-liner about this pairing in the user's language — MUST be under 20 words, witty and emotionally resonant.",
  "archetypeCategory": "MUST be exactly one of: harmony | tension | growth | karmic | volatile — pick the most accurate description of the overall energy. Output English only.",
  "hookDimension": "MUST be exactly one of: long_term | communication | attraction | emotional — the dimension whose score deviates most from the other three (highest or lowest). Output English only.",
  "shareQuote": "社交分享金句（≤20字，朗朗上口，不含天命定论语气，适合截图分享）"
}

只输出纯 JSON，不要任何其他内容。`
}

/**
 * AI 生成合婚解读
 */
export async function generateHeHunInterpretation(
  env: AiRouterEnv,
  result: HeHunFullResult,
  input: HeHunInput,
  isPro: boolean,
  language: string
): Promise<HeHunInterpretation> {
  const prompt = buildHeHunPrompt(result, input)

  const systemPrompt = [
    getSystemRole('hehun'),
    '',
    buildEnhancedGuardrails('相遇即是缘'),
    '',
    '## 合婚解读原则',
    '- 低分配对不说"不合适"，而说"需要更多理解和包容"、"互相磨合是成长的礼物"',
    '- 高分配对不过度吹捧，要提醒"好的感情也需要经营"',
    '- 每份解读必须包含 2-3 条具体可执行的增进感情建议',
    '- 结尾必须正面、温暖，传递"相遇即是缘"的核心信念',
    buildLanguageBlock(language, 'hehun'),
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro,
    maxTokens: isPro ? 4096 : 2048,
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    metricLabel: 'hehun-pair',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonStr) as Partial<HeHunInterpretation>

    if (!parsed.overview || !parsed.summary) {
      throw new Error('Incomplete HeHun reading: missing required fields')
    }

    const VALID_CATEGORIES = ['harmony', 'tension', 'growth', 'karmic', 'volatile'] as const
    const VALID_DIMENSIONS = ['long_term', 'communication', 'attraction', 'emotional'] as const

    return {
      overview: parsed.overview,
      dayMasterRelation: parsed.dayMasterRelation ?? '',
      yearBranch: parsed.yearBranch ?? '',
      monthBranch: parsed.monthBranch ?? '',
      dayBranch: parsed.dayBranch ?? '',
      highlights: parsed.highlights ?? '',
      warnings: parsed.warnings ?? '',
      advice: parsed.advice ?? '',
      summary: parsed.summary,
      archetypeName: parsed.archetypeName ?? '',
      archetypeTagline: parsed.archetypeTagline ?? '',
      archetypeCategory: VALID_CATEGORIES.includes(
        parsed.archetypeCategory as (typeof VALID_CATEGORIES)[number]
      )
        ? (parsed.archetypeCategory as HeHunInterpretation['archetypeCategory'])
        : 'growth',
      hookDimension: VALID_DIMENSIONS.includes(
        parsed.hookDimension as (typeof VALID_DIMENSIONS)[number]
      )
        ? (parsed.hookDimension as HeHunInterpretation['hookDimension'])
        : 'attraction',
      shareQuote: parsed.shareQuote,
    }
  } catch (err) {
    throw new Error(
      `HeHun interpretation generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ========================================
// 六章深度报告 + 破冰断言（aha hook）
// ========================================

/** One of the six synastry deep-report chapters. Mirrors scenario-kindred's
 *  `SynastryChapter['kind']`; kept local so svc-astro stays frontend-free. */
export type SynastryChapterKind =
  | 'first_impression'
  | 'communication'
  | 'conflict'
  | 'complement'
  | 'monthly_outlook'
  | 'long_term_advice'

export interface SynastryChapterOutput {
  kind: SynastryChapterKind
  title: string
  /** 1–3 sentence quotable 金句 — the screenshot/share bait. */
  goldenLine: string
  /** 150–250 word body, must cite concrete chart facts. */
  body: string
}

export interface SynastryChaptersResult {
  /** The single most striking, specific, true assertion about THIS pair —
   *  shown on the report gate / invite CTA / paywall to drive unlock + invite. */
  ahaHook: string
  chapters: SynastryChapterOutput[]
}

/** Fixed chapter order + per-chapter focus. The first three are the free taste;
 *  the rest unlock via invite / single-purchase / subscription (see ADR-0013). */
const SYNASTRY_CHAPTER_SPECS: ReadonlyArray<{
  kind: SynastryChapterKind
  label: string
  focus: string
}> = [
  {
    kind: 'first_impression',
    label: '第一印象',
    focus: '两人初见的化学反应：日主与格局气场的第一观感，彼此最先被吸引或被触发的点',
  },
  {
    kind: 'communication',
    label: '沟通方式',
    focus: '信息与情绪如何在两人间流动：表达节奏差异、最易被误解之处、最有效的沟通频道',
  },
  {
    kind: 'conflict',
    label: '冲突源头',
    focus: '摩擦的真正根源（地支刑冲害/五行相克/格局张力），以及它通常如何被点燃',
  },
  {
    kind: 'complement',
    label: '互补之处',
    focus: '彼此补足的能量：一方喜用恰是另一方所缺，长处如何对冲对方盲区',
  },
  {
    kind: 'monthly_outlook',
    label: '本月运势',
    focus: '未来约30天两人相处的节奏：适合深聊/共同推进的窗口，与需要彼此留白的时段',
  },
  {
    kind: 'long_term_advice',
    label: '长期建议',
    focus: '让这段关系走得久的核心功课：需要共同经营的，与各自需要软化的模式',
  },
]

const VALID_CHAPTER_KINDS = new Set<string>(SYNASTRY_CHAPTER_SPECS.map((s) => s.kind))

function buildSynastryChaptersPrompt(result: HeHunFullResult, input: HeHunInput): string {
  const now = new Date()
  const ym = `${now.getFullYear()}年${now.getMonth() + 1}月`
  const chapterList = SYNASTRY_CHAPTER_SPECS.map(
    (s, i) =>
      `${i + 1}. kind="${s.kind}"（${s.label}）—— ${s.kind === 'monthly_outlook' ? `${s.focus}（当前为 ${ym}）` : s.focus}`
  ).join('\n')

  return `你是一位精通命盘配对的 AI 命理师，正在为以下两人撰写一份「六章深度合盘」正文，并提炼一句最抓人的破冰断言。

${buildPairFacts(result, input)}

## 章节清单（必须严格按此顺序、此 kind 输出 6 章）
${chapterList}

## 写作要求
- 每章 body 150–250 字，**必须直接引用上方命盘事实**（具体日主/格局/地支刑冲合/神煞/五行喜忌），禁止泛泛而谈、禁止占星化通用语。
- 每章 goldenLine 为 1–3 句可截图分享的金句，精炼、有画面感、点中关系本质。
- title ≤14 字，贴合该章 kind。
- ahaHook 是整份报告的钩子：基于两人命盘的**真实互动**，点出一个具体、出人意料但准确的关系真相，制造"怎么会被说中"的瞬间；≤30 字，留有悬念引导用户解锁全文，**不含天命定论语气**。
- 低分关系不说"不合适"，而说"需要更多理解与磨合"；高分关系也要提醒"好的关系仍需经营"。

## 输出要求（严格 JSON）
{
  "ahaHook": "≤30字的破冰断言",
  "chapters": [
    { "kind": "first_impression", "title": "...", "goldenLine": "...", "body": "..." },
    { "kind": "communication", "title": "...", "goldenLine": "...", "body": "..." },
    { "kind": "conflict", "title": "...", "goldenLine": "...", "body": "..." },
    { "kind": "complement", "title": "...", "goldenLine": "...", "body": "..." },
    { "kind": "monthly_outlook", "title": "...", "goldenLine": "...", "body": "..." },
    { "kind": "long_term_advice", "title": "...", "goldenLine": "...", "body": "..." }
  ]
}

只输出纯 JSON，不要任何其他内容。`
}

/**
 * AI 生成六章深度合盘 + 破冰断言。
 *
 * Generated once at bond creation, in parallel with the flat interpretation.
 * Always full-quality (the chapters ARE the premium product); display gating
 * by tier/unlock happens downstream. Throws on parse failure so the caller can
 * fall back to a chapter-less report rather than 500.
 */
export async function generateSynastryChapters(
  env: AiRouterEnv,
  result: HeHunFullResult,
  input: HeHunInput,
  language: string
): Promise<SynastryChaptersResult> {
  const prompt = buildSynastryChaptersPrompt(result, input)

  const systemPrompt = [
    getSystemRole('hehun'),
    '',
    buildEnhancedGuardrails('相遇即是缘'),
    '',
    '## 合盘正文原则',
    '- 每章必须落到双方命盘的具体特征上，给出可感、可执行的洞察',
    '- 结尾正面、温暖，传递"相遇即是缘"的核心信念',
    buildLanguageBlock(language, 'hehun'),
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro: true,
    maxTokens: 8192,
    thinkingLevel: 'HIGH',
    metricLabel: 'hehun-chapters',
    locale: language,
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonStr) as Partial<SynastryChaptersResult>

    const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : []
    const byKind = new Map<string, Partial<SynastryChapterOutput>>()
    for (const ch of rawChapters) {
      if (ch && typeof ch.kind === 'string' && VALID_CHAPTER_KINDS.has(ch.kind)) {
        byKind.set(ch.kind, ch)
      }
    }

    // Re-assemble in the canonical order; drop chapters the model omitted.
    const chapters: SynastryChapterOutput[] = SYNASTRY_CHAPTER_SPECS.flatMap((spec) => {
      const ch = byKind.get(spec.kind)
      if (!ch?.body) return []
      return [
        {
          kind: spec.kind,
          title: typeof ch.title === 'string' && ch.title ? ch.title : spec.label,
          goldenLine: typeof ch.goldenLine === 'string' ? ch.goldenLine : '',
          body: ch.body,
        },
      ]
    })

    if (chapters.length === 0) throw new Error('No valid chapters produced')

    return {
      ahaHook: typeof parsed.ahaHook === 'string' ? parsed.ahaHook : '',
      chapters,
    }
  } catch (err) {
    throw new Error(
      `Synastry chapters generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ========================================
// 年度运势预测
// ========================================

export interface AnnualForecastInput {
  personASolarDate: string
  personATimeIndex: number
  personAGender: '男' | '女'
  personAName?: string | null
  personBSolarDate: string
  personBTimeIndex: number
  personBGender: '男' | '女'
  personBName?: string | null
  /** 已有合盘评分数据（来自 pairReadings.compatibilityData） */
  compatibilityData: Record<string, unknown>
  queryYear: number
  language?: string
}

export interface AnnualForecastInterpretation {
  yearOverview: string
  springFall: string
  summerWinter: string
  keyMonths: string
  joint: string
  opportunities: string
  challenges: string
  advice: string
  summary: string
}

function buildAnnualForecastPrompt(input: AnnualForecastInput): string {
  const nameA = input.personAName ?? '甲方'
  const nameB = input.personBName ?? '乙方'
  const dateA = parseSolarDate(input.personASolarDate, input.personATimeIndex)
  const dateB = parseSolarDate(input.personBSolarDate, input.personBTimeIndex)
  const pillarsA = getFourPillars(dateA)
  const pillarsB = getFourPillars(dateB)
  const summaryA = buildChartSummary(pillarsA)
  const summaryB = buildChartSummary(pillarsB)

  const score = (input.compatibilityData as Record<string, unknown>).score ?? '未知'
  const grade = (input.compatibilityData as Record<string, unknown>).grade ?? '未知'

  return `你是一位精通八字合婚与流年运势的 AI 命理师。请根据以下双方八字和合盘基础，解读 ${input.queryYear} 年的双人年度运势。

## 甲方（${nameA}）
- 四柱：${summaryA.pillarsLabel}
- 日主：${summaryA.dayMaster}（${summaryA.dayMasterWuXing}），${summaryA.dayMasterStrength}
- 格局：${summaryA.gejuPrimary}
- 性别：${input.personAGender}

## 乙方（${nameB}）
- 四柱：${summaryB.pillarsLabel}
- 日主：${summaryB.dayMaster}（${summaryB.dayMasterWuXing}），${summaryB.dayMasterStrength}
- 格局：${summaryB.gejuPrimary}
- 性别：${input.personBGender}

## 合盘基础
- 合缘总分：${score}分（${grade}评级）

## 分析重点
聚焦 ${input.queryYear} 年太岁对甲乙双方日柱的影响，评估：
1. 该年流年天干地支与双方四柱的吉凶互动
2. 该年双人感情/合作运势的整体走向
3. 年内吉月凶月分布（上半年/下半年趋势）
4. 双方对这一年的最优策略

## 输出要求（JSON 格式）
{
  "yearOverview": "${input.queryYear}年总体双人运势（150字，评估太岁对双方的整体影响）",
  "springFall": "上半年（春夏）运势走势（80字）",
  "summerWinter": "下半年（秋冬）运势走势（80字）",
  "keyMonths": "重要月份提示（60字，点名2-3个特别吉或凶的月份及原因）",
  "joint": "双方协同建议（80字，如何共同把握${input.queryYear}年的机遇）",
  "opportunities": "年度机遇亮点（60字）",
  "challenges": "年度挑战提示（60字）",
  "advice": "化险为夷策略（80字，具体行动建议）",
  "summary": "一句话年度总结（15字以内）"
}

只输出纯 JSON，不要任何其他内容。`
}

/**
 * AI 生成年度双人运势解读
 */
export async function generateAnnualForecast(
  env: AiRouterEnv,
  input: AnnualForecastInput
): Promise<AnnualForecastInterpretation> {
  const prompt = buildAnnualForecastPrompt(input)

  const systemPrompt = [
    getSystemRole('hehun'),
    '',
    buildEnhancedGuardrails('顺势而为，共渡流年'),
    '',
    buildLanguageBlock(input.language ?? 'zh-CN', 'hehun'),
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro: true,
    maxTokens: 2048,
    thinkingLevel: 'MEDIUM',
    metricLabel: 'hehun-annual',
    locale: input.language ?? 'zh-CN',
  })

  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonStr) as Partial<AnnualForecastInterpretation>

    return {
      yearOverview: parsed.yearOverview ?? '',
      springFall: parsed.springFall ?? '',
      summerWinter: parsed.summerWinter ?? '',
      keyMonths: parsed.keyMonths ?? '',
      joint: parsed.joint ?? '',
      opportunities: parsed.opportunities ?? '',
      challenges: parsed.challenges ?? '',
      advice: parsed.advice ?? '',
      summary: parsed.summary ?? '',
    }
  } catch (err) {
    throw new Error(
      `Annual forecast generation failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
