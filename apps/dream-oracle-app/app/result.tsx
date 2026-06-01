/**
 * Dream Oracle result screen.
 *
 * Phase F: "Open full detail" link upgraded from a plain `<Link>` to a
 * core-ui `<Button variant="secondary">` so the brand accent (indigo, per
 * ADR-0004 §1) drives the press-state + haptic. SatelliteResultCard is
 * kept since it's shared infrastructure across all satellites.
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
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSatelliteI18n } from '@/lib/i18n'

export default function DreamResultScreen() {
  // Phase G: source bg + spacing from CoreUIProvider context so the indigo
  // brand accent (per ADR-0004) flows through. Direct darkTokens import
  // bypassed the per-brand palette and was a Phase F.5 polish miss.
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const params = useLocalSearchParams<{ readingId?: string; interpretation?: string }>()
  const interpretation = decodeURIComponent(params.interpretation ?? '')

  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const suggestedFlagship = routePortfolioToFlagship('dreamoracle', questionType)
  const upsellLabels = defaultFlagshipUpsellLabels(locale)
  const pickerLabels = defaultQuestionTypeLabels(locale)
  const deepLink = buildFlagshipDeepLink({
    flagship: suggestedFlagship,
    fromSlug: 'dream-oracle',
    signal: questionType,
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: 'Dream Result' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <SatelliteResultCard
            title='Dream Interpretation'
            body={
              interpretation || 'Your interpretation is ready. Open detail for formatted sections.'
            }
          />
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              variant='secondary'
              onPress={() =>
                router.push({
                  pathname: '/detail',
                  params: {
                    readingId: params.readingId ?? '',
                    interpretation: params.interpretation ?? '',
                  },
                })
              }
            >
              Open full detail →
            </Button>
          </View>
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
