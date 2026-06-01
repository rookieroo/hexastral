/**
 * Reading Chat — 阅读后多轮 AI 追问
 *
 * POST /chat
 * Body: {
 *   readingContext: string   — 阅读内容快照（AI 解读文字），作为对话背景
 *   memoryContext?: string   — Optional portfolio-memory excerpts retrieved on the API
 *                              side (already prefixed with locale-aware instruction).
 *                              Injected verbatim under <memory>…</memory>.
 *   messages: Array<{ role: 'user' | 'model', content: string }>
 *   isPro: boolean
 *   locale: string           — 语言代码，如 zh-CN / en
 * }
 * Response: { reply: string }
 */

import { Hono } from 'hono'
import type { ChatMessage } from '../lib/gemini'
import { callChatWithFallback } from '../lib/ai-router'
import { getSystemRole } from '../lib/prompts/system-role'
import { buildEnhancedGuardrails } from '../lib/prompts/guardrails'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const chatRoutes = new Hono<AppEnv>()

const LOCALE_OUTPUT_MAP: Record<string, string> = {
  'zh': '请用简体中文回答。',
  'zh-CN': '请用简体中文回答。',
  'zh-Hant': '請用繁體中文回答。',
  'en': 'Please reply in English.',
  'ko': '한국어로 답변해 주세요.',
  'ja': '日本語で回答してください。',
  'de': 'Bitte auf Deutsch antworten.',
  'es': 'Por favor responda en español.',
  'vi': 'Vui lòng trả lời bằng tiếng Việt.',
  'th': 'กรุณาตอบเป็นภาษาไทย',
}

chatRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    readingContext: string
    memoryContext?: string
    messages: ChatMessage[]
    isPro: boolean
    locale?: string
  }>()

  const { readingContext, memoryContext, messages, isPro, locale = 'zh-CN' } = body

  if (!readingContext || !messages || messages.length === 0) {
    return c.json({ error: 'readingContext and messages are required' }, 400)
  }

  const systemPrompt = buildChatSystemPrompt({ readingContext, memoryContext, locale })

  const reply = await callChatWithFallback(c.env, systemPrompt, messages, {
    isPro,
    maxTokens: isPro ? 1024 : 512,
  })

  return c.json({ reply })
})

/**
 * Pure builder used by both the route handler and the unit tests.
 * Exported so callers can snapshot the prompt deterministically.
 */
export function buildChatSystemPrompt(input: {
  readingContext: string
  memoryContext?: string | null
  locale?: string
}): string {
  const locale = input.locale ?? 'zh-CN'
  const localeInstruction = LOCALE_OUTPUT_MAP[locale] ?? LOCALE_OUTPUT_MAP['zh-CN']

  const segments = [
    getSystemRole('yiching'),
    '',
    buildEnhancedGuardrails('卦象明来意，行动定乾坤'),
    '',
    `以下是这位用户的命理解读报告，作为你回答问题的背景：
---
${input.readingContext}
---`,
  ]

  if (input.memoryContext && input.memoryContext.trim().length > 0) {
    segments.push(
      '',
      `<memory>
${input.memoryContext.trim()}
</memory>`
    )
  }

  segments.push(
    '',
    '请根据此报告回答用户的追问。如报告中没有相关信息，可基于命理通识作答，但需注明。',
    '若 <memory> 段存在，可参考其中过往解读的语境，但不得改写命盘事实，且不得编造未提及的细节。',
    '回复风格：言简意赅、有理有据，适当用命理术语但要解释含义。',
    localeInstruction
  )

  return segments.join('\n')
}
