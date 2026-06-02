/**
 * Bonds / Synastry tab — auto-redirects to the Bond Create flow.
 *
 * The legacy single-person Fate composer was removed in the deep refactor.
 * The "Kindred" tab now serves as a quick entrypoint to /(bonds)/bond-create so
 * users coming from the tab bar reach the live bond flow immediately.
 */

import { router, useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/theme'

export default function SynastryScreen() {
  const { isDark } = useTheme()
  const bg = isDark ? '#09090B' : '#FAFAFA'

  useFocusEffect(
    useCallback(() => {
      router.replace('/(bonds)/bond-create')
    }, [])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View />
    </SafeAreaView>
  )
}
