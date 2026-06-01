import { SatellitePaywall } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastPaywallScreen() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackPaywall') }} />
      <SheetHandle />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps='handled'
      >
        <SatellitePaywall
          productIds={REVENUECAT_PRODUCT_IDS}
          copy={{
            title: t('paywallUnlock'),
            restorePrimary: t('paywallRestoreRow'),
            restoreSecondary: t('paywallRestore'),
            planLabels: {
              monthly: t('paywallPlanMonthly'),
              annual: t('paywallPlanAnnual'),
              castPack: t('paywallPlanCastPack'),
            },
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
})
