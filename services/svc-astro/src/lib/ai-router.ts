/**
 * AI Router — svc-astro adapter over the shared `@zhop/ai-vision/router`.
 *
 * The model-routing policy (Kimi → Qwen3 → GLM, CF Workers AI only) is shared
 * across the whole 玄学 matrix so svc-astro and svc-feng never drift. This file
 * only adds svc-astro's env shape (it additionally carries `GEMINI_API_KEY` for
 * the VLM physiognomy describe stage, and always has `SVC_ADMIN_NOTIFY`).
 *
 * Text/chat → CF Workers AI (here). Image → text → Gemini Vision (`@zhop/ai-vision/gemini`).
 */

import type { LlmRouterEnv } from '@zhop/ai-vision/router'

export {
  type ChatCallOptions,
  type ChatMessage,
  callChatWithFallback,
  callWithFallback,
  type FallbackCallOptions,
  LLM_MODELS,
  type LlmRouterEnv,
  type RoutingTier,
  stripThinking,
} from '@zhop/ai-vision/router'

/**
 * svc-astro env for router calls. Extends the shared router env with the
 * Gemini key (VLM only) and the always-present admin-notify binding.
 */
export interface AiRouterEnv extends LlmRouterEnv {
  /** VLM only — Gemini Vision for the face/palm physiognomy describe stage. */
  GEMINI_API_KEY: string
  /** svc-astro always has admin-notify; the router uses it for fallback alerts. */
  SVC_ADMIN_NOTIFY: Fetcher
}
