'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useCallback, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  action?: string
}

/**
 * Cloudflare Turnstile — invisible CAPTCHA replacement.
 * Renders a hidden widget; calls `onToken` when challenge passes.
 */
export function TurnstileWidget({ onToken, action = 'chart-generate' }: TurnstileWidgetProps) {
  const ref = useRef(null)

  const handleSuccess = useCallback(
    (token: string) => {
      onToken(token)
    },
    [onToken]
  )

  const handleExpire = useCallback(() => {
    if (ref.current) {
      // @ts-ignore — reset() exists on instance
      ref.current.reset()
    }
  }, [])

  if (!SITE_KEY) return null

  return (
    <Turnstile
      ref={ref}
      siteKey={SITE_KEY}
      options={{
        action,
        size: 'invisible',
        theme: 'auto',
      }}
      onSuccess={handleSuccess}
      onExpire={handleExpire}
    />
  )
}
