import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteResultCard } from '@zhop/satellite-ui'
import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

function parsePayload(payload?: string | string[]): Record<string, unknown> {
  if (!payload || Array.isArray(payload)) return {}
  try {
    return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function FaceResultScreen() {
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const output = parsePayload(params.payload)
  const features = (output.features ?? {}) as Record<string, string>
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Result' }} />
      <SatelliteResultCard
        title='Feature Interpretation'
        body='Face pattern extraction completed. See structured features below.'
      />
      {Object.entries(features).map(([k, v]) => (
        <Text key={k} style={styles.line}>
          {k}: {v}
        </Text>
      ))}
      <Link
        href={{
          pathname: '/detail',
          params: { readingId: params.readingId ?? '', payload: params.payload ?? '' },
        }}
        style={styles.link}
      >
        Open full detail →
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTokens.bg, padding: 24, gap: 8 },
  line: { color: darkTokens.secondary, fontSize: 14, lineHeight: 20 },
  link: { color: darkTokens.accent, fontSize: 15, marginTop: 8 },
})
