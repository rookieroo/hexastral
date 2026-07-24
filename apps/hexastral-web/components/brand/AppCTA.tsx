'use client'

/**
 * Brand / LP acquisition CTA — DDL session + shared event_id pixel + server postback.
 * Replaces bare store links on paid surfaces.
 */

import {
  collectFingerprint,
  createDDLSession,
  mergeClickIdsForDdl,
  mergeUtmForDdl,
  redirectToAppStore,
} from '@zhop/ddl-client'
import { useEffect, useState } from 'react'
import {
  enqueueAdConvertClient,
  newAdEventId,
  trackBrowserConversion,
} from '@/lib/ads/track'
import type { GrowthAppStoreTarget } from '@/lib/growth/app-store-urls'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

interface AppCTAProps {
  ios: string
  android: string
  fallback?: string
  bg: string
  color: string
  labels: { ios: string; android: string; desktop: string }
  /** Portfolio / DDL target_app for attribution */
  targetApp: GrowthAppStoreTarget
  /** When false, skip pixel + server postback (e.g. future non-acq use). Default true. */
  enableAdPostback?: boolean
}

function isAndroidUA(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

export function AppCTA({
  ios,
  android,
  fallback,
  bg,
  color,
  labels,
  targetApp,
  enableAdPostback = true,
}: AppCTAProps) {
  const [label, setLabel] = useState(labels.desktop)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (/android/i.test(ua)) setLabel(labels.android)
    else if (/iphone|ipad|ipod/i.test(ua)) setLabel(labels.ios)
  }, [labels.ios, labels.android, labels.desktop])

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    const eventId = newAdEventId()
    if (enableAdPostback) {
      trackBrowserConversion({ eventName: 'Lead', eventId })
      void enqueueAdConvertClient({
        eventName: 'Lead',
        eventId,
        targetApp,
      })
    }

    try {
      const fp = collectFingerprint()
      const search = new URLSearchParams(window.location.search)
      const referrer = typeof document !== 'undefined' ? document.referrer : ''
      const { token } = await createDDLSession(API_BASE, fp, {
        landingPath: window.location.pathname,
        utm: mergeUtmForDdl(search),
        clickIds: mergeClickIdsForDdl(search),
        referrer: referrer.length > 0 ? referrer : undefined,
        targetApp,
      })
      if (isAndroidUA()) {
        const play = new URL(android)
        play.searchParams.set('referrer', token)
        window.location.href = play.toString()
      } else {
        redirectToAppStore(ios.trim() || fallback || ios, token)
      }
    } catch (err) {
      console.warn('[AppCTA] DDL session failed', err)
      window.location.href = isAndroidUA() ? android : ios.trim() || fallback || ios
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'inline-block',
        padding: '13px 30px',
        borderRadius: 28,
        background: bg,
        color,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 0.5,
        textDecoration: 'none',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {loading ? '…' : label}
    </button>
  )
}
