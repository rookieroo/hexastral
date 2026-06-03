/**
 * Kindred paywall — modal triggered when bond quota is exhausted (≥4 bonds on free).
 *
 * Two SKUs: monthly + annual (default highlight = annual). Both grant the
 * `hexastral_kindred_pro` RevenueCat entitlement.
 *
 * Auth gate (2026-06): if the user has no recovery method attached (no
 * Apple-link, no Google-link, no email), we render an inline sign-in step
 * BEFORE the price picker. A subscription tied to an anonymous device-id
 * evaporates on phone loss / reinstall — surfacing the auth step here keeps
 * people from buying into a wallet they can't restore. The sign-in itself
 * lifts the multi-provider `<SignInSheet>` (Apple + Google), same drawer
 * the user sees in Settings.
 *
 * Hero uses the cinnabar phase-moon (KindredMoon) — not the KindredSeal,
 * which carried the 緣 glyph the user asked us to drop from the paywall.
 *
 * Reached via:
 *   router.push({ pathname: '/(commerce)/paywall', params: { reason } })
 * from any quota-blocked screen (invite-email, reveal, future settings upgrade button).
 */

import { PaywallView } from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { SignInSheet } from '@/components/SignInSheet'
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
  const { userEmail } = useAuth()
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    void getYuanOfferings().then(setOfferings)
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
  // set after an OTP email bind OR after Apple/Google sign-in with the email
  // scope (Apple via FULL_NAME+EMAIL, Google always sends email). If null
  // the user is anonymous device-id only; we route through SignInSheet first.
  const needsAuth = userEmail === null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      {needsAuth ? (
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
            style={[kindredType.title, { color: kindredDark.text, textAlign: 'center' }]}
          >
            {t(locale, 'paywall.signInTitle')}
          </Text>
          <Text
            style={[
              kindredType.body,
              { color: kindredDark.textSecondary, textAlign: 'center', lineHeight: 22 },
            ]}
          >
            {t(locale, 'paywall.signInHint')}
          </Text>

          <Pressable
            onPress={() => setSignInOpen(true)}
            style={({ pressed }) => ({
              marginTop: kindredSpacing.md,
              paddingVertical: kindredSpacing.md,
              backgroundColor: kindredDark.text,
              borderRadius: 8,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[kindredType.body, { color: kindredDark.bg, fontWeight: '500' }]}>
              {t(locale, 'signIn.title')}
            </Text>
          </Pressable>

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

      <SignInSheet visible={signInOpen} onClose={() => setSignInOpen(false)} />
    </SafeAreaView>
  )
}
