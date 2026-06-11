/**
 * Reading Chat — 阅读后多轮 AI 追问
 *
 * POST /chat
 * Body (Chat plan CC.5 — structured context bundle):
 * {
 *   context: {
 *     user:    { name, locale, birthInfo, plan },
 *     primary: { type, text },           — the reading being chatted about
 *     related: Array<{ type, summary, ageDays }>,
 *     memory:  { context, hitCount },
 *   },
 *   messages: Array<{ role: 'user' | 'model', content: string }>,
 *   isPro: boolean,
 *   locale?: string,
 * }
 *
 * Legacy flat form ({ readingContext, memoryContext }) is still accepted so a
 * deploy skew between hexastral-api and svc-astro never breaks live chat.
 *
 * Response: { reply: string }
 */

import { Hono } from 'hono'
import { callChatWithFallback } from '../lib/ai-router'
import type { ChatMessage } from '../lib/chat-message'
import { buildEnhancedGuardrails } from '../lib/prompts/guardrails'
import { getSystemRole, type PromptDomain } from '../lib/prompts/system-role'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const chatRoutes = new Hono<AppEnv>()

interface BirthBriefLike {
  year: number
  month: number
  day: number
  hour: number | null
  gender: string | null
  city: string | null
}

interface ReadingContextLike {
  user: { name: string | null; locale: string; birthInfo: BirthBriefLike | null; plan: string }
  primary: { type: string; text: string }
  related: Array<{ type: string; summary: string; ageDays: number }>
  memory: { context: string; hitCount: number }
}

const LOCALE_OUTPUT_MAP: Record<string, string> = {
  zh: '请用简体中文回答。',
  'zh-CN': '请用简体中文回答。',
  'zh-Hant': '請用繁體中文回答。',
  en: 'Please reply in English.',
  ko: '한국어로 답변해 주세요.',
  ja: '日本語で回答してください。',
  de: 'Bitte auf Deutsch antworten.',
  es: 'Por favor responda en español.',
  vi: 'Vui lòng trả lời bằng tiếng Việt.',
  th: 'กรุณาตอบเป็นภาษาไทย',
}

/** Map the primary reading type to the most fitting interpreter persona. */
const DOMAIN_BY_READING: Record<string, PromptDomain> = {
  natal: 'natal',
  stellar: 'stellar',
  yiching: 'yiching',
  pair: 'hehun',
  physiognomy: 'physiognomy',
  report: 'fate',
  feng: 'fate', // no dedicated feng persona; 'fate' is the multi-system advisor
}

chatRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    context?: ReadingContextLike
    readingContext?: string
    memoryContext?: string
    messages: ChatMessage[]
    isPro: boolean
    locale?: string
  }>()

  const { context, readingContext, memoryContext, messages, isPro, locale = 'zh-CN' } = body

  // Normalize the legacy flat form into the structured bundle.
  const ctx: ReadingContextLike | null =
    context ??
    (readingContext
      ? {
          user: { name: null, locale, birthInfo: null, plan: 'free' },
          primary: { type: 'report', text: readingContext },
          related: [],
          memory: { context: memoryContext ?? '', hitCount: 0 },
        }
      : null)

  if (!ctx?.primary.text || !messages || messages.length === 0) {
    return c.json({ error: 'context and messages are required' }, 400)
  }

  const systemPrompt = buildChatSystemPrompt({ context: ctx, locale })

  const reply = await callChatWithFallback(c.env, systemPrompt, messages, {
    isPro,
    // /no_think stops qwen3 (a reasoning model) from spending the whole budget on
    // a hidden <think> block and returning EMPTY. The slightly larger free budget
    // also gives the GLM fallback (which ignores /no_think) headroom to finish.
    maxTokens: isPro ? 1024 : 768,
    noThink: true,
  })

  return c.json({ reply })
})

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Pure builder used by both the route handler and the unit tests.
 * Exported so callers can snapshot the prompt deterministically.
 */
export function buildChatSystemPrompt(input: {
  context: ReadingContextLike
  locale?: string
}): string {
  const { context } = input
  const locale = input.locale ?? context.user.locale ?? 'zh-CN'
  const localeInstruction =
    LOCALE_OUTPUT_MAP[locale] ?? LOCALE_OUTPUT_MAP['zh-CN'] ?? '请用简体中文回答。'
  const domain = DOMAIN_BY_READING[context.primary.type] ?? 'fate'

  const segments: string[] = [getSystemRole(domain), '', buildEnhancedGuardrails()]

  // ── L2 · USER PROFILE ──
  const u = context.user
  const profile: string[] = ['', '## 用户简档 / USER PROFILE']
  if (u.name) profile.push(`姓名 / Name: ${u.name}`)
  if (u.birthInfo) {
    const b = u.birthInfo
    const hour = b.hour != null ? `${pad2(b.hour)}时` : '时辰不详 / hour unknown'
    const bits = [`${b.year}-${pad2(b.month)}-${pad2(b.day)} ${hour}`]
    if (b.gender) bits.push(b.gender)
    if (b.city) bits.push(b.city)
    profile.push(`生辰 / Birth: ${bits.join(' · ')}`)
  }
  profile.push(`订阅 / Plan: ${u.plan}`)
  segments.push(...profile)

  // ── L1 · PRIMARY READING ──
  segments.push(
    '',
    `## 主阅读 / PRIMARY READING (${context.primary.type})`,
    '---',
    context.primary.text,
    '---'
  )

  // ── L3 · RELATED CONTEXT ──
  if (context.related.length > 0) {
    segments.push('', '## 关联背景 / RELATED CONTEXT（同一用户，近期）')
    for (const r of context.related) {
      const age = r.ageDays > 0 ? `${r.ageDays}d ago` : 'current'
      segments.push(`[${r.type}, ${age}] ${r.summary}`)
    }
  }

  // ── L4 · PAST MEMORY ──
  if (context.memory.context.trim().length > 0) {
    segments.push('', `<memory>\n${context.memory.context.trim()}\n</memory>`)
  }

  // ── RULES ──
  segments.push(
    '',
    '## 规则 / RULES',
    '- 仅依据以上语境作答；命盘 / 卦象 / 报告事实不得编造或改写。语境缺失时可用命理通识作答，但须注明。',
    '- 跨阅读推断须注明来源层，例如「结合您的命盘日主…」「上次面相…」。',
    '- 生辰缺失时，不要从姓名或其他线索臆测出生信息。',
    '- 言简意赅、有理有据；命理术语需附带通俗解释。',
    localeInstruction
  )

  return segments.join('\n')
}
