import { useTheme } from '@zhop/core-ui'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { resolveLocale, useStrings } from '@/lib/i18n'

export function SignInScreen() {
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const t = useStrings(resolveLocale())
  const { signInWithApple, signInWithGoogle, signInAsGuest } = useAuth()

  const showApple = Platform.OS === 'ios'
  const showGoogle = Platform.OS === 'android' || Platform.OS === 'ios'

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 56, color: colors.accent, textAlign: 'center' }}>風</Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
          marginTop: spacing.md,
        }}
      >
        {t.appName}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.secondary,
          textAlign: 'center',
          marginTop: spacing.sm,
          lineHeight: 22,
          marginBottom: spacing.xl,
        }}
      >
        {t.sign_in_hint}
      </Text>

      {showApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={0}
          style={{ width: '100%', height: 48, marginBottom: spacing.md }}
          onPress={() => {
            void signInWithApple().catch((err: unknown) => {
              const code = (err as { code?: string }).code
              if (code === 'ERR_REQUEST_CANCELED') return
              if (__DEV__) console.error('[Fēng auth] Apple sign-in failed', err)
            })
          }}
        />
      ) : null}

      {showGoogle ? (
        <Pressable
          onPress={() => {
            void signInWithGoogle().catch((err) => {
              if (__DEV__) console.error('[Fēng auth] Google sign-in failed', err)
            })
          }}
          style={{
            width: '100%',
            paddingVertical: 14,
            borderWidth: 0.5,
            borderColor: colors.separator,
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
            {t.sign_in_google}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          void signInAsGuest()
        }}
        style={{ paddingVertical: spacing.md, alignItems: 'center' }}
      >
        <Text style={{ color: colors.secondary, fontSize: 15 }}>{t.sign_in_guest}</Text>
      </Pressable>
    </View>
  )
}
