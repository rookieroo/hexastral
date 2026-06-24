'use client'

import { useEffect, useState } from 'react'

interface AppCTAProps {
  /** App Store (iOS) URL. */
  ios: string
  /** Google Play (Android) URL. */
  android: string
  /** Fallback when platform is unknown (desktop) — usually the App Store. */
  fallback?: string
  /** Background (brand accent) + text color. */
  bg: string
  color: string
  labels: { ios: string; android: string; desktop: string }
}

/**
 * One platform-aware download button: detects iOS / Android from the UA and
 * points at the matching store (desktop falls back to the App Store). One button,
 * not a row of badges — the label + destination resolve client-side after mount.
 */
export function AppCTA({ ios, android, fallback, bg, color, labels }: AppCTAProps) {
  const [target, setTarget] = useState<{ href: string; label: string }>({
    href: fallback ?? ios,
    label: labels.desktop,
  })

  useEffect(() => {
    const ua = navigator.userAgent || ''
    if (/android/i.test(ua)) setTarget({ href: android, label: labels.android })
    else if (/iphone|ipad|ipod/i.test(ua)) setTarget({ href: ios, label: labels.ios })
  }, [ios, android, labels.ios, labels.android])

  return (
    <a
      href={target.href}
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
      }}
    >
      {target.label}
    </a>
  )
}
