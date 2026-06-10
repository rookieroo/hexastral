/**
 * Runtime configuration sourced from EXPO_PUBLIC_* env vars + app.json `extra`.
 * Centralised so the rest of the app never reads `process.env` directly.
 */

import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>

function readEnv(key: string, fallback: string): string {
  const value = process.env[key]
  if (typeof value === 'string' && value.length > 0) return value
  const extraValue = extra[key]
  if (typeof extraValue === 'string' && extraValue.length > 0) return extraValue
  return fallback
}

export const config = {
  apiUrl: readEnv('EXPO_PUBLIC_API_URL', 'https://api.hexastral.com'),
  env: readEnv('EXPO_PUBLIC_ENV', 'development') as 'development' | 'preview' | 'production',
  revenueCat: {
    ios: readEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY', ''),
    android: readEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY', ''),
  },
  easProjectId: readEnv('EXPO_PUBLIC_EAS_PROJECT_ID', ''),
} as const

export const isDev = config.env === 'development'
export const isProduction = config.env === 'production'
