import type { HexastralClient } from '@zhop/hexastral-client'
import type {
  BondsTimelineExplainInput,
  MakeIfExplainInput,
  ResonanceInviteInput,
  RespondInput,
  SoloCreateInput,
} from '../types'

/**
 * Hono `hc<AppType>()` stops inferring some deep branches (e.g. `/api/bonds`)
 * once the route tree is large. Runtime paths are correct; this module
 * restores typings for Kindred hooks only.
 */
export type KindredBondsRpc = {
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
    /** `lc` retargets this viewer's mirror report to their device locale (per-reader
     *  locale — the server re-runs the interp in `lc`; matches bondGetQuerySchema). */
    $get: (opts: { param: { id: string }; query?: { lc?: string } }) => Promise<Response>
    /** Soft-delete a bond (DELETE /api/bonds/:id → { id, status: 'removed' }).
     *  Server marks status 'removed' and the list query filters it out. */
    $delete: (opts: { param: { id: string } }) => Promise<Response>
    share: {
      $post: (opts: { param: { id: string } }) => Promise<Response>
    }
    /** Buy-to-unlock the full six-chapter report for this one bond. */
    unlock: {
      $post: (opts: { param: { id: string } }) => Promise<Response>
    }
    /** Re-run THIS bond's reading with the viewer's current birth (Pro, in-place). */
    recompute: {
      $post: (opts: { param: { id: string } }) => Promise<Response>
    }
    /** 关系决策推演 (make-if): rank the bond's forward windows. Pro-gated. */
    makeif: {
      $post: (opts: { param: { id: string } }) => Promise<Response>
      /** Per-window LLM deep-read ("这个月对推进这一步合不合适"). */
      explain: {
        $post: (opts: { param: { id: string }; json: MakeIfExplainInput }) => Promise<Response>
      }
    }
  }
  // Bonds timeline (BT.3/BT.4, ADR-0014). Registered before `/:id` server-side
  // so the static path wins; typed here for Kindred hooks.
  timeline: {
    /** `horizon: 'far'` opens the hidden beyond-10y view (Pro). */
    $get: (opts?: { query?: { horizon?: 'far' } }) => Promise<Response>
    explain: {
      $post: (opts: { json: BondsTimelineExplainInput }) => Promise<Response>
    }
  }
}

export function kindredBonds(client: HexastralClient): KindredBondsRpc {
  const api = client.api as unknown as { bonds: KindredBondsRpc }
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
 *   const data = await unwrap<{ bonds: BondData[] }>(await kindredBonds(client).$get())
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
