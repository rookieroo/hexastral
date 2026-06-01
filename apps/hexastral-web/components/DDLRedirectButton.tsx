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
  /** Persisted with DDL session for growth analytics (portfolio app key). */
  targetApp?: string
  style?: React.CSSProperties
  className?: string
}

export function DDLRedirectButton({
  children,
  payload,
  appStoreUrl,
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
      const store = appStoreUrl?.trim() || DEFAULT_APP_STORE_URL
      redirectToAppStore(store, token)
    } catch (err) {
      console.warn('[DDLRedirectButton] DDL session failed', err)
      // Fallback: direct link without DDL token
      window.location.href = appStoreUrl?.trim() || DEFAULT_APP_STORE_URL
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
      aria-label='Download on the App Store'
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
