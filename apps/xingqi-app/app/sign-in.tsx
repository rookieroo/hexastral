/**
 * Full-screen sign-in (Kanyu/Yuel pattern) — NOT a sheet stacked on modals.
 * Uses Apple's official AppleAuthenticationButton for entitlement compliance.
 */

import { useTheme } from '@zhop/core-ui'
import {
  emitPortfolioAppleLinkedGrowth,
  exchangeAppleCredentialForPortfolio,
  exchangeGoogleCredentialForPortfolio,
  resolvePortfolioApiUrl,
} from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { loginFaceIap } from '@/lib/iap'
import { resolveLocale } from '@/lib/i18n'

interface GoogleSigninModule {
  GoogleSignin: {
    configure(config: { iosClientId?: string; webClientId?: string; offlineAccess?: boolean }): void
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

function isAppleCancel(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED'
}

export default function SignInScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [googlePhase, setGooglePhase] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const googleModuleRef = useRef<GoogleSigninModule | null>(null)
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'ios' || isExpoGo()) {
      setAppleAvailable(false)
      return
    }
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false))
  }, [])

  useEffect(() => {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
    if (!iosClientId && !webClientId) {
      setGooglePhase('unavailable')
      return
    }
    if (isExpoGo()) {
      setGooglePhase('unavailable')
      return
    }
    void (async () => {
      try {
        const mod = (await import(
          // @ts-expect-error optional peer — may be absent
          '@react-native-google-signin/google-signin'
        )) as GoogleSigninModule
        mod.GoogleSignin.configure({
          iosClientId: iosClientId || undefined,
          webClientId: webClientId || undefined,
          offlineAccess: false,
        })
        googleModuleRef.current = mod
        setGooglePhase('ready')
      } catch {
        setGooglePhase('unavailable')
      }
    })()
  }, [])

  const onApple = async () => {
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
      if (!cred.identityToken) throw new Error('no_identity_token')
      const { userId } = await exchangeAppleCredentialForPortfolio({
        identityToken: cred.identityToken,
        authorizationCode: cred.authorizationCode,
        targetApp: PORTFOLIO_TARGET_APP,
      })
      await loginFaceIap(userId)
      void emitPortfolioAppleLinkedGrowth({
        apiBase: resolvePortfolioApiUrl(),
        storagePrefix: PORTFOLIO_STORAGE_PREFIX,
        targetApp: PORTFOLIO_TARGET_APP,
        surface: 'apple_auth',
        credentialPresent: true,
      })
      if (router.canGoBack()) router.back()
      else router.replace('/(app)')
    } catch (err) {
      if (isAppleCancel(err)) return
      if (__DEV__) console.error('[Xingqi] Apple sign-in failed', err)
      const msg = err instanceof Error ? err.message : ''
      setError(
        zh
          ? msg.includes('portfolio auth')
            ? '服务器登录失败，请检查网络后重试'
            : 'Apple 登录失败。请确认本机已登录 Apple ID，且 App ID 已开通 Sign in with Apple。'
          : msg.includes('portfolio auth')
            ? 'Server auth failed. Check network and try again.'
            : 'Apple sign-in failed. Confirm Sign in with Apple is enabled for this App ID.'
      )
    } finally {
      setBusy(null)
    }
  }

  const onGoogle = async () => {
    if (busy || !googleModuleRef.current) return
    setBusy('google')
    setError(null)
    try {
      const mod = googleModuleRef.current
      if (Platform.OS === 'android') {
        await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      }
      const result = await mod.GoogleSignin.signIn()
      const idToken = result.data?.idToken ?? result.idToken ?? null
      if (!idToken) throw new Error('no_token')
      const { userId } = await exchangeGoogleCredentialForPortfolio({
        idToken,
        targetApp: PORTFOLIO_TARGET_APP,
      })
      await loginFaceIap(userId)
      if (router.canGoBack()) router.back()
      else router.replace('/(app)')
    } catch (err) {
      if (__DEV__) console.error('[Xingqi] Google sign-in failed', err)
      setError(zh ? 'Google 登录失败' : 'Google sign-in failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <XingqiMark size={72} color={colors.accent} />
      </View>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600', textAlign: 'center' }}>
        Xingqi
      </Text>
      <Text
        style={{
          color: colors.secondary,
          fontSize: 15,
          lineHeight: 22,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}
      >
        {zh
          ? '登录以保存形气解读，并在多设备同步 Timeline。'
          : 'Sign in to save readings and sync Timeline across devices.'}
      </Text>

      {appleAvailable ? (
        <View style={{ opacity: busy === 'apple' ? 0.6 : 1 }}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={0}
            style={{ width: '100%', height: 48 }}
            onPress={() => void onApple()}
          />
          {busy === 'apple' ? (
            <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <XingqiLoader size={36} label={zh ? '登录中' : 'Signing in'} />
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: colors.dim, textAlign: 'center', fontSize: 13 }}>
          {zh
            ? '当前环境不支持 Apple 登录（需真机 Development Build）。'
            : 'Apple Sign-In needs a device development build.'}
        </Text>
      )}

      {googlePhase === 'ready' ? (
        <Pressable
          onPress={() => void onGoogle()}
          disabled={busy != null}
          style={{
            borderWidth: 0.5,
            borderColor: colors.separator,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          {busy === 'google' ? (
            <XingqiLoader size={36} label={zh ? '登录中' : 'Signing in'} />
          ) : (
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {zh ? '通过 Google 登录' : 'Continue with Google'}
            </Text>
          )}
        </Pressable>
      ) : null}

      {error ? (
        <Text style={{ color: colors.accent, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}

      <Pressable onPress={() => router.back()} style={{ paddingVertical: spacing.md }}>
        <Text style={{ color: colors.secondary, textAlign: 'center' }}>
          {zh ? '稍后再说' : 'Not now'}
        </Text>
      </Pressable>
    </View>
  )
}
