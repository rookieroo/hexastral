/**
 * Auspice Pro paywall sheet — wraps @zhop/satellite-ui SatelliteBottomSheet +
 * SatellitePaywall. Free tier sees top-3 宜忌; Pro unlocks the full lists + 对你而言
 * personalization + the specialized 择日 drill-ins + the personal calendar feed.
 *
 * Login-at-subscribe (2026-06): the free 黄历 is anonymous, but subscribing
 * requires sign-in first, so the subscription is a portable cross-app identity
 * (universe_pro continuity + Bonds → Kindred carry-over). The sheet shows the
 * sign-in gate when not signed in, then the purchase options. See lib/account.ts.
 */
import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet, SatellitePaywall } from '@zhop/satellite-ui'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native'
import { MoonLoader } from '@/components/MoonLoader'

import { isSignedIn, signInWithApple, signInWithGoogle } from '@/lib/account'
import { useStrings } from '@/lib/i18n-context'

const CYCLE_PRO_PRODUCT_IDS = {
  monthly: 'auspice_pro_monthly',
  annual: 'auspice_pro_annual',
} as const

export function AuspicePaywallSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const scheme = useColorScheme()
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!visible) return
    isSignedIn()
      .then(setSignedIn)
      .catch(() => setSignedIn(false))
  }, [visible])

  const runSignIn = async (fn: () => Promise<string | null>) => {
    setSigningIn(true)
    setFailed(false)
    try {
      const userId = await fn()
      if (userId) setSignedIn(true)
    } catch {
      setFailed(true)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <SatelliteBottomSheet visible={visible} onClose={onClose} title={t.proTitle}>
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {t.proSubtitle}
        </Text>

        {/* What Pro unlocks — explicit, localized benefit list. */}
        <View style={{ gap: spacing.sm }}>
          {t.proBenefits.map((benefit) => (
            <View key={benefit} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Text style={{ color: colors.accent, fontSize: 13, lineHeight: 20 }}>✓</Text>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20, flex: 1 }}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {signedIn === null ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <MoonLoader />
          </View>
        ) : signedIn === false ? (
          // ── Login-at-subscribe gate ──
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
              {t.signInToSubscribe}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
              {t.signInBenefit}
            </Text>
            {signingIn ? (
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
            {failed ? (
              <Text style={{ color: colors.danger, fontSize: 12 }}>{t.signInError}</Text>
            ) : null}
          </View>
        ) : (
          <SatellitePaywall
            productIds={CYCLE_PRO_PRODUCT_IDS}
            onRestore={onClose}
            copy={{
              title: t.proTitle,
              restorePrimary: t.proRestore,
              planLabels: { monthly: t.proMonthly, annual: t.proAnnual },
            }}
          />
        )}
      </View>
    </SatelliteBottomSheet>
  )
}
