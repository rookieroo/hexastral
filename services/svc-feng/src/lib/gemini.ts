/**
 * @deprecated — moved to `@zhop/ai-vision`.
 *
 * This file is kept as a thin re-export so existing imports inside svc-feng
 * keep compiling. New code should import directly from `@zhop/ai-vision`.
 * Phase F follow-up: delete this file after svc-feng route files migrate.
 */

export {
  callGeminiText,
  callGeminiVisionStructured,
} from '@zhop/ai-vision'
