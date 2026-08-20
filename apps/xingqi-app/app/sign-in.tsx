/**
 * Full-screen Apple / Google sign-in — same providers as Yuun (iOS keeps both).
 */

import { useTheme } from '@zhop/core-ui'
import { emitPortfolioAppleLinkedGrowth, resolvePortfolioApiUrl } from '@zhop/satellite-runtime'
import * as AppleAuthentication from 'expo-apple-authentication'
import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { XingqiMark } from '@/components/XingqiMark'
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '@/lib/account'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { pickUi } from '@/lib/locale-zh'

function isExpoGo(): boolean {
  if (Constants.executionEnvironment === 'storeClient') return true
  if (Constants.appOwnership === 'expo') return true
  return false
}

export default function SignInScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const rawNext = useLocalSearchParams<{ next?: string | string[] }>().next
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'ios' || isExpoGo()) {
      setAppleAvailable(false)
      return
    }
    void isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  useEffect(() => {
    if (isExpoGo()) {
      setGoogleAvailable(false)
      return
    }
    void isGoogleSignInAvailable().then(setGoogleAvailable)
  }, [])

  const finishSignIn = () => {
    if (next === 'consent') {
      router.replace('/consent')
      return
    }
    if (router.canGoBack()) router.back()
    else router.replace('/(app)')
  }

  const onApple = async () => {
    if (busy) return
    setBusy('apple')
    setError(null)
    try {
      const userId = await signInWithApple()
      if (!userId) return
      void emitPortfolioAppleLinkedGrowth({
        apiBase: resolvePortfolioApiUrl(),
        storagePrefix: PORTFOLIO_STORAGE_PREFIX,
        targetApp: PORTFOLIO_TARGET_APP,
        surface: 'apple_auth',
        credentialPresent: true,
      })
      finishSignIn()
    } catch (err) {
      if (__DEV__) console.error('[Xingqi] Apple sign-in failed', err)
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('portfolio auth')
          ? s(
              '服务器登录失败，请检查网络后重试',
              '伺服器登入失敗，請檢查網路後重試',
              'Server auth failed. Check network and try again.',
              'サーバーへのログインに失敗しました。ネットワークを確認して再試行してください。'
            )
          : s(
              'Apple 登录失败。请确认本机已登录 Apple ID，且 App ID 已开通 Sign in with Apple。',
              'Apple 登入失敗。請確認本機已登入 Apple ID，且 App ID 已開通 Sign in with Apple。',
              'Apple sign-in failed. Confirm Sign in with Apple is enabled for this App ID.',
              'Apple ログインに失敗しました。Apple ID にサインイン済みで、この App ID で Sign in with Apple が有効か確認してください。'
            )
      )
    } finally {
      setBusy(null)
    }
  }

  const onGoogle = async () => {
    if (busy) return
    setBusy('google')
    setError(null)
    try {
      const userId = await signInWithGoogle()
      if (!userId) return
      finishSignIn()
    } catch (err) {
      if (__DEV__) console.error('[Xingqi] Google sign-in failed', err)
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('GOOGLE_WEB_CLIENT')
          ? s(
              '缺少 Google Web Client ID，无法拿到 idToken。',
              '缺少 Google Web Client ID，無法拿到 idToken。',
              'Missing Google Web Client ID (required for idToken).',
              'Google Web Client ID が未設定です。'
            )
          : s(
              'Google 登录失败',
              'Google 登入失敗',
              'Google sign-in failed',
              'Google ログインに失敗しました'
            )
      )
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
        <XingqiMark size={72} />
      </View>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600', textAlign: 'center' }}>
        Syel
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
        {s(
          '登录以保存形气解读，并在多设备同步 Timeline。',
          '登入以保存形氣解讀，並在多裝置同步 Timeline。',
          'Sign in to save form-qi readings and sync Timeline across devices.',
          'ログインして形気リーディングを保存し、Timeline を端末間で同期します。'
        )}
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
              <XingqiLoader size={36} label={s('登录中', '登入中', 'Signing in', 'ログイン中')} />
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: colors.dim, textAlign: 'center', fontSize: 13 }}>
          {s(
            '当前环境不支持 Apple 登录（需真机 Development Build）。',
            '目前環境不支援 Apple 登入（需真機 Development Build）。',
            'Apple Sign-In needs a device development build.',
            'この環境では Apple ログインに対応していません（実機の Development Build が必要です）。'
          )}
        </Text>
      )}

      {googleAvailable ? (
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
            <XingqiLoader size={36} label={s('登录中', '登入中', 'Signing in', 'ログイン中')} />
          ) : (
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {s('通过 Google 登录', '透過 Google 登入', 'Continue with Google', 'Google で続ける')}
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
          {s('稍后再说', '稍後再說', 'Not now', '後で')}
        </Text>
      </Pressable>
    </View>
  )
}
