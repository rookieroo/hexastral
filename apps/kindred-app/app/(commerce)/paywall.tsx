/**
 * Kindred paywall — modal triggered when bond quota is exhausted (≥4 bonds on free).
 *
 * Two SKUs: monthly + annual (default highlight = annual). Both grant the
 * `hexastral_kindred_pro` RevenueCat entitlement.
 *
 * Auth gate (2026-06): if the user has no recovery method attached (no
 * Apple-link, no email), we render an inline sign-in step BEFORE the price
 * picker. A subscription tied to an anonymous device-id evaporates on phone
 * loss / reinstall — surfacing the auth step here keeps people from buying
 * into a wallet they can't restore.
 *
 * Hero now uses the cinnabar phase-moon (KindredMoon) instead of the
 * KindredSeal disc, which carried the 緣 glyph — the user said the seal
 * shouldn't show up inside the paywall ("仍然是 缘 字logo"), and the moon
 * matches the rest of the brand surface in the app.
 *
 * Reached via:
 *   router.push({ pathname: '/(commerce)/paywall', params: { reason } })
 * from any quota-blocked screen (invite-email, reveal, future settings upgrade button).
 */

import { PaywallView } from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { useAuth } from '@/lib/auth'
import {
  getYuanOfferings,
  type KindredOfferings,
  purchaseKindredPro,
  restoreKindredPurchases,
  YUAN_PRODUCT_IDS,
} from '@/lib/iap'
import { resolveLocale, t } from '@/lib/i18n'

export default function PaywallScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { reason } = useLocalSearchParams<{ reason?: string }>()
  const [offerings, setOfferings] = useState<KindredOfferings | null>(null)
  const { userEmail, linkApple, refreshProfile } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    void getYuanOfferings().then(setOfferings)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
    }
  }, [])

  const palette = useMemo(
    () => ({
      background: kindredDark.bg,
      text: kindredDark.text,
      textSecondary: kindredDark.textSecondary,
      textMuted: kindredDark.textMuted,
      border: kindredDark.border,
      card: kindredDark.card,
      accent: kindredDark.accent,
    }),
    []
  )

  const copy = useMemo(
    () => ({
      title: t(locale, 'paywall.title'),
      subtitle: t(locale, 'paywall.subtitle'),
      planLabels: {
        monthly: t(locale, 'paywall.monthly'),
        annual: t(locale, 'paywall.annual'),
      },
      planBadges: {
        annual: t(locale, 'paywall.bestValue'),
      },
      cta: t(locale, 'paywall.cta'),
      ctaPurchasing: t(locale, 'paywall.cta'),
      successLabel: t(locale, 'paywall.success'),
      restoreLabel: t(locale, 'paywall.restore'),
      restoreLoadingLabel: '…',
      closeLabel: t(locale, 'paywall.close'),
      errorFailed: t(locale, 'paywall.failed'),
      errorUnavailable: t(locale, 'paywall.unavailable'),
    }),
    [locale]
  )

  // userEmail is the simplest "do they have a recovery handle?" signal. It's
  // set after an OTP email bind OR after an Apple sign-in (with EMAIL scope,
  // which we now request — see (settings)/index.tsx handleApple). If null,
  // the user is anonymous device-id only and would lose any purchase on
  // device-loss; we route through sign-in first.
  const needsAuth = userEmail === null

  const handleApple = async () => {
    if (signingIn) return
    setSigningIn(true)
    setSignInError(null)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('Apple returned no identity token')
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim()
      await linkApple({
        identityToken: credential.identityToken,
        fullName: fullName || undefined,
      })
      await refreshProfile()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_REQUEST_CANCELED') {
        setSigningIn(false)
        return
      }
      setSignInError(err instanceof Error ? err.message : t(locale, 'settings.error.generic'))
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      {needsAuth ? (
        // Inline auth gate — sits in front of the paywall until the user has
        // a recovery handle. Same KindredMoon hero so the surface still feels
        // like the paywall; pressing Apple lifts the gate and the paywall
        // re-renders without a route change.
        <View
          style={{
            flex: 1,
            paddingHorizontal: kindredSpacing.screenH,
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: kindredSpacing.md }}>
            <KindredMoon size={96} />
          </View>
          <Text
            style={[
              kindredType.title,
              { color: kindredDark.text, textAlign: 'center' },
            ]}
          >
            {t(locale, 'paywall.signInTitle')}
          </Text>
          <Text
            style={[
              kindredType.body,
              {
                color: kindredDark.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              },
            ]}
          >
            {t(locale, 'paywall.signInHint')}
          </Text>
          {appleAvailable && Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ width: '100%', height: 48, marginTop: kindredSpacing.md }}
              onPress={handleApple}
            />
          ) : (
            <Pressable
              onPress={handleApple}
              disabled={signingIn}
              style={{
                marginTop: kindredSpacing.md,
                paddingVertical: kindredSpacing.md,
                borderWidth: 0.5,
                borderColor: kindredDark.border,
                alignItems: 'center',
                opacity: signingIn ? 0.6 : 1,
              }}
            >
              {signingIn ? (
                <ActivityIndicator color={kindredDark.text} />
              ) : (
                <Text style={[kindredType.body, { color: kindredDark.text }]}>
                  {t(locale, 'paywall.signInCta')}
                </Text>
              )}
            </Pressable>
          )}
          {signInError ? (
            <Text
              style={[
                kindredType.caption,
                {
                  color: kindredDark.seal,
                  textAlign: 'center',
                  marginTop: kindredSpacing.sm,
                },
              ]}
            >
              {signInError}
            </Text>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{ alignSelf: 'center', marginTop: kindredSpacing.lg }}
          >
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textMuted, textDecorationLine: 'underline' },
              ]}
            >
              {t(locale, 'paywall.close')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <PaywallView
          reason={reason}
          productIds={YUAN_PRODUCT_IDS}
          prices={{
            monthly: offerings?.monthlyPriceString ?? null,
            annual: offerings?.annualPriceString ?? null,
          }}
          bullets={[
            t(locale, 'paywall.bullet.unlimited'),
            t(locale, 'paywall.bullet.deep'),
            t(locale, 'paywall.bullet.support'),
          ]}
          copy={copy}
          brand={palette}
          defaultPlan='annual'
          hero={<KindredMoon size={96} />}
          onClose={() => router.back()}
          onPurchase={async (productId) => {
            const plan = productId === YUAN_PRODUCT_IDS.annual ? 'annual' : 'monthly'
            return purchaseKindredPro(plan)
          }}
          onRestore={restoreKindredPurchases}
        />
      )}
    </SafeAreaView>
  )
}
