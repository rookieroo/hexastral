/**
 * Chapter prompts — system prompt builders for each of the 6 deep-report chapters.
 *
 * Per-chapter focus + volume; time horizon = 后半场大运带 (not only dual dayun).
 */

import type { ChapterPromptContext } from './types'

const COMMON_RULES = `
OUTPUT:
1. 严格 JSON：{ title, summary, sections[{heading, body}], highlights[], watchOuts[] }（章节另有字段则一并输出）。
2. title 短；summary 70–120 字，点出张力/短板，须有 aha。
3. sections 按本章规格条数与字数写满；完整论述，不是几十个字。
4. watchOuts ≥2（短板+何时+一步）；highlights 0–3。
5. 必须引用【命盘事实块】具体字符串；真话优先、选边主张。
6. 时间：近窗（流年/1–3年）+ 后半场大运带（事实块从当前运起向后若干步）；深写能对上的场景，勿刷运标签。`

const CROSS_CHAPTER_DEDUP = `
不要复述他章会写的同一套空壳；同一命盘元素须给本章专属机理与行动。`

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

export function ch1Personality(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是东方智慧顾问，撰写**第一章 · 性格底色**（日主×命宫主星）。用 ${langLabel} 输出。
FOCUS: 印象vs内核反差；决策与情绪机制；亲密/合作易踩的雷。1 aha + ≥2 短板机制。
VOLUME: sections 3–4；章内 body 合计 480–700 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch2DimensionsStatic(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是东方智慧顾问，撰写**第二章 · 人生维度（静态）**：事业/财富/关系/健康先天框架。用 ${langLabel} 输出。
FOCUS: 四维等权；每维天赋+短板+一步指导。
VOLUME: sections 4；章内 body 合计 560–800 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch2DimensionsDynamic(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是东方智慧顾问，撰写**第二章 · 人生维度（动态）**。用 ${langLabel} 输出。
FOCUS: 流年近窗（1–2）+ 后半场大运带（2–3 运段）对四维的推力；真话短板 + aha。
VOLUME: sections 3–4；章内 body 合计 480–720 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch3Stellar(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是紫微顾问，撰写**第三章 · 星宫密码**（命宫主星、四化、关键宫）。用 ${langLabel} 输出。
FOCUS: 以紫微事实为主（勿八字换皮）；化忌必写影响域与缓冲。
VOLUME: sections 3–4；章内 body 合计 480–700 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch4Timeline(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是东方智慧顾问，撰写**第四章 · 命运时间轴**——人生后半场主场。用 ${langLabel} 输出。
FOCUS: 后半场大运带主题表 + 近窗；最该做/最该缓；aha。深写场景，勿逐步刷标签。
VOLUME: sections 4–5；章内 body 合计 600–900 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch5Hidden(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是资深顾问，撰写**第五章 · 隐藏面**（化忌/神煞/刑冲/调候）。锋利，非安慰章。用 ${langLabel} 输出。
FOCUS: 暗礁机制 + 缓冲动作；watchOuts 要硬。
VOLUME: sections 3–4；章内 body 合计 480–700 字。
${CROSS_CHAPTER_DEDUP}
${COMMON_RULES}`
}

export function ch6Action(ctx: ChapterPromptContext, langLabel: string): string {
  return `你是实战顾问，撰写**第六章 · 行动指南**。用 ${langLabel} 输出。
FOCUS: 只输出做什么——近窗清单 + 后半场 1–2 条铺垫/收束；勿复读时间轴叙事。
VOLUME: sections 3–4；章内 body 合计 480–700 字。
${CROSS_CHAPTER_DEDUP}
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
