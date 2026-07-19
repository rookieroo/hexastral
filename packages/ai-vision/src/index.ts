/**
 * @zhop/ai-vision — shared Gemini Vision + R2 cache + retry primitives.
 *
 * Used by:
 *   - services/svc-feng (feng-shui external landform analysis)
 *   - services/svc-astro (face-oracle / palm physiognomy via portfolio pipeline)
 *
 * Single Gemini secret per Worker. Single R2 cache pattern. Single retry
 * envelope. Pre-Phase-F each vision pipeline rolled its own; this package
 * is the consolidation per docs/phase-f-plan.md §3 + ADR-0004 §6.
 */

export {
  type CacheEntry,
  cacheKey,
  canonicalize,
  fetchR2AsBase64,
  readCache,
  writeCache,
} from './cache'
export {
  type CallGeminiTextOptions,
  type CallGeminiVisionOptions,
  type CallGeminiVisionStructuredOptions,
  callGeminiText,
  callGeminiVision,
  callGeminiVisionStructured,
  type GeminiThinkingLevel,
  type VisionImage,
} from './gemini'

export { type WithZodRetryOptions, withZodRetry } from './retry'

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
  type WorkersAiBinding,
} from './router'

export {
  callVisionStructuredWithFallback,
  type VisionRouterEnv,
  type VisionStructuredOptions,
  type VisionStructuredResult,
  VLM_CASCADE_ID,
  VLM_MODELS,
} from './vision-router'
