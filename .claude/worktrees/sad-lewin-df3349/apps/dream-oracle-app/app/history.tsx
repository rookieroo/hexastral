import { getTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

export default function DreamHistoryScreen() {
  const isDark = useColorScheme() === 'dark'
  const c = getTokens(isDark)
  const { t } = useSatelliteI18n()
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackHistory') }} />
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText={t('historyEmpty')} />
    </SafeAreaView>
  )
}
