import { fetchReadingById } from '@zhop/portfolio-client'
import { CoinCastSharePoster } from '@zhop/portfolio-posters'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

function parsePayload(raw: string | string[] | undefined): Record<string, unknown> {
  if (!raw || Array.isArray(raw)) return {}
  try {
    return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export default function CoinCastDetailScreen() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const [payload, setPayload] = useState<Record<string, unknown>>(parsePayload(params.payload))
  useEffect(() => {
    const readingId = params.readingId
    if (Object.keys(payload).length > 0 || !readingId) return
    ;(async () => {
      try {
        const reading = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
        setPayload(safeJson(reading.reading.resultJson))
      } catch (err) {
        console.warn('[coincast] detail fallback failed', err)
      }
    })()
  }, [params.readingId, payload])
  const advice = typeof payload.advice === 'string' ? payload.advice : t('detailFallbackAdvice')
  const summary = typeof payload.summary === 'string' ? payload.summary : t('detailFallbackSummary')

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SheetHandle />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { flexGrow: 1, backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps='handled'
      >
        <Stack.Screen options={{ title: t('stackDetail') }} />
        <View
          style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{t('detailTitle')}</Text>
          <Text style={[styles.body, { color: colors.secondary }]}>{advice}</Text>
          <Text style={[styles.summary, { color: colors.accent }]}>{summary}</Text>
        </View>
        <CoinCastSharePoster
          shareUrl='https://hexastral.com/en/lp/twelve-palaces'
          headline={summary}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 14 },
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  summary: { fontSize: 14 },
})
