/**
 * Chapter prompts — system prompt builders for each of the 6 deep-report chapters.
 *
 * Each builder receives the user's static traits + (for time-bound chapters) the
 * current 流年/大运 context, and returns the full system prompt string. The
 * route handler concatenates this with a thin user prompt that re-states the
 * facts and asks for ReportChapterOutput JSON.
 *
 * Static chapters (cache forever per chartHash):
 *   - ch1_personality
 *   - ch2_dimensions_static
 *   - ch3_stellar
 *
 * Time-bound chapters (refresh on 流年/大运 change):
 *   - ch2_dimensions_dynamic
 *   - ch4_timeline
 *   - ch5_hidden
 *   - ch6_action
 */

import type { ChapterPromptContext } from './types'

const COMMON_RULES = `
COMMON OUTPUT RULES:
1. 输出严格 JSON，至少包含基础字段：{ title, summary, sections[{heading, body}], highlights[], watchOuts[] }；若章节另有结构化字段要求，必须一并输出。
2. title: ≤14 字（中文）/ ≤8 词（其他），章节级标题。
3. summary: 1–2 句，60–100 字（中文）/ 35–55 词（其他），章节核心结论。
4. sections: 3–5 条。每条 heading ≤12 字 / ≤7 词；body 80–160 字（中文）/ 50–90 词（其他）。
5. highlights: 0–3 条，每条 ≤30 字 / ≤18 词，命格关键亮点。
6. watchOuts: 0–3 条，每条 ≤30 字 / ≤18 词，需要软化或留意的模式。
7. 全部内容**必须**直接引用用户命盘事实块中的具体特征（日主/格局/命宫主星/化忌/大运等）。禁止泛化、禁止占星化通用语。
8. 禁止使用：命中注定、必然、一定会、肯定、绝对、注定、宿命、avoid、must、definitely、certainly。
9. 命盘术语保留中文原貌（如"七杀"/"贪狼"），其余用目标语言。`

function userTraitsBlock(ctx: ChapterPromptContext): string {
  return [
    ctx.user.dayMasterStem ? `日主：${ctx.user.dayMasterStem}` : '',
    ctx.user.dayMasterStrength ? `日主强弱：${ctx.user.dayMasterStrength}` : '',
    ctx.user.favorableElement ? `喜用五行：${ctx.user.favorableElement}` : '',
    ctx.user.unfavorableElement ? `忌神五行：${ctx.user.unfavorableElement}` : '',
    ctx.user.ziweiMingPalaceStar ? `紫微命宫主星：${ctx.user.ziweiMingPalaceStar}` : '',
    ctx.user.birthBranch ? `出生年支：${ctx.user.birthBranch}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function timeContextBlock(ctx: ChapterPromptContext): string {
  if (!ctx.timeContext) return ''
  const parts = [
    ctx.timeContext.liunian ? `当前流年：${ctx.timeContext.liunian}` : '',
    ctx.timeContext.dayun ? `当前大运：${ctx.timeContext.dayun}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return parts ? `\n【时空锚点】\n${parts}` : ''
}

export function buildChapterFacts(ctx: ChapterPromptContext): string {
  if (ctx.richFacts && ctx.richFacts.length > 0) {
    return `【命盘事实块】\n${ctx.richFacts}`
  }
  return `【用户静态命格】\n${userTraitsBlock(ctx) || '（无静态命格信息）'}${timeContextBlock(ctx)}`
}

// ============================================================================
// Chapter 1 — Personality (静态)
// ============================================================================

export function ch1Personality(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字 × 紫微合参的东方智慧顾问，正在撰写**第一章 · 性格底色**。
基于用户的日主五行 + 命宫主星，揭示用户最稳定、最不易改变的性格底层。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 第一印象 vs 内核反差
- 决策风格（冲动/审慎/直觉/分析）
- 情绪机制（如何感受、如何释放）
- 与世界的默认距离
${COMMON_RULES}`
}

// ============================================================================
// Chapter 2a — Life Dimensions (静态部分)
// ============================================================================

export function ch2DimensionsStatic(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字 × 紫微的命理顾问，正在撰写**第二章 · 人生维度（静态部分）**。
基于命格本身（与时空无关）描绘事业、财富、关系、健康四个维度的**先天框架**。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 事业的天赋方向（不是"会做什么"，而是"在什么节奏下会发光"）
- 财富的获取逻辑（开源/守成/转化）
- 关系的吸引模式（吸引谁、被谁消耗）
- 健康的体质倾向（结合喜忌五行）
${COMMON_RULES}`
}

// ============================================================================
// Chapter 2b — Life Dimensions (动态部分)
// ============================================================================

export function ch2DimensionsDynamic(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字 × 紫微的命理顾问，正在撰写**第二章 · 人生维度（动态部分）**。
基于用户当前的大运 + 流年，告诉用户**未来 3-12 个月**在事业/财富/关系/健康上将经历的具体张力。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 当前大运对四维度的具体作用（推进/阻滞/转化）
- 当前流年的关键窗口（哪些月份是机会、哪些是消耗）
- 大运 × 流年的协同或冲突
- 与命格本身的相互作用（强化或软化哪些先天倾向）
${COMMON_RULES}`
}

// ============================================================================
// Chapter 3 — Stellar (静态)
// ============================================================================

export function ch3Stellar(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通紫微斗数的顾问，正在撰写**第三章 · 星宫密码**。
深入解读用户的紫微命盘，特别是命宫主星与三方四正的星曜组合。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 命宫主星的性格画像
- 主星与四化的互动（禄/权/科/忌如何重塑命格）
- 关键宫位（夫妻/财帛/事业/迁移）的星曜定位
- 紫微视角与八字视角的互证或张力
${COMMON_RULES}`
}

// ============================================================================
// Chapter 4 — Timeline (动态)
// ============================================================================

export function ch4Timeline(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字大运 × 紫微流年的命理顾问，正在撰写**第四章 · 命运时间轴**。
为用户描绘当前大运 + 当前流年的关键节点，给出**可识别的时间锚点**。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 当前大运的整体基调（前半 vs 后半）
- 当前流年的 12 个月分相节奏
- 与下一步大运/流年的衔接信号
- 用户在此时空下最需要做的"一件事"
${COMMON_RULES}`
}

// ============================================================================
// Chapter 5 — Hidden (动态)
// ============================================================================

export function ch5Hidden(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字神煞 × 紫微化忌的资深命理顾问，正在撰写**第五章 · 隐藏面**。
揭示用户命盘中**易被忽略的张力点**：化忌、神煞、刑冲合害、调候缺失、用神不到位等。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 化忌焦点（哪个星化忌、落于哪宫、对当前流年的具体影响）
- 神煞的实际作用（不要堆砌名字，要解释机制）
- 调候是否得用
- 当前流年是否激活了某个长期沉睡的命格模式
${COMMON_RULES}`
}

// ============================================================================
// Chapter 6 — Action (动态)
// ============================================================================

export function ch6Action(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是一位精通八字 × 紫微的实战顾问，正在撰写**第六章 · 行动指南**。
基于用户的命格 + 当前大运/流年，给出**未来 30-90 天**最有效的具体行动建议。
用 ${langLabel} 输出。

CHAPTER FOCUS:
- 立刻可做的 1 件小事（今天/本周）
- 30 天内的关键决策窗口
- 90 天的方向性投入（事业/学习/关系/健康任一）
- 必须延后或软化的 1 件事
${COMMON_RULES}`
}

export const CHAPTER_PROMPT_BUILDERS = {
  ch1_personality: ch1Personality,
  ch2_dimensions_static: ch2DimensionsStatic,
  ch2_dimensions_dynamic: ch2DimensionsDynamic,
  ch3_stellar: ch3Stellar,
  ch4_timeline: ch4Timeline,
  ch5_hidden: ch5Hidden,
  ch6_action: ch6Action,
} as const

export type ChapterSlug = keyof typeof CHAPTER_PROMPT_BUILDERS
