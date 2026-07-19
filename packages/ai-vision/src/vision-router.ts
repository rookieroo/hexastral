/**
 * Vision router — structured image → JSON cascade for physiognomy extract.
 *
 * Primary: CF Kimi K2.6 (vision + Chinese). Fallbacks: Gemini Flash, Llama 3.2 vision.
 * Keeps ADR-0028: pixels → feature JSON only; reading LLM stays text-only.
 */

import {
  callGeminiVisionStructured,
  normalizeImageBase64,
  type GeminiThinkingLevel,
  type VisionImage,
} from './gemini'
import { stripThinking, type WorkersAiBinding } from './router'

export const VLM_MODELS = {
  KIMI: '@cf/moonshotai/kimi-k2.6',
  GEMINI_FLASH: 'gemini-3-flash-preview',
  LLAMA_VISION: '@cf/meta/llama-3.2-11b-vision-instruct',
} as const

/** Cascade label mixed into content-hash (not the concrete winning model). */
export const VLM_CASCADE_ID = 'vlm-cascade-v1'

export interface VisionRouterEnv {
  AI: WorkersAiBinding
  /** Optional — Gemini tier skipped when absent. */
  GEMINI_API_KEY?: string
}

export interface VisionStructuredOptions {
  systemPrompt: string
  userPrompt: string
  images: VisionImage[]
  responseSchema: Record<string, unknown>
  maxOutputTokens?: number
  temperature?: number
  metricLabel?: string
  geminiThinkingLevel?: GeminiThinkingLevel
}

export interface VisionStructuredResult<T> {
  data: T
  model: string
  fallbackDepth: number
}

const KIMI_TIMEOUT_MS = 40_000
const GEMINI_TIMEOUT_MS = 25_000
const LLAMA_TIMEOUT_MS = 25_000

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

function extractAiText(result: unknown): string {
  const r = result as {
    choices?: Array<{ message?: { content?: unknown } }>
    response?: unknown
  } | null
  const fromChoices = r?.choices?.[0]?.message?.content
  if (typeof fromChoices === 'string' && fromChoices) return fromChoices
  return typeof r?.response === 'string' ? r.response : ''
}

function parseJsonObject<T>(raw: string): T {
  const text = stripThinking(raw)
  try {
    return JSON.parse(text) as T
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T
    }
    throw new Error(`vlm_invalid_json:${text.slice(0, 120)}`)
  }
}

function schemaInstruction(schema: Record<string, unknown>): string {
  return `\n\nYou must output ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\nNo explanations, no markdown code blocks, just the JSON object.`
}

function toDataUri(img: VisionImage): string {
  const b64 = normalizeImageBase64(img.base64)
  const mime = img.mimeType ?? 'image/jpeg'
  return `data:${mime};base64,${b64}`
}

function emitMetric(payload: {
  model: string
  fallbackDepth: number
  latencyMs: number
  metricLabel?: string
}): void {
  console.log('[vlm-router.metric]', JSON.stringify(payload))
}

async function callCfVisionJson(
  ai: WorkersAiBinding,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  images: VisionImage[],
  responseSchema: Record<string, unknown>,
  opts: { maxTokens: number; temperature: number; timeoutMs: number; thinkingOff?: boolean }
): Promise<string> {
  const finalSystem = systemPrompt + schemaInstruction(responseSchema)
  const content: Array<
    { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: userPrompt }]
  for (const img of images) {
    content.push({ type: 'image_url', image_url: { url: toDataUri(img) } })
  }

  const inputs: Record<string, unknown> = {
    messages: [
      { role: 'system', content: finalSystem },
      { role: 'user', content },
    ],
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
  }
  if (opts.thinkingOff) {
    inputs.chat_template_kwargs = { thinking: false }
  }

  const result = await withTimeout(ai.run(model, inputs), opts.timeoutMs, model)
  const text = extractAiText(result)
  if (!text) throw new Error(`Empty vision response from ${model}`)
  return text
}

/**
 * Structured vision cascade: Kimi (CF) → Gemini Flash → Llama 3.2 vision (CF).
 */
export async function callVisionStructuredWithFallback<T extends object>(
  env: VisionRouterEnv,
  opts: VisionStructuredOptions
): Promise<VisionStructuredResult<T>> {
  const startedAt = Date.now()
  const maxTokens = opts.maxOutputTokens ?? 1024
  const temperature = opts.temperature ?? 0.2
  const errors: string[] = []

  // Tier 1 — Kimi
  try {
    const raw = await callCfVisionJson(
      env.AI,
      VLM_MODELS.KIMI,
      opts.systemPrompt,
      opts.userPrompt,
      opts.images,
      opts.responseSchema,
      {
        maxTokens,
        temperature,
        timeoutMs: KIMI_TIMEOUT_MS,
        thinkingOff: true,
      }
    )
    const data = parseJsonObject<T>(raw)
    emitMetric({
      model: VLM_MODELS.KIMI,
      fallbackDepth: 0,
      latencyMs: Date.now() - startedAt,
      metricLabel: opts.metricLabel,
    })
    return { data, model: VLM_MODELS.KIMI, fallbackDepth: 0 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`kimi:${msg}`)
    console.error('[vlm-router] kimi failed:', msg.slice(0, 300))
  }

  // Tier 2 — Gemini Flash
  const geminiKey = env.GEMINI_API_KEY?.trim()
  if (geminiKey) {
    try {
      const data = await withTimeout(
        callGeminiVisionStructured<T>(geminiKey, {
          systemPrompt: opts.systemPrompt,
          userPrompt: opts.userPrompt,
          images: opts.images,
          responseSchema: opts.responseSchema,
          model: VLM_MODELS.GEMINI_FLASH,
          maxOutputTokens: maxTokens,
          temperature,
          thinkingLevel: opts.geminiThinkingLevel ?? 'MINIMAL',
        }),
        GEMINI_TIMEOUT_MS,
        VLM_MODELS.GEMINI_FLASH
      )
      emitMetric({
        model: VLM_MODELS.GEMINI_FLASH,
        fallbackDepth: 1,
        latencyMs: Date.now() - startedAt,
        metricLabel: opts.metricLabel,
      })
      return { data, model: VLM_MODELS.GEMINI_FLASH, fallbackDepth: 1 }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`gemini:${msg}`)
      console.error('[vlm-router] gemini failed:', msg.slice(0, 300))
    }
  } else {
    errors.push('gemini:skipped_no_key')
  }

  // Tier 3 — Llama 3.2 vision
  try {
    const raw = await callCfVisionJson(
      env.AI,
      VLM_MODELS.LLAMA_VISION,
      opts.systemPrompt,
      opts.userPrompt,
      opts.images,
      opts.responseSchema,
      {
        maxTokens,
        temperature,
        timeoutMs: LLAMA_TIMEOUT_MS,
      }
    )
    const data = parseJsonObject<T>(raw)
    emitMetric({
      model: VLM_MODELS.LLAMA_VISION,
      fallbackDepth: 2,
      latencyMs: Date.now() - startedAt,
      metricLabel: opts.metricLabel,
    })
    return { data, model: VLM_MODELS.LLAMA_VISION, fallbackDepth: 2 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`llama:${msg}`)
    console.error('[vlm-router] llama failed:', msg.slice(0, 300))
  }

  throw new Error(`[vlm-router] All vision tiers failed. ${errors.join(' | ')}`)
}
