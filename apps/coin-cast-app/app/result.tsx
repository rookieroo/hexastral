/**
 * Coin Cast result screen.
 *
 * Phase F: "Open detail" link upgraded to `<Button variant="secondary">` from
 * core-ui so the brand amber accent (ADR-0004 §1) drives press-state + haptic.
 * SatelliteResultCard kept — it's shared infra across satellites (Week 7
 * follow-up: lift SatelliteResultCard into core-ui or refactor internally).
 *
 * Phase G.1.c: appended `<SatelliteQuestionTypePicker>` +
 * `<SatelliteFlagshipUpsellCard>` for satellite → flagship funnel.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { type QuestionType, routePortfolioToFlagship } from '@zhop/portfolio-client'
import {
  buildFlagshipDeepLink,
  defaultFlagshipUpsellLabels,
  defaultQuestionTypeLabels,
  flagshipAppStoreUrl,
  SatelliteFlagshipUpsellCard,
  SatelliteQuestionTypePicker,
  SatelliteResultCard,
} from '@zhop/satellite-ui'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
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
  const { spacing } = useTheme()
  const { t, uiLocale } = useSatelliteI18n()
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const payload = parsePayload(params.payload)
  const hexagram = (payload.hexagram ?? {}) as { number?: number; name?: string }
  const interpretation =
    typeof payload.interpretation === 'string'
      ? payload.interpretation
      : t('resultFallbackInterpretation')

  const personalizedMeta = payload.personalized_meta as
    | { birth_used?: boolean; pillars_summary?: string }
    | undefined
  const birthUsed = Boolean(personalizedMeta?.birth_used)
  const pillarsSummary =
    typeof personalizedMeta?.pillars_summary === 'string' ? personalizedMeta.pillars_summary : null

  const title = t('resultHexagramTitle', {
    num: hexagram.number ?? '—',
    name: typeof hexagram.name === 'string' ? hexagram.name : '',
  }).trim()

  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const suggestedFlagship = routePortfolioToFlagship('coincast', questionType)
  const upsellLabels = defaultFlagshipUpsellLabels(uiLocale)
  const pickerLabels = defaultQuestionTypeLabels(uiLocale)
  const deepLink = buildFlagshipDeepLink({
    flagship: suggestedFlagship,
    fromSlug: 'coin-cast',
    signal: questionType,
  })

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: t('stackResult') }} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <SheetHandle />
        <View style={[styles.inner, { gap: spacing.md }]}>
          <SatelliteResultCard title={title} body={interpretation} />
          {birthUsed && pillarsSummary ? (
            <Text style={[styles.meta, { color: colors.dim }]}>
              {t('resultPersonalizedNote', { pillars: pillarsSummary })}
            </Text>
          ) : null}
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              variant='secondary'
              onPress={() =>
                router.push({
                  pathname: '/detail',
                  params: { readingId: params.readingId ?? '', payload: params.payload ?? '' },
                })
              }
            >
              {t('resultOpenDetail')} →
            </Button>
          </View>
          <Text style={[styles.meta, { color: colors.dim }]}>
            {t('resultReadingId', { id: params.readingId ?? '—' })}
          </Text>
        </View>

        <SatelliteQuestionTypePicker
          value={questionType}
          onChange={setQuestionType}
          labels={pickerLabels}
        />

        <SatelliteFlagshipUpsellCard
          suggestedFlagship={suggestedFlagship}
          labelsByFlagship={upsellLabels}
          deepLink={deepLink}
          appStoreUrl={flagshipAppStoreUrl(suggestedFlagship)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  meta: { fontSize: 12 },
})
