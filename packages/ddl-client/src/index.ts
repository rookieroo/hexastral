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

// API client
export { createDDLSession, matchDDLSession, resolveDDLSession } from './client'

// Fingerprint
export { collectFingerprint, fingerprintId } from './fingerprint'
// Growth / attribution (browser)
export {
  CLICK_ID_KEYS,
  mergeClickIdsForDdl,
  mergeUtmForDdl,
  readPersistedClickIds,
  readPersistedGrowthUtm,
} from './growth-utm'
export type { ClickIdKey } from './growth-utm'

// Redirect helpers
export { clearCachedDDLToken, getCachedDDLToken, redirectToAppStore } from './redirect'
// Types
export type {
  BrowserFingerprint,
  DDLCreateResponse,
  DDLMatchFingerprint,
  DDLMatchResponse,
  DDLResolveResponse,
  DDLSession,
  DDLSessionMeta,
} from './types'
