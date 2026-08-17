/**
 * Reusable Apple/Google sign-in gate for Yuun (birth entry + subscribe).
 * Does not open the paywall — caller continues its own flow after success.
 */

import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native'
import { MoonLoader } from '@/components/MoonLoader'
import { isSignedIn, signInWithApple, signInWithGoogle } from '@/lib/account'
import { useStrings } from '@/lib/i18n-context'

export function AuspiceSignInSheet({
  visible,
  onClose,
  onSignedIn,
  title,
  subtitle,
}: {
  visible: boolean
  onClose: () => void
  onSignedIn: (userId: string) => void
  title?: string
  subtitle?: string
}) {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const scheme = useColorScheme()
  const [checking, setChecking] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [failedMsg, setFailedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setChecking(true)
    setFailedMsg(null)
    isSignedIn()
      .then((ok) => {
        if (ok) {
          // Already signed in — close gate; parent should proceed.
          onClose()
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [visible, onClose])

  const runSignIn = async (fn: () => Promise<string | null>) => {
    setSigningIn(true)
    setFailedMsg(null)
    try {
      const userId = await fn()
      if (userId) onSignedIn(userId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[yuun.signin] failed', msg)
      // Pre-launch: surface the REAL reason — the generic copy hides everything
      // ("portfolio auth failed: 401" vs "development build required" vs native
      // Google errors are all different fixes). Re-gate to DEV-only at launch polish.
      setFailedMsg(msg)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <SatelliteBottomSheet
      visible={visible}
      onClose={onClose}
      title={title ?? t.signInForBirthTitle}
    >
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {subtitle ?? t.signInForBirthBenefit}
        </Text>

        {checking || signingIn ? (
          <View style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <MoonLoader size={32} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  scheme === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={12}
                style={{ height: 48 }}
                onPress={() => {
                  void runSignIn(signInWithApple)
                }}
              />
            ) : null}
            <Pressable
              onPress={() => {
                void runSignIn(signInWithGoogle)
              }}
              accessibilityRole='button'
              accessibilityLabel={t.signInWithGoogle}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: colors.separator,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>
                {t.signInWithGoogle}
              </Text>
            </Pressable>
          </View>
        )}
        {failedMsg ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t.signInError}</Text>
            <Text style={{ color: colors.danger, fontSize: 11, lineHeight: 15 }}>
              [{failedMsg}]
            </Text>
          </View>
        ) : null}
      </View>
    </SatelliteBottomSheet>
  )
}
