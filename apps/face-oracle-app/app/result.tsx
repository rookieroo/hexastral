/**
 * Face Oracle result screen.
 *
 * Two-tier flow (K.3):
 *   - Teaser: the free /preview reading (cheap canned features, no Gemini Vision).
 *   - Full report: gated behind Apple sign-in + the `faceoracle_pro` entitlement.
 *     "Reveal full reading" calls the authed /linked path (`runFaceFull`), which
 *     runs the real Gemini Vision extraction server-side. A 402 (not entitled)
 *     routes to the paywall; a missing portfolio session routes to sign-in.
 *
 * Below the reading: `<SatelliteQuestionTypePicker>` + `<SatelliteFlagshipUpsellCard>`
 * funnel the user toward a flagship (per ADR-0004).
 */

import { Button, useTheme } from '@zhop/core-ui'
import { type QuestionType, routePortfolioToFlagship } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
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
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { runFaceFull } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

function parsePayload(payload?: string | string[]): Record<string, unknown> {
  if (!payload || Array.isArray(payload)) return {}
  try {
    return JSON.parse(decodeURIComponent(payload)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function asString(v?: string | string[]): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function stringEntries(value: unknown): [string, string][] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>).filter(
    (e): e is [string, string] => typeof e[1] === 'string' && e[1].length > 0
  )
}

function copyFor(locale: string) {
  const zh = locale.startsWith('zh')
  const ja = locale.startsWith('ja')
  return {
    teaserTitle: zh ? '面相速览 · 预览' : ja ? '人相プレビュー' : 'Quick Look · preview',
    fullTitle: zh ? '完整面相解读' : ja ? '完全な人相鑑定' : 'Full Face Reading',
    teaserNote: zh
      ? '这是基于通用特征的免费预览。解锁后将分析你的真实照片，生成完整解读。'
      : ja
        ? 'これは一般的な特徴に基づく無料プレビューです。解除すると写真を解析した完全な鑑定が得られます。'
        : 'A free preview from generic features. Unlock to analyze your actual photo for the full reading.',
    unlock: zh ? '解锁完整解读 · Pro' : ja ? '完全な鑑定を解除 · Pro' : 'Unlock full reading · Pro',
    reveal: zh ? '生成完整解读' : ja ? '完全な鑑定を表示' : 'Reveal full reading',
    analyzing: zh ? '分析中…' : ja ? '分析中…' : 'Analyzing…',
  }
}

export default function FaceResultScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const params = useLocalSearchParams<{
    readingId?: string
    payload?: string
    imageUri?: string
  }>()
  const imageUri = asString(params.imageUri)
  const copy = copyFor(locale)

  const entitlements = useEntitlements()
  // Face is per-use (no faceoracle_pro sub — plan §8). universe_pro carries the monthly
  // face allowance → full reading; pack-credit buyers are authorized server-side and get
  // the full output from the /linked call (P4 client flip: drive `entitled` off the
  // server response rather than a client entitlement for the pack path).
  const entitled = hasEntitlement(entitlements, 'universe_pro')

  const [fullOutput, setFullOutput] = useState<Record<string, unknown> | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)

  const teaserOutput = parsePayload(params.payload)
  const output = fullOutput ?? teaserOutput
  const isFull = fullOutput != null
  const features = (output.features ?? {}) as Record<string, string>
  const interpretation = stringEntries(output.aiInterpretation)

  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const suggestedFlagship = routePortfolioToFlagship('faceoracle', questionType)
  const upsellLabels = defaultFlagshipUpsellLabels(locale)
  const pickerLabels = defaultQuestionTypeLabels(locale)
  const deepLink = buildFlagshipDeepLink({
    flagship: suggestedFlagship,
    fromSlug: 'face-oracle',
    signal: questionType,
  })

  const onReveal = async () => {
    if (loadingFull) return
    setLoadingFull(true)
    try {
      const res = await runFaceFull(imageUri, locale)
      if (res.mode === 'refused') {
        router.push('/paywall')
        return
      }
      setFullOutput(res.output as Record<string, unknown>)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // No portfolio session yet → sign in; otherwise treat as not-entitled → paywall.
      router.push(msg === 'signin_required' ? '/(tabs)/me' : '/paywall')
    } finally {
      setLoadingFull(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, gap: spacing.lg }}
    >
      <Stack.Screen options={{ title: isFull ? copy.fullTitle : copy.teaserTitle }} />

      <View style={{ gap: spacing.sm }}>
        <SatelliteResultCard
          title={isFull ? copy.fullTitle : copy.teaserTitle}
          body={isFull ? '' : copy.teaserNote}
        />

        {features
          ? Object.entries(features).map(([k, v]) => (
              <Text key={k} style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
                {k}: {v}
              </Text>
            ))
          : null}

        {interpretation.map(([k, v]) => (
          <Text key={`ai-${k}`} style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
            {v}
          </Text>
        ))}

        {!isFull ? (
          <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>
            {entitled ? (
              <Button variant='primary' onPress={onReveal} disabled={loadingFull}>
                {loadingFull ? copy.analyzing : copy.reveal}
              </Button>
            ) : (
              <Button variant='primary' onPress={() => router.push('/paywall')}>
                {copy.unlock}
              </Button>
            )}
            {loadingFull ? (
              <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}
          </View>
        ) : null}
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
