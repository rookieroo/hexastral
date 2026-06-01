/**
 * (report)/[siteId] — 6-chapter feng-shui report with per-chapter share.
 *
 * Renders chapters as vertical cards with cinnabar share buttons.
 * Data flow:
 *   1. useFengSite(siteId) → site row + latestReport (if any)
 *   2. If no report: show "Analyze" CTA which calls useAnalyzeJob.
 *   3. If a report exists: render chapters[].
 *
 * Phase F: chapter rows use <Card variant="elevated">; analyze CTA uses <Button>
 * with loading state + progress label; empty/error states use core-ui primitives.
 */

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingTextBlock,
  Pill,
  useTheme,
} from '@zhop/core-ui'
import {
  BaZhaiWheel,
  type FengChapter,
  FlyingStarsGrid,
  useAnalyzeJob,
  useFengSite,
} from '@zhop/scenario-feng'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnnotatedMapSwiper } from '@/components/AnnotatedMapSwiper'
import { ShareFengChapterButton } from '@/components/ShareFengChapterButton'
import { resolveLocale, useStrings } from '@/lib/i18n'

const CHAPTER_LABELS: Record<string, string> = {
  external_landform: '外巒頭',
  personal_fit: '命卦',
  flying_stars: '飛星',
  annual_directions: '流年',
  remediation: '化解',
  auspicious_objects: '改運',
}

export default function ReportScreen() {
  const { siteId, autoAnalyze } = useLocalSearchParams<{ siteId: string; autoAnalyze?: string }>()
  const analyzeOnceRef = useRef(false)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const t = useStrings(resolveLocale())

  const { site, latestReport, isLoading, refetch } = useFengSite(siteId ?? null)
  const analyze = useAnalyzeJob(siteId ?? null)

  useEffect(() => {
    if (analyze.stage === 'done') void refetch()
  }, [analyze.stage, refetch])

  useEffect(() => {
    if (autoAnalyze !== '1' || !siteId || analyzeOnceRef.current) return
    if (latestReport || analyze.isRunning) return
    analyzeOnceRef.current = true
    void analyze.start()
  }, [autoAnalyze, siteId, latestReport, analyze.isRunning, analyze.start])

  const chapters: FengChapter[] = latestReport?.chapters ?? analyze.job?.report?.chapters ?? []
  const reportId = latestReport?.id ?? ''
  const annotatedTiles = latestReport?.annotatedTiles ?? analyze.job?.report?.annotatedTiles ?? []
  const compute = latestReport?.compute ?? analyze.job?.report?.compute ?? null

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      style={{ backgroundColor: colors.bg }}
    >
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.accent, fontSize: 14 }}>‹ Back</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <LoadingTextBlock />
          <LoadingTextBlock />
        </View>
      ) : !site ? (
        <ErrorState
          variant='fullscreen'
          title='Site not found'
          message='This site may have been deleted or you do not have access.'
        />
      ) : (
        <>
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.xs }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{site.name}</Text>
            <Text style={{ fontSize: 13, color: colors.secondary }}>{site.formattedAddress}</Text>
          </View>

          {reportId && annotatedTiles.length > 0 ? (
            <AnnotatedMapSwiper
              reportId={reportId}
              tiles={annotatedTiles}
              horizontalPadding={spacing.xl}
              strings={{
                report_map_close: t.report_map_close,
                report_map_mid: t.report_map_mid,
                report_map_wide: t.report_map_wide,
                report_map_loading: t.report_map_loading,
                report_map_failed: t.report_map_failed,
              }}
            />
          ) : null}

          {chapters.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
              <EmptyState
                title={t.report_pending}
                customAction={
                  <View style={{ gap: spacing.sm, alignItems: 'center' }}>
                    <Button
                      variant='primary'
                      size='lg'
                      loading={analyze.isRunning}
                      disabled={analyze.isRunning}
                      onPress={() => {
                        if (analyze.isRunning || analyzeOnceRef.current) return
                        analyzeOnceRef.current = true
                        void analyze.start()
                      }}
                    >
                      {analyze.isRunning
                        ? t.new_site_review_processing.replace('{stage}', analyze.stage ?? 'maps')
                        : t.new_site_review_confirm}
                    </Button>
                    {analyze.error ? (
                      <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center' }}>
                        {t.report_failed.replace('{message}', analyze.error.message)}
                      </Text>
                    ) : null}
                  </View>
                }
              />
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: spacing.xl,
                gap: spacing.lg,
                marginTop: spacing.lg,
              }}
            >
              {chapters.map((chapter, idx) => (
                <Card
                  key={chapter.kind}
                  variant='elevated'
                  padding='lg'
                  style={{ gap: spacing.sm }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <Pill variant='accent'>{`CH ${idx + 1}`}</Pill>
                    <Text
                      style={{
                        color: colors.secondary,
                        fontSize: 11,
                        letterSpacing: 2,
                      }}
                    >
                      {CHAPTER_LABELS[chapter.kind] ?? chapter.kind.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>
                    {chapter.title}
                  </Text>
                  <Text style={{ color: colors.accent, fontSize: 14, fontStyle: 'italic' }}>
                    {chapter.goldenLine}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
                    {chapter.body}
                  </Text>

                  {compute && chapter.kind === 'flying_stars' ? (
                    <View style={{ marginTop: spacing.md }}>
                      <FlyingStarsGrid
                        result={compute.flyingStars}
                        backgroundColor={colors.card}
                        borderColor={colors.separator}
                        labelColor={colors.text}
                      />
                    </View>
                  ) : null}

                  {compute?.baZhai && chapter.kind === 'personal_fit' ? (
                    <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
                      <BaZhaiWheel result={compute.baZhai} size={240} strokeColor={colors.text} />
                    </View>
                  ) : null}

                  {reportId ? (
                    <View style={{ marginTop: spacing.sm }}>
                      <ShareFengChapterButton
                        reportId={reportId}
                        chapterKind={chapter.kind}
                        chapterTitle={chapter.title}
                        contentJson={JSON.stringify({
                          kind: chapter.kind,
                          title: chapter.title,
                          goldenLine: chapter.goldenLine,
                          body: chapter.body,
                        })}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}

              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 12,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  paddingHorizontal: spacing.xl,
                }}
              >
                {t.report_data_quality_footer}
              </Text>

              {reportId ? (
                <Button
                  variant='secondary'
                  size='lg'
                  onPress={() =>
                    router.push({
                      pathname: '/(report)/chat',
                      params: { reportId, title: site.name },
                    })
                  }
                >
                  {t.chat_cta}
                </Button>
              ) : null}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}
