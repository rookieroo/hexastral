import { Tabs } from 'expo-router'

import { CoinCastTabBar } from '@/components/CoinCastTabBar'

export default function CoinCastTabsLayout() {
  return (
    <Tabs tabBar={(props) => <CoinCastTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name='index' />
      <Tabs.Screen name='me' />
    </Tabs>
  )
}
