import { HEXAGRAM_DETAILS } from '@zhop/hexastral-tokens/constants/hexagram'
import { fetchReadingById } from '@zhop/portfolio-client'
import { CoinCastSharePoster } from '@zhop/portfolio-posters'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { coincastLandingUrl, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
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
  const { t, uiLocale } = useSatelliteI18n()
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

  // Classical 64-hexagram reference, available offline from the shared token
  // package. Looked up by the cast hexagram number so the original judgment /
  // image / line statements are always shown, even if the AI payload is sparse.
  const hexagram = (payload.hexagram ?? {}) as { number?: number }
  const classical =
    typeof hexagram.number === 'number'
      ? HEXAGRAM_DETAILS.find((h) => h.number === hexagram.number)
      : undefined

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
        {classical ? (
          <View
            style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              {t('detailClassicalTitle')} · {classical.symbol} {classical.name}
            </Text>
            <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailJudgment')}</Text>
            <Text style={[styles.body, { color: colors.secondary }]}>{classical.judgment}</Text>
            <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailImage')}</Text>
            <Text style={[styles.body, { color: colors.secondary }]}>{classical.image}</Text>
            <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailLines')}</Text>
            {classical.lines.map((lineText, i) => (
              <Text key={i} style={[styles.lineText, { color: colors.secondary }]}>
                {lineText}
              </Text>
            ))}
            <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailKeywords')}</Text>
            <Text style={[styles.body, { color: colors.secondary }]}>
              {classical.keywords.join(' · ')}
            </Text>
          </View>
        ) : null}
        <CoinCastSharePoster shareUrl={coincastLandingUrl(uiLocale)} headline={summary} />
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
  refLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginTop: 4 },
  lineText: { fontSize: 14, lineHeight: 22 },
})
