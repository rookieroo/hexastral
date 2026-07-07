/**
 * Kindred paywall — modal triggered when bond quota is exhausted (≥4 bonds on free).
 *
 * Two SKUs: monthly + annual (default highlight = annual). Both grant the
 * `kindred_pro` RevenueCat entitlement.
 *
 * Auth gate (2026-06): if the user has no recovery method attached (no
 * Apple-link, no Google-link, no email), we render an inline sign-in step
 * BEFORE the price picker. A subscription tied to an anonymous device-id
 * evaporates on phone loss / reinstall — surfacing the auth step here keeps
 * people from buying into a wallet they can't restore. The sign-in itself
 * lifts the multi-provider `<SignInSheet>` (Apple + Google), same drawer
 * the user sees in Settings.
 *
 * Hero uses the vertical Yuel knot mark (YuelMark) in cinnabar — the brand
 * crest the rest of the suite leads with.
 *
 * Reached via:
 *   router.push({ pathname: '/(commerce)/paywall', params: { reason } })
 * from any quota-blocked screen (invite-email, reveal, future settings upgrade button).
 */

import { PaywallView } from '@zhop/core-ui'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SignInSheet } from '@/components/SignInSheet'
import { YuelMark } from '@/components/YuelMark'
import { useAuth } from '@/lib/auth'
import { resolveLocale, t } from '@/lib/i18n'
import {
  getYuanOfferings,
  type KindredOfferings,
  purchaseKindredPro,
  restoreKindredPurchases,
  YUAN_PRODUCT_IDS,
} from '@/lib/iap'

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

  // Reason-aware subtitle: chat gate / chapter unlock / bond quota each get apt
  // copy instead of the bond-quota default.
  const subtitleKey =
    reason === 'chat'
      ? 'paywall.subtitleChat'
      : reason === 'chapters'
        ? 'paywall.subtitleChapters'
        : 'paywall.subtitle'

  const copy = useMemo(
    () => ({
      title: t(locale, 'paywall.title'),
      subtitle: t(locale, subtitleKey),
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
    [locale, subtitleKey]
  )

  // userEmail = "do they already have a recovery handle?" (set after an email
  // bind OR Apple/Google sign-in). Null → anonymous device-id only; we use this
  // ONLY to decide whether to nudge sign-in AFTER a purchase — never to gate the
  // purchase itself.
  const needsAuth = userEmail === null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View style={{ flex: 1 }}>
        <PaywallView
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
        hero={<YuelMark vertical size={96} color={kindredDark.seal} />}
        onClose={() => router.back()}
        onPurchase={async (productId) => {
          const plan = productId === YUAN_PRODUCT_IDS.annual ? 'annual' : 'monthly'
          const result = await purchaseKindredPro(plan)
          if (result === 'success' && needsAuth) setSignInOpen(true)
          return result
        }}
        onRestore={restoreKindredPurchases}
        />
        <Text
          style={{
            color: kindredDark.textMuted,
            fontSize: 11,
            lineHeight: 16,
            paddingHorizontal: 20,
            paddingBottom: 12,
            textAlign: 'center',
          }}
        >
          {t(locale, 'paywall.legalDisclaimer')}
        </Text>
      </View>

      <SignInSheet visible={signInOpen} onClose={() => setSignInOpen(false)} />
    </SafeAreaView>
  )
}
