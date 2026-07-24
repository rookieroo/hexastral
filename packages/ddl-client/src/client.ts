/**
 * API client helpers for the hexastral-api DDL endpoints.
 * Can be used server-side (Next.js server actions) or client-side.
 */

import { z } from 'zod/v4'
import type {
  BrowserFingerprint,
  DDLCreateResponse,
  DDLMatchFingerprint,
  DDLMatchResponse,
  DDLResolveResponse,
  DDLSessionMeta,
} from './types'

const BrowserFingerprintSchema = z.object({
  userAgent: z.string(),
  language: z.string(),
  timezone: z.string(),
  screenWidth: z.number(),
  screenHeight: z.number(),
  pixelRatio: z.number(),
  platform: z.string(),
  colorDepth: z.number(),
  touchPoints: z.number(),
  canvas: z.string(),
  webgl: z.string(),
})

const DDLSessionMetaSchema = z.object({
  referrer: z.string().optional(),
  utm: z.record(z.string(), z.string()).optional(),
  clickIds: z.record(z.string(), z.string()).optional(),
  landingPath: z.string().optional(),
  targetApp: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const DDLSessionSchema = z.object({
  fingerprint: BrowserFingerprintSchema,
  meta: DDLSessionMetaSchema,
  createdAt: z.number(),
  clientIp: z.string().optional(),
})

const DDLCreateResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.number(),
})

const DDLResolveResponseSchema = z.object({
  session: DDLSessionSchema.nullable(),
  found: z.boolean(),
})

const DDLMatchResponseSchema = z.object({
  session: DDLSessionSchema.nullable(),
  found: z.boolean(),
  score: z.number(),
})

/**
 * Create a DDL session by posting a fingerprint to the API.
 * Returns a short-lived token that can be embedded in the App Store URL
 * and later resolved by the iOS app after install.
 *
 * @param apiBase  e.g. "https://api.hexastral.com"
 * @param fingerprint  Collected via collectFingerprint()
 * @param meta  Optional UTM params / landing path / payload
 */
export async function createDDLSession(
  apiBase: string,
  fingerprint: BrowserFingerprint,
  meta?: DDLSessionMeta
): Promise<DDLCreateResponse> {
  const res = await fetch(`${apiBase}/api/ddl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint, meta: meta ?? {} }),
  })
  if (!res.ok) {
    throw new Error(`DDL session creation failed: ${res.status} ${res.statusText}`)
  }
  const raw = await res.json()
  return DDLCreateResponseSchema.parse(raw)
}

/**
 * Resolve a DDL session by token.
 * Called by the iOS app immediately after first launch to retrieve
 * the intent that was stored before the App Store redirect.
 *
 * The token is high-entropy (32-char hex) and one-time-read,
 * so no additional auth is required. The optional serviceToken
 * param is kept for backward compatibility with internal callers.
 *
 * @param apiBase  e.g. "https://api.hexastral.com"
 * @param token    Token received via deep link URL
 * @param serviceToken  Optional (no longer required by API)
 */
export async function resolveDDLSession(
  apiBase: string,
  token: string,
  serviceToken?: string
): Promise<DDLResolveResponse> {
  const headers: Record<string, string> = {}
  if (serviceToken) headers['X-DDL-Service-Token'] = serviceToken

  const res = await fetch(`${apiBase}/api/ddl/${encodeURIComponent(token)}`, { headers })
  if (res.status === 404) return { session: null, found: false }
  if (!res.ok) throw new Error(`DDL resolve failed: ${res.status}`)
  const raw = await res.json()
  return DDLResolveResponseSchema.parse(raw)
}

/**
 * Fuzzy-match a DDL session by device fingerprint.
 * Fallback path for iOS cold starts where no deep-link token is available.
 * The server compares screen size + timezone + IP to find the best match.
 *
 * @param apiBase      e.g. "https://api.hexastral.com"
 * @param fingerprint  Lightweight device signals (screen, timezone, platform)
 */
export async function matchDDLSession(
  apiBase: string,
  fingerprint: DDLMatchFingerprint
): Promise<DDLMatchResponse> {
  const res = await fetch(`${apiBase}/api/ddl/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fingerprint),
  })
  if (res.status === 404) return { session: null, found: false, score: 0 }
  if (!res.ok) throw new Error(`DDL match failed: ${res.status}`)
  const raw = await res.json()
  return DDLMatchResponseSchema.parse(raw)
}
