import { createLogger } from '@zhop/logger'

export const aiVisionLogger = createLogger({ service: 'ai-vision' })

export type GeminiOp = 'vision' | 'vision-structured' | 'text'

export async function withGeminiTiming<T>(
  op: GeminiOp,
  meta: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now()
  aiVisionLogger.info('gemini.call.start', { op, ...meta })
  try {
    const result = await fn()
    aiVisionLogger.info('gemini.call.done', {
      op,
      ...meta,
      durationMs: Date.now() - started,
      ok: true,
    })
    return result
  } catch (err) {
    aiVisionLogger.error('gemini.call.failed', {
      op,
      ...meta,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
