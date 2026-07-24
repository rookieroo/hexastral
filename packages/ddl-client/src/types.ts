/**
 * @zhop/ddl-client — Deferred Deep Link types
 *
 * Used by web apps to collect browser fingerprints and
 * pass intent to the native app after install.
 */

/** Browser fingerprint collected before App Store redirect */
export interface BrowserFingerprint {
  userAgent: string
  language: string
  timezone: string
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  platform: string
  colorDepth: number
  touchPoints: number
  canvas: string
  webgl: string
}

/** Metadata attached to the DDL session */
export interface DDLSessionMeta {
  /** Where the user came from */
  referrer?: string
  /** UTM parameters */
  utm?: Record<string, string>
  /** Ad click / browser match ids (fbclid, gclid, ttclid, rdt_cid, _fbp, _fbc) */
  clickIds?: Record<string, string>
  /** The page path the user was on when they clicked */
  landingPath?: string
  /** Portfolio app key for analytics routing (e.g. faceoracle, starpalace, hexastral) */
  targetApp?: string
  /** Any app-specific payload to restore after install */
  payload?: Record<string, unknown>
}

/** Full session stored in Cloudflare KV */
export interface DDLSession {
  fingerprint: BrowserFingerprint
  meta: DDLSessionMeta
  createdAt: number
  clientIp?: string
}

/** Returned by POST /api/ddl */
export interface DDLCreateResponse {
  /** Opaque session token, stored in cookie + passed to iOS via URL scheme */
  token: string
  /** Unix timestamp (ms) when session expires */
  expiresAt: number
}

/** Returned by GET /api/ddl/:token (iOS app reads this after install) */
export interface DDLResolveResponse {
  session: DDLSession | null
  found: boolean
}

/** Lightweight device fingerprint for POST /api/ddl/match (iOS cold-start fallback) */
export interface DDLMatchFingerprint {
  screenWidth: number
  screenHeight: number
  timezone: string
  platform: string
}

/** Returned by POST /api/ddl/match */
export interface DDLMatchResponse {
  session: DDLSession | null
  found: boolean
  score: number
}
