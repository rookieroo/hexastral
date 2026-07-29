import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { pickUi } from '@/lib/locale-zh'

export default function FaceHistoryScreen() {
  const locale = resolveLocale()
  const emptyText = pickUi(
    locale,
    '尚无形气解读',
    '尚無形氣解讀',
    'No form-qi readings yet.',
    '形気リーディングはまだありません。'
  )
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText={emptyText} />
    </View>
  )
}
