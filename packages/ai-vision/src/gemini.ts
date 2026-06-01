/**
 * Gemini Vision client — shared infrastructure for all HexAstral vision pipelines.
 *
 * Wraps `@google/genai` SDK with:
 *   - Multi-image support (feng-shui needs 3 satellite scales, face-oracle
 *     needs 1 face image)
 *   - Structured JSON output via responseSchema
 *   - Text generation (for downstream synthesis stages)
 *
 * Model: `gemini-3.1-pro-preview` — matches svc-astro convention. Override
 * via the `model` option per-call if needed (e.g., to A/B against flash for
 * cost-sensitive paths).
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { withGeminiTiming } from './log'

export type GeminiThinkingLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL'

const DEFAULT_MODEL = 'gemini-3.1-pro-preview'

function resolveThinkingLevel(level: GeminiThinkingLevel | undefined): ThinkingLevel {
  switch (level) {
    case 'HIGH':
      return ThinkingLevel.HIGH
    case 'LOW':
      return ThinkingLevel.LOW
    case 'MINIMAL':
      return ThinkingLevel.MINIMAL
    default:
      return ThinkingLevel.MEDIUM
  }
}

export interface VisionImage {
  base64: string
  mimeType?: string
}

export interface CallGeminiVisionOptions {
  systemPrompt: string
  userPrompt: string
  imageBase64: string
  mimeType?: string
  /** Override the default model (e.g. flash for cost-sensitive describe steps). */
  model?: string
  maxOutputTokens?: number
  temperature?: number
  thinkingLevel?: GeminiThinkingLevel
}

/**
 * Single-image free-text vision call. Used by svc-astro physiognomy describe
 * stage (face/palm narrative before structured interpretation).
 */
export async function callGeminiVision(
  apiKey: string,
  opts: CallGeminiVisionOptions
): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL
  return withGeminiTiming('vision', { model, imageCount: 1 }, async () => {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model,
      config: {
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        temperature: opts.temperature ?? 1.0,
        systemInstruction: opts.systemPrompt,
        thinkingConfig: { thinkingLevel: resolveThinkingLevel(opts.thinkingLevel) },
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: opts.userPrompt },
            {
              inlineData: {
                data: opts.imageBase64,
                mimeType: opts.mimeType ?? 'image/jpeg',
              },
            },
          ],
        },
      ],
    })
    return response.text ?? ''
  })
}

export interface CallGeminiVisionStructuredOptions {
  systemPrompt: string
  userPrompt: string
  images: VisionImage[]
  responseSchema: object
  /** Override the default model. */
  model?: string
  maxOutputTokens?: number
  temperature?: number
  thinkingLevel?: GeminiThinkingLevel
}

/**
 * Multi-image structured-output call. Returns parsed JSON conforming to the
 * provided schema; callers should still Zod-validate (use `withZodRetry` in
 * `retry.ts`) since Gemini occasionally returns malformed JSON.
 */
export async function callGeminiVisionStructured<T>(
  apiKey: string,
  opts: CallGeminiVisionStructuredOptions
): Promise<T> {
  const model = opts.model ?? DEFAULT_MODEL
  return withGeminiTiming(
    'vision-structured',
    { model, imageCount: opts.images.length, structured: true },
    async () => {
      const ai = new GoogleGenAI({ apiKey })
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
        [{ text: opts.userPrompt }]
      for (const img of opts.images) {
        parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType ?? 'image/png' } })
      }
      const response = await ai.models.generateContent({
        model,
        config: {
          maxOutputTokens: opts.maxOutputTokens ?? 4096,
          temperature: opts.temperature ?? 0.2,
          systemInstruction: opts.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: opts.responseSchema,
          thinkingConfig: { thinkingLevel: resolveThinkingLevel(opts.thinkingLevel) },
        },
        contents: [{ role: 'user', parts }],
      })
      const text = response.text ?? '{}'
      return JSON.parse(text) as T
    }
  )
}

export interface CallGeminiTextOptions {
  systemPrompt: string
  userPrompt: string
  responseSchema?: object
  model?: string
  maxOutputTokens?: number
  temperature?: number
  thinkingLevel?: GeminiThinkingLevel
}

/**
 * Text generation. Used by synthesis stages (Stage 3 of the feng-shui pipeline,
 * post-vision text composition in face-oracle, etc.).
 *
 * If `responseSchema` is provided, output is constrained to JSON; otherwise
 * returns free text.
 */
export async function callGeminiText(apiKey: string, opts: CallGeminiTextOptions): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL
  return withGeminiTiming('text', { model, structured: !!opts.responseSchema }, async () => {
    const ai = new GoogleGenAI({ apiKey })
    const config: Record<string, unknown> = {
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      temperature: opts.temperature ?? 0.7,
      systemInstruction: opts.systemPrompt,
      thinkingConfig: { thinkingLevel: resolveThinkingLevel(opts.thinkingLevel) },
    }
    if (opts.responseSchema) {
      config.responseMimeType = 'application/json'
      config.responseSchema = opts.responseSchema
    }
    const response = await ai.models.generateContent({
      model,
      config,
      contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
    })
    return response.text ?? ''
  })
}
