/**
 * Gemini Flash dual-call generation for Fate Reading (P1)
 *
 * Call 1 (structured, temp 0.6) — full FateYearReading JSON
 * Call 2 (creative,  temp 1.1) — HooksBundle (hiddenTraits / socialHooks / iapCuriosity)
 *
 * Two parallel LLM calls with different temperatures and personas. Output
 * is grounded in the same consensus + chart context, so hooks can reference
 * specific elements from the structured reading.
 */

import { type AiRouterEnv, callWithFallback } from '../../lib/ai-router'
import { buildAgeLanguageBlock } from '../../lib/age'
import { extractJson } from '../../lib/extract-json'
import { buildLanguageBlock } from '../../lib/i18n-prompt'
import {
  buildPersonaBlock,
  extractDayMasterElement,
  personaTemperature,
  pickPersona,
} from './persona'
import { buildEnhancedCrisisFraming, buildEnhancedGuardrails } from '../../lib/prompts/guardrails'
import { getSystemRole } from '../../lib/prompts/system-role'
import type { ShuangPanConsensus } from './shuangpan'

// ─── Forbidden filler phrases per language ────────────────────────────────

const FORBIDDEN_PHRASES: Record<string, string[]> = {
  zh: ['平稳', '平顺', '无明显', '整体来看', '总体而言', '总体来看', '尚算', '中规中矩'],
  'zh-Hant': ['平穩', '平順', '無明顯', '整體來看', '總體而言', '總體來看', '尚算', '中規中矩'],
  en: [
    'balanced',
    'stable overall',
    'generally',
    'no major',
    'overall well',
    'in summary',
    'all in all',
  ],
  ja: ['全体的に', '概ね', '大きな問題はなく', '安定している', 'バランスが取れて'],
  ko: ['전반적으로', '대체로', '큰 문제 없이', '안정적이며'],
  de: ['insgesamt', 'im Großen und Ganzen', 'allgemein gesehen', 'stabil und ausgeglichen'],
  es: ['en general', 'en líneas generales', 'estable en general', 'sin problemas mayores'],
  vi: ['nhìn chung', 'tổng thể', 'không có vấn đề lớn', 'ổn định'],
  th: ['โดยรวม', 'ทั่วไป', 'ไม่มีปัญหาใหญ่', 'มีความมั่นคง'],
}

function pickForbidden(language: string): string[] {
  if (language.startsWith('zh-Hant') || language === 'zh-TW') return FORBIDDEN_PHRASES['zh-Hant']!
  if (language.startsWith('zh')) return FORBIDDEN_PHRASES.zh!
  return FORBIDDEN_PHRASES[language] ?? FORBIDDEN_PHRASES.en!
}

function buildForbiddenBlock(language: string): string {
  const list = pickForbidden(language)
  const isZh = language.startsWith('zh')
  const header = isZh
    ? '## 禁用填充词（任何输出字段都不得出现以下词组）'
    : '## Forbidden filler phrases (must not appear in any output field)'
  return [header, list.map((p) => `- ${p}`).join('\n')].join('\n')
}

// ─── Anchor specificity (≥2 chart elements per paragraph) ─────────────────

function buildAnchorRule(language: string): string {
  const isZh = language.startsWith('zh')
  return isZh
    ? [
        '## 锚定具体度（铁律）',
        '- 每一段叙述必须明确引用至少 2 个命盘元素（如：日柱"辛酉"、命宫"七杀+破军"、流年"甲辰"、神煞"驿马"）',
        '- 不允许通用描述。每一句话必须可追溯到八字 / 紫微 / 流年的具体元素',
        '- 反例（禁止）："今年事业稳定，需要努力"',
        '- 正例：："七杀坐命+流年甲辰，事业宫触发禄马交驰，3 月（戊辰）启动期最关键"',
      ].join('\n')
    : [
        '## Anchor specificity (mandatory)',
        '- Every paragraph MUST cite at least 2 specific chart elements by name (day pillar, palace, transiting year stem, shensha)',
        '- No generic descriptions. Every sentence must be traceable to a specific Bazi / Ziwei / annual element',
        '- BAD: "Career is stable this year, work hard."',
        '- GOOD: "Qi Sha sits in your Career palace; the 甲辰 transit triggers the Lu-Ma combination — March (戊辰) is your launch window."',
      ].join('\n')
}

// ─── Few-shot BAD/GOOD examples per language ──────────────────────────────

function buildFewShot(language: string): string {
  if (language.startsWith('zh')) {
    return [
      '## 风格示范',
      '<BAD>',
      '今年财运平稳，整体来看适合稳健投资。建议保持谨慎，避免大额支出。',
      '</BAD>',
      '<GOOD>',
      '偏财坐流年甲辰，3 月驿马启动，副业窗口打开；但七杀逢冲，10 月前避免高杠杆。具体可执行：把 5 万以上支出推迟到 11 月。',
      '</GOOD>',
    ].join('\n')
  }
  return [
    '## Style examples',
    '<BAD>',
    'Your finances are balanced this year. Generally a good time to invest cautiously. Avoid major expenses.',
    '</BAD>',
    '<GOOD>',
    'Pian Cai sits in your annual 甲辰 transit; March activates the Travel Horse — a side-hustle window opens. But Qi Sha clashes through October — defer any 5-figure expense to November.',
    '</GOOD>',
  ].join('\n')
}

// ─── Call 1: Structured Reading ───────────────────────────────────────────

export interface FateYearReadingShape {
  yearOverview: string
  personalityCore: string
  career: string
  wealth: string
  relationship: string
  health: string
  monthlyHighlights: Record<string, string>
  decadeArc: string
  shenshaWarnings: Array<{ name: string; severity: 'low' | 'medium' | 'high'; advice: string }>
  confidence: string
}

const STRUCTURED_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    yearOverview: { type: 'string' },
    personalityCore: { type: 'string' },
    career: { type: 'string' },
    wealth: { type: 'string' },
    relationship: { type: 'string' },
    health: { type: 'string' },
    monthlyHighlights: { type: 'object', additionalProperties: { type: 'string' } },
    decadeArc: { type: 'string' },
    shenshaWarnings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          advice: { type: 'string' },
        },
        required: ['name', 'severity', 'advice'],
      },
    },
    confidence: { type: 'string' },
  },
  required: [
    'yearOverview',
    'personalityCore',
    'career',
    'wealth',
    'relationship',
    'health',
    'monthlyHighlights',
    'decadeArc',
    'shenshaWarnings',
    'confidence',
  ],
} as const

function buildStructuredPrompt(
  consensus: ShuangPanConsensus,
  queryYear: number,
  language: string,
  options?: {
    solarBirthDate?: string
    physiognomyFeaturesJson?: string | null
    readingMode?: 'beginner' | 'expert'
  }
): string {
  const insightsStr = consensus.insights
    .map(
      (i) =>
        `- ${i.dimension}: 八字(${i.natalSignal}) + 紫微(${i.stellarSignal}) → ${i.direction}，置信度${i.confidence === 'high' ? '高' : i.confidence === 'medium' ? '中' : '冲突'}`
    )
    .join('\n')

  const ageBlock = options?.solarBirthDate
    ? `\n${buildAgeLanguageBlock(options.solarBirthDate, language)}\n`
    : ''

  const physiognomySection = options?.physiognomyFeaturesJson
    ? `\n\n## 面相修正维度（后天格局）\n${options.physiognomyFeaturesJson}\n（结合面相特征对流年细节做精准度修正）`
    : ''

  return [
    '[段一 — 八字底色]',
    consensus.natalSummary,
    consensus.daYunContext ? `\n${consensus.daYunContext}` : '',
    consensus.shenShaContext ? `${consensus.shenShaContext}` : '',
    physiognomySection,
    ageBlock,
    '[段二 — 紫微流年]',
    `${queryYear} 年流年信号：${consensus.stellarSummary}`,
    '',
    '[段三 — 合参指令]',
    '两套系统共识分析：',
    insightsStr || '- 无显著冲突信号',
    `→ 总体置信度：${consensus.overallConfidence === 'high' ? '高' : consensus.overallConfidence === 'medium' ? '中' : '冲突'}`,
    '',
    `请基于以上双盘合参信息，生成 ${queryYear} 年度结构化运势报告。`,
    '',
    '字段长度要求（必须遵守，否则视为不合格）：',
    '- yearOverview: 80-120 字',
    '- personalityCore: 100-150 字（人格核心：日主性格 × 命宫主星 × 神煞印记）',
    '- career / wealth / relationship: 80-120 字',
    '- health: 60-100 字',
    '- monthlyHighlights: 至少 3 个关键月份，每条 30 字内（key 用「3月」「October」等本地化标签）',
    '- decadeArc: 100-150 字（当前大运走势）',
    '- shenshaWarnings: 0-3 项；severity 仅 high/medium 才输出（low 信号不输出）',
    '- confidence: 30 字内（本次分析的置信度说明）',
    '',
    ...(options?.readingMode === 'expert'
      ? [
          '## 受众模式：专家',
          '- 直接使用完整干支/宫位/神煞原文标签（如：辛酉、命宫七杀、甲辰流年）',
          '- 无需术语注解。可引用具体流月地支和四化星曜名称',
          '',
        ]
      : [
          '## 受众模式：入门',
          '- 每个字段核心叙述后补充一句术语注解（≤20字，括号内），确保无命理知识读者能理解',
          '- 避免术语堆砌。注解示例：（日干辛，属金，主个性刚毅细腻）',
          '',
        ]),
    '输出纯 JSON 对象，符合上述 responseSchema。不要包含其他字段。',
  ].join('\n')
}

export async function generateStructuredReading(
  env: AiRouterEnv,
  consensus: ShuangPanConsensus,
  queryYear: number,
  isPro: boolean,
  language: string,
  options?: {
    solarBirthDate?: string
    physiognomyFeaturesJson?: string | null
    readingMode?: 'beginner' | 'expert'
  }
): Promise<{ aiReading: string; parsed: FateYearReadingShape }> {
  const prompt = buildStructuredPrompt(consensus, queryYear, language, options)

  // Persona injection — voice variation based on day master 五行.
  // Persona block goes AFTER the static prompt so upstream Gemini implicit
  // caching can still fingerprint the static prefix.
  const dayMasterElement = extractDayMasterElement(consensus.natalSummary)
  const persona = pickPersona(dayMasterElement)
  const personaBlock = buildPersonaBlock(persona, language)

  const systemPrompt = [
    getSystemRole('shuangpan'),
    '',
    '## 双盘合参原则',
    '- "同向顺"（两套系统指向相同吉方）→ 置信度高，给出积极建议',
    '- "同向逆"（两套系统指向相同凶方）→ 置信度高，给出防御策略和化解之道',
    '- "反向"（两套系统矛盾）→ 置信度中，说明"机遇与风险并存"',
    '',
    buildAnchorRule(language),
    '',
    buildForbiddenBlock(language),
    '',
    buildFewShot(language),
    '',
    buildEnhancedGuardrails(),
    '',
    buildEnhancedCrisisFraming(),
    buildLanguageBlock(language, 'shuangpan'),
    '',
    personaBlock,
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro,
    maxTokens: isPro ? 4096 : 2400,
    temperature: personaTemperature(persona, isPro),
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    responseSchema: STRUCTURED_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
    metricLabel: `fate-structured:${persona}`,
    locale: language,
  })

  const jsonStr = extractJson(text)
  if (!jsonStr) throw new Error('No JSON found in structured reading response')
  const parsed = JSON.parse(jsonStr) as FateYearReadingShape
  return { aiReading: jsonStr, parsed }
}

// ─── Call 2: Hooks Bundle ─────────────────────────────────────────────────

export interface HooksBundleShape {
  hiddenTraits: string[]
  socialHooks: string[]
  iapCuriosity: string[]
}

const HOOKS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    hiddenTraits: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    socialHooks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    iapCuriosity: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
  },
  required: ['hiddenTraits', 'socialHooks', 'iapCuriosity'],
} as const

function buildHooksPrompt(
  consensus: ShuangPanConsensus,
  structured: FateYearReadingShape,
  language: string
): string {
  const isZh = language.startsWith('zh')
  const insightsStr = consensus.insights.map((i) => `- ${i.dimension}: ${i.summary}`).join('\n')

  if (isZh) {
    return [
      '基于以下命盘信息和已生成的年度结构化解读，输出三类创意钩子：',
      '',
      '## 命盘速览',
      `命格底色：${consensus.natalSummary}`,
      `星宫流年：${consensus.stellarSummary}`,
      insightsStr,
      '',
      '## 已生成的结构化解读',
      `人格核心：${structured.personalityCore}`,
      `年度总览：${structured.yearOverview}`,
      `事业：${structured.career}`,
      `感情：${structured.relationship}`,
      '',
      '## 输出要求',
      '1. hiddenTraits（3 条，每条 80-100 字）：',
      '   "你不知道自己" 系列。揭示用户没意识到的自我特质或盲点。',
      '   必须基于具体命盘元素。语气：犀利、洞察、不留情面。',
      '2. socialHooks（3 条，每条 ≤25 字）：',
      '   截图分享金句。朗朗上口，不带吉凶断言。适合做社交卡片。',
      '3. iapCuriosity（2 条，每条 ≤40 字）：',
      '   付费升级的好奇心钩子。暗示更深的内容。不要硬推销。',
      '',
      '输出纯 JSON 对象。',
    ].join('\n')
  }

  return [
    'Based on the chart context and the structured yearly reading already generated, produce three types of creative hooks:',
    '',
    '## Chart snapshot',
    `Natal foundation: ${consensus.natalSummary}`,
    `Annual transit: ${consensus.stellarSummary}`,
    insightsStr,
    '',
    '## Generated structured reading',
    `Personality core: ${structured.personalityCore}`,
    `Year overview: ${structured.yearOverview}`,
    `Career: ${structured.career}`,
    `Relationships: ${structured.relationship}`,
    '',
    '## Output requirements',
    '1. hiddenTraits (3 items, each 80-100 chars):',
    '   "Things you don\'t realize about yourself." Surface uncomfortable truths.',
    '   Must anchor in specific chart elements. Tone: sharp, observational, unflinching.',
    '2. socialHooks (3 items, each ≤25 chars):',
    '   Punchy share-card lines. No fortune predictions. Punctuated, screenshot-ready.',
    '3. iapCuriosity (2 items, each ≤40 chars):',
    '   Curiosity-gap teasers for upgrade. Hint at deeper content. No hard sell.',
    '',
    'Output a single JSON object.',
  ].join('\n')
}

export async function generateHooksBundle(
  env: AiRouterEnv,
  consensus: ShuangPanConsensus,
  structured: FateYearReadingShape,
  isPro: boolean,
  language: string
): Promise<HooksBundleShape> {
  const prompt = buildHooksPrompt(consensus, structured, language)

  const systemPrompt = [
    language.startsWith('zh')
      ? '你是一位犀利、洞察驱动的东方命理评论家。避免陈词滥调，直击不舒服的真相。语气：朋友的真诚 + 评论家的锋利。绝不堆砌平庸描述。'
      : "You are a sharp, intuition-driven East Asian metaphysics critic. Avoid platitudes. Surface the uncomfortable truth. Voice: a friend's honesty + a critic's edge. Never pad with bland generalities.",
    '',
    buildAnchorRule(language),
    '',
    buildForbiddenBlock(language),
    '',
    buildEnhancedGuardrails(),
    buildLanguageBlock(language, 'shuangpan'),
  ].join('\n')

  const text = await callWithFallback(env, systemPrompt, prompt, {
    isPro,
    maxTokens: 1500,
    temperature: 1.1,
    thinkingLevel: 'LOW',
    responseSchema: HOOKS_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
    metricLabel: 'fate-hooks',
    locale: language,
  })

  const jsonStr = extractJson(text)
  if (!jsonStr) throw new Error('No JSON found in hooks response')
  const parsed = JSON.parse(jsonStr) as HooksBundleShape

  // Defensive normalization: ensure exact array sizes
  return {
    hiddenTraits: (parsed.hiddenTraits ?? []).slice(0, 3),
    socialHooks: (parsed.socialHooks ?? []).slice(0, 3),
    iapCuriosity: (parsed.iapCuriosity ?? []).slice(0, 2),
  }
}

// ─── Orchestrator: parallel dual-call ─────────────────────────────────────

export interface DualCallResult {
  /** Structured reading JSON string (matches FateYearReading shape, sans hooks) */
  aiReading: string
  /** Parsed hooks bundle, or null if hooks call failed (non-fatal) */
  hooks: HooksBundleShape | null
  /** Convenience: first social hook, used as legacy shareQuote */
  shareQuote?: string
}

/**
 * Runs structured + hooks calls in parallel. Hooks failure is non-fatal —
 * a working aiReading is still returned with `hooks: null`.
 */
export async function generateDualReading(
  env: AiRouterEnv,
  consensus: ShuangPanConsensus,
  queryYear: number,
  isPro: boolean,
  language: string,
  options?: {
    solarBirthDate?: string
    physiognomyFeaturesJson?: string | null
    readingMode?: 'beginner' | 'expert'
  }
): Promise<DualCallResult> {
  // Call 1 must succeed to have a usable reading
  const structured = await generateStructuredReading(
    env,
    consensus,
    queryYear,
    isPro,
    language,
    options
  )

  // Call 2 runs after Call 1 (so it can use parsed structured output as context)
  let hooks: HooksBundleShape | null = null
  try {
    hooks = await generateHooksBundle(env, consensus, structured.parsed, isPro, language)
  } catch (err) {
    console.error('[shuangpan/dual-call] hooks generation failed (non-fatal):', err)
  }

  return {
    aiReading: structured.aiReading,
    hooks,
    shareQuote: hooks?.socialHooks[0],
  }
}
