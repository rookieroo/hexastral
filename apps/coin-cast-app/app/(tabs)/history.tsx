import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { useTheme } from '@zhop/core-ui'

export default function CoinCastHistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const { t } = useSatelliteI18n()

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style='auto' />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t('navBack')}
          hitSlop={12}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('stackHistory')}</Text>
      </View>
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText={t('meEmpty')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
