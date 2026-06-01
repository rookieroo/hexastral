/**
 * Cycle Pro paywall sheet — wraps @zhop/satellite-ui SatelliteBottomSheet +
 * SatellitePaywall. Sprint 2 deliverable #4 (Pro split).
 *
 * Free tier sees top-3 宜忌; Pro unlocks the full lists + 对你而言 personalization
 * (when birth date set) + the 4 specialized 择日 drill-ins. Other Pro
 * surfaces (real-solar-time correction, dual-timezone, specialized 择日 UI)
 * stack on this same paywall sheet.
 *
 * Product IDs mirror docs/v1-submission-checklist.md §1.5 — `cycle_pro_monthly`
 * + `cycle_pro_annual`. RC handles the actual purchase; entitlement comes back
 * via the shared `useEntitlements()` listener registered at root via
 * `usePurchases()`. When RC keys are placeholders (current cycle state in
 * pre-submission builds), the paywall renders but the purchase will no-op
 * with a console.warn from SatellitePaywall — fine for dev/TestFlight smoke.
 */
import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet, SatellitePaywall } from '@zhop/satellite-ui'
import { Text, View } from 'react-native'

import { useStrings } from '@/lib/i18n-context'

const CYCLE_PRO_PRODUCT_IDS = {
  monthly: 'cycle_pro_monthly',
  annual: 'cycle_pro_annual',
} as const

export function CyclePaywallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()

  return (
    <SatelliteBottomSheet visible={visible} onClose={onClose} title={t.proTitle} animated={false}>
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
          {t.proSubtitle}
        </Text>
        <SatellitePaywall
          productIds={CYCLE_PRO_PRODUCT_IDS}
          onRestore={onClose}
          copy={{
            title: t.proTitle,
            restorePrimary: t.proRestore,
            planLabels: { monthly: t.proMonthly, annual: t.proAnnual },
          }}
        />
      </View>
    </SatelliteBottomSheet>
  )
}
