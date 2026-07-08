/**
 * Fēng paywall — one-shot site report (`hexastral_feng_single` / `hexastral_feng_premium`).
 *
 * Includes unlimited AI chat for that report after analysis completes.
 * Reached from review (pre-analyze) or chat (post-analyze upsell).
 * `residenceType` param selects the billing tier (apartment vs flat/villa).
 */

import { PaywallView } from '@zhop/core-ui'
import type { FengResidenceType } from '@zhop/scenario-feng'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FengMark } from '@/components/FengMark'
import { useAuth } from '@/lib/auth'
import {
  billingPlanForResidence,
  normalizeResidenceType,
  productIdForResidence,
} from '@/lib/feng-pricing-client'
import { REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { getFengPrice, purchaseFeng, restoreFengPurchases } from '@/lib/iap'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { waitForFengPurchaseAvailable } from '@/lib/purchase'
import { FENG_PALETTE } from '@/lib/theme'

export default function FengPaywallScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const locale = useMemo(() => resolveLocale(), [])
  const t = useStrings(locale)
  const { intent, residenceType: residenceParam } = useLocalSearchParams<{
    intent?: string
    residenceType?: string
  }>()
  const residenceType = normalizeResidenceType(residenceParam)
  const plan = billingPlanForResidence(residenceType)
  const productId = productIdForResidence(residenceType)
  const isPremium = plan === 'premium'

  const [price, setPrice] = useState<string | null>(null)

  useEffect(() => {
    void getFengPrice(productId).then(setPrice)
  }, [productId])

  const palette = useMemo(
    () => ({
      background: FENG_PALETTE.night,
      text: FENG_PALETTE.rice,
      textSecondary: FENG_PALETTE.riceWarm,
      textMuted: FENG_PALETTE.riceMute,
      border: FENG_PALETTE.hairline,
      card: FENG_PALETTE.nightRaised,
      accent: FENG_PALETTE.copperGold,
    }),
    []
  )

  const subtitle =
    intent === 'chat' ? t.paywall_subtitle_chat : t.paywall_subtitle_analyze

  const bullets = useMemo(() => {
    const base = [t.paywall_bullet_report, t.paywall_bullet_chat, t.paywall_bullet_once]
    if (isPremium) {
      return [t.paywall_bullet_multifloor, t.paywall_bullet_street, ...base]
    }
    return base
  }, [isPremium, t])

  const copy = useMemo(
    () => ({
      title: t.paywall_title,
      subtitle,
      planLabels: {
        single: isPremium ? t.paywall_plan_premium : t.paywall_plan_single,
      },
      cta: t.paywall_cta,
      ctaPurchasing: t.paywall_cta,
      successLabel: t.paywall_success,
      restoreLabel: t.paywall_restore,
      restoreLoadingLabel: '…',
      closeLabel: t.nav_back,
      errorFailed: t.paywall_failed,
      errorUnavailable: t.paywall_unavailable,
    }),
    [isPremium, subtitle, t]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1 }}>
        <PaywallView
          productIds={REVENUECAT_PRODUCT_IDS}
          prices={{ single: price }}
          bullets={bullets}
          copy={copy}
          brand={palette}
          defaultPlan='single'
          hero={<FengMark size={72} />}
          onClose={() => router.back()}
          onPurchase={async () => {
            const result = await purchaseFeng(productId)
            if (result === 'success' && userId) {
              await waitForFengPurchaseAvailable(userId, residenceType as FengResidenceType)
            }
            return result
          }}
          onRestore={restoreFengPurchases}
        />
        <Text
          style={{
            color: palette.textMuted,
            fontSize: 11,
            lineHeight: 16,
            paddingHorizontal: 20,
            paddingBottom: 12,
            textAlign: 'center',
          }}
        >
          {t.paywall_legal_disclaimer}
        </Text>
      </View>
    </SafeAreaView>
  )
}
