import Constants from 'expo-constants'
import Purchases from 'react-native-purchases'
import { Platform } from 'react-native'
import { useEffect } from 'react'

function getExtraConfig(): Record<string, unknown> {
  const maybeExtra = Constants.expoConfig?.extra
  if (maybeExtra && typeof maybeExtra === 'object') {
    return maybeExtra
  }
  return {}
}

function isExpoGoRuntime(): boolean {
  const ownership = Constants.appOwnership
  const executionEnvironment = Constants.executionEnvironment
  return ownership === 'expo' || executionEnvironment === 'storeClient'
}

/**
 * RevenueCat public SDK keys use `appl_` / `goog_` (or Test Store `test_`).
 * Placeholder strings in app.json (e.g. REPLACE_WITH_...) are truthy and would
 * call native configure — that can crash the app on launch.
 */
function isLikelyValidRevenueCatPublicKey(key: string, platform: typeof Platform.OS): boolean {
  const k = key.trim()
  if (!k) return false
  if (/replace|placeholder/i.test(k)) return false
  if (k.startsWith('test_')) return true
  if (platform === 'ios') return k.startsWith('appl_')
  if (platform === 'android') return k.startsWith('goog_')
  return false
}

/** Prefer `app.json` extra; fall back to EAS / `.env` (`EXPO_PUBLIC_REVENUECAT_*`) like `hexastral-app`. */
function resolveRevenueCatPublicKey(platform: typeof Platform.OS): string {
  const extra = getExtraConfig()
  const fromExtra =
    platform === 'ios'
      ? typeof extra.REVENUECAT_IOS_API_KEY === 'string'
        ? extra.REVENUECAT_IOS_API_KEY
        : ''
      : platform === 'android'
        ? typeof extra.REVENUECAT_ANDROID_API_KEY === 'string'
          ? extra.REVENUECAT_ANDROID_API_KEY
          : ''
        : ''
  const fromEnv =
    platform === 'ios'
      ? typeof process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY === 'string'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : ''
      : platform === 'android'
        ? typeof process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY === 'string'
          ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
          : ''
        : ''
  if (isLikelyValidRevenueCatPublicKey(fromExtra, platform)) return fromExtra.trim()
  if (isLikelyValidRevenueCatPublicKey(fromEnv, platform)) return fromEnv.trim()
  return ''
}

export function usePurchases(): void {
  useEffect(() => {
    if (isExpoGoRuntime()) {
      return
    }

    const key = resolveRevenueCatPublicKey(Platform.OS)
    if (!key) {
      const extra = getExtraConfig()
      const extraRaw =
        Platform.OS === 'ios'
          ? (typeof extra.REVENUECAT_IOS_API_KEY === 'string' ? extra.REVENUECAT_IOS_API_KEY : '')
          : Platform.OS === 'android'
            ? typeof extra.REVENUECAT_ANDROID_API_KEY === 'string'
              ? extra.REVENUECAT_ANDROID_API_KEY
              : ''
            : ''
      const envRaw =
        Platform.OS === 'ios'
          ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '').trim()
          : Platform.OS === 'android'
            ? (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '').trim()
            : ''
      if (extraRaw.trim().length > 0 || envRaw.length > 0) {
        console.warn(
          '[satellite-runtime] RevenueCat: skipping Purchases.configure — set valid keys in app extra or EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (appl_/goog_/test_)',
        )
      }
      return
    }

    try {
      Purchases.configure({ apiKey: key })
    } catch (error) {
      console.error('Failed to configure RevenueCat Purchases', { error })
    }
  }, [])
}
