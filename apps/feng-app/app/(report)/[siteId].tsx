/**
 * (report)/[siteId] — the feng report, a 宣纸 chaptered pager (Yuel-aligned UX,
 * feng-native craft).
 *
 * Each chapter is a horizontal page: 碑拓 seal + 意象图 centerpiece + title +
 * 朱砂 golden line + prose (with the term layer + 划词 selection) + the chapter's
 * deterministic visual (飞星盘 / 八宅轮 / 卫星图) + share. A closing page carries
 * the confidence notes + chat. Overlays: FengSelectionBar (划词) + FengTermBubble.
 *
 * Analysis wait uses the staged 罗盘 loader (FengAnalyzing). No Skia — pure
 * react-native-svg + reanimated.
 */

import { Button, EmptyState, ErrorState, useHaptic } from '@zhop/core-ui'
import {
  BaZhaiWheel,
  type FengChapter,
  type FengComputeJson,
  deriveReportDigest,
  FlyingStarsGrid,
  type ReportDigest,
  useAnalyzeJob,
  useFengSite,
} from '@zhop/scenario-feng'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnnotatedMapSwiper, type MapOrient } from '@/components/AnnotatedMapSwiper'
import { FengAnalyzing, type FengAnalyzingStep } from '@/components/FengAnalyzing'
import { FengButton } from '@/components/FengButton'
import { FengDigestCard } from '@/components/FengDigestCard'
import { FengInkImage } from '@/components/FengInkImage'
import { FengProse } from '@/components/FengProse'
import { FengSelectionBar } from '@/components/FengSelectionBar'
import { FengTermBubble } from '@/components/FengTermBubble'
import { LuopanLoader } from '@/components/LuopanLoader'
import { SealNumeral } from '@/components/SealNumeral'
import { ShareFengChapterButton } from '@/components/ShareFengChapterButton'
import { type FengTerm, getFengTerm } from '@/lib/feng-terms'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { type Locale, resolveLocale, type Strings, useStrings } from '@/lib/i18n'
import { FENG_PAPER, spacing } from '@/lib/theme'

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

// 宣纸 document palette — the report reads as ink-on-paper regardless of mode.
const C = {
  bg: FENG_PAPER.bg,
  text: FENG_PAPER.ink,
  secondary: FENG_PAPER.inkSoft,
  accent: FENG_PAPER.bronze,
  danger: FENG_PAPER.cinnabar,
  card: FENG_PAPER.sheet,
  separator: FENG_PAPER.hair,
}

// Staged-loader copy (localized inline; report-screen-only chrome).
const STAGE_ORDER = ['maps', 'vision', 'compute', 'synthesis'] as const
type AnalyzeStage = (typeof STAGE_ORDER)[number]
const STAGE_LABELS: Record<Locale, Record<AnalyzeStage, string>> = {
  en: {
    maps: 'Mapping the site',
    vision: 'Reading the land',
    compute: 'Casting the chart',
    synthesis: 'Writing the reading',
  },
  zh: { maps: '加载地图', vision: '标注形势', compute: '排盘演算', synthesis: '撰写报告' },
  'zh-Hant': { maps: '載入地圖', vision: '標註形勢', compute: '排盤演算', synthesis: '撰寫報告' },
  ja: {
    maps: '地図を読み込み',
    vision: '地形を注釈',
    compute: '盤を立てる',
    synthesis: 'レポートを作成',
  },
}
const ANALYZE_CAPTION: Record<Locale, string> = {
  en: 'Generating report…',
  zh: '正在生成报告…',
  'zh-Hant': '正在生成報告…',
  ja: 'レポートを生成中…',
}

export default function ReportScreen() {
  const { siteId, autoAnalyze } = useLocalSearchParams<{ siteId: string; autoAnalyze?: string }>()
  const analyzeOnceRef = useRef(false)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const t = useStrings(resolveLocale())
  const locale = resolveLocale()
  const haptic = useHaptic()

  const { site, latestReport, isLoading, refetch } = useFengSite(siteId ?? null)
  const analyze = useAnalyzeJob(siteId ?? null)

  const [page, setPage] = useState(0)
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [activeTerm, setActiveTerm] = useState<FengTerm | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])

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
  const flyingStarsConfidence =
    latestReport?.dataQuality?.flyingStarsConfidence ??
    analyze.job?.report?.dataQuality?.flyingStarsConfidence ??
    'high'
  const reportDigest = useMemo(
    () => deriveReportDigest(compute, flyingStarsConfidence),
    [compute, flyingStarsConfidence]
  )
  // 坐/向/门 bearings for the client-drawn map overlay (server ships raw tiles).
  const orient: MapOrient | null = site
    ? {
        facing: Number(site.facingDegTrue),
        sit: Number(site.sitDegTrue),
        door: site.doorDegTrue != null ? Number(site.doorDegTrue) : null,
      }
    : null

  useEffect(() => {
    if (!reportId) return
    void loadHighlights(reportId).then(setHighlights)
  }, [reportId])

  const chapterTag = (kind: string): string => {
    const key = CHAPTER_TAG_KEYS[kind]
    return key ? t[key] : kind.toUpperCase()
  }

  const onPickQuote = useCallback(
    (sentence: string) => {
      void haptic('light')
      setPickedQuote(sentence)
    },
    [haptic]
  )

  const onTapTerm = useCallback(
    (termId: string) => {
      const term = getFengTerm(termId)
      if (term) {
        void haptic('light')
        setActiveTerm(term)
      }
    },
    [haptic]
  )

  const askInChat = useCallback(
    (quote: string) => {
      if (!reportId) return
      router.push({
        pathname: '/(report)/chat',
        params: { reportId, siteId, title: site?.name ?? '', quote },
      })
    },
    [router, reportId, site?.name]
  )

  const onChatAboutQuote = useCallback(() => {
    const q = pickedQuote
    setPickedQuote(null)
    if (q) askInChat(q)
  }, [pickedQuote, askInChat])

  const onCopyQuote = useCallback(() => {
    if (pickedQuote) void copyToClipboard(pickedQuote)
    setPickedQuote(null)
  }, [pickedQuote])

  const onToggleHighlight = useCallback(() => {
    const q = pickedQuote
    if (!q) return
    setHighlights((prev) => {
      const next = prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
      if (reportId) void saveHighlights(reportId, next)
      return next
    })
    setPickedQuote(null)
  }, [pickedQuote, reportId])

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width)
      if (i !== page) {
        setPage(i)
        setPickedQuote(null)
      }
    },
    [width, page]
  )

  const analyzeSteps: FengAnalyzingStep[] = useMemo(() => {
    const cur = STAGE_ORDER.indexOf(analyze.stage as AnalyzeStage)
    // cur < 0 = not a pipeline stage yet (queued / starting) — the FIRST step is
    // active and the rest pending. (The old `cur < 0 ? 'done'` painted every step
    // complete before the job had even begun.)
    return STAGE_ORDER.map((s, i) => ({
      label: STAGE_LABELS[locale][s],
      status:
        cur < 0
          ? i === 0
            ? 'active'
            : 'pending'
          : i < cur
            ? 'done'
            : i === cur
              ? 'active'
              : 'pending',
    }))
  }, [analyze.stage, locale])

  // ── floating back button (no header — the report reads as an unrolled scroll) ──
  const backButton = (
    <Pressable
      onPress={() => {
        void haptic('light')
        router.back()
      }}
      accessibilityRole='button'
      accessibilityLabel={t.nav_back}
      hitSlop={12}
      style={{
        position: 'absolute',
        top: insets.top + spacing.xs,
        left: spacing.lg,
        zIndex: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.separator,
      }}
    >
      <Text style={{ color: C.accent, fontSize: 22, marginTop: -2 }}>‹</Text>
    </Pressable>
  )

  // ── states ───────────────────────────────────────────────
  let middle: React.ReactNode
  if (isLoading) {
    middle = (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LuopanLoader label={t.report_loading} />
      </View>
    )
  } else if (!site) {
    middle = (
      <ErrorState
        variant='fullscreen'
        title='Site not found'
        message='This site may have been deleted or you do not have access.'
      />
    )
  } else if (chapters.length === 0 && compute && analyze.stage !== 'failed') {
    // Two-phase load: the computed SHELL (排盘/坐向/tiles/八宅) is ready while the
    // written chapters are still generating. Show it now instead of a blank wait.
    // NOT when the job failed — the server deletes the orphan shell on failure, but
    // guard here too so a stale in-memory shell can't become a permanent fake loader.
    middle = (
      <ReportShellView
        width={width}
        compute={compute}
        reportId={reportId}
        annotatedTiles={annotatedTiles}
        orient={orient}
        insets={insets}
        steps={analyzeSteps}
        caption={ANALYZE_CAPTION[locale]}
        digest={reportDigest}
        t={t}
      />
    )
  } else if (chapters.length === 0) {
    middle = (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {analyze.isRunning ? (
          <FengAnalyzing steps={analyzeSteps} label={ANALYZE_CAPTION[locale]} />
        ) : (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <EmptyState
              title={t.report_pending}
              customAction={
                <View style={{ gap: spacing.lg, alignItems: 'center' }}>
                  <FengButton
                    label={t.new_site_review_confirm}
                    loading={analyze.isRunning}
                    disabled={analyze.isRunning}
                    fullWidth={false}
                    onPress={() => {
                      // Manual (re)try — gate only on isRunning, NOT analyzeOnceRef
                      // (the auto-analyze effect sets that true, which would
                      // otherwise permanently disable retry after a failure).
                      if (analyze.isRunning) return
                      analyzeOnceRef.current = true
                      void analyze.start()
                    }}
                  />
                  {analyze.error ? (
                    <Text style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>
                      {t.report_failed.replace('{message}', analyze.error.message)}
                    </Text>
                  ) : null}
                </View>
              }
            />
          </View>
        )}
      </ScrollView>
    )
  } else {
    const hasDigest = reportDigest != null
    const pageCount = chapters.length + (hasDigest ? 2 : 1)
    middle = (
      <>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {reportDigest ? (
            <DigestCoverView
              width={width}
              insets={insets}
              siteName={site.name}
              digest={reportDigest}
              t={t}
            />
          ) : null}
          {chapters.map((chapter, idx) => (
            <ChapterPageView
              key={chapter.kind}
              width={width}
              insets={insets}
              chapter={chapter}
              index={idx}
              active={page === idx}
              tag={chapterTag(chapter.kind)}
              compute={compute}
              reportId={reportId}
              annotatedTiles={annotatedTiles}
              orient={orient}
              highlights={highlights}
              onPickQuote={onPickQuote}
              onTapTerm={onTapTerm}
              t={t}
            />
          ))}
          <ClosingPageView
            width={width}
            insets={insets}
            reportId={reportId}
            siteName={site.name}
            streetAttribution={compute?.streetAttribution ?? null}
            onChat={() =>
              router.push({
                pathname: '/(report)/chat',
                params: { reportId, siteId, title: site.name },
              })
            }
            t={t}
          />
        </ScrollView>
        <PageDots count={pageCount} active={page} bottom={insets.bottom + spacing.sm} />
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style='light' />
      {backButton}
      {middle}
      <FengSelectionBar
        quote={pickedQuote}
        highlighted={pickedQuote ? highlights.includes(pickedQuote) : false}
        labels={{ copy: t.reading_copy, chat: t.reading_chat, highlight: t.reading_highlight }}
        onCopy={onCopyQuote}
        onChat={reportId ? onChatAboutQuote : undefined}
        onHighlight={onToggleHighlight}
        onClose={() => setPickedQuote(null)}
      />
      <FengTermBubble
        term={activeTerm}
        onClose={() => setActiveTerm(null)}
        onAsk={
          reportId
            ? (term) => {
                setActiveTerm(null)
                askInChat(`${term.term}：`)
              }
            : undefined
        }
        sourceLabel={t.term_source}
        askLabel={t.term_ask}
      />
    </View>
  )
}

// ── digest cover (page 0 — qualitative summary, no percentile score) ──
function DigestCoverView({
  width,
  insets,
  siteName,
  digest,
  t,
}: {
  width: number
  insets: { top: number; bottom: number }
  siteName: string
  digest: ReportDigest
  t: Strings
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: insets.top + spacing.xxl + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl + spacing.lg,
        gap: spacing.lg,
      }}
    >
      <Animated.View entering={FadeInDown.duration(280)}>
        <Text style={{ color: C.accent, fontSize: 12, letterSpacing: 3 }}>
          {t.report_digest_tag.toUpperCase()}
        </Text>
        <Text
          style={{
            color: C.text,
            fontSize: 26,
            fontWeight: '700',
            marginTop: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          {siteName}
        </Text>
        <Text style={{ color: C.secondary, fontSize: 13, marginBottom: spacing.lg }}>
          {t.report_chapter_pager_hint}
        </Text>
      </Animated.View>

      <FengDigestCard digest={digest} t={t} />

      <Text style={{ color: C.secondary, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
        {t.report_confidence_note}
      </Text>
    </ScrollView>
  )
}

// ── report shell (two-phase load) ──────────────────────────
// The computed report — 排盘 / 坐向 / satellite tiles / 八宅 — rendered as soon
// as the pipeline persists the shell, while the written chapters synthesize.
// Horizontal pager: page 0 = deterministic preview only; swipe left for the loader.
function ReportShellView({
  width,
  compute,
  reportId,
  annotatedTiles,
  orient,
  insets,
  steps,
  caption,
  digest,
  t,
}: {
  width: number
  compute: FengComputeJson
  reportId: string
  annotatedTiles: ('close' | 'mid' | 'wide')[]
  orient: MapOrient | null
  insets: { top: number; bottom: number }
  steps: FengAnalyzingStep[]
  caption: string
  digest: ReportDigest | null
  t: Strings
}) {
  const [shellPage, setShellPage] = useState(0)
  const onShellMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setShellPage(Math.round(e.nativeEvent.contentOffset.x / width))
    },
    [width]
  )

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onShellMomentumEnd}
      >
        <ScrollView
          style={{ width }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: insets.top + spacing.xxl + spacing.xl,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
        >
          <Text style={{ color: C.accent, fontSize: 12, letterSpacing: 3 }}>
            {t.report_shell_tag.toUpperCase()}
          </Text>

          {digest ? (
            <View style={{ marginTop: spacing.lg }}>
              <FengDigestCard digest={digest} t={t} />
            </View>
          ) : null}

          {reportId && annotatedTiles.length > 0 ? (
            <View style={{ marginTop: spacing.md, marginHorizontal: -spacing.xl }}>
              <AnnotatedMapSwiper
                reportId={reportId}
                tiles={annotatedTiles}
                orient={orient}
                horizontalPadding={spacing.xl}
                strings={{
                  report_map_close: t.report_map_close,
                  report_map_mid: t.report_map_mid,
                  report_map_wide: t.report_map_wide,
                  report_map_loading: t.report_map_loading,
                  report_map_failed: t.report_map_failed,
                }}
              />
            </View>
          ) : null}

          {renderFlyingStars(compute, t)}
          {compute.baZhai ? renderBaZhai(compute, t) : null}
        </ScrollView>

        <View
          style={{
            width,
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
        >
          <FengAnalyzing steps={steps} label={caption} />
        </View>
      </ScrollView>
      <PageDots count={2} active={shellPage} bottom={insets.bottom + spacing.sm} />
    </>
  )
}

// ── one chapter page ───────────────────────────────────────
interface ChapterPageProps {
  width: number
  insets: { top: number; bottom: number }
  chapter: FengChapter
  index: number
  active: boolean
  tag: string
  compute: FengComputeJson | null
  reportId: string
  annotatedTiles: ('close' | 'mid' | 'wide')[]
  orient: MapOrient | null
  highlights: string[]
  onPickQuote: (s: string) => void
  onTapTerm: (id: string) => void
  t: Strings
}

function ChapterPageView({
  width,
  insets,
  chapter,
  index,
  active,
  tag,
  compute,
  reportId,
  annotatedTiles,
  orient,
  highlights,
  onPickQuote,
  onTapTerm,
  t,
}: ChapterPageProps) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        // clear the floating back button (top: insets.top + xs, 36pt tall)
        paddingTop: insets.top + spacing.xxl + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl + spacing.lg,
      }}
    >
      <Animated.View entering={FadeInDown.duration(280)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <SealNumeral n={index + 1} />
          <Text style={{ color: C.accent, fontSize: 12, letterSpacing: 3 }}>
            {tag.toUpperCase()}
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
          <FengInkImage
            kind={chapter.kind}
            width={Math.min(width - spacing.xl * 2, 300)}
            active={active}
          />
        </View>

        <Text style={{ color: C.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.xs }}>
          {chapter.title}
        </Text>
        <Text
          style={{
            color: FENG_PAPER.cinnabar,
            fontSize: 15,
            fontStyle: 'italic',
            marginBottom: spacing.md,
          }}
        >
          {chapter.goldenLine}
        </Text>
      </Animated.View>

      <FengProse
        body={chapter.body}
        highlights={highlights}
        onPickQuote={onPickQuote}
        onTapTerm={onTapTerm}
      />

      {chapter.kind === 'external_landform' && reportId && annotatedTiles.length > 0 ? (
        <View style={{ marginTop: spacing.lg, marginHorizontal: -spacing.xl }}>
          <AnnotatedMapSwiper
            reportId={reportId}
            tiles={annotatedTiles}
            orient={orient}
            horizontalPadding={spacing.xl}
            strings={{
              report_map_close: t.report_map_close,
              report_map_mid: t.report_map_mid,
              report_map_wide: t.report_map_wide,
              report_map_loading: t.report_map_loading,
              report_map_failed: t.report_map_failed,
            }}
          />
        </View>
      ) : null}

      {compute && chapter.kind === 'flying_stars' ? renderFlyingStars(compute, t) : null}
      {compute?.baZhai && chapter.kind === 'personal_fit' ? renderBaZhai(compute, t) : null}

      {reportId ? (
        <View style={{ marginTop: spacing.lg }}>
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

      <Text
        style={{
          color: C.secondary,
          fontSize: 10,
          lineHeight: 15,
          marginTop: spacing.lg,
          textAlign: 'center',
        }}
      >
        {t.report_chapter_micro_disclaimer}
      </Text>
    </ScrollView>
  )
}

// ── 玄空 visual block (preserved logic) ─────────────────────
function renderFlyingStars(compute: FengComputeJson, t: Strings) {
  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
      <FlyingStarsGrid
        result={compute.flyingStars}
        backgroundColor={FENG_PAPER.bg}
        borderColor={C.separator}
        labelColor={C.text}
      />
      <Text style={{ color: C.secondary, fontSize: 12, lineHeight: 18, marginTop: spacing.xs }}>
        {t.flying_stars_explainer}
      </Text>
      {compute.patterns && compute.patterns.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {compute.patterns.map((p) => {
            const tone =
              p.quality === 'auspicious'
                ? C.accent
                : p.quality === 'inauspicious'
                  ? C.danger
                  : C.secondary
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
        <Text style={{ color: C.secondary, fontSize: 12, fontStyle: 'italic' }}>
          {t.report_compound_facing_note}
        </Text>
      ) : null}
      {compute.formLi && compute.formLi.palaces.length > 0 ? (
        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          <Text style={{ color: C.secondary, fontSize: 11, letterSpacing: 1 }}>
            {t.report_formli_heading}
          </Text>
          {compute.formLi.palaces.flatMap((pl) =>
            pl.findings.map((f, i) => {
              const tone = AUSPICIOUS_VERDICTS.has(f.verdict)
                ? C.accent
                : f.verdict === '化煞' || f.verdict === '平'
                  ? C.secondary
                  : C.danger
              return (
                <View
                  key={`${pl.palace}-${f.verdict}-${i}`}
                  style={{ flexDirection: 'row', gap: spacing.sm }}
                >
                  <Text style={{ color: tone, fontSize: 12, fontWeight: '700', width: 56 }}>
                    {pl.palace}·{f.verdict}
                  </Text>
                  <Text style={{ color: C.text, fontSize: 12, flex: 1, lineHeight: 18 }}>
                    {f.reason}
                  </Text>
                </View>
              )
            })
          )}
          {compute.formLi.zhengLing.findings.map((z, i) => (
            <Text
              key={`zl-${z.palace}-${i}`}
              style={{ color: z.auspicious ? C.accent : C.danger, fontSize: 12, lineHeight: 18 }}
            >
              {z.reason}
            </Text>
          ))}
          {compute.formLi.patternRescue.map((r) => (
            <Text
              key={r.pattern}
              style={{
                color: r.favourable ? C.accent : C.danger,
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
  )
}

// ── 八宅 visual block (preserved logic) ─────────────────────
function renderBaZhai(compute: FengComputeJson, t: Strings) {
  if (!compute.baZhai) return null
  return (
    <View style={{ marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
      <BaZhaiWheel result={compute.baZhai} size={240} strokeColor={C.text} />
      {compute.baZhai.concord ? (
        <Text
          style={{
            color: compute.baZhai.concord.concordant ? C.accent : C.danger,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {compute.baZhai.concord.verdict}
        </Text>
      ) : null}
      <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
        <Text style={{ color: C.secondary, fontSize: 11, letterSpacing: 1 }}>
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
            <Text style={{ color: C.secondary, fontSize: 12, width: 56 }}>{label}</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>
              {v.kind}·{v.palace}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── closing page (notes + chat) ────────────────────────────
function ClosingPageView({
  width,
  insets,
  reportId,
  streetAttribution,
  onChat,
  t,
}: {
  width: number
  insets: { top: number; bottom: number }
  reportId: string
  siteName: string
  streetAttribution: string | null
  onChat: () => void
  t: Strings
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl + spacing.lg,
        gap: spacing.lg,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <LuopanLoader size={Math.min(width - spacing.xl * 2, 240)} />
      </View>
      <Text style={{ color: C.secondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
        {t.report_data_quality_footer}
      </Text>
      <Text style={{ color: C.secondary, fontSize: 11, textAlign: 'center' }}>
        {t.report_confidence_note}
      </Text>
      <Text style={{ color: C.secondary, fontSize: 10, textAlign: 'center', lineHeight: 15 }}>
        {t.report_legal_disclaimer}
      </Text>
      {streetAttribution ? (
        <Text style={{ color: C.secondary, opacity: 0.6, fontSize: 10, textAlign: 'center' }}>
          {streetAttribution}
        </Text>
      ) : null}
      {reportId ? (
        <Button variant='secondary' size='lg' onPress={onChat}>
          {t.chat_cta}
        </Button>
      ) : null}
    </ScrollView>
  )
}

// ── page dots ──────────────────────────────────────────────
function PageDots({ count, active, bottom }: { count: number; active: number; bottom: number }) {
  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? FENG_PAPER.cinnabar : FENG_PAPER.hair,
          }}
        />
      ))}
    </View>
  )
}

/** Copy to clipboard if expo-clipboard is present; silent no-op otherwise. */
async function copyToClipboard(text: string): Promise<void> {
  try {
    // Variable specifier so tsc/bundler don't hard-require the optional dep.
    const modName = 'expo-clipboard'
    const mod = (await import(modName)) as { setStringAsync?: (s: string) => Promise<unknown> }
    await mod.setStringAsync?.(text)
  } catch {
    // expo-clipboard not installed — copy is a best-effort convenience.
  }
}
