import { SatelliteResultCard } from '@zhop/satellite-ui'
import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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

export default function CoinCastResultScreen() {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const payload = parsePayload(params.payload)
  const hexagram = (payload.hexagram ?? {}) as { number?: number; name?: string }
  const interpretation =
    typeof payload.interpretation === 'string'
      ? payload.interpretation
      : t('resultFallbackInterpretation')

  const portfolioMemory = payload.portfolio_memory as
    | { search_hits?: number; enabled?: boolean }
    | undefined
  const memoryHits =
    typeof portfolioMemory?.search_hits === 'number' ? portfolioMemory.search_hits : 0
  const memoryEnabled = Boolean(portfolioMemory?.enabled)
  const showMemoryNote = memoryEnabled && memoryHits > 0

  const title = t('resultHexagramTitle', {
    num: hexagram.number ?? '—',
    name: typeof hexagram.name === 'string' ? hexagram.name : '',
  }).trim()

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackResult') }} />
      <SheetHandle />
      <View style={styles.inner}>
        <SatelliteResultCard title={title} body={interpretation} />
        {showMemoryNote ? (
          <Text style={[styles.meta, { color: colors.dim, marginTop: 4 }]}>
            {t('resultMemoryNote', { n: memoryHits })}
          </Text>
        ) : null}
        <Link
          href={{
            pathname: '/detail',
            params: { readingId: params.readingId ?? '', payload: params.payload ?? '' },
          }}
          style={[styles.link, { color: colors.accent }]}
        >
          {t('resultOpenDetail')} →
        </Link>
        <Text style={[styles.meta, { color: colors.dim }]}>
          {t('resultReadingId', { id: params.readingId ?? '—' })}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  inner: { flex: 1, gap: 12 },
  link: { fontSize: 15, marginTop: 4 },
  meta: { fontSize: 12, marginTop: 8 },
})
