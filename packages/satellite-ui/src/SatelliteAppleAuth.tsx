import { darkTokens } from '@zhop/hexastral-tokens/palette'
import {
  emitPortfolioAppleLinkedGrowth,
  exchangeAppleCredentialForPortfolio,
  resolvePortfolioApiUrl,
} from '@zhop/satellite-runtime'
import Constants from 'expo-constants'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

function isExpoGo(): boolean {
  if (Platform.OS !== 'ios') return false
  const ex = Constants.executionEnvironment
  if (ex === 'storeClient') return true
  if (Constants.appOwnership === 'expo') return true
  return false
}

type AppleAuthenticationModule = typeof import('expo-apple-authentication')

export interface SatelliteAppleAuthProps {
  storagePrefix: string
  targetApp: string
  apiBaseOverride?: string
  /** Overrides the default “Continue with Apple” label (e.g. i18n). */
  continueLabel?: string
  /** Shown while Apple Authentication is loading (iOS only). */
  loadingLabel?: string
  /** Shown when Sign in with Apple is not available (Expo Go, simulator, etc.). */
  unavailableLabel?: string
  onAuthed?: (payload: { userId: string; deviceSecret: string }) => void
}

export function SatelliteAppleAuth(props: SatelliteAppleAuthProps): ReactElement | null {
  const apiBase = props.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  const appleAuthRef = useRef<AppleAuthenticationModule | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    if (isExpoGo()) {
      setPhase('unavailable')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const AppleAuthentication = await import('expo-apple-authentication')
        const available = await AppleAuthentication.isAvailableAsync()
        if (cancelled) return
        if (!available) {
          setPhase('unavailable')
          return
        }
        appleAuthRef.current = AppleAuthentication
        setPhase('ready')
      } catch (err) {
        console.warn('[satellite-ui] Apple auth unavailable', err)
        if (!cancelled) setPhase('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (Platform.OS !== 'ios') return null

  const loadingLabel = props.loadingLabel ?? 'Preparing sign-in…'
  const unavailableLabel =
    props.unavailableLabel ??
    'Sign in with Apple requires a development or App Store build (not Expo Go).'

  if (phase === 'loading') {
    return (
      <View style={[styles.btn, styles.loadingRow]} accessibilityRole='progressbar'>
        <ActivityIndicator color={darkTokens.text} />
        <Text style={styles.loadingLbl}>{loadingLabel}</Text>
      </View>
    )
  }

  if (phase === 'unavailable') {
    return (
      <Text style={styles.hint} accessibilityRole='text'>
        {unavailableLabel}
      </Text>
    )
  }

  return (
    <View>
      <Pressable
        style={styles.btn}
        onPress={() => {
          const AppleAuthentication = appleAuthRef.current
          if (!AppleAuthentication) return
          setErrorMsg(null)
          void pressApple(
            AppleAuthentication,
            props.storagePrefix,
            props.targetApp,
            apiBase,
            props.onAuthed,
            setErrorMsg
          )
        }}
        accessibilityRole='button'
      >
        <Text style={styles.lbl}>{props.continueLabel ?? 'Continue with Apple'}</Text>
      </Pressable>
      {errorMsg ? (
        <Text style={styles.error} accessibilityRole='alert'>
          {errorMsg}
        </Text>
      ) : null}
    </View>
  )
}

async function pressApple(
  AppleAuthentication: AppleAuthenticationModule,
  storagePrefix: string,
  targetApp: string,
  apiBase: string,
  onAuthed?: (payload: { userId: string; deviceSecret: string }) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    })
    if (!cred.identityToken) {
      onError?.('Apple did not return an identityToken')
      return
    }

    const payload = await exchangeAppleCredentialForPortfolio({
      identityToken: cred.identityToken,
      authorizationCode: cred.authorizationCode,
      targetApp,
      apiBaseOverride: apiBase,
    })
    onAuthed?.(payload)

    await emitPortfolioAppleLinkedGrowth({
      apiBase,
      storagePrefix,
      targetApp,
      surface: 'apple_auth',
      credentialPresent: true,
    })
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    if (code === 'ERR_REQUEST_CANCELED') return
    console.warn('[satellite-ui] apple auth failed', err)
    onError?.(err instanceof Error ? err.message : String(err))
  }
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 0.5,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderColor: darkTokens.separator,
    backgroundColor: darkTokens.card,
    minWidth: 220,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  loadingLbl: { color: darkTokens.secondary, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  lbl: { color: darkTokens.secondary, fontSize: 14, fontWeight: '500' },
  hint: { color: darkTokens.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  error: {
    color: '#c0584a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
})
