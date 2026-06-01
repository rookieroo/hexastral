'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement | string, options: TurnstileOptions) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
      ready: (callback: () => void) => void
    }
  }
}

interface TurnstileOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  tabindex?: number
  'response-field'?: boolean
  'response-field-name'?: string
  retry?: 'auto' | 'never'
  'retry-interval'?: number
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  language?: string
  execution?: 'render' | 'execute'
  appearance?: 'always' | 'execute' | 'interaction-only'
}

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  onTimeout?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  className?: string
  retry?: 'auto' | 'never'
  language?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  onTimeout,
  theme = 'auto',
  size = 'normal',
  className = '',
  retry = 'auto',
  language = 'auto',
  appearance = 'always',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Turnstile script
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if script is already loaded
    if (window.turnstile) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com"]')
    if (existingScript) {
      const checkLoaded = () => {
        if (window.turnstile) {
          setIsLoaded(true)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      // Wait for turnstile to be ready
      const checkReady = () => {
        if (window.turnstile) {
          window.turnstile.ready(() => {
            setIsLoaded(true)
          })
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    }

    script.onerror = () => {
      setError('Failed to load Turnstile')
      console.error('Failed to load Turnstile script')
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup script if component unmounts before loading
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Render widget when loaded
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile) return

    try {
      const options: TurnstileOptions = {
        sitekey: siteKey,
        callback: onVerify,
        'error-callback': () => {
          setError('Verification failed')
          onError?.()
        },
        'expired-callback': () => {
          setError('Verification expired')
          onExpire?.()
        },
        'timeout-callback': () => {
          setError('Verification timeout')
          onTimeout?.()
        },
        theme,
        size,
        retry,
        language: language === 'auto' ? undefined : language,
        appearance,
      }

      const widgetId = window.turnstile.render(containerRef.current, options)
      widgetIdRef.current = widgetId
    } catch (err) {
      console.error('Failed to render Turnstile widget:', err)
      setError('Failed to initialize verification')
    }
  }, [
    isLoaded,
    siteKey,
    onVerify,
    onError,
    onExpire,
    onTimeout,
    theme,
    size,
    retry,
    language,
    appearance,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (err) {
          console.warn('Failed to cleanup Turnstile widget:', err)
        }
      }
    }
  }, [])

  // Reset widget method
  const reset = () => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        setError(null)
      } catch (err) {
        console.error('Failed to reset Turnstile widget:', err)
      }
    }
  }

  // Expose reset method
  useEffect(() => {
    if (containerRef.current) {
      ;(containerRef.current as any).resetTurnstile = reset
    }
  }, [])

  if (error) {
    return (
      <div
        className={`turnstile-error p-3 text-sm text-red-600 bg-red-50 rounded border ${className}`}
      >
        <div>{error}</div>
        <button type='button' onClick={reset} className='mt-2 text-xs underline hover:no-underline'>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`turnstile-widget ${className}`}
      style={{ minHeight: size === 'compact' ? '65px' : '65px' }}
    />
  )
}
