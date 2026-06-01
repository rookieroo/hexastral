import { getTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteResultCard } from '@zhop/satellite-ui'
import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DreamResultScreen() {
  const isDark = useColorScheme() === 'dark'
  const c = getTokens(isDark)
  const params = useLocalSearchParams<{ readingId?: string; interpretation?: string }>()
  const interpretation = decodeURIComponent(params.interpretation ?? '')
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: 'Dream Result' }} />
      <SatelliteResultCard
        title='Dream Interpretation'
        body={interpretation || 'Your interpretation is ready. Open detail for formatted sections.'}
      />
      <Link
        href={{
          pathname: '/detail',
          params: {
            readingId: params.readingId ?? '',
            interpretation: params.interpretation ?? '',
          },
        }}
        style={[styles.link, { color: c.accent }]}
      >
        Open full detail →
      </Link>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  link: { fontSize: 15 },
})
