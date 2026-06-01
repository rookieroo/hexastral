/**
 * @zhop/ddl-client
 *
 * Deferred Deep Link (DDL) — browser fingerprint collection,
 * API session management, and App Store redirect helper.
 *
 * Usage (web — 'use client' component or script):
 *
 *   import { collectFingerprint, createDDLSession, redirectToAppStore } from '@zhop/ddl-client'
 *
 *   const fp = collectFingerprint()
 *   const { token } = await createDDLSession(process.env.NEXT_PUBLIC_API_URL!, fp, {
 *     landingPath: window.location.pathname,
 *     utm: mergeUtmForDdl(new URLSearchParams(window.location.search)),
 *     targetApp: 'hexastral',
 *     payload: { mode: 'pairing', referralCode: 'FRIEND123' },
 *   })
 *   redirectToAppStore(process.env.NEXT_PUBLIC_APP_STORE_URL!, token)
 *
 * Usage (iOS — after first launch):
 *
 *   const { session } = await resolveDDLSession(apiBase, tokenFromDeepLink)
 *   if (session?.meta.payload?.mode === 'pairing') { ... }
 */

// Types
export type {
  BrowserFingerprint,
  DDLSession,
  DDLSessionMeta,
  DDLCreateResponse,
  DDLResolveResponse,
  DDLMatchFingerprint,
  DDLMatchResponse,
} from './types'

// Fingerprint
export { collectFingerprint, fingerprintId } from './fingerprint'

// API client
export { createDDLSession, resolveDDLSession, matchDDLSession } from './client'

// Redirect helpers
export { redirectToAppStore, getCachedDDLToken, clearCachedDDLToken } from './redirect'

// Growth / attribution (browser)
export { mergeUtmForDdl, readPersistedGrowthUtm } from './growth-utm'
