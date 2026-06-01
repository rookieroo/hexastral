import { getTokens } from '@zhop/hexastral-tokens/palette'
import { fetchReadingById } from '@zhop/portfolio-client'
import { DreamSharePoster } from '@zhop/portfolio-posters'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function DreamDetailScreen() {
  const isDark = useColorScheme() === 'dark'
  const c = getTokens(isDark)
  const params = useLocalSearchParams<{ readingId?: string; interpretation?: string }>()
  const [interpretation, setInterpretation] = useState(
    decodeURIComponent(params.interpretation ?? '')
  )
  useEffect(() => {
    const readingId = params.readingId
    if (interpretation || !readingId) return
    ;(async () => {
      try {
        const reading = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
        const output = JSON.parse(reading.reading.resultJson) as Record<string, unknown>
        const text = typeof output.interpretation === 'string' ? output.interpretation : ''
        setInterpretation(text)
      } catch (err) {
        console.warn('[dreamoracle] detail fallback failed', err)
      }
    })()
  }, [interpretation, params.readingId])
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: 'Dream Detail' }} />
        <View style={[styles.card, { borderColor: c.separator, backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>Symbol & Meaning</Text>
          <Text style={[styles.body, { color: c.secondary }]}>
            {interpretation || 'No interpretation text was provided.'}
          </Text>
        </View>
        <DreamSharePoster
          shareUrl='https://www.hexastral.com/en/lp/dream'
          headline={interpretation || 'Dream interpretation'}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, gap: 14 },
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 21 },
})
