/**
 * Xingqi reading report — Yuel-aligned chapter pager + 划词 + LivingLayerFab.
 * Close = top-right X. Living layer / chat = Pro only.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { fetchReadingById } from '@zhop/portfolio-client'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Dimensions, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ChapterPager } from '@/components/reading/ChapterPager'
import { InkCenterpiece } from '@/components/reading/InkCenterpiece'
import { LivingLayerFab } from '@/components/reading/LivingLayerFab'
import { natalFactsFromOutput } from '@/components/reading/NatalFactsStrip'
import { ReadingPrimer, useReadingPrimer } from '@/components/reading/ReadingPrimer'
import { SelectionActionBar } from '@/components/reading/SelectionActionBar'
import { ShareableXingqiCard } from '@/components/reading/ShareableXingqiCard'
import { XingqiLoader } from '@/components/XingqiLoader'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { useImageShare } from '@/lib/imageShare'
import { livingLayerLabels } from '@/lib/living-copy'
import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, pickZh } from '@/lib/locale-zh'
import { hydrateReadingDraft, patchReadingDraft } from '@/lib/reading-draft'
import { showReadingStartedHandoff, startReadingJob } from '@/lib/reading-job'
import {
  adaptReadingChapters,
  chapterTitle,
  inkSeedFromOutput,
  readingHasReportBody,
} from '@/lib/report-chapters'
import {
  XINGQI_BRAND_URL,
  XINGQI_INSTALL_URL,
  xingqiShareCaption,
  xingqiShareIdentity,
} from '@/lib/xingqiShare'

export default function FaceResultScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
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
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

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
        setLoadError(s('无法加载解读', '無法載入解讀', 'Could not load reading'))
      } catch {
        if (!cancelled) setLoadError(s('无法加载解读', '無法載入解讀', 'Could not load reading'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [paramPayload, readingId, locale])

  const chapters = useMemo(() => adaptReadingChapters(output, locale), [output, locale])
  const natalFacts = useMemo(() => natalFactsFromOutput(output), [output])
  const hasBody = chapters.length > 0 && readingHasReportBody(output)
  const inkSeed = useMemo(() => inkSeedFromOutput(output), [output])
  const { show: showPrimer, dismiss: dismissPrimer } = useReadingPrimer(hasBody && !loading)
  const { shotRef, capturing, share: shareImage } = useImageShare()

  const curChapter = chapters[chapterIndex]
  const rawLead = curChapter?.goldenLine.trim() ?? ''
  const shareLead = (() => {
    if (!rawLead) return ''
    if (isCjkZh(locale)) return rawLead
    const cjk = rawLead.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
    const letters = rawLead.replace(/\s/g, '').length
    if (letters > 0 && cjk / letters > 0.4) {
      const first = curChapter?.evidence.split(/(?<=[.!?。！？])\s+/)[0]?.trim() ?? ''
      return first.length > 12 ? first : ''
    }
    return rawLead
  })()
  const shareIdentity = xingqiShareIdentity(natalFacts)

  const handleShare = () => {
    if (!curChapter || shareLead.length === 0) return
    shareImage(xingqiShareCaption(locale, shareLead))
  }

  const goHome = () => router.replace('/(app)' as never)
  const chatId = readingId ?? 'draft'
  const softGatePro = () => router.push('/(commerce)/paywall' as never)

  const confirmRegenerate = () => {
    if (!isPro) {
      softGatePro()
      return
    }
    Alert.alert(
      s('重新生成报告？', '重新生成報告？', 'Regenerate report?'),
      s('使用当前系统语言重写正文，消耗 1 次本月报告重生成额度（不消耗照片额度）。', '使用目前系統語言重寫正文，消耗 1 次本月報告重新生成額度（不消耗照片額度）。', 'Rewrites the body in your current language. Uses 1 monthly report regeneration (not photo slots).'),
      [
        { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
        {
          text: s('生成', '生成', 'Regenerate'),
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
                  s('解读进行中', '解讀進行中', 'Reading in progress'),
                  s('请等待当前解读完成。', '請等待目前解讀完成。', 'Wait for the current reading to finish.')
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
    if (!isPro) {
      softGatePro()
      return
    }
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
        <XingqiLoader label={s('加载中', '載入中', 'Loading')} />
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
          {s('本期形气', '本期形氣', 'This period')}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
          {loadError ??
            (s('这篇解读正文尚未生成完整。请回首页更新照片后重新发起。', '這篇解讀正文尚未生成完整。請回首頁更新照片後重新發起。', 'This reading has no full body yet. Update photos on home and start again.'))}
        </Text>
        <Button variant='primary' onPress={goHome}>
          {s('完成', '完成', 'Done')}
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
        natalFacts={natalFacts}
        onShare={handleShare}
        renderCenterpiece={(ch) => (
          <InkCenterpiece
            chapter={ch}
            seed={inkSeed + ch.kind.length}
            width={Dimensions.get('window').width - 56}
            extraProse={JSON.stringify(output.aiInterpretation ?? {})}
          />
        )}
      />
      {/* Off-screen capture target — mount only while sharing (Yuel pattern). */}
      {capturing && curChapter && shareLead.length > 0 ? (
        <View
          ref={shotRef}
          collapsable={false}
          style={{ position: 'absolute', top: -20000, left: 0 }}
        >
          <ShareableXingqiCard
            leadLine={shareLead}
            chapterLabel={chapterTitle(curChapter.kind, locale)}
            chapterKind={curChapter.kind}
            chapterNumber={chapterIndex + 1}
            identityLine={shareIdentity}
            width={1080}
            height={1920}
            locale={locale}
            brandUrl={XINGQI_BRAND_URL}
            installUrl={XINGQI_INSTALL_URL}
          />
        </View>
      ) : null}
      <Pressable
        onPress={goHome}
        hitSlop={12}
        accessibilityRole='button'
        accessibilityLabel={s('关闭', '關閉', 'Close')}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          right: spacing.xl,
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
      >
        <X size={22} color={colors.text} strokeWidth={1.6} />
      </Pressable>
      <SelectionActionBar
        quote={pickedQuote}
        labels={{
          copy: s('复制', '複製', 'Copy'),
          chat: s('追问', '追問', 'Chat'),
          highlight: s('高亮', '高亮', 'Highlight'),
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
        bottomInset={insets.bottom + (!isPro ? 56 : 0)}
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
          pickedQuote && isPro
            ? () => {
                openChat(pickedQuote)
                setPickedQuote(null)
              }
            : pickedQuote && !isPro
              ? () => {
                  setPickedQuote(null)
                  softGatePro()
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
      {isPro ? (
        <LivingLayerFab
          insetBottom={insets.bottom + (pickedQuote ? 72 : 0)}
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
          onRegenerate={confirmRegenerate}
        />
      ) : null}
      {!isPro ? (
        <View
          style={{
            position: 'absolute',
            left: spacing.xl,
            right: spacing.xl,
            bottom: insets.bottom + 8,
          }}
        >
          <Button variant='primary' onPress={softGatePro}>
            {s(
              '解锁档案与气机层 · Pro',
              '解鎖檔案與氣機層 · Pro',
              'Unlock archive & qi layer · Pro'
            )}
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
