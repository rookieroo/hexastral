import { getHexagramDetail, resolveHexagramLocale } from '@zhop/hexastral-tokens/constants/hexagram'
import { fetchReadingById } from '@zhop/portfolio-client'
import { CoinCastSharePoster } from '@zhop/portfolio-posters'
import { Button } from '@zhop/core-ui'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { coincastLandingUrl, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { tryUpgradeCoincastReading } from '@/lib/coincast-upgrade'
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

type ClassicalPayload = {
  judgment?: string
  image?: string
  lines?: string[]
  changingLineTexts?: string[]
  naJiaContext?: string
}

export default function CoinCastDetailScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t, uiLocale } = useSatelliteI18n()
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const [payload, setPayload] = useState<Record<string, unknown>>(parsePayload(params.payload))
  const [upgradeLoading, setUpgradeLoading] = useState(false)
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

  const interpretationMode = payload.interpretationMode === 'classical' ? 'classical' : 'ai'
  const isAi = interpretationMode === 'ai'
  const serverClassical =
    payload.classical && typeof payload.classical === 'object'
      ? (payload.classical as ClassicalPayload)
      : undefined

  const advice = isAi
    ? typeof payload.advice === 'string' && payload.advice.trim().length > 0
      ? payload.advice
      : t('detailFallbackAdvice')
    : t('detailClassicalAdviceHint')
  const summary =
    typeof payload.summary === 'string' && payload.summary.trim().length > 0
      ? payload.summary
      : t('detailFallbackSummary')

  const hexagram = (payload.hexagram ?? {}) as { number?: number }
  const hexagramLocale = resolveHexagramLocale(uiLocale)
  const tokenClassical =
    typeof hexagram.number === 'number'
      ? getHexagramDetail(hexagram.number, hexagramLocale)
      : undefined

  const classical = serverClassical
    ? {
        judgment: serverClassical.judgment ?? tokenClassical?.judgment ?? '',
        image: serverClassical.image ?? tokenClassical?.image ?? '',
        lines: serverClassical.lines ?? tokenClassical?.lines ?? [],
        keywords: tokenClassical?.keywords ?? [],
        symbol: tokenClassical?.symbol ?? '',
        name: tokenClassical?.name ?? '',
        changingLineTexts: serverClassical.changingLineTexts ?? [],
        naJiaContext: serverClassical.naJiaContext,
      }
    : tokenClassical
      ? {
          judgment: tokenClassical.judgment,
          image: tokenClassical.image,
          lines: tokenClassical.lines,
          keywords: tokenClassical.keywords,
          symbol: tokenClassical.symbol,
          name: tokenClassical.name,
          changingLineTexts: [] as string[],
          naJiaContext: undefined as string | undefined,
        }
      : null

  const readingId = params.readingId?.trim() ?? ''
  const canUpgrade = !isAi && readingId.length > 0

  const handleUpgradeAi = () => {
    if (!readingId) {
      router.push('/paywall')
      return
    }
    setUpgradeLoading(true)
    void (async () => {
      const outcome = await tryUpgradeCoincastReading(readingId)
      setUpgradeLoading(false)
      if (outcome.ok) {
        setPayload(outcome.output)
        return
      }
      if (outcome.reason === 'paywall') {
        router.push('/paywall')
      }
    })()
  }

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
        {isAi ? (
          <View
            style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}
          >
            <Text style={[styles.title, { color: colors.text }]}>{t('detailTitle')}</Text>
            <Text style={[styles.body, { color: colors.secondary }]}>{advice}</Text>
            <Text style={[styles.summary, { color: colors.accent }]}>{summary}</Text>
          </View>
        ) : null}
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
            {classical.changingLineTexts.length > 0 ? (
              <>
                <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailLines')}</Text>
                {classical.changingLineTexts.map((lineText, i) => (
                  <Text key={`changing-${i}`} style={[styles.lineText, { color: colors.secondary }]}>
                    {lineText}
                  </Text>
                ))}
              </>
            ) : null}
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
            {classical.naJiaContext ? (
              <>
                <Text style={[styles.refLabel, { color: colors.accent }]}>{t('detailNaJiaTitle')}</Text>
                <Text style={[styles.naJia, { color: colors.secondary }]}>
                  {classical.naJiaContext}
                </Text>
              </>
            ) : null}
            {!isAi ? (
              <Text style={[styles.body, { color: colors.secondary, marginTop: 8 }]}>{advice}</Text>
            ) : null}
          </View>
        ) : null}
        {canUpgrade ? (
          <Button variant='secondary' disabled={upgradeLoading} onPress={handleUpgradeAi}>
            {upgradeLoading ? t('upgradeAiLoading') : t('upgradeAiCta')}
          </Button>
        ) : null}
        <CoinCastSharePoster shareUrl={coincastLandingUrl(uiLocale)} headline={summary} />
        <Text style={[styles.legal, { color: colors.dim }]}>{t('detailLegalDisclaimer')}</Text>
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
  naJia: { fontSize: 13, lineHeight: 20, fontFamily: 'Menlo' },
  legal: { fontSize: 11, lineHeight: 16 },
})
