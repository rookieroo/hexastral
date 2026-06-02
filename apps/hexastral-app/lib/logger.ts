/**
 * Client-side error logger
 *
 * In development: logs to console.
 * In production: silent (future hook point for Sentry / Crashlytics).
 * Usage: import { logError, logWarn } from '@/lib/logger'
 */

export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, error)
  }
}

export function logWarn(context: string, message: string): void {
  if (__DEV__) {
    console.warn(`[${context}]`, message)
  }
}
