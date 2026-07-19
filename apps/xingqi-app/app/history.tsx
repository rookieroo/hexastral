import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'

export default function FaceHistoryScreen() {
  const locale = resolveLocale()
  const emptyText = isCjkZh(locale)
    ? pickZh(locale, '尚无解读', '尚無解讀')
    : 'No face readings yet.'
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText={emptyText} />
    </View>
  )
}
