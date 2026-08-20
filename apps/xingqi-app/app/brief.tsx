/**
 * Period brief card — title / excerpt / summary / suggestion → locus CTA.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { fetchReadingById } from '@zhop/portfolio-client'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { resolveLocale } from '@/lib/i18n'
import { axisLabels, readingBriefCopy } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { parseReadingBrief, readingHasFiveChapters, type ReadingBrief } from '@/lib/reading-brief'

export default function BriefScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const copy = readingBriefCopy(locale)
  const axes = axisLabels(locale)
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const readingId = typeof params.readingId === 'string' ? params.readingId : undefined
  const paramPayload = typeof params.payload === 'string' ? params.payload : undefined

  const [brief, setBrief] = useState<ReadingBrief | null>(null)
  const [output, setOutput] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        let next: Record<string, unknown> = {}
        if (readingId) {
          const detail = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
          if (cancelled) return
          next = JSON.parse(detail.reading.resultJson) as Record<string, unknown>
        } else if (paramPayload) {
          next = JSON.parse(decodeURIComponent(paramPayload)) as Record<string, unknown>
        }
        if (cancelled) return
        setOutput(next)
        const parsed = parseReadingBrief(next)
        setBrief(parsed)
        if (!parsed && readingHasFiveChapters(next) && readingId) {
          router.replace({ pathname: '/result', params: { readingId } } as never)
          return
        }
        setError(parsed ? null : s('暂无短简', '暫無短簡', 'No brief yet', 'ブリーフがありません'))
      } catch {
        if (!cancelled) {
          setError(s('加载失败', '載入失敗', 'Could not load', '読み込みに失敗しました'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readingId, paramPayload, locale])

  const goLocus = () => {
    if (!readingId) return
    router.push({ pathname: '/locus', params: { readingId, part: 'face' } } as never)
  }

  const goChapters = () => {
    if (!readingId) return
    router.push({ pathname: '/result', params: { readingId } } as never)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={() => router.replace('/(app)' as never)}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel={s('关闭', '關閉', 'Close', '閉じる')}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <XingqiLoader label={s('加载中', '載入中', 'Loading', '読み込み中')} />
        </View>
      ) : error || !brief ? (
        <View style={{ flex: 1, padding: spacing.xl, gap: spacing.md }}>
          <Text style={{ color: colors.secondary }}>{error}</Text>
          {readingId && readingHasFiveChapters(output) ? (
            <Button variant='primary' onPress={goChapters}>
              {copy.chaptersCta}
            </Button>
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.lg,
          }}
        >
          {brief.axis ? (
            <Text
              style={{
                color: colors.dim,
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {axes[brief.axis]}
            </Text>
          ) : null}
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '600', lineHeight: 32 }}>
            {brief.title}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
            {brief.excerpt}
          </Text>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 1 }}>
              {copy.summaryLabel}
            </Text>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>
              {brief.summary}
            </Text>
          </View>
          <View
            style={{
              borderWidth: 0.5,
              borderColor: colors.separator,
              padding: spacing.lg,
              backgroundColor: colors.card,
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 1 }}>
              {copy.suggestionLabel}
            </Text>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>
              {brief.suggestion}
            </Text>
          </View>
          <Button variant='primary' onPress={goLocus} disabled={!readingId}>
            {copy.lociCta}
          </Button>
          {readingHasFiveChapters(output) ? (
            <Button variant='secondary' onPress={goChapters}>
              {copy.chaptersCta}
            </Button>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}
