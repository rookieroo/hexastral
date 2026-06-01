/**
 * fate-app's funnel surface — the satellite's actual job (route to flagships).
 *
 * Routing is server-driven via the K.2 discovery endpoint (`source='fate'`), with
 * offline `routeQuestionToFlagship` as the loading/failure fallback:
 * relationship/career → Yuán, home_office → Fēng, self_daily → no upsell
 * (fate IS the 命/self app), unpicked → Yuán.
 */

import {
  type FlagshipKey,
  type QuestionType,
  routeQuestionToFlagship,
} from '@zhop/portfolio-client'
import { emitCrossAppDiscoveryTap, useDiscoveryRecommendations } from '@zhop/satellite-runtime'
import {
  buildFlagshipDeepLink,
  defaultFlagshipUpsellLabels,
  defaultQuestionTypeLabels,
  flagshipAppStoreUrl,
} from '@zhop/satellite-ui/funnel-config'
import { SatelliteFlagshipUpsellCard } from '@zhop/satellite-ui/SatelliteFlagshipUpsellCard'
import { SatelliteQuestionTypePicker } from '@zhop/satellite-ui/SatelliteQuestionTypePicker'
import { getLocales } from 'expo-localization'
import { useState } from 'react'
import { View } from 'react-native'

import { PORTFOLIO_STORAGE_PREFIX } from '@/lib/growth-config'

export function FlagshipUpsell() {
  const locale = getLocales()[0]?.languageCode ?? 'en'
  const [questionType, setQuestionType] = useState<QuestionType | null>(null)

  // Dynamic routing (server config) with offline fallback for loading/failure.
  const { recommendations } = useDiscoveryRecommendations('fate', questionType, locale)
  const dynamic = [...recommendations].sort((a, b) => b.weight - a.weight)[0]?.target as
    | FlagshipKey
    | undefined

  const suggested = routeQuestionToFlagship(questionType)
  // Never upsell to the retired self app ('hexastral'); unpicked defaults to Yuán
  // so the funnel always shows. self/daily now routes to Cycle (daily flagship).
  const offline: FlagshipKey | null =
    suggested && suggested !== 'hexastral' ? suggested : 'yuan'

  const target: FlagshipKey | null = dynamic ?? offline

  return (
    <View style={{ gap: 14 }}>
      <SatelliteQuestionTypePicker
        value={questionType}
        onChange={setQuestionType}
        labels={defaultQuestionTypeLabels(locale)}
        options={['relationship', 'home_office', 'self_daily']}
      />
      {target ? (
        <SatelliteFlagshipUpsellCard
          suggestedFlagship={target}
          labelsByFlagship={defaultFlagshipUpsellLabels(locale)}
          deepLink={buildFlagshipDeepLink({
            flagship: target,
            fromSlug: 'fate',
            signal: questionType,
          })}
          appStoreUrl={flagshipAppStoreUrl(target)}
          onUpgrade={(flagship) =>
            void emitCrossAppDiscoveryTap({
              storagePrefix: PORTFOLIO_STORAGE_PREFIX,
              sourceApp: 'fate',
              targetApp: flagship,
              action: 'tap',
            })
          }
        />
      ) : null}
    </View>
  )
}
