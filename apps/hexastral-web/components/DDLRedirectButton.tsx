'use client'

import {
  collectFingerprint,
  createDDLSession,
  mergeUtmForDdl,
  redirectToAppStore,
} from '@zhop/ddl-client'
import { type ReactNode, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'
const DEFAULT_APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/hexastral/id6739739495'
// MOCK Google Play URL — Yuel/Yuun aren't on Google Play yet (2026-06). Swap this
// default (or set NEXT_PUBLIC_PLAY_STORE_URL) for the real listing at launch; the
// platform routing + token handoff below is already wired so only the URL changes.
const DEFAULT_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.hexastral.yuel'

/** Coarse client-side platform sniff for store routing. */
function isAndroidUA(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

export interface DDLPayload {
  mode?: 'personal' | 'pairing'
  dayMaster?: string
  score?: number
  referralCode?: string
  [key: string]: unknown
}

interface DDLRedirectButtonProps {
  children: ReactNode
  payload?: DDLPayload
  /** Override App Store URL (e.g. future FaceOracle bundle). Defaults to `NEXT_PUBLIC_APP_STORE_URL`. */
  appStoreUrl?: string
  /** Override Google Play URL (per-app listing). Defaults to `NEXT_PUBLIC_PLAY_STORE_URL` (mock until launch). */
  playStoreUrl?: string
  /** Persisted with DDL session for growth analytics (portfolio app key). */
  targetApp?: string
  style?: React.CSSProperties
  className?: string
}

export function DDLRedirectButton({
  children,
  payload,
  appStoreUrl,
  playStoreUrl,
  targetApp,
  style,
  className,
}: DDLRedirectButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    try {
      const fp = collectFingerprint()
      const referrer = typeof document !== 'undefined' ? document.referrer : ''
      const { token } = await createDDLSession(API_BASE, fp, {
        landingPath: window.location.pathname,
        utm: mergeUtmForDdl(new URLSearchParams(window.location.search)),
        referrer: referrer.length > 0 ? referrer : undefined,
        ...(targetApp?.trim() ? { targetApp: targetApp.trim() } : {}),
        payload,
      })
      if (isAndroidUA()) {
        // Android → Google Play. The iOS DDL handoff (universal link + cookie)
        // doesn't apply; pass the token as Play's `referrer` so the app can resolve
        // the same DDL session after install. (Full Android deferred-deep-link via
        // the Install Referrer API is a launch follow-up once the listing is live.)
        const play = new URL(playStoreUrl?.trim() || DEFAULT_PLAY_STORE_URL)
        play.searchParams.set('referrer', token)
        window.location.href = play.toString()
      } else {
        redirectToAppStore(appStoreUrl?.trim() || DEFAULT_APP_STORE_URL, token)
      }
    } catch (err) {
      console.warn('[DDLRedirectButton] DDL session failed', err)
      // Fallback: direct store link without the DDL token.
      window.location.href = isAndroidUA()
        ? playStoreUrl?.trim() || DEFAULT_PLAY_STORE_URL
        : appStoreUrl?.trim() || DEFAULT_APP_STORE_URL
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{
        cursor: loading ? 'wait' : 'pointer',
        border: 'none',
        background: 'none',
        padding: 0,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      aria-label='Get the app'
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            width='16'
            height='16'
            viewBox='0 0 16 16'
            fill='none'
            style={{ animation: 'ddl-spin 0.8s linear infinite' }}
            aria-hidden='true'
          >
            <circle cx='8' cy='8' r='6' stroke='currentColor' strokeOpacity='0.3' strokeWidth='2' />
            <path
              d='M8 2a6 6 0 0 1 6 6'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            />
          </svg>
          <style>{'@keyframes ddl-spin { to { transform: rotate(360deg); } }'}</style>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
