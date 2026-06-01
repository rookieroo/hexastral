import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastHistoryScreen() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackHistory') }} />
      <SheetHandle />
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText={t('meEmpty')} />
    </SafeAreaView>
  )
}
