import { SatellitePaywall } from '@zhop/satellite-ui'
import { Stack, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { REVENUECAT_PRODUCT_IDS } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastPaywallScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: t('stackPaywall'), headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t('navBack')}
          hitSlop={12}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('stackPaywall')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps='handled'
      >
        <SatellitePaywall
          productIds={REVENUECAT_PRODUCT_IDS}
          copy={{
            title: t('paywallUnlock'),
            restorePrimary: t('paywallRestoreRow'),
            restoreSecondary: t('paywallRestore'),
            planLabels: {
              castPack1: t('paywallPlanCastPack1'),
              castPack5: t('paywallPlanCastPack5'),
              castPack10: t('paywallPlanCastPack10'),
              monthly: t('paywallPlanMonthly'),
              annual: t('paywallPlanAnnual'),
            },
          }}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 8, gap: 8 },
})
