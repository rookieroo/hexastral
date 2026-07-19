import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'

export default function FaceHistoryScreen() {
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SatelliteHistoryList
        target={PORTFOLIO_TARGET_APP}
        emptyText={zh ? '尚无解读' : 'No face readings yet.'}
      />
    </View>
  )
}
