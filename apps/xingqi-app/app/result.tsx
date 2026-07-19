/**
 * Xingqi reading report — Yuel-aligned chapter pager + 划词 + LivingLayerFab.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { fetchReadingById } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Dimensions, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ChapterPager } from '@/components/reading/ChapterPager'
import { InkCenterpiece } from '@/components/reading/InkCenterpiece'
import { LivingLayerFab } from '@/components/reading/LivingLayerFab'
import { ReadingPrimer, useReadingPrimer } from '@/components/reading/ReadingPrimer'
import { SelectionActionBar } from '@/components/reading/SelectionActionBar'
import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { livingLayerLabels } from '@/lib/living-copy'
import { resolveLocale } from '@/lib/i18n'
import { hydrateReadingDraft, patchReadingDraft } from '@/lib/reading-draft'
import {
  showReadingStartedHandoff,
  startReadingJob,
} from '@/lib/reading-job'
import {
  adaptReadingChapters,
  inkSeedFromOutput,
  readingHasReportBody,
} from '@/lib/report-chapters'

export default function FaceResultScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const params = useLocalSearchParams<{ readingId?: string; payload?: string }>()
  const readingId = typeof params.readingId === 'string' ? params.readingId : undefined
  const paramPayload = typeof params.payload === 'string' ? params.payload : undefined

  const [output, setOutput] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])

  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        if (readingId) {
          const detail = await fetchReadingById(PORTFOLIO_TARGET_APP, readingId)
          if (cancelled) return
          setOutput(JSON.parse(detail.reading.resultJson) as Record<string, unknown>)
          setLoadError(null)
          const hs = await loadHighlights(readingId)
          if (!cancelled) setHighlights(hs)
          return
        }
        if (paramPayload) {
          try {
            setOutput(JSON.parse(decodeURIComponent(paramPayload)) as Record<string, unknown>)
          } catch {
            setOutput(JSON.parse(paramPayload) as Record<string, unknown>)
          }
          setLoadError(null)
          return
        }
        setLoadError(zh ? '无法加载解读' : 'Could not load reading')
      } catch {
        if (!cancelled) setLoadError(zh ? '无法加载解读' : 'Could not load reading')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [paramPayload, readingId, zh])

  const chapters = useMemo(() => adaptReadingChapters(output, locale), [output, locale])
  const hasBody = chapters.length > 0 && readingHasReportBody(output)
  const inkSeed = useMemo(() => inkSeedFromOutput(output), [output])
  const { show: showPrimer, dismiss: dismissPrimer } = useReadingPrimer(hasBody && !loading)

  const goHome = () => router.replace('/(app)' as never)
  const chatId = readingId ?? 'draft'

  const confirmRegenerate = () => {
    if (!isPro) {
      router.push('/(commerce)/paywall' as never)
      return
    }
    Alert.alert(
      zh ? '重新生成报告？' : 'Regenerate report?',
      zh
        ? '使用当前系统语言重写正文，消耗 1 次本月报告重生成额度（不消耗照片额度）。'
        : 'Rewrites the body in your current language. Uses 1 monthly report regeneration (not photo slots).',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '生成' : 'Regenerate',
          onPress: () => {
            void (async () => {
              const birth = (output.birth ?? {}) as Record<string, unknown>
              const faceFeatureId =
                typeof output.faceFeatureId === 'string' ? output.faceFeatureId : undefined
              const palmLeftFeatureId =
                typeof output.palmLeftFeatureId === 'string'
                  ? output.palmLeftFeatureId
                  : undefined
              const palmRightFeatureId =
                typeof output.palmRightFeatureId === 'string'
                  ? output.palmRightFeatureId
                  : undefined
              if (faceFeatureId && palmLeftFeatureId && palmRightFeatureId) {
                patchReadingDraft({
                  faceFeatureId,
                  palmLeftFeatureId,
                  palmRightFeatureId,
                  solarDate: typeof birth.solarDate === 'string' ? birth.solarDate : undefined,
                  timeIndex: typeof birth.timeIndex === 'number' ? birth.timeIndex : undefined,
                  gender:
                    birth.gender === '男' || birth.gender === '女' ? birth.gender : undefined,
                  city: typeof birth.city === 'string' ? birth.city : undefined,
                  outputKind: 'period_brief',
                })
              }
              const draft = await hydrateReadingDraft()
              const started = startReadingJob({
                locale,
                outputKind: 'period_brief',
                isPro: true,
                draft,
                regen: true,
                onQueued: () => {
                  void showReadingStartedHandoff({ locale })
                  goHome()
                },
              })
              if (!started) {
                Alert.alert(
                  zh ? '解读进行中' : 'Reading in progress',
                  zh ? '请等待当前解读完成。' : 'Wait for the current reading to finish.'
                )
              }
            })()
          },
        },
      ]
    )
  }

  const cardColors = {
    bg: colors.bg,
    text: colors.text,
    secondary: colors.secondary,
    dim: colors.dim,
    accent: colors.accent,
    separator: colors.separator,
  }

  const openChat = (quote?: string | null) => {
    const q = quote?.trim()
    router.push({
      pathname: '/reading-chat' as never,
      params: {
        readingId: chatId,
        ...(q ? { quote: encodeURIComponent(q) } : {}),
      },
    })
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top,
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <XingqiLoader label={zh ? '加载中' : 'Loading'} />
      </View>
    )
  }

  if (loadError || !hasBody) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl,
          gap: spacing.md,
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 28 }}>
          {zh ? '本期形气' : 'This period'}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
          {loadError ??
            (zh
              ? '这篇解读正文尚未生成完整。请回首页更新照片后重新发起。'
              : 'This reading has no full body yet. Update photos on home and start again.')}
        </Text>
        <Button variant='primary' onPress={goHome}>
          {zh ? '完成' : 'Done'}
        </Button>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ChapterPager
        chapters={chapters}
        currentIndex={chapterIndex}
        onIndexChange={setChapterIndex}
        locale={locale}
        colors={cardColors}
        onPickQuote={setPickedQuote}
        highlightedQuotes={highlights}
        renderCenterpiece={(ch) => (
          <InkCenterpiece
            chapter={ch}
            seed={inkSeed + ch.kind.length}
            width={Dimensions.get('window').width - 56}
            extraProse={JSON.stringify(output.aiInterpretation ?? {})}
          />
        )}
      />
      {isPro ? (
        <View
          style={{
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: insets.bottom + (pickedQuote ? 80 : 12),
          }}
        >
          <Button variant='secondary' onPress={goHome}>
            {zh ? '关闭' : 'Close'}
          </Button>
        </View>
      ) : null}
      <SelectionActionBar
        quote={pickedQuote}
        labels={{
          copy: zh ? '复制' : 'Copy',
          chat: zh ? '追问' : 'Chat',
          highlight: zh ? '高亮' : 'Highlight',
        }}
        highlighted={pickedQuote ? highlights.includes(pickedQuote) : false}
        colors={{
          card: colors.bg,
          border: colors.separator,
          text: colors.text,
          secondary: colors.secondary,
          muted: colors.dim,
          accent: colors.accent,
        }}
        bottomInset={insets.bottom + (isPro ? 0 : 56)}
        onClose={() => setPickedQuote(null)}
        onCopy={
          pickedQuote
            ? () => {
                void Clipboard.setStringAsync(pickedQuote)
                setPickedQuote(null)
              }
            : undefined
        }
        onChat={
          pickedQuote
            ? () => {
                openChat(pickedQuote)
                setPickedQuote(null)
              }
            : undefined
        }
        onHighlight={
          pickedQuote && readingId
            ? () => {
                const next = highlights.includes(pickedQuote)
                  ? highlights.filter((h) => h !== pickedQuote)
                  : [...highlights, pickedQuote]
                setHighlights(next)
                void saveHighlights(readingId, next)
                setPickedQuote(null)
              }
            : undefined
        }
      />
      <LivingLayerFab
        insetBottom={insets.bottom + (pickedQuote ? 72 : isPro ? 52 : 0)}
        labels={livingLayerLabels(locale)}
        colors={{
          accent: colors.accent,
          accentFg: colors.bg,
          disc: colors.bg,
          discFg: colors.text,
        }}
        onTimeline={() => router.push('/timeline' as never)}
        onWhatIf={() => router.push('/makeif' as never)}
        onChat={() => openChat(null)}
        onRegenerate={isPro ? confirmRegenerate : undefined}
      />
      {!isPro ? (
        <View
          style={{
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: insets.bottom + 8,
          }}
        >
          <Button variant='primary' onPress={() => router.push('/(commerce)/paywall')}>
            {locale === 'zh'
              ? '订阅 Pro · 时间线与提醒'
              : locale === 'zh-Hant'
                ? '訂閱 Pro · 時間線與提醒'
                : locale === 'ja'
                  ? 'Pro · タイムラインと通知'
                  : 'Subscribe Pro · Timeline & reminders'}
          </Button>
        </View>
      ) : null}
      <ReadingPrimer
        visible={showPrimer}
        locale={locale}
        colors={{
          bg: colors.bg,
          text: colors.text,
          secondary: colors.secondary,
          accent: colors.accent,
        }}
        onClose={dismissPrimer}
        onOpenGlossary={() => router.push('/glossary' as never)}
      />
    </View>
  )
}
