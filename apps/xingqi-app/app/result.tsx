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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ChapterPager } from '@/components/reading/ChapterPager'
import { InkCenterpiece } from '@/components/reading/InkCenterpiece'
import { LivingLayerFab } from '@/components/reading/LivingLayerFab'
import { natalFactsFromOutput } from '@/components/reading/NatalFactsStrip'
import { ReadingPrimer, useReadingPrimer } from '@/components/reading/ReadingPrimer'
import { SelectionActionBar } from '@/components/reading/SelectionActionBar'
import { ShareableXingqiCard } from '@/components/reading/ShareableXingqiCard'
import { XingqiLoader } from '@/components/XingqiLoader'
import { wuxingFromDayMaster } from '@/lib/ancient-glyphs'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { resolveLocale } from '@/lib/i18n'
import { useImageShare } from '@/lib/imageShare'
import { livingLayerLabels, readingBriefCopy } from '@/lib/living-copy'
import { isCjkZh, isJa, okForReadingLocale, pickUi } from '@/lib/locale-zh'
import {
  adaptReadingChapters,
  chapterTitle,
  inkSeedFromOutput,
  readingHasReportBody,
} from '@/lib/report-chapters'
import {
  clearFlight,
  flightPending,
  readFlight,
  retriesRemaining,
  setFlightTarget,
  subscribeFlight,
} from '@/lib/shared-element-flight'
import { resolveReadingPhotoUri } from '@/lib/reading-photos'
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
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const params = useLocalSearchParams<{
    readingId?: string
    payload?: string
    chapter?: string
    part?: string
  }>()
  const readingId = typeof params.readingId === 'string' ? params.readingId : undefined
  const paramPayload = typeof params.payload === 'string' ? params.payload : undefined
  const initialChapter = typeof params.chapter === 'string' ? params.chapter : undefined
  const partParam =
    params.part === 'face' || params.part === 'palm_l' || params.part === 'palm_r'
      ? params.part
      : undefined

  const [output, setOutput] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  // The reading's actual photos — shown mounted on the plate per chapter
  // (face → 面部, palms → 双手). The wheel tap deep-links + flies to the tapped
  // part's photo, but the photos render regardless of how the report opened.
  const [photos, setPhotos] = useState<Partial<Record<'face' | 'palm_l' | 'palm_r', string>>>({})
  /** Hide current chapter plate until wheel→report flight clears (Modal is the only copy). */
  const [flightHoldsEntrance, setFlightHoldsEntrance] = useState(
    () => readFlight().source !== null
  )

  useEffect(() => {
    return subscribeFlight(() => {
      setFlightHoldsEntrance(readFlight().source !== null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!readingId) {
      setPhotos({})
      return
    }
    void Promise.all(
      (['face', 'palm_l', 'palm_r'] as const).map(async (part) => {
        const uri = await resolveReadingPhotoUri(readingId, part, { fallbackLive: true })
        return [part, uri] as const
      })
    ).then((entries) => {
      if (cancelled) return
      const next: Partial<Record<'face' | 'palm_l' | 'palm_r', string>> = {}
      for (const [part, uri] of entries) if (uri) next[part] = uri
      setPhotos(next)
    })
    return () => {
      cancelled = true
    }
  }, [readingId])

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
        setLoadError(
          s('无法加载解读', '無法載入解讀', 'Could not load reading', '解読を読み込めませんでした')
        )
      } catch {
        if (!cancelled)
          setLoadError(
            s(
              '无法加载解读',
              '無法載入解讀',
              'Could not load reading',
              '解読を読み込めませんでした'
            )
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [paramPayload, readingId, locale])

  const chapters = useMemo(() => adaptReadingChapters(output, locale), [output, locale])

  // Deep-link from a locus tap: jump to the chapter that owns that part (once).
  const appliedInitialChapter = useRef(false)
  useEffect(() => {
    if (appliedInitialChapter.current) return
    if (!initialChapter || chapters.length === 0) return
    const idx = chapters.findIndex((c) => c.kind === initialChapter)
    if (idx >= 0) setChapterIndex(idx)
    appliedInitialChapter.current = true
  }, [initialChapter, chapters])
  const natalFacts = useMemo(() => natalFactsFromOutput(output), [output])
  const hasBody = chapters.length > 0 && readingHasReportBody(output)
  const inkSeed = useMemo(() => inkSeedFromOutput(output), [output])
  const { show: showPrimer, dismiss: dismissPrimer } = useReadingPrimer(hasBody && !loading)
  const { shotRef, capturing, share: shareImage } = useImageShare()

  // Shared-element flight: when a home tap queued a photo, measure the current
  // chapter's photo mount so the Modal can fly the photo onto it. Retries until
  // the pager/scroll settles (initial chapter jump + entrance float).
  const plateRef = useRef<View | null>(null)
  const photoRefs = {
    face: useRef<View | null>(null),
    palm_l: useRef<View | null>(null),
    palm_r: useRef<View | null>(null),
  }
  const measuredRef = useRef(false)
  useEffect(() => {
    if (readFlight().source) measuredRef.current = false
  }, [readingId, partParam])

  // No on-disk snapshot for the tapped part — abort flight instead of a meaningless morph.
  useEffect(() => {
    if (loading || !hasBody || !flightPending()) return
    const { source } = readFlight()
    if (!source) return
    const part = partParam ?? source.part
    if (photos[part]) return
    measuredRef.current = true
    clearFlight()
  }, [loading, hasBody, photos, partParam])

  useEffect(() => {
    if (!flightPending() || measuredRef.current || loading || !hasBody) return
    const { source } = readFlight()
    if (!source) return
    const part = partParam ?? source.part
    if (!photos[part]) return

    const retry = retriesRemaining(() => {
      const node = photoRefs[part].current ?? plateRef.current
      if (!node) return
      node.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          measuredRef.current = true
          setFlightTarget({ x, y, w, h })
        }
      })
    })
    retry.run()
    return retry.cancel
  }, [chapterIndex, loading, hasBody, photos, partParam])

  const curChapter = chapters[chapterIndex]
  const highlightCitationLocus = useMemo((): 'face' | 'palm_l' | 'palm_r' | undefined => {
    if (!partParam) return undefined
    const ch = chapters[chapterIndex]
    if (!ch) return undefined
    if (ch.kind === 'face' && partParam === 'face') return 'face'
    if (ch.kind === 'palms' && (partParam === 'palm_l' || partParam === 'palm_r')) return partParam
    return undefined
  }, [partParam, chapterIndex, chapters])
  const rawLead = curChapter?.goldenLine.trim() ?? ''
  const shareLead = (() => {
    if (!rawLead) return ''
    if (isCjkZh(locale) || isJa(locale)) return rawLead
    if (okForReadingLocale(locale, rawLead, 0.4)) return rawLead
    const first = curChapter?.evidence.split(/(?<=[.!?。！？])\s+/)[0]?.trim() ?? ''
    return first.length > 12 && okForReadingLocale(locale, first, 0.4) ? first : ''
  })()
  const shareIdentity = xingqiShareIdentity(natalFacts)

  const handleShare = () => {
    if (!curChapter || shareLead.length === 0) return
    shareImage(xingqiShareCaption(locale, shareLead))
  }

  const goHome = () => router.replace('/(app)' as never)
  const chatId = readingId ?? 'draft'
  const softGatePro = () => router.push('/(commerce)/paywall' as never)

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
        <XingqiLoader label={s('加载中', '載入中', 'Loading', '読み込み中')} />
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
          {s('本期形气', '本期形氣', 'This period', '本期の形気')}
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
          {loadError ??
            s(
              '这篇解读正文尚未生成完整。请回首页更新照片后重新发起。',
              '這篇解讀正文尚未生成完整。請回首頁更新照片後重新發起。',
              'This reading has no full body yet. Update photos on home and start again.',
              'この解読の本文が未完成です。ホームで写真を更新して、再度開始してください。'
            )}
        </Text>
        <Button variant='primary' onPress={goHome}>
          {s('完成', '完成', 'Done', '完了')}
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
        highlightCitationLocus={highlightCitationLocus}
        natalFacts={natalFacts}
        onShare={handleShare}
        renderCenterpiece={(ch, index) => {
          const isCurrent = index === chapterIndex
          // Map the chapter to the photo(s) that form describes.
          let chapterPhotos: Array<{ part: 'face' | 'palm_l' | 'palm_r'; uri: string }> = []
          if (ch.kind === 'face' && photos.face) {
            chapterPhotos = [{ part: 'face', uri: photos.face }]
          } else if (ch.kind === 'palms') {
            chapterPhotos = [
              ...(photos.palm_l ? [{ part: 'palm_l' as const, uri: photos.palm_l }] : []),
              ...(photos.palm_r ? [{ part: 'palm_r' as const, uri: photos.palm_r }] : []),
            ]
          }
          return (
            <InkCenterpiece
              chapter={ch}
              seed={inkSeed + ch.kind.length}
              width={Dimensions.get('window').width - 56}
              wuxing={wuxingFromDayMaster(natalFacts?.dayMaster)}
              locale={locale}
              plateRef={isCurrent ? plateRef : undefined}
              photos={chapterPhotos}
              photoRefs={isCurrent ? photoRefs : undefined}
              deferEntrance={isCurrent && flightHoldsEntrance}
            />
          )
        }}
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
        accessibilityLabel={s('关闭', '關閉', 'Close', '閉じる')}
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
      {readingId ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/locus', params: { readingId, part: 'face' } } as never)
          }
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={readingBriefCopy(locale).lociCta}
          style={{
            position: 'absolute',
            top: insets.top + 14,
            right: spacing.xl + 40,
            zIndex: 30,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          <Text style={{ color: colors.secondary, fontSize: 13 }}>
            {readingBriefCopy(locale).lociCta}
          </Text>
        </Pressable>
      ) : null}
      <SelectionActionBar
        quote={pickedQuote}
        labels={{
          copy: s('复制', '複製', 'Copy', 'コピー'),
          chat: s('追问', '追問', 'Chat', '質問'),
          highlight: s('高亮', '高亮', 'Highlight', 'ハイライト'),
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
          onTimeline={() =>
            router.push(
              (readingId
                ? `/timeline?readingId=${encodeURIComponent(readingId)}`
                : '/timeline') as never
            )
          }
          onWhatIf={() =>
            router.push(
              (readingId
                ? `/makeif?readingId=${encodeURIComponent(readingId)}`
                : '/makeif') as never
            )
          }
          onChat={() => openChat(null)}
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
              'Unlock archive & qi layer · Pro',
              'アーカイブと気機層を解放 · Pro'
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
