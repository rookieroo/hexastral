/**
 * Runtime configuration sourced from EXPO_PUBLIC_* env vars + app.json `extra`.
 * Centralised so the rest of the app never reads `process.env` directly.
 */

import Constants from 'expo-constants'
import type { Locale } from '@/lib/i18n'

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>

function readEnv(key: string, fallback: string): string {
  const value = process.env[key]
  if (typeof value === 'string' && value.length > 0) return value
  const extraValue = extra[key]
  if (typeof extraValue === 'string' && extraValue.length > 0) return extraValue
  return fallback
}

const LEGAL_BASE = 'https://kanyu.hexastral.com'

function legalSegment(locale: Locale): string {
  return locale === 'zh-Hant' ? 'tw' : locale === 'zh' ? 'zh' : locale === 'ja' ? 'ja' : 'en'
}

function brandLegalPath(locale: Locale, path: string): string {
  const seg = legalSegment(locale)
  if (seg === 'en') return path
  return `/${seg}${path}`
}

/** Kanyu per-app privacy appendix (`feng`) on the brand subdomain. */
export function privacyUrl(locale: Locale): string {
  return `${LEGAL_BASE}${brandLegalPath(locale, '/privacy/feng')}`
}

/** Shared suite Terms document on the brand subdomain. */
export function termsUrl(locale: Locale): string {
  return `${LEGAL_BASE}${brandLegalPath(locale, '/terms')}`
}

export const config = {
  apiUrl: readEnv('EXPO_PUBLIC_API_URL', 'https://api.hexastral.com'),
  env: readEnv('EXPO_PUBLIC_ENV', 'development') as 'development' | 'preview' | 'production',
  revenueCatIosKey: readEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY', ''),
  revenueCatAndroidKey: readEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY', ''),
  easProjectId: readEnv('EXPO_PUBLIC_EAS_PROJECT_ID', ''),
}
