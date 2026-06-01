import { darkTokens } from '@zhop/hexastral-tokens/palette'
import Constants from 'expo-constants'
import { type ReactElement, useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { resolvePortfolioApiUrl } from './api-url'
import { emitPortfolioAppleLinkedGrowth } from './auth-apple'

/** Expo Go bundles without full native parity; loading Sign in with Apple there aborts startup. */
function isExpoGo(): boolean {
  if (Platform.OS !== 'ios') return false
  const ex = Constants.executionEnvironment
  if (ex === 'storeClient') return true
  if (Constants.appOwnership === 'expo') return true
  return false
}

type AppleAuthenticationModule = typeof import('expo-apple-authentication')

export interface PortfolioAppleBannerProps {
  storagePrefix: string
  targetApp: string
  apiBaseOverride?: string
}

/**
 * Lightweight Sign in with Apple — emits funnel attribution only (no credential over HTTP yet).
 * expo-apple-authentication is dynamically imported only outside Expo Go to avoid startup crashes when opening via Expo Go.
 */
export function PortfolioAppleBanner(props: PortfolioAppleBannerProps): ReactElement | null {
  const apiBase = props.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  const [appleAuth, setAppleAuth] = useState<AppleAuthenticationModule | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot(): Promise<void> {
      if (Platform.OS !== 'ios') return
      if (isExpoGo()) return

      try {
        const AppleAuthentication = await import('expo-apple-authentication')
        const available = await AppleAuthentication.isAvailableAsync()
        if (cancelled) return
        if (!available) return
        setAppleAuth(() => AppleAuthentication)
      } catch (err) {
        console.warn('[satellite-runtime] Apple Sign-In module unavailable', err)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  if (Platform.OS !== 'ios' || !appleAuth) return null

  const mod = appleAuth

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.btn}
        onPress={() => pressApple(mod, props.storagePrefix, props.targetApp, apiBase)}
        accessibilityRole='button'
      >
        <Text style={styles.lbl}>Continue with Apple (optional)</Text>
      </Pressable>
    </View>
  )
}

async function pressApple(
  AppleAuthentication: AppleAuthenticationModule,
  storagePrefix: string,
  targetApp: string,
  apiBase: string
): Promise<void> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    })

    await emitPortfolioAppleLinkedGrowth({
      apiBase,
      storagePrefix,
      targetApp,
      surface: 'apple_banner',
      credentialPresent: (cred?.user?.length ?? 0) > 0,
    })
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? err.code
        : ''
    if (code === 'ERR_REQUEST_CANCELED') return
    console.warn('[satellite-runtime] apple auth failed', err)
  }
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, width: '100%', maxWidth: 320 },
  btn: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderColor: darkTokens.separator,
    backgroundColor: darkTokens.card,
  },
  lbl: { color: darkTokens.secondary, fontSize: 14, fontWeight: '400' },
})
