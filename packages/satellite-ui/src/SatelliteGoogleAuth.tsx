import { darkTokens } from '@zhop/hexastral-tokens/palette'
import {
  emitPortfolioGoogleLinkedGrowth,
  exchangeGoogleCredentialForPortfolio,
  resolvePortfolioApiUrl,
} from '@zhop/satellite-runtime'
import Constants from 'expo-constants'
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

function isExpoGo(): boolean {
  if (Constants.executionEnvironment === 'storeClient') return true
  if (Constants.appOwnership === 'expo') return true
  return false
}

/**
 * Minimal surface of @react-native-google-signin/google-signin that we call.
 * Hand-written (not `typeof import`) so this file's types don't depend on the
 * native package being installed; the app installs it. signIn()'s shape spans
 * lib majors (idToken at `.data.idToken` on v13+, `.idToken` before), so the
 * caller reads both.
 */
interface GoogleSigninResponse {
  type?: string
  data?: { idToken?: string | null } | null
  idToken?: string | null
}
interface GoogleSigninModule {
  GoogleSignin: {
    configure(config: { iosClientId?: string; webClientId?: string; offlineAccess?: boolean }): void
    hasPlayServices(opts?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>
    signIn(): Promise<GoogleSigninResponse>
  }
}

export interface SatelliteGoogleAuthProps {
  storagePrefix: string
  targetApp: string
  /** Google OAuth iOS client id (…apps.googleusercontent.com). */
  iosClientId?: string
  /** Google OAuth Web client id — required for signIn() to return an idToken. */
  webClientId?: string
  apiBaseOverride?: string
  /** Overrides the default “Continue with Google” label (e.g. i18n). */
  continueLabel?: string
  /** Shown while the Google module is loading. */
  loadingLabel?: string
  /** Shown when Google Sign-In is unavailable (Expo Go, unconfigured, etc.). */
  unavailableLabel?: string
  onAuthed?: (payload: { userId: string; deviceSecret: string }) => void
}

export function SatelliteGoogleAuth(props: SatelliteGoogleAuthProps): ReactElement | null {
  const apiBase = props.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  const moduleRef = useRef<GoogleSigninModule | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // No client id bound yet (待配置) → nothing to sign in against.
  const configured = Boolean(props.webClientId || props.iosClientId)

  useEffect(() => {
    if (!configured || isExpoGo()) {
      setPhase('unavailable')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const mod = (await import(
          '@react-native-google-signin/google-signin'
        )) as unknown as GoogleSigninModule
        if (cancelled) return
        mod.GoogleSignin.configure({
          iosClientId: props.iosClientId,
          webClientId: props.webClientId,
          offlineAccess: false,
        })
        moduleRef.current = mod
        setPhase('ready')
      } catch (err) {
        console.warn('[satellite-ui] Google auth unavailable', err)
        if (!cancelled) setPhase('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [configured, props.iosClientId, props.webClientId])

  const loadingLabel = props.loadingLabel ?? 'Preparing sign-in…'
  const unavailableLabel =
    props.unavailableLabel ??
    'Google Sign-In requires a development or App Store build (not Expo Go).'

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
          const mod = moduleRef.current
          if (!mod) return
          setErrorMsg(null)
          void pressGoogle(
            mod,
            props.storagePrefix,
            props.targetApp,
            apiBase,
            props.onAuthed,
            setErrorMsg
          )
        }}
        accessibilityRole='button'
      >
        <Text style={styles.lbl}>{props.continueLabel ?? 'Continue with Google'}</Text>
      </Pressable>
      {errorMsg ? (
        <Text style={styles.error} accessibilityRole='alert'>
          {errorMsg}
        </Text>
      ) : null}
    </View>
  )
}

async function pressGoogle(
  mod: GoogleSigninModule,
  storagePrefix: string,
  targetApp: string,
  apiBase: string,
  onAuthed?: (payload: { userId: string; deviceSecret: string }) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const res = await mod.GoogleSignin.signIn()
    if (res?.type === 'cancelled') return
    const idToken = res?.data?.idToken ?? res?.idToken ?? null
    if (!idToken) {
      onError?.('Google did not return an idToken (webClientId required)')
      return
    }

    const payload = await exchangeGoogleCredentialForPortfolio({
      idToken,
      targetApp,
      storagePrefix,
      apiBaseOverride: apiBase,
    })
    onAuthed?.(payload)

    await emitPortfolioGoogleLinkedGrowth({
      apiBase,
      storagePrefix,
      targetApp,
      surface: 'google_auth',
      credentialPresent: true,
    })
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    // User dismissed: SIGN_IN_CANCELLED (string) / -5 (iOS) / 12501 (Android).
    if (code === 'SIGN_IN_CANCELLED' || code === '-5' || code === '12501') return
    console.warn('[satellite-ui] google auth failed', err)
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
