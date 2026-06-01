import { fetchReadingById } from '@zhop/portfolio-client'
import { FaceOracleSharePoster } from '@zhop/portfolio-posters'
import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

function parsePayload(payload?: string | string[]): Record<string, unknown> {
  if (!payload || Array.isArray(payload)) return {}
  try {
    return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function FaceOracleDetailScreen() {
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const [output, setOutput] = useState<Record<string, unknown>>(parsePayload(params.payload))
  useEffect(() => {
    const readingId = params.readingId
    if (Object.keys(output).length > 0 || !readingId) return
    ;(async () => {
      try {
        const reading = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
        setOutput(JSON.parse(reading.reading.resultJson) as Record<string, unknown>)
      } catch (err) {
        console.warn('[faceoracle] detail fallback failed', err)
      }
    })()
  }, [output, params.readingId])

  const features = (output.features ?? {}) as Record<string, string>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Detail' }} />
      <View style={styles.card}>
        <Text style={styles.title}>Face Feature Reading</Text>
        {Object.entries(features).map(([key, value]) => (
          <Text key={key} style={styles.body}>
            {key}: {value}
          </Text>
        ))}
      </View>
      <FaceOracleSharePoster shareUrl='https://www.hexastral.com/en/lp/face' headline='Face feature reading' />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTokens.bg },
  content: { padding: 24, gap: 14 },
  card: {
    borderWidth: 0.5,
    borderColor: darkTokens.separator,
    borderRadius: 0,
    backgroundColor: darkTokens.card,
    padding: 14,
    gap: 8,
  },
  title: { color: darkTokens.text, fontSize: 18, fontWeight: '600' },
  body: { color: darkTokens.secondary, fontSize: 14, lineHeight: 20 },
})
