import type { ComponentType } from 'react'

import { isExpoGo } from '@/lib/native'

/**
 * Sentry shim — wraps @sentry/react-native behind a runtime guard.
 *
 * Expo Go does not include the Sentry native bridge, so we skip
 * initialization entirely in that environment. All exports are no-ops
 * or identity functions so call-sites need zero changes.
 *
 * In dev-client and production builds the real Sentry is used.
 */

interface SentryModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: (options: Record<string, unknown>) => void
  wrap: <T extends ComponentType<any>>(component: T) => T
  captureException: (err: unknown, hint?: Record<string, unknown>) => string
}

let _sentry: SentryModule | null = null

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@sentry/react-native') as SentryModule
  _sentry = mod
}

export function initSentry(): void {
  _sentry?.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: process.env.EXPO_PUBLIC_ENV === 'production',
    tracesSampleRate: 0.2,
  })
}

export function wrapWithSentry<T extends ComponentType<any>>(component: T): T {
  return _sentry?.wrap(component) ?? component
}

export function captureException(err: unknown, hint?: Record<string, unknown>): void {
  _sentry?.captureException(err, hint)
}
