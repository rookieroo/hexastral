/**
 * Shared API response envelope — Phase F normalization (per phase-f-plan §3.1).
 *
 * Every route should return one of two shapes:
 *
 *   Success:
 *     { ok: true, data: T, meta?: { cursor?: string, total?: number } }
 *
 *   Error:
 *     { ok: false, error: { code: string, message: string, details?: Record<string, unknown> } }
 *
 * Why uniform envelopes:
 *   - hexastral-client can have one parsing layer instead of N per-route shapes
 *   - List vs detail responses look the same: `data: T[]` vs `data: T`
 *   - Error codes are machine-readable for i18n + retry logic
 *   - Adding pagination is a `meta` extension, not a schema break
 *
 * Migration order (proof-of-pattern):
 *   1. feng-sites + feng-jobs (this file lands first)
 *   2. bonds + bonds-invite
 *   3. share (public)
 *   4. signal + onboarding
 *   5. share-public + share-private split (§3.7)
 *   6. rest of routes (sweep)
 */

import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// ── Result shapes ──────────────────────────────────────────────────────────

export interface ApiMeta {
  /** Pagination cursor — opaque ID to pass back on next request. */
  cursor?: string
  /** Total count if known. List endpoints may omit when computing is expensive. */
  total?: number
  /** Any additional non-data context (e.g., quota remaining). */
  [key: string]: unknown
}

export interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: ApiMeta
}

export interface ApiErrorPayload {
  /** Stable kebab-case identifier — drives client retry logic & i18n. */
  code: string
  /** Human-readable message (English source). Clients localize from code. */
  message: string
  /** Optional structured context (field validation errors, paywall product IDs, etc.). */
  details?: Record<string, unknown>
}

export interface ApiError {
  ok: false
  error: ApiErrorPayload
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

// ── Constructors ───────────────────────────────────────────────────────────

export function ok<T>(data: T, meta?: ApiMeta): ApiSuccess<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data }
}

export function err(code: string, message: string, details?: Record<string, unknown>): ApiError {
  return details
    ? { ok: false, error: { code, message, details } }
    : { ok: false, error: { code, message } }
}

// ── Hono helpers ───────────────────────────────────────────────────────────

/**
 * Return `c.json(ok(data, meta))` with the right HTTP status. Default 200.
 * Pass 201 explicitly for create endpoints.
 */
export function jsonOk<T>(c: Context, data: T, status: ContentfulStatusCode = 200, meta?: ApiMeta) {
  return c.json(ok(data, meta), status)
}

/**
 * Return `c.json(err(code, message, details))` with the right HTTP status.
 */
export function jsonErr(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return c.json(err(code, message, details), status)
}

// ── Stable error codes (kebab-case, machine-readable) ──────────────────────
//
// Add new codes here so the registry is one source of truth. Clients map them
// to localized strings.

export const ApiErrorCode = {
  // Validation / input
  invalid_input: 'invalid_input',
  missing_required: 'missing_required',
  validation_failed: 'validation_failed',

  // Auth
  unauthorized: 'unauthorized',
  signature_invalid: 'signature_invalid',
  forbidden: 'forbidden',

  // Resource state
  not_found: 'not_found',
  conflict: 'conflict',
  gone: 'gone',

  // Quota / billing
  quota_exhausted: 'quota_exhausted',
  paywall_required: 'paywall_required',
  subscription_required: 'subscription_required',

  // Pipeline / job
  job_failed: 'job_failed',
  context_hash_mismatch: 'context_hash_mismatch',
  generation_failed: 'generation_failed',

  // Server
  internal_error: 'internal_error',
  upstream_unavailable: 'upstream_unavailable',
  timeout: 'timeout',
} as const

export type ApiErrorCodeKey = keyof typeof ApiErrorCode
