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
  getCityLongitude,
  getFourPillars,
  getFourPillarsShiShen,
  type HeavenlyStem,
  type HeHunResult,
  resolveBirthHour,
  STEM_WUXING,
  WUXING_GENERATE,
  WUXING_OVERCOME,
  type WuXing,
} from '@zhop/astro-core'
import { calculateAge } from '../../lib/age'
import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { extractJson } from '../../lib/extract-json'
import { buildLanguageBlock, buildLanguageReminder } from '../../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import {
  analyzeZiweiSynastry,
  focusPalacesForCategory,
  formatZiweiSynastryForPrompt,
  summarizeZiwei,
  type ZiweiSummary,
} from './ziwei-synastry'

// ========================================
// Types
// ========================================

export interface HeHunPersonInput {
  /** 公历出生日期 YYYY-M-D */
  solarDate: string
  /** 时辰序号 0-12 */
  timeIndex: number
  /** 精确出生分钟数 0-1439（精确模式）。存在则启用真太阳时校准。 */
  clockMinutes?: number
  /** 真太阳时校准开关（默认开）。仅精确模式生效。 */
  calibrate?: boolean
  /** 经度（东经正、西经负）。校准用。 */
  longitude?: number
  /** IANA 时区 ID（含历史 DST）。校准用。 */
  timezoneId?: string
  /** 出生城市（可选；无经度时用于查中国城市经度表）。 */
  city?: string
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

function parsePersonDate(person: {
  solarDate: string
  timeIndex: number
  clockMinutes?: number
  calibrate?: boolean
  longitude?: number
  timezoneId?: string
  city?: string
}): { year: number; month: number; day: number; hour: number } {
  const [yearStr, monthStr, dayStr] = person.solarDate.split('-')
  const year = Number.parseInt(yearStr!, 10)
  const month = Number.parseInt(monthStr!, 10)
  const day = Number.parseInt(dayStr!, 10)
  // The SAME shared resolver solo + the natal service use: 时辰 midpoint (NOT the
  // old `timeIndex*2-1` edge, which silently shifted the hour pillar one 时辰),
  // plus 真太阳时 calibration in precise mode. This unifies 合盘 with every other
  // chart in the suite (it had drifted to its own stale, 时辰-only logic).
  const longitude = person.longitude ?? (person.city ? getCityLongitude(person.city) : undefined)
  const resolved = resolveBirthHour({
    year,
    month,
    day,
    timeIndex: person.timeIndex,
    clockMinutes: person.clockMinutes,
    calibrate: person.calibrate,
    longitude,
    timezoneId: person.timezoneId,
    city: person.city,
  })
  return { year: resolved.year, month: resolved.month, day: resolved.day, hour: resolved.hour }
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
  const dateA = parsePersonDate(input.personA)
  const dateB = parsePersonDate(input.personB)

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

function buildPairFacts(result: HeHunFullResult, input: HeHunInput, ziweiBlock = ''): string {
  const { compatibility, personA, personB } = result
  // Neutral role slots — the prose refers to the two people ONLY as 甲方/乙方, so
  // each device can render them per-viewer (你 + the other's name). We therefore
  // never feed the real names into the prompt; the model can't leak a name it
  // never saw. (2026-06 #7: 乙 should read the report framed around 乙, not 甲.)
  const nameA = '甲方'
  const nameB = '乙方'

  const compatText = formatHeHunForPrompt(compatibility)

  // 神煞补充（双方）
  const dateA = parsePersonDate(input.personA)
  const dateB = parsePersonDate(input.personB)
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

**务必区分甲乙、全文不可对调**：「甲方」始终指日主【${personA.dayMaster}${personA.dayMasterWuXing}】者，「乙方」始终指日主【${personB.dayMaster}${personB.dayMasterWuXing}】者。凡提及任一方，其称呼（甲/乙）与日主、格局、神煞的归属必须与上方一一对应，切勿交换两者——尤其在谈"互补/一方补另一方"等对称表述时，先想清楚谁是甲方谁是乙方再下笔。
${physioCrossRef}

${compatText}${ziweiBlock ? `\n\n${ziweiBlock}` : ''}`
}

/**
 * Compute the 紫微 synastry block for the prompt — the SECOND system woven in for
 * cross-validation (docs/apps/yuel/ziwei-synastry-plan.md P3). Best-effort: if the
 * 紫微 compute throws (bad date/time), the report gracefully stays 八字-only rather
 * than failing. Forward-looking — only the 6-chapter premium report uses it.
 */
/**
 * Both persons' 紫微 summaries, for PERSISTENCE (pairReadings) so the living layer
 * (timeline / what-if) can reuse them without recomputing iztro. Pure-ish (iztro);
 * returns nulls on failure so a chart error never blocks report creation.
 */
export function summarizeZiweiPair(input: HeHunInput): {
  ziweiSummaryA: ZiweiSummary | null
  ziweiSummaryB: ZiweiSummary | null
} {
  const toInput = (p: HeHunPersonInput) => ({
    solarDate: p.solarDate,
    timeIndex: p.timeIndex,
    gender: p.gender,
    longitude: p.longitude,
    city: p.city,
  })
  try {
    return {
      ziweiSummaryA: summarizeZiwei(toInput(input.personA)),
      ziweiSummaryB: summarizeZiwei(toInput(input.personB)),
    }
  } catch {
    return { ziweiSummaryA: null, ziweiSummaryB: null }
  }
}

function buildZiweiBlock(input: HeHunInput): string {
  try {
    const toInput = (p: HeHunPersonInput) => ({
      solarDate: p.solarDate,
      timeIndex: p.timeIndex,
      gender: p.gender,
      longitude: p.longitude,
      city: p.city,
    })
    const a = summarizeZiwei(toInput(input.personA))
    const b = summarizeZiwei(toInput(input.personB))
    // Romantic by default (the app's primary bond); skip the 夫妻宫 cross-read for
    // explicitly non-romantic relationship types. 紫微's twelve palaces are a
    // relationship map, so we also tell the model which palace is THIS bond's home
    // turf (父母/子女 for family, 仆役 for friends, 官禄 for work…) to foreground.
    const cat = input.relationshipCategory
    const romantic = cat === undefined || cat === 'spouse' || cat === 'partner'
    return formatZiweiSynastryForPrompt(analyzeZiweiSynastry(a, b), {
      romantic,
      focusPalaces: focusPalacesForCategory(cat),
    })
  } catch {
    return ''
  }
}

function buildHeHunPrompt(result: HeHunFullResult, input: HeHunInput): string {
  return `你是一位精通命盘配对的 AI 命理师。请根据以下双方八字合盘分析，生成一份专业且温暖的配对解读。

## 语体要求（重要）
用典雅、克制的命理书面语（"日主""相生相济""刑冲合会""刚柔相济"等）。**严禁现代口语与网络话术**（如"咬合""适配""CP""能量场""磁场""上头""相爱相杀"等）与商业/工程比喻。可有记忆点、可分享，但须根植命理意象；中文尤忌轻佻。

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
  "archetypeName": "A memorable, shareable relationship label in the user's language, rooted in 命理 imagery — e.g. '宿命之牵', 'The Karmic Anchor', '刚柔相济'. MUST be 2-8 words. For CJK use classical 命理 register, NOT internet slang.",
  "archetypeTagline": "One resonant line about this pairing in the user's language — under 20 words. Insightful and warm, NOT snark; for CJK keep the 命理 书面语 register.",
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

  const text = await callWithFallback(env, systemPrompt, prompt + buildLanguageReminder(language), {
    // standard (Qwen3 → GLM) not flagship: the flagship tier-1 is KIMI, which was
    // timing out and blowing the 55s budget for the SYNCHRONOUS accept (respond)
    // → 504 / "Network request failed" on mobile. Dropping the slow model keeps the
    // whole synastry generation fast + reliable; Qwen3 is strong for this. (The real
    // fix is to make report generation async; this removes the immediate failure.)
    tier: 'standard',
    isPro,
    maxTokens: isPro ? 3000 : 2048,
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

/** Severity of a chapter's named risk (暗礁·风险). */
export type ReefSeverity = 'low' | 'mid' | 'high'

export interface SynastryChapterOutput {
  kind: SynastryChapterKind
  title: string
  /** 1–3 sentence quotable 金句 — the screenshot/share bait. */
  goldenLine: string
  /** Assembled long-form body (the four layers joined). Kept so the current
   *  text-only ChapterCard renders the full depth without a redesign. */
  body: string
  // ── Four-layer structure (the depth that justifies the price) ──────────────
  /** 命盘依据 — cites concrete chart facts (日主/格局/刑冲合/神煞/五行喜忌). */
  evidence?: string
  /** 关系动态 — how the two actually interact on this dimension. */
  dynamic?: string
  /** 暗礁·风险 — the one named risk/crisis to watch on this dimension. */
  reef?: string
  /** Severity of `reef`. */
  severity?: ReefSeverity
  /** 解法 — concrete, actionable remedy anchored on 用神. */
  remedy?: string
  /** 用神 (favorable / 通关 element) the remedy is built on (金木水火土). */
  yongshen?: WuXing
  /** Optional 注脚 (e.g. 时柱相合 / 流月转气) — a hopeful counterpoint. */
  counterpoint?: string
}

export interface SynastryChaptersResult {
  /** The single most striking, specific, true assertion about THIS pair —
   *  shown on the report gate / invite CTA / paywall to drive unlock + invite. */
  ahaHook: string
  chapters: SynastryChapterOutput[]
  /** The one 通关/喜用 element for the whole relationship — every chapter's
   *  remedy is built on it (a single through-line, not six guesses). */
  yongshen: WuXing
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
    focus:
      '彼此补足的能量：甲方的喜用与长处如何补足乙方所缺、对冲乙方盲区，乙方又如何反向补足甲方——务必分清是谁补谁，全程不可把甲乙对调',
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
const VALID_SEVERITY = new Set<string>(['low', 'mid', 'high'])

/**
 * The relationship's single 通关/喜用 element, derived from the two day masters.
 *   克 → the bridging element (controller 生 X, X 生 controlled): 火克金 → 土.
 *   比和 → 泄秀 (channel the doubled element).
 *   相生 → cultivate the flow's next outlet so the 生 cycle keeps moving.
 * Deterministic, so all six chapters share ONE 用神 — a stronger through-line
 * than letting each chapter guess its own.
 */
export function computeRelationshipYongshen(
  a: WuXing,
  b: WuXing
): { element: WuXing; note: string } {
  if (WUXING_OVERCOME[a] === b) {
    const x = WUXING_GENERATE[a]
    return { element: x, note: `${a}克${b}，以${x}通关（${a}生${x}、${x}生${b}），化相克为相生` }
  }
  if (WUXING_OVERCOME[b] === a) {
    const x = WUXING_GENERATE[b]
    return { element: x, note: `${b}克${a}，以${x}通关（${b}生${x}、${x}生${a}），化相克为相生` }
  }
  if (a === b) {
    const x = WUXING_GENERATE[a]
    return { element: x, note: `双方同为${a}，比和过旺，以${x}泄其秀、引气流通` }
  }
  // 相生 (a生b or b生a): no clash — cultivate the flow's next outlet.
  const senior = WUXING_GENERATE[a] === b ? a : b
  const x = WUXING_GENERATE[WUXING_GENERATE[senior]]
  return { element: x, note: `${a}与${b}相生流通，以${x}续其生机、令气不滞` }
}

/** Per-chapter prompt — asks for ONE chapter rendered as four labelled layers
 *  (命盘依据 / 关系动态 / 暗礁·风险 + 严重度 / 解法 + 用神). Generating one chapter
 *  per call lets each be deeper, cited, and independently retryable/cacheable. */
function buildSynastryChapterPrompt(
  spec: (typeof SYNASTRY_CHAPTER_SPECS)[number],
  result: HeHunFullResult,
  input: HeHunInput,
  ym: string,
  yongshen: WuXing,
  yongshenNote: string,
  ziweiBlock: string
): string {
  const monthlyNote =
    spec.kind === 'monthly_outlook'
      ? `（季节参考：${ym}；正文用"接下来这几周/这个月"等相对表述，不要写死具体公历年月——报告会被缓存，写死会随时间失效）`
      : ''

  return `你是一位精通命盘配对的 AI 命理师，正在为以下两人撰写「六章深度合盘」中的一章：**${spec.label}**。

${buildPairFacts(result, input, ziweiBlock)}

## 本章聚焦
${spec.focus}${monthlyNote}

## 全报告通关用神（已据双方日主推定，六章共用，务必一致）
本段关系的通关/喜用之神为【${yongshen}】：${yongshenNote}。
本章的 remedy（解法）**必须围绕用神【${yongshen}】展开**，给出据此可执行的化解/增进之道，落到能动的一面。
**用神【${yongshen}】是「解法」，并非双方日主本来的关系。** 凡 title／goldenLine 提到五行关系，必须落在双方日主真实的两个五行及其生/克/比和上（如日主为木与土，则言「木土」之相克），用神之五行只可作为「通关／解法」点出且须明示其为解法——切勿把用神当作双方日主的相生来写（例如不可因用神为火便写「木火相生」），以免与正文相克/相生的判断自相矛盾。

## 写作要求（这一章要"值钱"：详尽、精准、可执行）
分四层撰写，每层都**必须直接引用上方命盘事实**（具体日主/格局/地支刑冲合/神煞/五行喜忌，以及紫微命盘要点：命宫/夫妻宫主星、飞星落宫），禁止泛泛而谈、禁止占星化通用语：
1. evidence（命盘依据，90–150字）：这一维度上双方命盘到底发生了什么——点名具体的干支/十神/刑冲合/神煞，把机理讲清楚；若八字与紫微（上方第二套系统）指向一致，明确点出「两套系统不约而同」以增强可信度。
2. dynamic（关系动态，90–150字）：上述命理如何落到两人**真实相处**的样子，具体可感。
3. reef（暗礁·风险，70–130字）：本章最该警惕的**一个**具体风险/危机——如何被触发、会演变成什么。点到痛处，但不下"天命定论"。
4. remedy（解法，90–150字）：围绕**用神**给出具体、可执行的化解/增进之道，落到能动的一面（命定其界、运在人为）。

另需：
- severity：reef 的严重度，必须是 low | mid | high 之一（英文小写）。
- goldenLine：1–3句可截图分享的金句，精炼、有画面感、点中本章本质；若点到五行，须用双方日主真实的两个五行及其生/克/比和，不可以用神之五行冒充双方的相生关系。
- title：≤14字，贴合本章。
- counterpoint（可选，≤60字）：一句留有转机/希望的注脚（如时柱相合、流月转气），没有可省略或留空。
- 低分关系不说"不合适"，而说"需要更多理解与磨合"；高分关系也要提醒"好的关系仍需经营"。
- **语体**：典雅克制的命理书面语（"日主""刑冲合会""相生相济""刚柔相济"等）。**严禁现代口语与网络话术**（"咬合""适配""CP感""能量场""磁场""上头"等）与商业/工程比喻。宁古雅，勿轻佻。

## 输出要求（严格 JSON，仅此一章）
{
  "title": "...",
  "goldenLine": "...",
  "evidence": "...",
  "dynamic": "...",
  "reef": "...",
  "severity": "low | mid | high",
  "remedy": "...",
  "counterpoint": "..."
}

只输出纯 JSON，不要任何其他内容。`
}

/** A tiny separate call for the whole-report 破冰断言 (aha hook). */
function buildAhaHookPrompt(
  result: HeHunFullResult,
  input: HeHunInput,
  ziweiBlock: string
): string {
  return `你是一位精通命盘配对的 AI 命理师。基于以下两人命盘的**真实互动**，提炼一句最抓人的破冰断言。

${buildPairFacts(result, input, ziweiBlock)}

## 要求
- 基于两人命盘的真实互动，点出一个具体、出人意料但准确的关系真相，制造"怎么会被说中"的瞬间。
- ≤30字，留有悬念引导用户解锁全文，**不含天命定论语气**；典雅克制的命理书面语，严禁网络话术。

## 输出（严格 JSON）
{ "ahaHook": "≤30字的破冰断言" }

只输出纯 JSON，不要任何其他内容。`
}

/**
 * Detect + correct a 甲方/乙方 role swap. The model occasionally crosses the two neutral
 * role tokens in a symmetrically-framed chapter (互补/complement is the usual trigger),
 * binding 甲方 to person B's day-master instead of A's. The device then renders a FLIPPED
 * 你/对方 (2026-06: ch4 read 你=己土 for a 乙木 viewer). The chart FACTS are right — only
 * the labels crossed — so swapping the 甲方↔乙方 tokens across every text field fully
 * corrects it. Detection: in the cited prose, 甲方 should sit next to A's day-master; if
 * B's day-master binds to 甲方 instead, it's swapped. No-op when the two day-masters are
 * identical (can't disambiguate) or 甲方 isn't cited.
 */
export function fixRoleSwap(
  ch: SynastryChapterOutput,
  a: HeHunChartSummary,
  b: HeHunChartSummary
): SynastryChapterOutput {
  const dmA = `${a.dayMaster}${a.dayMasterWuXing}`
  const dmB = `${b.dayMaster}${b.dayMasterWuXing}`
  if (!a.dayMaster || !a.dayMasterWuXing || !b.dayMaster || !b.dayMasterWuXing || dmA === dmB) {
    return ch
  }
  const probe = `${ch.evidence ?? ''}\n${ch.body}\n${ch.goldenLine}`
  // After a role token's first mention, which day-master binds to it (the nearer one)?
  // A swap is when BOTH are crossed — 甲方→B's day-master AND 乙方→A's. Requiring both
  // keeps a single misleading relational phrase from triggering a false correction.
  const bindsWrong = (role: string, wrong: string, right: string): boolean => {
    const i = probe.indexOf(role)
    if (i < 0) return false
    const w = probe.indexOf(wrong, i)
    const r = probe.indexOf(right, i)
    return w >= 0 && (r < 0 || w < r)
  }
  const swapped = bindsWrong('甲方', dmB, dmA) && bindsWrong('乙方', dmA, dmB)
  if (!swapped) return ch
  const swap = (s: string): string =>
    s.replace(/甲方|乙方/g, (m) => (m === '甲方' ? '乙方' : '甲方'))
  const swapOpt = (s?: string): string | undefined => (s == null ? undefined : swap(s))
  return {
    ...ch,
    title: swap(ch.title),
    goldenLine: swap(ch.goldenLine),
    body: swap(ch.body),
    evidence: swapOpt(ch.evidence),
    dynamic: swapOpt(ch.dynamic),
    reef: swapOpt(ch.reef),
    remedy: swapOpt(ch.remedy),
    counterpoint: swapOpt(ch.counterpoint),
  }
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
  language: string,
  /**
   * Generate only a SUBSET of chapters (progressive reports): the create/accept
   * path asks for `['first_impression']` to return + paint fast, then a background
   * pass requests the remaining five and merges them in. Omit to generate all six
   * (the default for relocalize / any one-shot caller). The aha hook rides the
   * subset that contains `first_impression` (the report shell), so it's generated
   * once, on the fast path, and skipped on the background top-up.
   */
  opts?: { which?: readonly string[] }
): Promise<SynastryChaptersResult> {
  // Which chapters this call produces (canonical order preserved by filtering the
  // canonical spec list, never the caller's array order). `which` is hoisted to a
  // const so its narrowing survives into the filter closure.
  const which = opts?.which
  const specs = which
    ? SYNASTRY_CHAPTER_SPECS.filter((s) => which.includes(s.kind))
    : SYNASTRY_CHAPTER_SPECS
  const includeAha = specs.some((s) => s.kind === 'first_impression')
  const now = new Date()
  const ym = `${now.getFullYear()}年${now.getMonth() + 1}月`

  // One 通关用神 for the whole report, derived from the two day masters.
  const yong = computeRelationshipYongshen(
    result.personA.dayMasterWuXing,
    result.personB.dayMasterWuXing
  )

  // 紫微 second-system block (best-effort) — woven into each chapter + the aha
  // hook for 八字/紫微 cross-validation. Computed once; empty string if it fails.
  const ziweiBlock = buildZiweiBlock(input)

  const systemPrompt = [
    getSystemRole('hehun'),
    '',
    buildEnhancedGuardrails('相遇即是缘'),
    '',
    '## 合盘正文原则',
    '- 每章必须落到双方命盘的具体特征上，给出可感、可执行的洞察',
    '- 结尾正面、温暖，传递"相遇即是缘"的核心信念',
    '- 正文中一律以「甲方」「乙方」称呼两人，不要使用或杜撰任何具体姓名（客户端会把称呼替换为「你」与对方名字）',
    buildLanguageBlock(language, 'hehun'),
  ].join('\n')

  // Per-chapter language reminder (highest-recency repeat of the system block) +
  // a drift guard: when the report is non-Chinese, a chapter that comes back
  // overwhelmingly CJK has ignored the directive, so retry it ONCE (2026-06 bug:
  // 1 of 6 en chapters in English, the rest Chinese).
  const langReminder = buildLanguageReminder(language)
  const expectsNonChinese = !language.startsWith('zh')
  const driftedToChinese = (text: string): boolean => {
    if (!expectsNonChinese) return false
    const cjk = (text.match(/[一-鿿]/g) ?? []).length
    const latin = (text.match(/[A-Za-z]/g) ?? []).length
    // Overwhelmingly CJK in a non-CJK locale → the chapter drifted. Conservative
    // threshold so a few quoted 命理 terms don't trigger a needless retry.
    return cjk > 40 && cjk > latin
  }

  // One flagship call per chapter (+ a tiny aha-hook call), fired in parallel.
  // Per-chapter generation lets each chapter be deeper and cited, and lets a
  // single failed chapter drop out instead of nuking the whole report.
  const chapterCall = async (spec: (typeof SYNASTRY_CHAPTER_SPECS)[number]) => {
    const userPrompt =
      buildSynastryChapterPrompt(spec, result, input, ym, yong.element, yong.note, ziweiBlock) +
      langReminder
    const opts = {
      // standard (Qwen3 → GLM): see the hehun-pair note — flagship's KIMI tier-1 was
      // the slow model 504-ing the synchronous accept. 6 of these run in parallel, so
      // the model count matters doubly (fewer concurrent CF-AI calls = less contention).
      tier: 'standard' as const,
      maxTokens: 2200,
      metricLabel: `hehun-chapter-${spec.kind}`,
      locale: language,
    }
    let text = await callWithFallback(env, systemPrompt, userPrompt, opts)
    if (driftedToChinese(text)) {
      const retry = await callWithFallback(
        env,
        systemPrompt,
        `${userPrompt}\n\n(Your previous attempt was in the wrong language. Re-output this chapter with every text field in the target language ONLY.)`,
        opts
      ).catch(() => '')
      if (retry && !driftedToChinese(retry)) text = retry
    }
    // The model occasionally crosses 甲方/乙方 in a symmetric chapter (complement is the
    // usual trigger) → the device would render a flipped 你/对方. Detect + relabel.
    return fixRoleSwap(
      parseSynastryChapterResponse(text, spec, yong.element),
      result.personA,
      result.personB
    )
  }

  // Kick off the aha-hook call in parallel; it never rejects (defaults to '').
  // Only on the shell-bearing pass (first_impression) — a background top-up of the
  // remaining chapters must not regenerate (and overwrite) the already-stored hook.
  const ahaPromise: Promise<string> = includeAha
    ? callWithFallback(
        env,
        systemPrompt,
        buildAhaHookPrompt(result, input, ziweiBlock) + langReminder,
        { tier: 'standard', maxTokens: 256, metricLabel: 'hehun-aha', locale: language }
      )
        .then(parseAhaHook)
        .catch(() => '')
    : Promise.resolve('')

  const settled = await Promise.allSettled(specs.map(chapterCall))

  const byKind = new Map<string, SynastryChapterOutput>()
  for (const s of settled) {
    if (s.status === 'fulfilled') byKind.set(s.value.kind, s.value)
    else console.error('[svc-astro/hehun] chapter failed:', s.reason)
  }

  // Retry any chapter whose call/parse failed (a transient LLM/JSON hiccup) before
  // accepting a short report — without this a single failure silently ships 5/6
  // chapters (the report footer then reads "第 N / 五"). One retry clears almost all.
  const missing = specs.filter((spec) => !byKind.has(spec.kind))
  if (missing.length > 0) {
    console.warn(
      `[svc-astro/hehun] ${missing.length} chapter(s) missing, retrying: ${missing
        .map((m) => m.kind)
        .join(', ')}`
    )
    const retried = await Promise.allSettled(missing.map(chapterCall))
    for (const s of retried) {
      if (s.status === 'fulfilled') byKind.set(s.value.kind, s.value)
      else console.error('[svc-astro/hehun] chapter retry failed:', s.reason)
    }
  }

  // Canonical order; drop any chapter whose call still failed after the retry.
  const chapters = specs.flatMap((spec) => {
    const ch = byKind.get(spec.kind)
    return ch ? [ch] : []
  })
  if (chapters.length === 0) throw new Error('Synastry chapters: every chapter failed')
  if (chapters.length < specs.length) {
    console.error(
      `[svc-astro/hehun] incomplete report: ${chapters.length}/${specs.length} chapters after retry`
    )
  }

  const ahaHook = await ahaPromise
  return { ahaHook, chapters, yongshen: yong.element }
}

/**
 * One relationship daily-push teaser, harvested at report-generation time (ADR-0025).
 * `trigger` maps to `calculateDailySynastry().status`, so a cheap deterministic cron
 * can later send the matching line on a matching-energy day — no per-day LLM.
 */
export interface RelationshipPushSnippet {
  trigger: 'resonance' | 'tension' | 'neutral'
  title: string
  body: string
}

const VALID_PUSH_TRIGGER = new Set(['resonance', 'tension', 'neutral'])

function buildPushSnippetsPrompt(
  result: HeHunFullResult,
  input: HeHunInput,
  ziweiBlock: string
): string {
  return `你是一位精通命盘配对的 AI 命理师。基于以下两人命盘的**真实互动**，预先撰写三条"关系日活推送"语料 —— 未来某天两人当日能量呈现对应状态时，App 会作为推送发出，唤起用户打开看这段关系。

${buildPairFacts(result, input, ziweiBlock)}

## 要求
- 为三种"当日能量状态"各写一条，trigger 取值固定为：resonance(高契合日)、tension(易摩擦日)、neutral(平稳日)。
- 每条含 title(≤12字 钩子) 与 body(≤30字 一句话)，必须落到这两人命盘的具体互动上，典雅克制，不下天命定论，严禁网络话术。
- 以「你」称呼接收推送的一方，对方称「对方」（客户端会替换为真实名字）。

## 输出（严格 JSON）
{ "snippets": [ { "trigger": "resonance", "title": "…", "body": "…" }, { "trigger": "tension", "title": "…", "body": "…" }, { "trigger": "neutral", "title": "…", "body": "…" } ] }

只输出纯 JSON，不要任何其他内容。`
}

/**
 * Harvest relationship push 语料 during the same LLM moment as the report (ADR-0025).
 * One small structured call, run in parallel with the chapters; never fatal (returns
 * [] on any failure — the report must not 500 over a push side-output).
 */
export async function generateRelationshipPushSnippets(
  env: AiRouterEnv,
  result: HeHunFullResult,
  input: HeHunInput,
  language: string
): Promise<RelationshipPushSnippet[]> {
  const ziweiBlock = buildZiweiBlock(input)
  const systemPrompt = [
    getSystemRole('hehun'),
    '',
    buildEnhancedGuardrails('相遇即是缘'),
    '',
    buildLanguageBlock(language, 'hehun'),
  ].join('\n')
  const text = await callWithFallback(
    env,
    systemPrompt,
    buildPushSnippetsPrompt(result, input, ziweiBlock) + buildLanguageReminder(language),
    { tier: 'standard', maxTokens: 512, metricLabel: 'hehun-push-snippets', locale: language }
  )
  return parsePushSnippets(text)
}

/** Parse the push-snippets JSON; returns [] on any failure (non-fatal). */
export function parsePushSnippets(text: string): RelationshipPushSnippet[] {
  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) return []
    const parsed = JSON.parse(jsonStr) as { snippets?: unknown }
    if (!Array.isArray(parsed.snippets)) return []
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    return parsed.snippets
      .map((s) => {
        const o = (s ?? {}) as Record<string, unknown>
        const trigger = str(o.trigger)
        return {
          trigger: (VALID_PUSH_TRIGGER.has(trigger)
            ? trigger
            : 'neutral') as RelationshipPushSnippet['trigger'],
          title: str(o.title),
          body: str(o.body),
        }
      })
      .filter((s) => s.title && s.body)
  } catch {
    return []
  }
}

/**
 * Parse one chapter's structured JSON into a SynastryChapterOutput. Assembles a
 * rich `body` from the four layers so even the current text-only card shows the
 * full depth. Throws if the chapter has no usable content (caller drops it).
 */
export function parseSynastryChapterResponse(
  text: string,
  spec: (typeof SYNASTRY_CHAPTER_SPECS)[number],
  yongshen: WuXing
): SynastryChapterOutput {
  const jsonStr = extractJson(text)
  if (!jsonStr) throw new Error(`Synastry chapter ${spec.kind}: no JSON`)
  const p = JSON.parse(jsonStr) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  const evidence = str(p.evidence)
  const dynamic = str(p.dynamic)
  const reef = str(p.reef)
  const remedy = str(p.remedy)
  const counterpoint = str(p.counterpoint)
  const severity = (VALID_SEVERITY.has(str(p.severity)) ? str(p.severity) : 'mid') as ReefSeverity

  // Backward-compatible long-form body = the four layers, joined.
  const body = [evidence, dynamic, reef, remedy, counterpoint].filter(Boolean).join('\n\n')
  if (!body) throw new Error(`Synastry chapter ${spec.kind}: empty body`)

  return {
    kind: spec.kind,
    title: str(p.title) || spec.label,
    goldenLine: str(p.goldenLine),
    body,
    evidence: evidence || undefined,
    dynamic: dynamic || undefined,
    reef: reef || undefined,
    severity,
    remedy: remedy || undefined,
    yongshen,
    counterpoint: counterpoint || undefined,
  }
}

/** Parse the tiny aha-hook JSON; returns '' on any failure (non-fatal). */
export function parseAhaHook(text: string): string {
  try {
    const jsonStr = extractJson(text)
    if (!jsonStr) return ''
    const p = JSON.parse(jsonStr) as { ahaHook?: unknown }
    return typeof p.ahaHook === 'string' ? p.ahaHook.trim() : ''
  } catch {
    return ''
  }
}

/**
 * Legacy all-at-once parser (kept for the offline eval + as a fallback shape).
 * Re-assembles chapters in canonical order, drops unknown/body-less chapters,
 * and throws on unrecoverable output so the route can fall back gracefully.
 * No `yongshen` — that's computed from chart facts in the live per-chapter flow,
 * not recoverable from raw text alone.
 */
export function parseSynastryChaptersResponse(
  text: string
): Omit<SynastryChaptersResult, 'yongshen'> {
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
  const dateA = parsePersonDate({
    solarDate: input.personASolarDate,
    timeIndex: input.personATimeIndex,
  })
  const dateB = parsePersonDate({
    solarDate: input.personBSolarDate,
    timeIndex: input.personBTimeIndex,
  })
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
