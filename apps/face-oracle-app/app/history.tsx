import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { Stack } from 'expo-router'
import { View } from 'react-native'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function FaceHistoryScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'History' }} />
      <SatelliteHistoryList target={PORTFOLIO_TARGET_APP} emptyText='No face readings yet.' />
    </View>
  )
}
