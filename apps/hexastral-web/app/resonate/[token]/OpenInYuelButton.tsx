'use client'

/**
 * Open-in-app CTA for resonate invite pages.
 * Tries `yuel://` first, then transitional `kindred://` for stale native builds.
 * Falls back to the App Store after a short delay if neither scheme is handled.
 */

import { useCallback, useRef } from 'react'

export function OpenInYuelButton({
  token,
  label,
  appStoreUrl,
}: {
  token: string
  label: string
  appStoreUrl: string
}) {
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const open = useCallback(() => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)

    const yuel = `yuel:///accept/${encodeURIComponent(token)}`
    const kindred = `kindred:///accept/${encodeURIComponent(token)}`

    // Custom-scheme navigation — Safari shows "invalid address" only when NO
    // app has registered the scheme. Trying yuel then kindred covers rename drift.
    window.location.href = yuel
    fallbackTimer.current = setTimeout(() => {
      window.location.href = kindred
      fallbackTimer.current = setTimeout(() => {
        window.location.href = appStoreUrl
      }, 900)
    }, 700)
  }, [token, appStoreUrl])

  return (
    <button
      type='button'
      onClick={open}
      style={{
        display: 'inline-block',
        fontSize: 16,
        fontWeight: 600,
        color: '#0B0B0C',
        background: '#C4A882',
        letterSpacing: 0.5,
        padding: '15px 36px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {label} →
    </button>
  )
}
