/**
 * Yuun Pro paywall — sign-in gate then RevenueCat purchase/restore with
 * localized prices, auto-renew disclosure, and Privacy/Terms links.
 */
import { useTheme } from '@zhop/core-ui'
import { reconcilePortfolioEntitlements } from '@zhop/satellite-runtime'
import { SatelliteBottomSheet, SatellitePaywall } from '@zhop/satellite-ui'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native'
import { MoonLoader } from '@/components/MoonLoader'

import { isSignedIn, signInWithApple, signInWithGoogle } from '@/lib/account'
import { privacyUrl, termsUrl } from '@/lib/config'
import { useStrings } from '@/lib/i18n-context'

const AUSPICE_PRO_PRODUCT_IDS = {
  monthly: 'auspice_pro_monthly',
  annual: 'auspice_pro_annual',
} as const

const AUSPICE_PRO_ENTITLEMENT = 'auspice_pro'

export function AuspicePaywallSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
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
            productIds={AUSPICE_PRO_PRODUCT_IDS}
            entitlementId={AUSPICE_PRO_ENTITLEMENT}
            privacyUrl={privacyUrl(locale)}
            termsUrl={termsUrl(locale)}
            onPurchaseComplete={(result) => {
              if (result === 'success') {
                void reconcilePortfolioEntitlements()
                onClose()
              }
            }}
            onRestoreComplete={(restored) => {
              if (restored) {
                void reconcilePortfolioEntitlements()
                onClose()
              }
            }}
            copy={{
              title: t.proTitle,
              restorePrimary: t.proRestore,
              planLabels: { monthly: t.proMonthly, annual: t.proAnnual },
              loading: t.proLoading,
              purchaseFailed: t.proPurchaseFailed,
              restoreFailed: t.proRestoreFailed,
              restoreSuccess: t.proRestoreSuccess,
              unavailable: t.proUnavailable,
              autoRenewDisclaimer: t.proAutoRenewDisclaimer,
              privacyLabel: t.privacy,
              termsLabel: t.terms,
            }}
          />
        )}

        <Text
          style={{ color: colors.secondary, fontSize: 11, lineHeight: 16, textAlign: 'center' }}
        >
          {t.legalDisclaimerShort}
        </Text>
      </View>
    </SatelliteBottomSheet>
  )
}
