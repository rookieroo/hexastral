/**
 * Kindred paywall — modal triggered when bond quota is exhausted (≥4 bonds on free).
 *
 * Two SKUs: monthly + annual (default highlight = annual). Both grant the
 * `hexastral_kindred_pro` RevenueCat entitlement.
 *
 * Reached via:
 *   router.push({ pathname: '/(commerce)/paywall', params: { reason } })
 * from any quota-blocked screen (invite-email, reveal, future settings upgrade button).
 *
 * Phase J · J.1.3: body shrunk from ~200 LOC to a thin wrapper around
 * <PaywallView> in @zhop/core-ui. Kindred brand is preserved via the `brand`
 * palette + KindredSeal hero slot.
 */

import { PaywallView } from '@zhop/core-ui'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { KindredSeal } from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
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
        hero={<KindredSeal mode='breathing' size={96} />}
        onClose={() => router.back()}
        onPurchase={async (productId) => {
          const plan = productId === YUAN_PRODUCT_IDS.annual ? 'annual' : 'monthly'
          return purchaseKindredPro(plan)
        }}
        onRestore={restoreKindredPurchases}
      />
    </SafeAreaView>
  )
}
