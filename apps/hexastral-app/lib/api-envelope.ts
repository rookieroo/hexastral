/**
 * Shared `{ ok, data }` / `{ ok: false, error }` envelope from hexastral-api.
 * Phase F routes return this shape; unwrap before using typed payloads.
 */

export interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: { cursor?: string; total?: number }
}

export interface ApiError {
  ok: false
  error: { code: string; message: string; details?: Record<string, unknown> }
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

/** Hono RPC client responses and fetch `Response` both expose `.json()`. */
type JsonBody = { json(): Promise<unknown>; status?: number }

/** Unwrap envelope JSON; throws with server code on `ok: false`. */
export async function unwrapApiEnvelope<T>(res: JsonBody): Promise<T> {
  const json = (await res.json()) as ApiResult<T>
  if (!json.ok) {
    const code = json.error?.code ?? 'unknown_error'
    const statusSuffix = res.status != null ? ` (${res.status})` : ''
    const message = json.error?.message ?? `Request failed${statusSuffix}`
    const err = new Error(message)
    ;(err as Error & { code?: string }).code = code
    throw err
  }
  return json.data
}
