/**
 * AI Router — svc-astro LLM 容灾路由
 *
 * callWithFallback (fate reading / 一次性 JSON 生成):
 *   Pro:  google/gemini-3.1-pro → @cf/deepseek-ai/deepseek-r1-distill-qwen-32b → @cf/qwen/qwen3-30b-a3b-fp8 → @cf/meta/llama-3.3-70b-instruct-fp8-fast
 *   Free: google/gemini-3.1-flash-lite → @cf/deepseek-ai/deepseek-r1-distill-qwen-32b → @cf/qwen/qwen3-30b-a3b-fp8 → @cf/meta/llama-3.3-70b-instruct-fp8-fast
 *
 * callChatWithFallback (多轮对话 — 不使用 DeepSeek R1，思维链不适合 chat 场景):
 *   Pro:  google/gemini-3.1-pro → google/gemini-3.1-flash-lite → @cf/qwen/qwen3-30b-a3b-fp8
 *   Free: google/gemini-3.1-flash-lite → @cf/qwen/qwen3-30b-a3b-fp8 → @cf/meta/llama-3.3-70b-instruct-fp8-fast
 *
 * Fallback 选型理由（中文场景优先）:
 *   - DeepSeek R1 distill Qwen 32B: CF 上唯一 DeepSeek 模型，Qwen2.5 底座，中文能力强，仅用于一次性生成（需剥离 <think> 块）
 *   - Qwen3 30B MoE: 中文最佳 Hosted 模型，无思维前缀，速度快
 *   - Llama 3.3 70B Fast: 最后兜底，中文能力一般
 *
 * API 格式:
 *   - Gemini 系列 (google/...): 使用原生 contents/parts 格式，system prompt prepend 到第一个 user turn
 *   - 其他 (@cf/...): 使用 OpenAI messages 格式
 *
 * Workers AI catalog: https://developers.cloudflare.com/ai/models/
 */

import type { Ai } from '@cloudflare/workers-types'
import type { ChatMessage, GeminiThinkingLevel } from './gemini'

// ==================== Types ====================

export interface AiRouterEnv {
  GEMINI_API_KEY: string // Retained ONLY for physiognomy VLM, text routes use Workers AI
  AI: Ai
  SVC_ADMIN_NOTIFY: Fetcher
}

export interface FallbackCallOptions {
  isPro?: boolean
  maxTokens?: number
  temperature?: number
  thinkingLevel?: GeminiThinkingLevel
  /** When true, tier 1 fallback uses DeepSeekJson (JSON-object response_format) */
  jsonMode?: boolean
  /** Gemini-only: forces structured JSON output via responseSchema */
  responseSchema?: Record<string, unknown>
  /** When true and isPro, tier 1 uses Gemini Flash instead of Pro for lower latency */
  preferFlash?: boolean
  /** Optional metric tag — used in [ai-router.metric] log line for grouping by route/locale */
  metricLabel?: string
  /** Optional locale tag forwarded to metric log */
  locale?: string
}

/** Gemini API usageMetadata shape — surfaces via Workers AI Gemini passthrough */
export interface GeminiUsage {
  promptTokenCount?: number
  candidatesTokenCount?: number
  cachedContentTokenCount?: number
  totalTokenCount?: number
}

/** Structured metric line consumed by Logpush. One log per LLM call. */
function emitMetric(payload: {
  model: string
  tier: 'tier1' | 'fallback1' | 'fallback2' | 'fallback3'
  isPro: boolean
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
  totalTokens?: number
  fallbackDepth: number
  metricLabel?: string
  locale?: string
}): void {
  // Single line, JSON-serialised, prefixed for grep/Logpush filter:
  // [ai-router.metric] {"model":"...","tier":"tier1",...}
  console.log('[ai-router.metric]', JSON.stringify(payload))
}

// ==================== Internal ====================

/** Fire-and-forget admin alert on LLM fallback. Never throws. */
async function notifyFallback(
  env: AiRouterEnv,
  from: string,
  to: string,
  error: string
): Promise<void> {
  try {
    await env.SVC_ADMIN_NOTIFY.fetch('http://internal/notify/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[svc-astro] LLM fallback: ${from} → ${to}`,
        message: error.slice(0, 500),
        level: 'warn',
      }),
    })
  } catch {
    // intentional — alert failure must never break the reading pipeline
  }
}

async function callCfAi(
  ai: Ai,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackCallOptions
): Promise<string> {
  let finalSystem = systemPrompt
  if (options?.responseSchema) {
    finalSystem += `\n\nYou must output ONLY valid JSON matching this schema:\n${JSON.stringify(options.responseSchema, null, 2)}\nNo explanations, no markdown code blocks, just the JSON object.`
  } else if (options?.jsonMode) {
    finalSystem += '\n\nYou must output ONLY valid JSON.'
  }

  const result = (await ai.run(
    model as any,
    {
      messages: [
        { role: 'system', content: finalSystem },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    } as any
  )) as { response?: string }

  if (!result.response) {
    throw new Error(`Empty response from ${model}`)
  }

  let text = result.response
  if (options?.responseSchema || options?.jsonMode) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]
  }
  return text
}

async function callCfAiChat(
  ai: Ai,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  options?: Pick<FallbackCallOptions, 'isPro' | 'maxTokens' | 'temperature'>
): Promise<string> {
  const result = (await ai.run(
    model as any,
    {
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    } as any
  )) as { response?: string }

  if (!result.response) {
    throw new Error(`Empty response from ${model}`)
  }
  return result.response
}

/**
 * Gemini native API helper — uses contents/parts format (no @cf/ prefix models).
 * System prompt is prepended to the first user turn (Gemini has no dedicated system role in contents).
 */
async function callGeminiCfAi(
  ai: Ai,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackCallOptions
): Promise<{ text: string; usage?: GeminiUsage }> {
  let finalSystem = systemPrompt
  if (options?.responseSchema) {
    finalSystem += `\n\nYou must output ONLY valid JSON matching this schema:\n${JSON.stringify(options.responseSchema, null, 2)}\nNo explanations, no markdown code blocks, just the JSON object.`
  } else if (options?.jsonMode) {
    finalSystem += '\n\nYou must output ONLY valid JSON.'
  }

  const result = (await ai.run(
    model as any,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${finalSystem}\n\n${userPrompt}` }],
        },
      ],
    } as any
  )) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: GeminiUsage
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Empty response from ${model}`)
  }

  let out = text
  if (options?.responseSchema || options?.jsonMode) {
    const jsonMatch = out.match(/\{[\s\S]*\}/)
    if (jsonMatch) out = jsonMatch[0]
  }
  return { text: out, usage: result.usageMetadata }
}

/**
 * Gemini native chat helper — converts ChatMessage[] to contents/parts format.
 * assistant role maps to 'model' role in Gemini API.
 */
async function callGeminiCfAiChat(
  ai: Ai,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  options?: Pick<FallbackCallOptions, 'isPro' | 'maxTokens' | 'temperature'>
): Promise<{ text: string; usage?: GeminiUsage }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  let systemPrepended = false

  for (const m of messages) {
    const geminiRole = m.role === 'assistant' ? 'model' : m.role
    if (m.role === 'user' && !systemPrepended) {
      contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\n${m.content}` }] })
      systemPrepended = true
    } else {
      contents.push({ role: geminiRole, parts: [{ text: m.content }] })
    }
  }

  if (!systemPrepended) {
    contents.unshift({ role: 'user', parts: [{ text: systemPrompt }] })
  }

  const result = (await ai.run(
    model as any,
    { contents } as any
  )) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: GeminiUsage
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Empty response from ${model}`)
  }
  return { text, usage: result.usageMetadata }
}

// ==================== Public API ====================

/**
 * 剥离推理模型思维链块 — 仅保留最终答案。
 * 适用于所有可能输出 reasoning 块的模型 (Gemini 3.x、DeepSeek R1、Qwen3 thinking、Llama)。
 * 同时清理常见的 reasoning 包裹标签：<think>、<thinking>、<reasoning>，以及未闭合残块。
 * 必须在所有 LLM 出口统一调用，防止 <think> 泄漏到用户可见 UI 或被持久化到 D1。
 */
export function stripThinking(text: string): string {
  let out = text
  // 1. 闭合的推理块
  out = out.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '')
  // 2. 未闭合的开头残块（模型截断或泄漏的开标签 → 丢弃到下一个空行或文本末尾）
  out = out.replace(/<(think|thinking|reasoning)>[\s\S]*$/gi, '')
  // 3. 落单的闭合标签
  out = out.replace(/<\/(think|thinking|reasoning)>/gi, '')
  return out.trim()
}

/**
 * 文本生成容灾路由（fate reading / 一次性 JSON 生成）
 *
 * Pro:  Gemini 3.1 Pro → DeepSeek R1 Qwen 32B → Qwen3 30B → Llama 3.3 Fast
 * Free: Gemini Flash Lite → DeepSeek R1 Qwen 32B → Qwen3 30B → Llama 3.3 Fast
 *
 * DeepSeek R1 是推理模型，需剥离 <think> 块，不用于 chat 场景。
 */
export async function callWithFallback(
  env: AiRouterEnv,
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackCallOptions
): Promise<string> {
  const geminiPro  = 'google/gemini-3.1-pro'
  const geminiFlash = 'google/gemini-3.1-flash'
  const flashLite  = 'google/gemini-3.1-flash-lite'
  const deepseekR1 = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b'
  const qwen3      = '@cf/qwen/qwen3-30b-a3b-fp8'
  const llama33    = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

  const isPro = options?.isPro ?? false
  const preferFlash = options?.preferFlash ?? false
  const startedAt = Date.now()

  // ── Pro Tier 1: Gemini 3.1 Pro (1M context, 中文推理最佳) ──────────────────
  // ── Pro + preferFlash: Gemini 3.1 Flash (低延迟，适用于时间敏感章节) ────────
  // ── Free Tier 1: Gemini Flash Lite (轻量高效，onboarding 足够) ────────────
  const tier1 = isPro ? (preferFlash ? geminiFlash : geminiPro) : flashLite
  try {
    const { text, usage } = await callGeminiCfAi(env.AI, tier1, systemPrompt, userPrompt, options)
    emitMetric({
      model: tier1,
      tier: 'tier1',
      isPro,
      latencyMs: Date.now() - startedAt,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      cachedTokens: usage?.cachedContentTokenCount,
      totalTokens: usage?.totalTokenCount,
      fallbackDepth: 0,
      metricLabel: options?.metricLabel,
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Tier 1 (${tier1}) failed:`, msg)
    void notifyFallback(env, tier1, deepseekR1, msg)
  }

  // ── Fallback 1: DeepSeek R1 distill Qwen 32B (中文强，需剥离 <think>) ─────
  try {
    const raw = await callCfAi(env.AI, deepseekR1, systemPrompt, userPrompt, options)
    emitMetric({
      model: deepseekR1,
      tier: 'fallback1',
      isPro,
      latencyMs: Date.now() - startedAt,
      fallbackDepth: 1,
      metricLabel: options?.metricLabel,
      locale: options?.locale,
    })
    return stripThinking(raw)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Fallback 1 (${deepseekR1}) failed:`, msg)
    void notifyFallback(env, deepseekR1, qwen3, msg)
  }

  // ── Fallback 2: Qwen3 30B MoE (中文最佳 Hosted，可能输出 thinking 块) ──────
  try {
    const text = await callCfAi(env.AI, qwen3, systemPrompt, userPrompt, options)
    emitMetric({
      model: qwen3,
      tier: 'fallback2',
      isPro,
      latencyMs: Date.now() - startedAt,
      fallbackDepth: 2,
      metricLabel: options?.metricLabel,
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Fallback 2 (${qwen3}) failed:`, msg)
    void notifyFallback(env, qwen3, llama33, msg)
  }

  // ── Fallback 3: Llama 3.3 70B Fast (最终兜底) ─────────────────────────────
  try {
    const text = await callCfAi(env.AI, llama33, systemPrompt, userPrompt, options)
    emitMetric({
      model: llama33,
      tier: 'fallback3',
      isPro,
      latencyMs: Date.now() - startedAt,
      fallbackDepth: 3,
      metricLabel: options?.metricLabel,
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Fallback 3 (${llama33}) failed:`, msg)
    void notifyFallback(env, llama33, 'NONE', msg)
    throw new Error(`[ai-router] All LLM tiers failed. Last error: ${msg}`)
  }
}

/**
 * 多轮对话容灾路由 — /chat 端点追问场景
 *
 * 注意：不使用 DeepSeek R1（推理模型的 <think> 块在对话中破坏 UX）
 *
 * Pro:  Gemini 3.1 Pro → Gemini Flash Lite → Qwen3 30B
 * Free: Gemini Flash Lite → Qwen3 30B → Llama 3.3 Fast
 */
export async function callChatWithFallback(
  env: AiRouterEnv,
  systemPrompt: string,
  messages: ChatMessage[],
  options?: Pick<FallbackCallOptions, 'isPro' | 'maxTokens' | 'temperature'> & {
    metricLabel?: string
    locale?: string
  }
): Promise<string> {
  const geminiPro = 'google/gemini-3.1-pro'
  const flashLite = 'google/gemini-3.1-flash-lite'
  const qwen3     = '@cf/qwen/qwen3-30b-a3b-fp8'
  const llama33   = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

  const isPro = options?.isPro ?? false
  const startedAt = Date.now()

  // ── Tier 1: Gemini 3.1 Pro (Pro) / Flash Lite (Free) ─────────────────────
  const tier1 = isPro ? geminiPro : flashLite
  try {
    const { text, usage } = await callGeminiCfAiChat(env.AI, tier1, systemPrompt, messages, options)
    emitMetric({
      model: tier1,
      tier: 'tier1',
      isPro,
      latencyMs: Date.now() - startedAt,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      cachedTokens: usage?.cachedContentTokenCount,
      totalTokens: usage?.totalTokenCount,
      fallbackDepth: 0,
      metricLabel: options?.metricLabel ?? 'chat',
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Chat Tier 1 (${tier1}) failed:`, msg)
    void notifyFallback(env, tier1, isPro ? flashLite : qwen3, msg)
  }

  // ── Pro Tier 2 / Free fallback: Gemini Flash Lite (Pro) / Qwen3 30B (Free) ─
  if (isPro) {
    try {
      const { text, usage } = await callGeminiCfAiChat(env.AI, flashLite, systemPrompt, messages, options)
      emitMetric({
        model: flashLite,
        tier: 'fallback1',
        isPro,
        latencyMs: Date.now() - startedAt,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        cachedTokens: usage?.cachedContentTokenCount,
        totalTokens: usage?.totalTokenCount,
        fallbackDepth: 1,
        metricLabel: options?.metricLabel ?? 'chat',
        locale: options?.locale,
      })
      return stripThinking(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[ai-router] Chat Tier 2 (${flashLite}) failed:`, msg)
      void notifyFallback(env, flashLite, qwen3, msg)
    }
  }

  // ── Qwen3 30B MoE — 中文最佳 Hosted，OpenAI messages 格式 ────────────────
  try {
    const text = await callCfAiChat(env.AI, qwen3, systemPrompt, messages, options)
    emitMetric({
      model: qwen3,
      tier: isPro ? 'fallback2' : 'fallback1',
      isPro,
      latencyMs: Date.now() - startedAt,
      fallbackDepth: isPro ? 2 : 1,
      metricLabel: options?.metricLabel ?? 'chat',
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ai-router] Chat Qwen3 (${qwen3}) failed:`, msg)
    void notifyFallback(env, qwen3, llama33, msg)
  }

  // ── Llama 3.3 Fast (最终兜底，Free 专用) ─────────────────────────────────
  try {
    const text = await callCfAiChat(env.AI, llama33, systemPrompt, messages, options)
    emitMetric({
      model: llama33,
      tier: isPro ? 'fallback3' : 'fallback2',
      isPro,
      latencyMs: Date.now() - startedAt,
      fallbackDepth: isPro ? 3 : 2,
      metricLabel: options?.metricLabel ?? 'chat',
      locale: options?.locale,
    })
    return stripThinking(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`[ai-router] All chat LLM tiers failed. Last error: ${msg}`)
  }
}
