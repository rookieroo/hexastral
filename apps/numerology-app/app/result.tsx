/**
 * Result screen — meihua hexagram cast.
 *
 * Renders:
 *   - The cast hexagram (HexagramCard) with upper/lower trigrams + changing line
 *   - 体卦 (subject) / 用卦 (object) trigrams with 五行
 *   - 互卦 (nuclear hexagram)
 *   - SatelliteFlagshipUpsellCard pointing at the appropriate flagship by
 *     user question intent (yuan / feng / hexastral — routed by portfolio-client).
 */

import { Button, useTheme } from '@zhop/core-ui'
import {
  type FlagshipKey,
  type QuestionType,
  routeQuestionToFlagship,
} from '@zhop/portfolio-client'
import {
  buildFlagshipDeepLink,
  defaultFlagshipUpsellLabels,
  defaultQuestionTypeLabels,
  flagshipAppStoreUrl,
  SatelliteFlagshipUpsellCard,
  SatelliteQuestionTypePicker,
} from '@zhop/satellite-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HexagramCard } from '@/components/HexagramCard'
import type { MeihuaReading } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

const TRIGRAM_NAME: Record<number, string> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
}

const TRIGRAM_ELEMENT: Record<number, string> = {
  1: '金',
  2: '金',
  3: '火',
  4: '木',
  5: '木',
  6: '水',
  7: '土',
  8: '土',
}

const RELATION_GENERATES: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

const RELATION_CONTROLS: Record<string, string> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

function isReading(v: unknown): v is MeihuaReading {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    Array.isArray(r.lines) &&
    (r.lines as unknown[]).length === 6 &&
    typeof r.upperNumber === 'number' &&
    typeof r.lowerNumber === 'number' &&
    typeof r.changingLineNumber === 'number' &&
    typeof r.bodyTrigramNumber === 'number' &&
    typeof r.useTrigramNumber === 'number'
  )
}

function assessRelation(
  bodyNumber: number,
  useNumber: number
): { labelKey: string; tone: 'great' | 'good' | 'neutral' | 'caution' | 'bad' } {
  const b = TRIGRAM_ELEMENT[bodyNumber]
  const u = TRIGRAM_ELEMENT[useNumber]
  if (!b || !u) return { labelKey: 'relationNeutral', tone: 'neutral' }
  if (b === u) return { labelKey: 'relationNeutral', tone: 'neutral' }
  if (RELATION_GENERATES[u] === b) return { labelKey: 'relationGreat', tone: 'great' }
  if (RELATION_CONTROLS[b] === u) return { labelKey: 'relationGood', tone: 'good' }
  if (RELATION_GENERATES[b] === u) return { labelKey: 'relationCaution', tone: 'caution' }
  if (RELATION_CONTROLS[u] === b) return { labelKey: 'relationBad', tone: 'bad' }
  return { labelKey: 'relationNeutral', tone: 'neutral' }
}

export default function ResultScreen() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { colors } = useAppTheme()
  const { spacing } = useTheme()
  const { payload, readingId, mode } = useLocalSearchParams<{
    payload?: string
    readingId?: string
    mode?: 'preview' | 'linked'
  }>()

  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const suggestedFlagship: FlagshipKey = routeQuestionToFlagship(questionType) ?? 'hexastral'
  const upsellLabels = defaultFlagshipUpsellLabels(locale)
  const pickerLabels = defaultQuestionTypeLabels(locale)
  const deepLink = buildFlagshipDeepLink({
    flagship: suggestedFlagship,
    fromSlug: 'numerology',
    signal: questionType,
  })

  const reading = useMemo<MeihuaReading | null>(() => {
    if (!payload) return null
    try {
      const parsed = JSON.parse(payload)
      return isReading(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [payload])

  if (!reading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.md }}
      >
        <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('computeError')}</Text>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button variant='secondary' onPress={() => router.replace('/compute')}>
            {t('resultRecompute')}
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  const relation = assessRelation(reading.bodyTrigramNumber, reading.useTrigramNumber)
  const bodyName = TRIGRAM_NAME[reading.bodyTrigramNumber] ?? '?'
  const useName = TRIGRAM_NAME[reading.useTrigramNumber] ?? '?'
  const bodyElement = TRIGRAM_ELEMENT[reading.bodyTrigramNumber] ?? '?'
  const useElement = TRIGRAM_ELEMENT[reading.useTrigramNumber] ?? '?'

  const handleShare = async () => {
    const lines = [
      t('resultShareTitle'),
      reading.question ? `Q: ${reading.question}` : null,
      `${TRIGRAM_NAME[reading.upperNumber] ?? '?'}${TRIGRAM_NAME[reading.lowerNumber] ?? '?'}卦 · 动${reading.changingLineNumber}爻`,
      `体${bodyName}(${bodyElement}) / 用${useName}(${useElement}) · ${t(relation.labelKey as Parameters<typeof t>[0])}`,
      '',
      'numerology.hexastral.com',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await Share.share({ message: lines })
    } catch {
      // user cancel — silent
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
        gap: spacing.xl,
      }}
    >
      <View>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '500', letterSpacing: 0.4 }}>
          {t('resultTitle')}
        </Text>
        {reading.question ? (
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              marginTop: 6,
              fontStyle: 'italic',
            }}
          >
            "{reading.question}"
          </Text>
        ) : null}
        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            marginTop: 6,
            letterSpacing: 0.4,
          }}
        >
          {new Date(reading.castAt).toLocaleString(locale)}
          {mode === 'linked' && readingId ? '  ·  ' + t('resultSaved') : ''}
        </Text>
      </View>

      <HexagramCard
        lines={reading.lines}
        changingLines={reading.changingLines}
        upperNumber={reading.upperNumber}
        lowerNumber={reading.lowerNumber}
        upperLabel={t('resultUpperTrigram')}
        lowerLabel={t('resultLowerTrigram')}
        changingLabel={t('resultChangingLine')}
      />

      <View
        style={{
          borderWidth: 0.5,
          borderColor: colors.separator,
          padding: spacing.xl,
          gap: spacing.md,
          backgroundColor: colors.card,
        }}
      >
        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {t('resultBodyUseLabel')}
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
          {t('resultBody')} <Text style={{ fontWeight: '600' }}>{bodyName}</Text> ({bodyElement})
          {' · '}
          {t('resultUse')} <Text style={{ fontWeight: '600' }}>{useName}</Text> ({useElement})
        </Text>
        <Text style={{ color: colors.accent, fontSize: 14 }}>
          {t(relation.labelKey as Parameters<typeof t>[0])}
        </Text>
      </View>

      <View
        style={{
          borderWidth: 0.5,
          borderColor: colors.separator,
          padding: spacing.xl,
          gap: spacing.sm,
          backgroundColor: colors.card,
        }}
      >
        <Text
          style={{
            color: colors.secondary,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {t('resultNuclearLabel')}
        </Text>
        <Text style={{ color: colors.text, fontSize: 14 }}>
          {TRIGRAM_NAME[reading.nuclearHexagram.upperNumber] ?? '?'} /{' '}
          {TRIGRAM_NAME[reading.nuclearHexagram.lowerNumber] ?? '?'}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
          {t('resultNuclearHelper')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button variant='secondary' fullWidth onPress={() => router.replace('/compute')}>
            {t('resultRecompute')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button variant='primary' fullWidth onPress={handleShare}>
            {t('resultShare')}
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
  )
}
