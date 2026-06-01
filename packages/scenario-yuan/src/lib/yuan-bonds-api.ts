import type { HexastralClient } from '@zhop/hexastral-client'
import type {
  BondsTimelineExplainInput,
  ResonanceInviteInput,
  RespondInput,
  SoloCreateInput,
} from '../types'

/**
 * Hono `hc<AppType>()` stops inferring some deep branches (e.g. `/api/bonds`)
 * once the route tree is large. Runtime paths are correct; this module
 * restores typings for Yuán hooks only.
 */
export type YuanBondsRpc = {
  $get: () => Promise<Response>
  solo: {
    $post: (opts: { json: SoloCreateInput }) => Promise<Response>
  }
  invite: {
    $post: (opts: { json: ResonanceInviteInput }) => Promise<Response>
    ':token': {
      info: { $get: (opts: { param: { token: string } }) => Promise<Response> }
      respond: {
        $post: (opts: { param: { token: string }; json: RespondInput }) => Promise<Response>
      }
    }
  }
  ':id': {
    $get: (opts: { param: { id: string } }) => Promise<Response>
    share: {
      $post: (opts: { param: { id: string } }) => Promise<Response>
    }
  }
  // Bonds timeline (BT.3/BT.4, ADR-0014). Registered before `/:id` server-side
  // so the static path wins; typed here for Yuán hooks.
  timeline: {
    $get: () => Promise<Response>
    explain: {
      $post: (opts: { json: BondsTimelineExplainInput }) => Promise<Response>
    }
  }
}

export function yuanBonds(client: HexastralClient): YuanBondsRpc {
  const api = client.api as unknown as { bonds: YuanBondsRpc }
  return api.bonds
}

// ── Response envelope helpers ──────────────────────────────────────────────
//
// Phase F: server now returns `{ ok: true, data: T, meta? }` or
// `{ ok: false, error: { code, message, details? } }`. Mirrors scenario-feng's
// `unwrap()` helper.

export interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: { cursor?: string; total?: number; [key: string]: unknown }
}

export interface ApiError {
  ok: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

/**
 * Unwrap a Response into the inner data. Throws with the server's error code
 * + message on `ok: false`. Use for every Phase F-migrated route consumer.
 *
 *   const data = await unwrap<{ bonds: BondData[] }>(await yuanBonds(client).$get())
 */
export async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResult<T>
  if (!json.ok) {
    const code = json.error?.code ?? 'unknown_error'
    const message = json.error?.message ?? `Request failed (${res.status})`
    const err = new Error(message)
    ;(err as Error & { code?: string }).code = code
    throw err
  }
  return json.data
}
