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

import { Button, EmptyState, ErrorState, useHaptic, useTheme } from '@zhop/core-ui'
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
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnnotatedMapSwiper } from '@/components/AnnotatedMapSwiper'
import { LuopanLoader } from '@/components/LuopanLoader'
import { ShareFengChapterButton } from '@/components/ShareFengChapterButton'
import { resolveLocale, type Strings, useStrings } from '@/lib/i18n'
import { FENG_PAPER } from '@/lib/theme'

/** form-li verdicts that read as auspicious (accent color); others = danger. */
const AUSPICIOUS_VERDICTS = new Set(['旺丁', '旺财'])

const CHAPTER_TAG_KEYS: Record<string, keyof Strings> = {
  external_landform: 'chapter_external_landform',
  personal_fit: 'chapter_personal_fit',
  flying_stars: 'chapter_flying_stars',
  annual_directions: 'chapter_annual_directions',
  remediation: 'chapter_remediation',
  auspicious_objects: 'chapter_auspicious_objects',
}

export default function ReportScreen() {
  const { siteId, autoAnalyze } = useLocalSearchParams<{ siteId: string; autoAnalyze?: string }>()
  const analyzeOnceRef = useRef(false)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { spacing } = useTheme()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()

  // 宣纸 document palette — the report reads as ink-on-paper regardless of mode.
  const c = {
    bg: FENG_PAPER.bg,
    text: FENG_PAPER.ink,
    secondary: FENG_PAPER.inkSoft,
    accent: FENG_PAPER.bronze,
    danger: FENG_PAPER.cinnabar,
    card: FENG_PAPER.sheet,
    separator: FENG_PAPER.hair,
  }

  const chapterTag = (kind: string): string => {
    const key = CHAPTER_TAG_KEYS[kind]
    return key ? t[key] : kind.toUpperCase()
  }

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
      style={{ backgroundColor: c.bg }}
    >
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <Pressable
          onPress={() => {
            void haptic('light')
            router.back()
          }}
          accessibilityRole='button'
          accessibilityLabel={t.nav_back}
          hitSlop={12}
        >
          <Text style={{ color: c.accent, fontSize: 14 }}>‹ {t.nav_back}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: spacing.xl * 3, alignItems: 'center' }}>
          <LuopanLoader label={t.report_loading} />
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
            <Text style={{ fontSize: 26, fontWeight: '700', color: c.text }}>{site.name}</Text>
            <Text style={{ fontSize: 13, color: c.secondary }}>{site.formattedAddress}</Text>
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
                  <View style={{ gap: spacing.lg, alignItems: 'center' }}>
                    {analyze.isRunning ? (
                      <LuopanLoader
                        size={140}
                        label={t.new_site_review_processing.replace(
                          '{stage}',
                          analyze.stage ?? 'maps'
                        )}
                      />
                    ) : null}
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
                      <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center' }}>
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
                <Animated.View
                  key={chapter.kind}
                  entering={FadeInDown.duration(260).delay(idx * 60)}
                >
                  <View
                    style={{
                      backgroundColor: c.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: c.separator,
                      padding: spacing.lg,
                      gap: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          color: FENG_PAPER.cinnabar,
                          fontSize: 11,
                          fontWeight: '700',
                          letterSpacing: 1,
                        }}
                      >
                        {`CH ${idx + 1}`}
                      </Text>
                      <Text style={{ color: c.accent, fontSize: 11, letterSpacing: 3 }}>
                        {chapterTag(chapter.kind)}
                      </Text>
                    </View>
                    <Text style={{ color: c.text, fontSize: 19, fontWeight: '700' }}>
                      {chapter.title}
                    </Text>
                    <Text style={{ color: FENG_PAPER.cinnabar, fontSize: 14, fontStyle: 'italic' }}>
                      {chapter.goldenLine}
                    </Text>
                    <Text style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
                      {chapter.body}
                    </Text>

                    {compute && chapter.kind === 'flying_stars' ? (
                      <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                        <FlyingStarsGrid
                          result={compute.flyingStars}
                          backgroundColor={FENG_PAPER.bg}
                          borderColor={c.separator}
                          labelColor={c.text}
                        />
                        {compute.patterns && compute.patterns.length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                            {compute.patterns.map((p) => {
                              const tone =
                                p.quality === 'auspicious'
                                  ? c.accent
                                  : p.quality === 'inauspicious'
                                    ? c.danger
                                    : c.secondary
                              return (
                                <View
                                  key={`${p.kind}-${p.scope ?? ''}`}
                                  accessibilityLabel={`${p.kind}${p.scope && p.scope !== '全局' ? ` ${p.scope}` : ''}`}
                                  style={{
                                    paddingHorizontal: spacing.sm,
                                    paddingVertical: 4,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: tone,
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: tone }}>
                                    {p.kind}
                                    {p.scope && p.scope !== '全局' ? `·${p.scope}` : ''}
                                  </Text>
                                </View>
                              )
                            })}
                          </View>
                        ) : null}
                        {compute.flyingStars.isCompoundFacing ? (
                          <Text
                            style={{
                              color: c.secondary,
                              fontSize: 12,
                              fontStyle: 'italic',
                            }}
                          >
                            {t.report_compound_facing_note}
                          </Text>
                        ) : null}
                        {compute.formLi && compute.formLi.palaces.length > 0 ? (
                          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                            <Text
                              style={{
                                color: c.secondary,
                                fontSize: 11,
                                letterSpacing: 1,
                              }}
                            >
                              {t.report_formli_heading}
                            </Text>
                            {compute.formLi.palaces.flatMap((pl) =>
                              pl.findings.map((f, i) => {
                                const tone = AUSPICIOUS_VERDICTS.has(f.verdict)
                                  ? c.accent
                                  : f.verdict === '化煞' || f.verdict === '平'
                                    ? c.secondary
                                    : c.danger
                                return (
                                  <View
                                    key={`${pl.palace}-${f.verdict}-${i}`}
                                    style={{ flexDirection: 'row', gap: spacing.sm }}
                                  >
                                    <Text
                                      style={{
                                        color: tone,
                                        fontSize: 12,
                                        fontWeight: '700',
                                        width: 56,
                                      }}
                                    >
                                      {pl.palace}·{f.verdict}
                                    </Text>
                                    <Text
                                      style={{
                                        color: c.text,
                                        fontSize: 12,
                                        flex: 1,
                                        lineHeight: 18,
                                      }}
                                    >
                                      {f.reason}
                                    </Text>
                                  </View>
                                )
                              })
                            )}
                            {compute.formLi.zhengLing.findings.map((z, i) => (
                              <Text
                                key={`zl-${z.palace}-${i}`}
                                style={{
                                  color: z.auspicious ? c.accent : c.danger,
                                  fontSize: 12,
                                  lineHeight: 18,
                                }}
                              >
                                {z.reason}
                              </Text>
                            ))}
                            {compute.formLi.patternRescue.map((r) => (
                              <Text
                                key={r.pattern}
                                style={{
                                  color: r.favourable ? c.accent : c.danger,
                                  fontSize: 12,
                                  fontStyle: 'italic',
                                  lineHeight: 18,
                                }}
                              >
                                {r.note}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {compute?.baZhai && chapter.kind === 'personal_fit' ? (
                      <View
                        style={{ marginTop: spacing.md, alignItems: 'center', gap: spacing.sm }}
                      >
                        <BaZhaiWheel result={compute.baZhai} size={240} strokeColor={c.text} />
                        {compute.baZhai.concord ? (
                          <Text
                            style={{
                              color: compute.baZhai.concord.concordant ? c.accent : c.danger,
                              fontSize: 13,
                              fontWeight: '700',
                            }}
                          >
                            {compute.baZhai.concord.verdict}
                          </Text>
                        ) : null}
                        <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
                          <Text style={{ color: c.secondary, fontSize: 11, letterSpacing: 1 }}>
                            {t.report_placement_heading}
                          </Text>
                          {(
                            [
                              [t.placement_door, compute.baZhai.placement.door],
                              [t.placement_bed, compute.baZhai.placement.bedHead],
                              [t.placement_stove, compute.baZhai.placement.stove.mouthToward],
                              [t.placement_desk, compute.baZhai.placement.desk],
                            ] as const
                          ).map(([label, v]) => (
                            <View key={label} style={{ flexDirection: 'row', gap: spacing.sm }}>
                              <Text style={{ color: c.secondary, fontSize: 12, width: 56 }}>
                                {label}
                              </Text>
                              <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>
                                {v.kind}·{v.palace}
                              </Text>
                            </View>
                          ))}
                        </View>
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
                  </View>
                </Animated.View>
              ))}

              <Text
                style={{
                  color: c.secondary,
                  fontSize: 12,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  paddingHorizontal: spacing.xl,
                }}
              >
                {t.report_data_quality_footer}
              </Text>

              <Text
                style={{
                  color: c.secondary,
                  fontSize: 11,
                  textAlign: 'center',
                  paddingHorizontal: spacing.xl,
                }}
              >
                {t.report_confidence_note}
              </Text>

              {compute?.streetAttribution ? (
                <Text
                  style={{
                    color: c.secondary,
                    opacity: 0.6,
                    fontSize: 10,
                    textAlign: 'center',
                    paddingHorizontal: spacing.xl,
                  }}
                >
                  {compute.streetAttribution}
                </Text>
              ) : null}

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
