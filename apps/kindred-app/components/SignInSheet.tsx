/**
 * SignInSheet — bottom-sheet sign-in for Kindred (Apple + Google).
 *
 * Why a sheet (not inline buttons): the user asked for the same drawer
 * pattern Auspice / ming-pan use, where the auth UI lifts up from the bottom
 * over a dimmed backdrop. It reads as a deliberate moment ("recover your
 * threads") instead of a passive checklist in Settings.
 *
 * Provider wiring:
 *   - Apple: `expo-apple-authentication` (already in kindred deps), with
 *     EMAIL + FULL_NAME scopes so we capture the email for recovery on
 *     first-ever authorization.
 *   - Google: `@react-native-google-signin/google-signin` (NOT a direct
 *     kindred dep yet — it's a peer dep of satellite-ui that the user must
 *     install separately + configure native iOS). Loaded via dynamic import
 *     mirroring `packages/satellite-ui/src/SatelliteGoogleAuth.tsx`; if the
 *     module isn't installed at runtime we just hide the Google button.
 *
 * Both providers route through kindred's own auth context (`linkApple`,
 * `linkGoogle` → `/api/onboarding/{apple,google}-link`), NOT the satellite
 * portfolio flow. That keeps the kindred user identity separate from
 * portfolio accounts (kindred users have bonds; portfolio users don't).
 *
 * Configuration the user must provision before Google works end-to-end:
 *   1. Install `@react-native-google-signin/google-signin` (peer dep already
 *      in satellite-ui — just `bun install` after adding to package.json).
 *   2. Configure native iOS (URL schemes from GoogleService-Info.plist).
 *   3. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
 *      in the kindred env.
 *   4. Set `GOOGLE_OAUTH_AUDIENCES` on the hexastral-api worker — that's the
 *      comma-separated list of OAuth client ids the server JWT-verifies
 *      against (see apps/hexastral-api/src/routes/onboarding/google-link.ts).
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import Constants from 'expo-constants'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'

import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'

const EXIT_MS = 240

// Hand-rolled minimal surface of the Google sign-in module. Same trick
// satellite-ui uses so this file compiles even when the native package
// isn't installed; the runtime catch hides the button if so.
interface GoogleSigninModule {
  GoogleSignin: {
    configure(config: {
      iosClientId?: string
      webClientId?: string
      offlineAccess?: boolean
    }): void
    hasPlayServices(opts?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>
    signIn(): Promise<{
      type?: string
      data?: { idToken?: string | null } | null
      idToken?: string | null
    }>
  }
}

function isExpoGo(): boolean {
  if (Constants.executionEnvironment === 'storeClient') return true
  if (Constants.appOwnership === 'expo') return true
  return false
}

export interface SignInSheetProps {
  visible: boolean
  onClose: () => void
  /** Fires after a provider returns 'linked' | 'recovered' | 'already_linked'. */
  onAuthed?: () => void
}

export function SignInSheet({ visible, onClose, onAuthed }: SignInSheetProps) {
  const locale = resolveLocale()
  const { linkApple, linkGoogle, refreshProfile } = useAuth()
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [googlePhase, setGooglePhase] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const googleModuleRef = useRef<GoogleSigninModule | null>(null)
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mount-guard so animation can finish before the Modal unmounts.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (visible) {
      setMounted(true)
      setError(null)
    } else if (mounted) {
      const id = setTimeout(() => setMounted(false), EXIT_MS)
      return () => clearTimeout(id)
    }
  }, [visible, mounted])

  // Apple availability — iOS only, not in Expo Go.
  useEffect(() => {
    if (Platform.OS !== 'ios' || isExpoGo()) {
      setAppleAvailable(false)
      return
    }
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false))
  }, [])

  // Google availability — dynamic-import the native module so the file still
  // compiles + runs when the lib isn't installed. The button hides itself
  // when no client ids are set OR the lib isn't present.
  useEffect(() => {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
    if (!iosClientId && !webClientId) {
      setGooglePhase('unavailable')
      return
    }
    if (isExpoGo()) {
      // Native module requires a dev client / release build.
      setGooglePhase('unavailable')
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
          iosClientId: iosClientId || undefined,
          webClientId: webClientId || undefined,
          offlineAccess: false,
        })
        googleModuleRef.current = mod
        setGooglePhase('ready')
      } catch (err) {
        if (__DEV__) console.warn('[Kindred SignInSheet] Google module unavailable', err)
        if (!cancelled) setGooglePhase('unavailable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleApple = async () => {
    if (busy) return
    setBusy('apple')
    setError(null)
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!cred.identityToken) throw new Error('Apple returned no identity token')
      const fullName = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim()
      await linkApple({
        identityToken: cred.identityToken,
        fullName: fullName || undefined,
      })
      await refreshProfile()
      onAuthed?.()
      onClose()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_REQUEST_CANCELED') {
        setBusy(null)
        return
      }
      setError(err instanceof Error ? err.message : t(locale, 'settings.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  const handleGoogle = async () => {
    const mod = googleModuleRef.current
    if (!mod || busy) return
    setBusy('google')
    setError(null)
    try {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      const res = await mod.GoogleSignin.signIn()
      if (res?.type === 'cancelled') {
        setBusy(null)
        return
      }
      const idToken = res?.data?.idToken ?? res?.idToken ?? null
      if (!idToken) {
        throw new Error('Google did not return an idToken (webClientId required)')
      }
      await linkGoogle({ identityToken: idToken })
      await refreshProfile()
      onAuthed?.()
      onClose()
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      if (code === 'SIGN_IN_CANCELLED' || code === '-5' || code === '12501') {
        setBusy(null)
        return
      }
      setError(err instanceof Error ? err.message : t(locale, 'settings.error.generic'))
    } finally {
      setBusy(null)
    }
  }

  if (!mounted) return null

  return (
    <Modal
      visible
      animationType='none'
      presentationStyle='overFullScreen'
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible ? (
        <>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(EXIT_MS)}
            style={S.backdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(260)}
            exiting={SlideOutDown.duration(EXIT_MS)}
            style={S.sheetWrap}
            pointerEvents='box-none'
          >
            <View style={S.sheet}>
              <View style={S.handle} />
              <Text style={[kindredType.title, S.title]}>
                {t(locale, 'signIn.title')}
              </Text>
              <Text style={[kindredType.caption, S.hint]}>
                {t(locale, 'signIn.hint')}
              </Text>

              {appleAvailable && Platform.OS === 'ios' ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={8}
                  style={S.appleBtn}
                  onPress={handleApple}
                />
              ) : (
                <Pressable
                  onPress={handleApple}
                  disabled={!appleAvailable || busy !== null}
                  style={[S.providerBtn, S.appleFallback, !appleAvailable && S.disabled]}
                >
                  {busy === 'apple' ? (
                    <ActivityIndicator color={kindredDark.bg} />
                  ) : (
                    <Text style={[kindredType.body, S.appleLabel]}>
                      {appleAvailable
                        ? t(locale, 'signIn.appleCta')
                        : t(locale, 'signIn.appleUnavailable')}
                    </Text>
                  )}
                </Pressable>
              )}

              {googlePhase === 'ready' ? (
                <Pressable
                  onPress={handleGoogle}
                  disabled={busy !== null}
                  style={[S.providerBtn, S.googleBtn]}
                >
                  {busy === 'google' ? (
                    <ActivityIndicator color={kindredDark.text} />
                  ) : (
                    <Text style={[kindredType.body, S.googleLabel]}>
                      {t(locale, 'signIn.googleCta')}
                    </Text>
                  )}
                </Pressable>
              ) : googlePhase === 'loading' ? (
                <View style={[S.providerBtn, S.googleBtn]}>
                  <ActivityIndicator color={kindredDark.textMuted} />
                </View>
              ) : null}

              {error ? (
                <Text style={[kindredType.caption, S.error]}>{error}</Text>
              ) : null}

              <Pressable onPress={onClose} hitSlop={12} style={S.cancelBtn}>
                <Text style={[kindredType.caption, S.cancelLabel]}>
                  {t(locale, 'signIn.cancel')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </>
      ) : null}
    </Modal>
  )
}

const S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: kindredDark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: kindredSpacing.screenH,
    paddingTop: 12,
    paddingBottom: kindredSpacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: kindredDark.border,
    gap: kindredSpacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: kindredDark.border,
    marginBottom: kindredSpacing.md,
  },
  title: { color: kindredDark.text, textAlign: 'center' },
  hint: {
    color: kindredDark.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: kindredSpacing.md,
  },
  appleBtn: { width: '100%', height: 48 },
  providerBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleFallback: { backgroundColor: kindredDark.text },
  appleLabel: { color: kindredDark.bg, fontWeight: '500' },
  googleBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: kindredDark.borderStrong,
  },
  googleLabel: { color: kindredDark.text, fontWeight: '500' },
  disabled: { opacity: 0.5 },
  error: { color: kindredDark.seal, textAlign: 'center', marginTop: -4 },
  cancelBtn: { alignSelf: 'center', marginTop: 4 },
  cancelLabel: { color: kindredDark.textMuted, textDecorationLine: 'underline' },
})
