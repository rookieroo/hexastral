/**
 * Zod-validated retry envelope for AI calls.
 *
 * Pattern (used by both Stage 1 vision and Stage 3 synthesis):
 *   1. Call the model.
 *   2. Parse output through Zod.
 *   3. On parse failure, retry up to `maxRetries` times.
 *   4. On final failure, return a `degraded` result the caller provides.
 *
 * Why retry: structured-output models occasionally return malformed JSON
 * (truncation, schema drift). 2 retries with the same prompt + temperature
 * usually fix it; if not, we degrade gracefully so downstream stages don't
 * 500 the whole pipeline.
 */

import type { ZodTypeAny, infer as zInfer } from 'zod'
import { aiVisionLogger } from './log'

export interface WithZodRetryOptions<T extends ZodTypeAny> {
  /** Async function that calls the model and returns raw parsed JSON. */
  call: () => Promise<unknown>
  /** Zod schema the call's output must conform to. */
  schema: T
  /** Max attempts AFTER the first. Default 2 (so 3 total tries). */
  maxRetries?: number
  /** Tag for log messages. */
  label?: string
  /** Returned when all retries fail. If omitted, the last error is thrown. */
  degraded?: () => zInfer<T>
}

export async function withZodRetry<T extends ZodTypeAny>(
  opts: WithZodRetryOptions<T>
): Promise<zInfer<T>> {
  const max = opts.maxRetries ?? 2
  const label = opts.label ?? 'ai-call'
  let lastError: unknown

  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      const raw = await opts.call()
      const result = opts.schema.parse(raw) as zInfer<T>
      return result
    } catch (err) {
      lastError = err
      aiVisionLogger.warn('zod_retry.attempt_failed', {
        label,
        attempt: attempt + 1,
        maxAttempts: max + 1,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (opts.degraded) {
    aiVisionLogger.error('zod_retry.degraded', {
      label,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    })
    return opts.degraded()
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[${label}] retries exhausted: ${String(lastError)}`)
}
