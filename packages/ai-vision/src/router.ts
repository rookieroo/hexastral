/**
 * LLM Router — 玄学矩阵统一文本/对话路由（Cloudflare Workers AI only）
 *
 * 设计原则（ADR: 统一高质量 LLM 基座）:
 *   - 所有「文本生成 + 多轮对话」走同一组 Cloudflare-hosted 模型，杜绝跨服务漂移。
 *   - Gemini 仅保留在 VLM 场景（看图 → 文字），见同包 `./gemini`。
 *   - 模型按「任务复杂度」分层，而非按业务场景或用户等级：
 *       flagship —— readings / reports / 合婚 / feng synthesis / Pro chat（产品本身，质量第一）
 *       standard —— explain / signal / preview / Free-taste chat（短输出 + 轻推理，控成本）
 *
 * 模型选型（中文优先，CF Workers AI catalog）:
 *   - Kimi K2.6 (1T MoE) —— C-Eval 92.5 / CMMLU 90.9，已公布的最强中文，复杂任务主力。
 *   - Qwen3 30B A3B (MoE) —— 性价比最高的中文 hosted 模型，通用主力 + 简单任务 Tier 1。
 *   - GLM-4.7-Flash (智谱) —— 中文原生、131k context、超低价，最终兜底。
 *
 * 已淘汰: google/gemini-*（性价比不及 Kimi）、deepseek-r1-distill（thinking 块破坏 chat、无 func call）、
 *         llama-3.3-70b（中文非官方支持）、gpt-oss-120b（C-Eval 20%，中文不可用）。
 *
 * API 格式: 全部 `@cf/` 模型使用 OpenAI messages 格式（ai.run）。
 *
 * Workers AI catalog: https://developers.cloudflare.com/workers-ai/models/
 */

// ==================== Models ====================

export const LLM_MODELS = {
  /** 复杂任务主力 — C-Eval 92.5, 262k ctx, func call + guided_json */
  KIMI: '@cf/moonshotai/kimi-k2.6',
  /** 通用主力 + 简单任务 Tier 1 — 中文性价比最高, 32k ctx */
  QWEN3: '@cf/qwen/qwen3-30b-a3b-fp8',
  /** 最终兜底 — 智谱, 中文原生, 131k ctx, 超低价 */
  GLM: '@cf/zai-org/glm-4.7-flash',
  /**
   * Non-zh output lead. Kimi/Qwen3/GLM are all China-trained and, against a
   * Chinese-heavy 命理 prompt, ignore an explicit "output in English / 日本語"
   * directive and drift back to Chinese (confirmed in prod: an en 合盘 report came
   * back ~87% CJK). Llama 3.3 reliably honors the requested output language; the
   * fp8-fast build keeps it inside the parallel-chapter latency budget.
   */
  LLAMA: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
} as const

/**
 * Output-language routing. For a non-zh locale, lead with {@link LLM_MODELS.LLAMA}
 * (reliable output-language adherence) and keep the China stack behind it as a
 * reliability fallback. zh (and an absent locale) keep the original chain verbatim.
 */
function leadForLocale(baseChain: readonly string[], locale?: string): string[] {
  if (locale && !locale.toLowerCase().startsWith('zh')) {
    return [LLM_MODELS.LLAMA, ...baseChain]
  }
  return [...baseChain]
}

/** flagship: Kimi → Qwen3 → GLM. standard: Qwen3 → GLM. */
export type RoutingTier = 'flagship' | 'standard'

// ==================== Types ====================

/** Chat turn shape — structurally compatible with svc-astro's ChatMessage. */
export type ChatMessage = {
  role: 'user' | 'model' | 'system' | 'assistant'
  content: string
}

/**
 * Minimal structural shape of the Cloudflare Workers AI binding the router uses.
 *
 * Declared structurally (NOT via the `Ai` global from `@cloudflare/workers-types`)
 * so this shared package is robust to consuming workers compiling under different
 * tsconfig `lib` settings: the full `Ai` type transitively drags in `AbortSignal`
 * / `Event`, whose ambient resolution (DOM lib vs workers-types) differs per worker
 * and otherwise makes `Env` non-assignable across services. The router only ever
 * calls `.run(...)` and reads `.response`, so `run` is all we need.
 */
export interface WorkersAiBinding {
  // Workers AI `run` has model-specific overloads; we keep the binding structural
  // (only `.response` is read) so consumers' real `Ai` stays assignable regardless
  // of their tsconfig `lib`. `noExplicitAny` is disabled repo-wide (biome.json).
  run(model: any, inputs: any, options?: any): Promise<any>
}

/**
 * Minimal env the router needs. `AI` is the Cloudflare Workers AI binding.
 * `SVC_ADMIN_NOTIFY` is optional — only svc-astro has the admin-notify binding;
 * svc-feng calls the router without it (fallback alerts silently skipped).
 */
export interface LlmRouterEnv {
  AI: WorkersAiBinding
  SVC_ADMIN_NOTIFY?: Fetcher
}

export interface FallbackCallOptions {
  /**
   * Routing tier (default `'flagship'`).
   * `'flagship'` (Kimi → Qwen3 → GLM) for readings/reports/合婚/feng synthesis.
   * `'standard'` (Qwen3 → GLM) for short explain/signal/preview.
   */
  tier?: RoutingTier
  /** Retained for metric tagging only — no longer selects the model in generation. */
  isPro?: boolean
  maxTokens?: number
  temperature?: number
  /** When true, instruct the model to emit ONLY a JSON object (extracted post-hoc). */
  jsonMode?: boolean
  /**
   * Append the `/no_think` soft switch to the user turn. Qwen-template models
   * (our Qwen3 Tier-1) skip the chain-of-thought, which is the right default for
   * SHORT structured tasks (explain / makeif-narrate): reasoning there only burns
   * the token budget and — at low `maxTokens` — can starve the answer to empty.
   * Harmless to models that don't recognize it (GLM ignores it; give those token
   * headroom instead).
   */
  noThink?: boolean
  /** Forces structured JSON output via a schema instruction injected into the system prompt. */
  responseSchema?: Record<string, unknown>
  /** Optional metric tag — grouped in the [llm-router.metric] log line. */
  metricLabel?: string
  /** Optional locale tag forwarded to the metric log. */
  locale?: string
  /**
   * Override the whole-chain wall-clock budget (default {@link TOTAL_BUDGET_MS} = 48s,
   * tuned to sit under svc-astro's 55s caller). Heavy NON-interactive callers running
   * in a queue consumer (e.g. feng's 6-chapter/16k-token synthesis) can raise this —
   * but it MUST stay below that caller's own outer AbortSignal timeout, or the caller
   * aborts mid-cascade. Only set this when the caller's timeout is correspondingly large.
   */
  totalBudgetMs?: number
  /** Override the per-model cap (default {@link PER_MODEL_TIMEOUT_MS} = 24s). Pairs with `totalBudgetMs`. */
  perModelTimeoutMs?: number
  /**
   * @deprecated Gemini-only thinking budget — IGNORED by the CF router.
   * Retained as a no-op so existing callers compile; depth is now expressed via `tier`
   * (deep tasks default to `'flagship'`). Safe to drop in a later sweep.
   */
  thinkingLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL'
  /**
   * @deprecated Gemini Pro-vs-Flash hint — IGNORED by the CF router (flagship Tier 1 is always Kimi).
   * Retained as a no-op so existing callers compile. Safe to drop in a later sweep.
   */
  preferFlash?: boolean
}

export type ChatCallOptions = Pick<
  FallbackCallOptions,
  'isPro' | 'maxTokens' | 'temperature' | 'metricLabel' | 'locale' | 'noThink'
>

// ==================== Metrics ====================

/** Structured metric line consumed by Logpush. One log per LLM call. */
function emitMetric(payload: {
  model: string
  tier: 'tier1' | 'fallback1' | 'fallback2'
  routingTier: RoutingTier
  isPro: boolean
  latencyMs: number
  fallbackDepth: number
  metricLabel?: string
  locale?: string
}): void {
  // [llm-router.metric] {"model":"@cf/...","tier":"tier1",...}
  console.log('[llm-router.metric]', JSON.stringify(payload))
}

/** Fire-and-forget admin alert on LLM fallback. Never throws. No-op without binding. */
async function notifyFallback(
  env: LlmRouterEnv,
  from: string,
  to: string,
  error: string
): Promise<void> {
  if (!env.SVC_ADMIN_NOTIFY) return
  try {
    await env.SVC_ADMIN_NOTIFY.fetch('http://internal/notify/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[llm-router] LLM fallback: ${from} → ${to}`,
        message: error.slice(0, 500),
        level: 'warn',
      }),
    })
  } catch {
    // intentional — alert failure must never break the reading pipeline
  }
}

// ==================== Reasoning-block stripping ====================

/**
 * 剥离推理模型思维链块 — 仅保留最终答案。
 * Kimi / Qwen3 等在 thinking 模式下可能输出 <think>/<thinking>/<reasoning> 包裹块。
 * 必须在所有 LLM 出口统一调用，防止泄漏到用户可见 UI 或被持久化到 D1。
 */
export function stripThinking(text: string): string {
  let out = text
  // 1. 闭合的推理块
  out = out.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, '')
  // 2. 未闭合的开头残块
  out = out.replace(/<(think|thinking|reasoning)>[\s\S]*$/gi, '')
  // 3. 落单的闭合标签
  out = out.replace(/<\/(think|thinking|reasoning)>/gi, '')
  return out.trim()
}

// ==================== CF Workers AI calls (OpenAI messages format) ====================

/**
 * Extract the assistant text from a Workers AI `ai.run` result, tolerant of BOTH
 * response shapes the catalog now mixes:
 *   - NEW OpenAI chat-completion shape (Kimi / Qwen3 / GLM and the 2025+ models):
 *       `result.choices[0].message.content`. Reasoning models keep their chain in a
 *       SEPARATE `message.reasoning_content` / `message.reasoning` field, so
 *       `.content` is already free of <think> blocks.
 *   - LEGACY Workers AI text shape: top-level `result.response`.
 * Returns '' when neither yields a non-empty string (caller treats '' as a failure
 * and falls through to the next model). This is the fix for the 2025-Q2 catalog
 * migration that silently broke every `.response`-only reader.
 */
function extractAiText(result: unknown): string {
  const r = result as {
    choices?: Array<{ message?: { content?: unknown } }>
    response?: unknown
  } | null
  const fromChoices = r?.choices?.[0]?.message?.content
  if (typeof fromChoices === 'string' && fromChoices) return fromChoices
  return typeof r?.response === 'string' ? r.response : ''
}

/**
 * Per-model wall-clock budget. The router cascades on ERRORS, but `ai.run` has no
 * timeout of its own — so a SLOW (non-erroring) model would block until the
 * CALLER's outer timeout (svc-astro waits 55s) and the faster fallbacks
 * (Qwen3/GLM) would never run → a 504. Capping each model and treating a timeout
 * as a failure makes slowness cascade. Sized so two fallbacks still fit a ~55s
 * caller budget (24 + 24 + flash leaves headroom).
 */
const PER_MODEL_TIMEOUT_MS = 24_000

/**
 * Chat is INTERACTIVE — a user is staring at "Thinking…", so a stalled model
 * must cascade sooner than for a batch reading. 18s per model keeps the whole
 * chain (3 flagship tiers) under ~40s wall-clock, comfortably inside the
 * client's 45s abort, instead of the 24×3 ≈ 72s that read as "hang then die".
 */
const CHAT_PER_MODEL_TIMEOUT_MS = 18_000

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    work.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Whole-chain wall-clock budgets — kept UNDER the caller's outer timeout so the
 * caller never times out MID-cascade (which surfaces as a 504). The bug this fixes:
 * the flagship chain is THREE models, so PER_MODEL_TIMEOUT_MS × 3 = 72s blew past
 * svc-astro's 55s `callAstro` budget — when KIMI + QWEN3 were both slow, GLM never
 * finished and every report chapter 504'd. We now give each remaining model an EQUAL
 * share of the time LEFT (capped at the per-model ceiling), so the serial chain fits
 * the budget and a slow tier-1 model can't starve the reliable last fallback.
 *   - report/reading budget < svc-astro's 55s caller timeout (astro-client.ts)
 *   - chat budget < the client's ~45s abort (apps' chat fetch)
 */
const TOTAL_BUDGET_MS = 48_000
const CHAT_TOTAL_BUDGET_MS = 40_000
/** Below this, a model can't produce anything useful — stop cascading, fail clean. */
const MIN_MODEL_SLOT_MS = 5_000

/** Per-model timeout = min(per-model cap, equal split of the remaining budget). */
function modelSlotMs(
  totalBudgetMs: number,
  startedAt: number,
  modelsLeft: number,
  perModelCap: number
): number {
  const remaining = totalBudgetMs - (Date.now() - startedAt)
  return Math.min(perModelCap, Math.floor(remaining / Math.max(1, modelsLeft)))
}

async function callCfAi(
  ai: WorkersAiBinding,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackCallOptions,
  timeoutMs: number = PER_MODEL_TIMEOUT_MS
): Promise<string> {
  let finalSystem = systemPrompt
  if (options?.responseSchema) {
    finalSystem += `\n\nYou must output ONLY valid JSON matching this schema:\n${JSON.stringify(options.responseSchema, null, 2)}\nNo explanations, no markdown code blocks, just the JSON object.`
  } else if (options?.jsonMode) {
    finalSystem += '\n\nYou must output ONLY valid JSON.'
  }
  const finalUser = options?.noThink ? `${userPrompt}\n\n/no_think` : userPrompt

  const result = await withTimeout(
    ai.run(model, {
      messages: [
        { role: 'system', content: finalSystem },
        { role: 'user', content: finalUser },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    }),
    timeoutMs,
    model
  )

  let text = extractAiText(result)
  if (!text) {
    throw new Error(`Empty response from ${model}`)
  }

  if (options?.responseSchema || options?.jsonMode) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]
  }
  return text
}

/** Map our ChatMessage roles to the OpenAI messages format CF expects ('model' → 'assistant'). */
function toCfRole(role: ChatMessage['role']): 'system' | 'user' | 'assistant' {
  return role === 'model' ? 'assistant' : role
}

async function callCfAiChat(
  ai: WorkersAiBinding,
  model: string,
  systemPrompt: string,
  messages: readonly ChatMessage[],
  options?: ChatCallOptions,
  timeoutMs: number = CHAT_PER_MODEL_TIMEOUT_MS
): Promise<string> {
  const cfMessages = messages.map((m) => ({ role: toCfRole(m.role), content: m.content }))
  // Suppress the qwen3 <think> chain on the final user turn. In chat the budget is
  // small (512 for free) — without this, qwen3 spends it ALL on reasoning and
  // returns EMPTY content (→ "Empty response", chat fails). /no_think puts the
  // reply straight into content; GLM/non-qwen models ignore the token harmlessly.
  if (options?.noThink && cfMessages.length > 0) {
    const last = cfMessages[cfMessages.length - 1]
    if (last) last.content = `${last.content}\n\n/no_think`
  }
  const result = await withTimeout(
    ai.run(model, {
      messages: [{ role: 'system', content: systemPrompt }, ...cfMessages],
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    }),
    timeoutMs,
    model
  )

  const text = extractAiText(result)
  if (!text) {
    throw new Error(`Empty response from ${model}`)
  }
  return text
}

// ==================== Public API ====================

/**
 * 文本生成容灾路由（readings / reports / explain / 一次性 JSON 生成）。
 *
 *   flagship (默认): Kimi K2.6 → Qwen3 30B → GLM-4.7-Flash
 *   standard:        Qwen3 30B → GLM-4.7-Flash
 *
 * 调用方按任务复杂度传 `tier`；不传则默认 flagship（质量优先）。
 */
export async function callWithFallback(
  env: LlmRouterEnv,
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackCallOptions
): Promise<string> {
  const routingTier: RoutingTier = options?.tier ?? 'flagship'
  const isPro = options?.isPro ?? false
  const startedAt = Date.now()
  const totalBudgetMs = options?.totalBudgetMs ?? TOTAL_BUDGET_MS
  const perModelCapMs = options?.perModelTimeoutMs ?? PER_MODEL_TIMEOUT_MS

  // flagship 多一个 Kimi 头部；standard 从 Qwen3 起。Non-zh leads with Llama (see leadForLocale).
  const baseChain =
    routingTier === 'flagship'
      ? [LLM_MODELS.KIMI, LLM_MODELS.QWEN3, LLM_MODELS.GLM]
      : [LLM_MODELS.QWEN3, LLM_MODELS.GLM]
  const chain = leadForLocale(baseChain, options?.locale)

  let lastError = ''
  for (let depth = 0; depth < chain.length; depth++) {
    const model = chain[depth] as string
    const slotMs = modelSlotMs(totalBudgetMs, startedAt, chain.length - depth, perModelCapMs)
    // No usable time left before the caller's outer timeout — stop cascading and
    // throw a clean error rather than starting a model that will 504 the API.
    if (slotMs < MIN_MODEL_SLOT_MS) {
      lastError = lastError || `budget exhausted before ${model}`
      break
    }
    try {
      const text = await callCfAi(env.AI, model, systemPrompt, userPrompt, options, slotMs)
      emitMetric({
        model,
        tier: depth === 0 ? 'tier1' : depth === 1 ? 'fallback1' : 'fallback2',
        routingTier,
        isPro,
        latencyMs: Date.now() - startedAt,
        fallbackDepth: depth,
        metricLabel: options?.metricLabel,
        locale: options?.locale,
      })
      return stripThinking(text)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      const next = chain[depth + 1] ?? 'NONE'
      console.error(`[llm-router] ${model} failed (depth ${depth}):`, lastError)
      void notifyFallback(env, model, next, lastError)
    }
  }

  throw new Error(`[llm-router] All LLM tiers failed. Last error: ${lastError}`)
}

/**
 * 多轮对话容灾路由（/chat 追问）。
 *
 *   Pro (isPro):  Kimi K2.6 → Qwen3 30B → GLM-4.7-Flash   (flagship — 付费用户感知质量)
 *   Free:         Qwen3 30B → GLM-4.7-Flash                (standard — taste 钩子够用)
 *
 * 不使用 reasoning 模型 —— thinking 链在对话中破坏 UX（stripThinking 仍兜底）。
 */
export async function callChatWithFallback(
  env: LlmRouterEnv,
  systemPrompt: string,
  messages: readonly ChatMessage[],
  options?: ChatCallOptions
): Promise<string> {
  const isPro = options?.isPro ?? false
  const routingTier: RoutingTier = isPro ? 'flagship' : 'standard'
  const startedAt = Date.now()

  const baseChain = isPro
    ? [LLM_MODELS.KIMI, LLM_MODELS.QWEN3, LLM_MODELS.GLM]
    : [LLM_MODELS.QWEN3, LLM_MODELS.GLM]
  const chain = leadForLocale(baseChain, options?.locale)

  let lastError = ''
  for (let depth = 0; depth < chain.length; depth++) {
    const model = chain[depth] as string
    const slotMs = modelSlotMs(
      CHAT_TOTAL_BUDGET_MS,
      startedAt,
      chain.length - depth,
      CHAT_PER_MODEL_TIMEOUT_MS
    )
    if (slotMs < MIN_MODEL_SLOT_MS) {
      lastError = lastError || `budget exhausted before ${model}`
      break
    }
    try {
      const text = await callCfAiChat(env.AI, model, systemPrompt, messages, options, slotMs)
      emitMetric({
        model,
        tier: depth === 0 ? 'tier1' : depth === 1 ? 'fallback1' : 'fallback2',
        routingTier,
        isPro,
        latencyMs: Date.now() - startedAt,
        fallbackDepth: depth,
        metricLabel: options?.metricLabel ?? 'chat',
        locale: options?.locale,
      })
      return stripThinking(text)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      const next = chain[depth + 1] ?? 'NONE'
      console.error(`[llm-router] chat ${model} failed (depth ${depth}):`, lastError)
      void notifyFallback(env, model, next, lastError)
    }
  }

  throw new Error(`[llm-router] All chat LLM tiers failed. Last error: ${lastError}`)
}
