/**
 * Bond detail / synastry report.
 *
 * Loads /api/bonds/:id via useSynastryReport, then renders:
 *   - Header: 2 names + relationship + compatibility score
 *   - If report has chapters: ChapterPager (horizontal swipe across 6 chapters)
 *   - Else: fall back to single-page summary card with goldenLine if present
 *
 * Status 202 → "generating" UI; on 4xx/5xx → error state + retry.
 *
 * Share flow: tapping the chapter's share button registers a shareId via
 * POST /api/bonds/:id/share, renders ShareableChapterCard off-screen, captures
 * it as a 1080×1920 PNG via react-native-view-shot, then opens the system
 * share sheet via expo-sharing.
 *
 * Phase F migration: loading / generating / error states use core-ui patterns.
 * Editorial typography (kindredType) and gold-underline CTAs (kindredPresets) stay
 * Kindred-specific.
 */

import { ErrorState, useHaptic } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  ChapterPager,
  CompatibilityScore,
  ShareableChapterCard,
  useShareBond,
  useSynastryReport,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { captureRef } from 'react-native-view-shot'
import { ReportReveal } from '@/components/ReportReveal'
import { useI18n } from '@/lib/i18n'

export default function BondDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { detail, isLoading, isGenerating, error, refetch, chapters } = useSynastryReport(
    id ?? null
  )
  const [chapterIndex, setChapterIndex] = useState<number>(0)
  const { createShareUrl } = useShareBond()
  const { t } = useI18n()

  // Off-screen render target for ShareableChapterCard.
  // When shareTarget is set, the hidden View renders the card for that chapter
  // and the effect below captures it via view-shot, then opens share sheet.
  const [shareTarget, setShareTarget] = useState<{ index: number; brandUrl: string } | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const captureRefView = useRef<View>(null)
  const haptic = useHaptic()

  // When shareTarget changes, capture-and-share on the next layout pass.
  useEffect(() => {
    if (!shareTarget) return
    let cancelled = false
    const handle = setTimeout(async () => {
      if (cancelled || !captureRefView.current) return
      try {
        const uri = await captureRef(captureRefView.current, {
          format: 'png',
          quality: 1,
          width: 1080,
          height: 1920,
        })
        if (!cancelled) {
          await haptic('light')
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              dialogTitle: 'Kindred',
              mimeType: 'image/png',
              UTI: 'public.png',
            })
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[Kindred share]', err)
      } finally {
        if (!cancelled) {
          setShareTarget(null)
          setIsCapturing(false)
        }
      }
    }, 80)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [shareTarget, haptic])

  const handleShareChapter = async (idx: number) => {
    if (!id || isCapturing) return
    setIsCapturing(true)
    let brandUrl = 'kindred.hexastral.com'
    try {
      const res = await createShareUrl(id)
      brandUrl = res.url.replace(/^https?:\/\//, '')
    } catch (err) {
      if (__DEV__) console.warn('[Kindred share/url]', err)
      // Fall through with default brandUrl — still shareable as a generic card.
    }
    setShareTarget({ index: idx, brandUrl })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
        </View>
      </SafeAreaView>
    )
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <AutoMoonPhaseLoader size={96} skin={SKIN_CINNABAR} />
          <Text style={[kindredType.body, { color: kindredDark.textSecondary }]}>合盘中…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <ErrorState
          variant='fullscreen'
          title={error?.message ?? 'Bond not found'}
          customAction={
            <Pressable onPress={() => void refetch()} hitSlop={12}>
              <Text style={kindredPresets.ctaText}>Retry →</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
    )
  }

  // Names for the share card — fall back to "你" / targetName for solo bonds
  const selfName = detail.interpretation?.personAName as string | undefined
  const otherName = detail.targetName

  // Pro chat over this synastry. The server's 'pair' context query keys on the
  // pairReadings id (hehunReadingId), NOT the bond id — only offer chat once a
  // reading exists.
  const pairReadingId = detail.hehunReadingId
  const openChat =
    pairReadingId != null
      ? () =>
          router.push({
            pathname: '/(bonds)/chat',
            params: { id: pairReadingId, title: detail.targetName },
          })
      : null

  // Chapter-based report (v2): horizontal pager
  if (chapters && chapters.length > 0) {
    return (
      <ReportReveal>
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
          <View
            style={{
              paddingHorizontal: kindredSpacing.screenH,
              paddingVertical: kindredSpacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={kindredDark.text} size={24} strokeWidth={1.2} />
            </Pressable>
            <Text
              style={[
                kindredType.caption,
                { color: kindredDark.textSecondary, marginLeft: kindredSpacing.md },
              ]}
            >
              {detail.targetName} · {detail.relationshipLabel}
            </Text>
            <View style={{ flex: 1 }} />
            {openChat ? (
              <Pressable onPress={openChat} hitSlop={8}>
                <Text style={kindredPresets.ctaText}>{t('chat.cta')}</Text>
              </Pressable>
            ) : null}
          </View>
          <ChapterPager
            report={{
              id: detail.id,
              bondId: detail.id,
              generatedAt: detail.createdAt,
              chapters,
              headline: detail.archetypeTagline ?? '',
            }}
            currentIndex={chapterIndex}
            onIndexChange={setChapterIndex}
            onShareChapter={(idx) => void handleShareChapter(idx)}
          />

          {/* Off-screen capture target — positioned far outside viewport but mounted. */}
          {shareTarget ? (
            <View
              ref={captureRefView}
              collapsable={false}
              style={{ position: 'absolute', top: -20000, left: 0 }}
            >
              <ShareableChapterCard
                chapter={chapters[shareTarget.index] ?? chapters[0]!}
                selfName={selfName ?? '你'}
                otherName={otherName}
                width={1080}
                height={1920}
                brandUrl={shareTarget.brandUrl}
              />
            </View>
          ) : null}
        </SafeAreaView>
      </ReportReveal>
    )
  }

  // V1 fallback — single-page summary
  return (
    <ReportReveal>
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: kindredSpacing.screenH,
            paddingTop: kindredSpacing.lg,
            paddingBottom: kindredSpacing.xxl,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
            <ChevronLeft color={kindredDark.text} size={24} strokeWidth={1.2} />
          </Pressable>

          <View
            style={{ alignItems: 'center', marginTop: kindredSpacing.lg, gap: kindredSpacing.sm }}
          >
            <Text style={[kindredType.seal, { color: kindredDark.textMuted }]}>
              {detail.relationshipLabel}
            </Text>
            <Text style={[kindredType.title, { color: kindredDark.text }]}>
              {detail.targetName}
            </Text>
          </View>

          {detail.score != null && (
            <View style={{ alignItems: 'center', marginTop: kindredSpacing.xl }}>
              <CompatibilityScore score={detail.score} label={detail.grade ?? undefined} />
            </View>
          )}

          {detail.archetypeName && (
            <View style={{ marginTop: kindredSpacing.xl, gap: kindredSpacing.sm }}>
              <Text style={[kindredType.caption, { color: kindredDark.accent, letterSpacing: 4 }]}>
                {detail.archetypeCategory?.toUpperCase()}
              </Text>
              <Text style={[kindredType.heading, { color: kindredDark.text }]}>
                {detail.archetypeName}
              </Text>
              {detail.archetypeTagline && (
                <Text style={[kindredType.body, { color: kindredDark.textSecondary }]}>
                  {detail.archetypeTagline}
                </Text>
              )}
            </View>
          )}

          {detail.interpretation?.overview && (
            <View style={{ marginTop: kindredSpacing.xl }}>
              <Text style={[kindredType.body, { color: kindredDark.text }]}>
                {detail.interpretation.overview}
              </Text>
            </View>
          )}

          {openChat ? (
            <Pressable onPress={openChat} style={{ marginTop: kindredSpacing.xl }} hitSlop={8}>
              <Text style={kindredPresets.ctaText}>{t('chat.cta')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ReportReveal>
  )
}
