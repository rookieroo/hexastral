/**
 * ReadingReport — dark-ink 合参命书 content for the SOLO reading.
 *
 * Ported from ming-pan-app/components/ReadingReport.tsx per ADR-0021 K1 /
 * ADR-0022. Pure content + logic: chart compute, chapter fetch (LLM-or-
 * template), and premium-chapter gating. Rendered by ReadingOverlay (this
 * folder) — the ink mask + bloom + swipe-back live there, not here.
 *
 * Adaptations for kindred (deltas from the ming-pan original):
 *   - Birth source: kindred's `useSelfBirth()` (lib/selfBirth) — a flat
 *     `SelfBirth | null | undefined`, where `timeIndex: number | null` — in
 *     place of ming-pan's `useBirthDraft()` `{ status, draft }` shape.
 *   - Monetization: ming-pan gated locked chapters behind email-binding +
 *     invite-to-unlock (EmailBindSheet / InviteUnlockSheet / SignInPromptSheet
 *     / lib/entitlement). Kindred uses RevenueCat: locked cards navigate to the
 *     existing paywall (`/(commerce)/paywall`); Pro status (getYuanProStatus,
 *     lib/iap) unlocks all chapters. No unlock sheets, no server manifest /
 *     pending-invite surfaces, no email-bind flow.
 *   - Removed ming-pan-only growth surfaces: SatelliteFlagshipUpsellCard,
 *     satellite-runtime analytics emits, usePushPrime, markReadingViewed,
 *     portfolio public-profile links, cross-app discovery taps.
 *   - Theme: dark-only ink (ADR-0021 §5) from `@zhop/hexastral-tokens`
 *     (rubbing / ricePaper / ink / cinnabar). ming-pan rendered on a light
 *     paper surface; here the surface is the void-black report ground.
 *   - Icons: lucide-react-native (ArrowLeft / ChevronRight) — kindred's icon
 *     set — replacing `@zhop/hexastral-icons` (not a kindred dep).
 *   - i18n: reading-i18n.ts (this folder).
 *   - Status bar stays dark (kindred is dark-only); no light/dark toggle.
 */

import type { WuXing } from '@zhop/astro-core'
import { cinnabar, ink, ricePaper, rubbing } from '@zhop/hexastral-tokens'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getYuanProStatus } from '@/lib/iap'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart } from '@/lib/solo/natal'
import { analyzeDayunRelation, computeDayunChain, parseBirthInput } from '@/lib/solo/reading'
import {
  type CachedChapter,
  computeChartHash,
  fetchChapter,
  getCachedChapter,
} from '@/lib/solo/reading-cache'
import { computeZiweiChart } from '@/lib/solo/ziwei'
import {
  dayMasterLabel,
  elementLabel,
  type ReadingStringKey,
  shichenLabel,
  strengthLabel,
  useReadingI18n,
} from './reading-i18n'

/* ── palette — dark ink (ADR-0021 §5) ── */
const P = {
  bg: rubbing.void,
  ink: ricePaper.ivory,
  inkSoft: 'rgba(245,240,232,0.72)',
  bronze: ink.gold,
  muted: 'rgba(245,240,232,0.45)',
  cinnabar: cinnabar.seal,
  hair: 'rgba(245,240,232,0.14)',
  hairSoft: 'rgba(245,240,232,0.07)',
  ctaText: ricePaper.ivory,
} as const

const LOCKED_CHAPTERS = [
  {
    sub: 'CAREER',
    labelKey: 'reading.lcCareerLabel',
    descKey: 'reading.lcCareerDesc',
    detailKey: 'reading.lcCareerDetail',
  },
  {
    sub: 'RELATIONSHIPS',
    labelKey: 'reading.lcRelLabel',
    descKey: 'reading.lcRelDesc',
    detailKey: 'reading.lcRelDetail',
  },
  {
    sub: 'HIDDEN TENSIONS',
    labelKey: 'reading.lcHiddenLabel',
    descKey: 'reading.lcHiddenDesc',
    detailKey: 'reading.lcHiddenDetail',
  },
  {
    sub: 'ACTION PLAN',
    labelKey: 'reading.lcActionLabel',
    descKey: 'reading.lcActionDesc',
    detailKey: 'reading.lcActionDetail',
  },
] as const satisfies ReadonlyArray<{
  sub: string
  labelKey: ReadingStringKey
  descKey: ReadingStringKey
  detailKey: ReadingStringKey
}>

/** Targets the chapter detail view — null = list view. */
export type ChapterRef =
  | { kind: 'free'; key: 'ch1' | 'ch4' }
  | { kind: 'locked'; idx: 0 | 1 | 2 | 3 }

export interface ReadingReportProps {
  /** Lifted to ReadingOverlay so swipe-back can pop detail before closing. */
  activeChapter: ChapterRef | null
  setActiveChapter: (next: ChapterRef | null) => void
  /**
   * 划词 AI chat (ADR-0021 K3) — called when the user long-presses a paragraph
   * (quote = that paragraph) or taps the chapter-level ask CTA (quote = null).
   * `slug` is the server chapter slug ('ch1_personality' / 'ch4_timeline').
   * Omit to hide the ask affordances entirely.
   */
  onAskAI?: (args: { slug: string; quote: string | null }) => void
}

/** ChapterRef.key → server report-chapter slug (reading-cache / chat readingId). */
const CHAPTER_SLUG: Record<'ch1' | 'ch4', string> = {
  ch1: 'ch1_personality',
  ch4: 'ch4_timeline',
}

export function ReadingReport({ activeChapter, setActiveChapter, onAskAI }: ReadingReportProps) {
  const birth = useSelfBirth()
  const router = useRouter()
  const { t, locale } = useReadingI18n()

  const ready = birth != null
  const timeIndex = birth?.timeIndex ?? null

  /* ── Pro status (RevenueCat). Unlocks all locked chapters when active. ── */
  const [isPro, setIsPro] = useState(false)
  useEffect(() => {
    let cancelled = false
    void getYuanProStatus().then((s) => {
      if (!cancelled) setIsPro(s.isPro)
    })
    return () => {
      cancelled = true
    }
  }, [])

  /* ── chart ── */
  const chart = useMemo(() => {
    if (!birth) return null
    try {
      return computeFateNatalChart({
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        gender: birth.gender,
      })
    } catch {
      return null
    }
  }, [birth])

  const ziwei = useMemo(() => {
    if (!birth) return null
    try {
      return computeZiweiChart({
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        gender: birth.gender,
      })
    } catch {
      return null
    }
  }, [birth])

  const dayunInfo = useMemo(() => {
    if (!chart || !birth) return null
    try {
      const bd = parseBirthInput(birth.solarDate, birth.timeIndex ?? 0)
      const { steps, currentVisibleIndex } = computeDayunChain(bd, birth.gender)
      const active = steps[currentVisibleIndex] ?? steps[0]
      const relation = active ? analyzeDayunRelation(active, chart.dayMaster) : null
      return { active, relation }
    } catch {
      return null
    }
  }, [chart, birth])

  /* ── LLM cache + fetch ── */
  const [ch1, setCh1] = useState<CachedChapter | null>(null)
  const [ch4, setCh4] = useState<CachedChapter | null>(null)
  const [loading, setLoading] = useState(true)

  const chartHash = useMemo(() => {
    if (!birth) return ''
    return computeChartHash(birth.solarDate, birth.timeIndex ?? 0, birth.gender)
  }, [birth])

  const draftSolarDate = birth?.solarDate ?? null
  const draftGender = birth?.gender ?? null

  useEffect(() => {
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    let cancelled = false
    const b = { solarDate: draftSolarDate, timeIndex: timeIndex ?? 0, gender: draftGender }
    async function load() {
      // Both ch1 + ch4 are inside the default unlock window, so fetch both from
      // the server. A cached hit short-circuits the network call.
      const [cached1, cached4] = await Promise.all([
        getCachedChapter('ch1_personality', chartHash),
        getCachedChapter('ch4_timeline', chartHash),
      ])
      if (cancelled) return
      const ch1Promise: Promise<CachedChapter | null> = cached1
        ? Promise.resolve(cached1)
        : fetchChapter('ch1_personality', chartHash, b)
      const ch4Promise: Promise<CachedChapter | null> = cached4
        ? Promise.resolve(cached4)
        : fetchChapter('ch4_timeline', chartHash, b)
      const [fresh1, fresh4] = await Promise.all([ch1Promise, ch4Promise])
      if (cancelled) return
      setCh1(fresh1)
      setCh4(fresh4)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [chartHash, draftSolarDate, draftGender, timeIndex])

  // Locked chapters route to the existing RevenueCat paywall. Pro users skip
  // this entirely (every card renders as a full Chapter — see below).
  const goToPaywall = () =>
    router.push({ pathname: '/(commerce)/paywall', params: { reason: 'reading' } })

  // Cache the last-seen activeChapter so the detail Animated.View can keep
  // showing correct content while its `exiting` animation plays.
  const lastActiveRef = useRef<ChapterRef | null>(null)
  if (activeChapter) lastActiveRef.current = activeChapter

  /* ── empty guard ── */
  if (!ready || !chart) {
    return (
      <View style={S.paper}>
        <SafeAreaView edges={['top']}>
          <View style={S.header}>
            <Text style={S.headerTitle}>{t('reading.title')}</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  /* ── display ── */
  const ziweiMing = ziwei?.palaces.find((p) => p.name === '命宫')
  const ziweiLabel = ziweiMing?.majorStars.map((s) => s.name).join(' ') ?? ''
  const birthBadge = `${birth.solarDate} · ${
    timeIndex != null ? shichenLabel(timeIndex, locale) : t('birth.timeUnknown')
  }`

  const identityLine =
    `${dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale)} · ${chart.geju.primary} · ${t('label.self', { s: strengthLabel(chart.geju.dayMasterStrength, locale) })}` +
    (ziweiLabel ? ` · ${t('label.soulPalaceInline', { stars: ziweiLabel })}` : '')

  /* ── chapter metadata: gathered once so the detail view + list both consume
     the same source of truth (label, sub, content, placeholder). */
  const ch1Meta = {
    label: t('reading.ch1Label'),
    sub: 'PERSONALITY',
    content: ch1?.content ?? null,
    loading: loading && !ch1,
    placeholder: t('reading.ch1Placeholder', {
      stem: chart.dayMaster,
      el: elementLabel(chart.dayMasterWuXing as WuXing, locale),
      geju: chart.geju.primary,
      soul: ziweiLabel ? t('reading.soulPalaceClause', { stars: ziweiLabel }) : '',
    }),
  }
  const ch4Meta = {
    label: t('reading.ch4Label'),
    sub: 'CURRENT PERIOD',
    content: ch4?.content ?? null,
    loading: loading && !ch4,
    placeholder: dayunInfo?.active
      ? t('reading.ch4Placeholder', {
          dayun: t('reading.dayunActive', {
            gz: `${dayunInfo.active.ganZhi.stem}${dayunInfo.active.ganZhi.branch}`,
            start: dayunInfo.active.startAge,
            end: dayunInfo.active.endAge,
          }),
          rel: dayunInfo.relation ? ` · ${dayunInfo.relation.label}` : '',
        })
      : t('reading.genAnalysis'),
  }

  /* ── detail view props (rendered as a slide-in overlay at the bottom of the
     return tree, NOT an early return — the list stays mounted behind so the
     entering/exiting animations feel like a page push). */
  const detailChapter = activeChapter ?? lastActiveRef.current
  let detailProps: React.ComponentProps<typeof ChapterDetail> | null = null
  if (detailChapter) {
    const back = () => setActiveChapter(null)
    if (detailChapter.kind === 'free') {
      const key = detailChapter.key
      const m = key === 'ch1' ? ch1Meta : ch4Meta
      detailProps = {
        label: m.label,
        sub: m.sub,
        content: m.content,
        loading: m.loading,
        placeholder: m.placeholder,
        locked: false,
        unlockLabel: t('reading.unlock'),
        backLabel: t('common.back'),
        onBack: back,
        onUnlock: goToPaywall,
        // Identity context grounds the detail in THIS chart so it doesn't read
        // like a generic article. Locked chapters skip this since their body is
        // a preview, not a personalised reading.
        identityLine,
        birthBadge,
        // 划词 AI chat (K3) — long-press a paragraph or tap the chapter CTA.
        onAsk: onAskAI
          ? (quote: string | null) => onAskAI({ slug: CHAPTER_SLUG[key], quote })
          : undefined,
        askChapterLabel: t('reading.askChapter'),
        askHint: t('reading.askParagraphHint'),
      }
    } else {
      const lc = LOCKED_CHAPTERS[detailChapter.idx]
      if (lc) {
        detailProps = {
          label: t(lc.labelKey),
          sub: lc.sub,
          content: null,
          loading: false,
          // Drill-in copy is intentionally longer than the list-card teaser —
          // gives the locked chapter substance even before unlock.
          placeholder: t(lc.detailKey),
          locked: !isPro,
          unlockLabel: t('reading.unlock'),
          backLabel: t('common.back'),
          onBack: back,
          onUnlock: goToPaywall,
        }
      }
    }
  }

  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.header}>
          <Text style={S.headerTitle}>{t('reading.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          {/* identity header */}
          <Text style={S.identity}>{identityLine}</Text>
          <Text style={S.birth}>{birthBadge}</Text>
          {timeIndex == null ? <Text style={S.caveat}>{t('reading.timeUnknownEst')}</Text> : null}

          {/* ch1: personality — summary only; tap drills into ChapterDetail */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch1' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  label={ch1Meta.label}
                  sub={ch1Meta.sub}
                  summary={ch1Meta.content ?? ch1Meta.placeholder}
                  loading={ch1Meta.loading}
                  showAffordance
                />
              </View>
            )}
          </Pressable>

          {/* ch4: current period (大運 — luck pillar phase) */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch4' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  label={ch4Meta.label}
                  sub={ch4Meta.sub}
                  summary={ch4Meta.content ?? ch4Meta.placeholder}
                  loading={ch4Meta.loading}
                  showAffordance
                />
              </View>
            )}
          </Pressable>

          {/* ── premium chapters ── */}
          <View style={S.lockedDivider}>
            <View style={S.dividerLine} />
            <Text style={S.dividerLabel}>{t('reading.moreChapters')}</Text>
            <View style={S.dividerLine} />
          </View>

          {/*
           * Pro user (isPro) unlocks all locked chapters → they render as full
           * Chapter cards (drill-in to the detail view). Otherwise the cards
           * keep the dim teaser + chevron and tapping routes to the paywall.
           */}
          {LOCKED_CHAPTERS.map((ch, i) => {
            const idx = i as 0 | 1 | 2 | 3
            return isPro ? (
              <Pressable key={ch.sub} onPress={() => setActiveChapter({ kind: 'locked', idx })}>
                {({ pressed }) => (
                  <View style={pressed ? S.chapterPressed : undefined}>
                    <Chapter
                      label={t(ch.labelKey)}
                      sub={ch.sub}
                      summary={t(ch.descKey)}
                      loading={false}
                      showAffordance
                    />
                  </View>
                )}
              </Pressable>
            ) : (
              <Pressable
                key={ch.sub}
                onPress={() => setActiveChapter({ kind: 'locked', idx })}
                style={({ pressed }) => [
                  S.lockedCard,
                  { opacity: (0.5 - i * 0.06) * (pressed ? 0.7 : 1) },
                ]}
              >
                <View style={S.lockedHead}>
                  <Text style={S.lockedLabel}>{t(ch.labelKey)}</Text>
                  <Text style={S.lockedSub}>{ch.sub}</Text>
                  <View style={S.lockedChevron}>
                    <ChevronRight size={14} color={P.muted} strokeWidth={1.4} />
                  </View>
                </View>
                <Text style={S.lockedDesc} numberOfLines={2}>
                  {t(ch.descKey)}
                </Text>
              </Pressable>
            )
          })}

          {/* CTA stays visible until the user is Pro. Routes to the paywall. */}
          {!isPro ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, pressed && { opacity: 0.85 }]}
              onPress={goToPaywall}
            >
              <Text style={S.unlockText}>{t('reading.unlock')}</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Detail overlay — slides in from right when a chapter is tapped, slides
          out on back. List stays mounted behind for a true page-push feel. */}
      {activeChapter && detailProps ? (
        <Animated.View
          entering={SlideInRight.duration(280)}
          exiting={SlideOutRight.duration(240)}
          style={S.detailOverlay}
        >
          <ChapterDetail {...detailProps} />
        </Animated.View>
      ) : null}
    </View>
  )
}

/* ── Chapter (list-card) ───────────────────────────────────────────── */

/**
 * Compact preview row — label / sub / 1-2 line summary / chevron. Full LLM
 * content lives in `<ChapterDetail>` (二级页面). This keeps the list scannable
 * so the user can browse the TOC without scrolling past long bodies.
 */
function Chapter({
  label,
  sub,
  summary,
  loading,
  showAffordance,
}: {
  label: string
  sub: string
  /** One-paragraph preview; truncated to 2 lines via numberOfLines. */
  summary: string | null
  loading: boolean
  /** When true, renders a chevron-right hinting the card opens a detail view. */
  showAffordance?: boolean
}) {
  return (
    <View style={S.chapter}>
      <View style={S.chapterHead}>
        <Text style={S.chapterLabel}>{label}</Text>
        <Text style={S.chapterSub}>{sub}</Text>
        {showAffordance ? (
          <View style={S.chapterChevron}>
            <ChevronRight size={14} color={P.muted} strokeWidth={1.4} />
          </View>
        ) : null}
      </View>
      {loading && !summary ? (
        <View style={S.skeleton}>
          <View style={S.skelLine} />
          <View style={[S.skelLine, { width: '70%' }]} />
        </View>
      ) : summary ? (
        <Text style={S.chapterSummary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
    </View>
  )
}

/* ── ChapterDetail (single-chapter focused view) ───────────────────── */

function ChapterDetail({
  label,
  sub,
  content,
  loading,
  placeholder,
  locked,
  unlockLabel,
  backLabel,
  onBack,
  onUnlock,
  identityLine,
  birthBadge,
  onAsk,
  askChapterLabel,
  askHint,
}: {
  label: string
  sub: string
  content: string | null
  loading: boolean
  placeholder?: string
  locked: boolean
  unlockLabel: string
  backLabel: string
  onBack: () => void
  onUnlock: () => void
  /** Optional chart fingerprint shown above the chapter title (free only). */
  identityLine?: string
  birthBadge?: string
  /** 划词 chat (K3): quote = long-pressed paragraph, null = whole chapter. */
  onAsk?: (quote: string | null) => void
  askChapterLabel?: string
  askHint?: string
}) {
  // Paragraph-level ask: split the prose into its '\n\n' blocks (the shape
  // flattenChapterContent produces) so each one can be long-pressed.
  const paragraphs = useMemo(() => (content ? content.split('\n\n') : []), [content])
  const askParagraph = (para: string) => {
    if (!onAsk) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    onAsk(para)
  }
  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.detailHeader}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityLabel={backLabel}
            style={({ pressed }) => [S.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ArrowLeft size={20} color={P.inkSoft} strokeWidth={1.5} />
          </Pressable>
          <Text style={S.detailHeaderSub}>{sub}</Text>
          <View style={S.backBtn} />
        </View>
        <ScrollView contentContainerStyle={S.detailScroll} showsVerticalScrollIndicator={false}>
          {identityLine ? (
            <View style={S.detailIdentity}>
              <Text style={S.detailIdentityLine}>{identityLine}</Text>
              {birthBadge ? <Text style={S.detailBirth}>{birthBadge}</Text> : null}
            </View>
          ) : null}
          <Text style={S.detailLabel}>{label}</Text>
          {content ? (
            onAsk ? (
              // 划词 mode: each paragraph is long-pressable → ask AI about it.
              <View>
                {askHint ? <Text style={S.askHint}>{askHint}</Text> : null}
                {paragraphs.map((para, i) => (
                  <Pressable
                    key={i}
                    onLongPress={() => askParagraph(para)}
                    delayLongPress={350}
                    style={({ pressed }) => [pressed && S.paraPressed]}
                  >
                    <Text style={[S.detailBody, S.paraBlock]}>{para}</Text>
                  </Pressable>
                ))}
                {askChapterLabel ? (
                  <Pressable
                    onPress={() => onAsk(null)}
                    hitSlop={12}
                    accessibilityRole='button'
                    style={({ pressed }) => [S.askChapterBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={S.askChapterText}>{askChapterLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={S.detailBody}>{content}</Text>
            )
          ) : loading ? (
            <View style={S.skeleton}>
              <View style={S.skelLine} />
              <View style={[S.skelLine, { width: '85%' }]} />
              <View style={[S.skelLine, { width: '70%' }]} />
              <View style={[S.skelLine, { width: '90%' }]} />
              <View style={[S.skelLine, { width: '60%' }]} />
            </View>
          ) : placeholder ? (
            <Text style={S.detailPlaceholder}>{placeholder}</Text>
          ) : null}

          {locked ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, S.detailUnlock, pressed && { opacity: 0.85 }]}
              onPress={onUnlock}
            >
              <Text style={S.unlockText}>{unlockLabel}</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

/* ── styles ────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.bg },
  safe: { flex: 1 },
  // Detail page sits above the list with same ground + a subtle top hairline to
  // hint "this is a new layer". Slide animation comes from reanimated.
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { color: P.bronze, fontSize: 11, letterSpacing: 4, fontWeight: '300' },

  scroll: { paddingHorizontal: 24, paddingTop: 12 },

  // identity
  identity: { color: P.inkSoft, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  caveat: { color: P.muted, fontSize: 10, marginBottom: 4 },

  // chapter
  chapter: { paddingVertical: 24, borderTopWidth: 0.5, borderTopColor: P.hair },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chapterLabel: { color: P.ink, fontSize: 22, letterSpacing: 1 },
  chapterSub: { color: P.bronze, fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },
  chapterChevron: { marginLeft: 'auto', opacity: 0.55 },
  chapterPressed: { opacity: 0.7 },
  // List-view summary — short preview clamped to 2 lines. Body proper lives in
  // ChapterDetail (二级).
  chapterSummary: { color: P.inkSoft, fontSize: 13, lineHeight: 20, letterSpacing: 0.2 },
  skeleton: { gap: 12 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: P.hairSoft, width: '100%' },

  // locked divider
  lockedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 32,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: P.hair },
  dividerLabel: { color: P.muted, fontSize: 10, letterSpacing: 3, fontWeight: '500' },

  // locked chapters
  lockedCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: P.hairSoft,
    borderRadius: 10,
  },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lockedLabel: { color: P.ink, fontSize: 16, letterSpacing: 1 },
  lockedSub: { color: P.bronze, fontSize: 8, letterSpacing: 2, fontWeight: '600' },
  lockedChevron: { marginLeft: 'auto', opacity: 0.55 },
  lockedDesc: { color: P.muted, fontSize: 12, lineHeight: 18 },

  // unlock
  unlockBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: P.cinnabar,
    borderRadius: 22,
  },
  unlockText: { color: P.ctaText, fontSize: 13, fontWeight: '600', letterSpacing: 3 },

  // detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  detailHeaderSub: { color: P.bronze, fontSize: 10, letterSpacing: 3, fontWeight: '600' },
  detailScroll: { paddingHorizontal: 32, paddingTop: 12 },
  detailIdentity: { marginBottom: 20 },
  detailIdentityLine: {
    color: P.inkSoft,
    fontSize: 12,
    letterSpacing: 1,
    lineHeight: 18,
    marginBottom: 3,
  },
  detailBirth: { color: P.muted, fontSize: 11, letterSpacing: 1 },
  detailLabel: { color: P.ink, fontSize: 30, letterSpacing: 2, marginBottom: 28 },
  detailBody: { color: P.ink, fontSize: 17, lineHeight: 32, letterSpacing: 0.3 },
  detailPlaceholder: { color: P.inkSoft, fontSize: 16, lineHeight: 28, fontStyle: 'italic' },
  detailUnlock: { marginTop: 40 },

  // 划词 AI chat (K3)
  askHint: { color: P.muted, fontSize: 12, letterSpacing: 0.5, marginBottom: 16 },
  paraBlock: { marginBottom: 20 },
  paraPressed: { backgroundColor: P.hairSoft, marginHorizontal: -8, paddingHorizontal: 8 },
  askChapterBtn: { marginTop: 24, alignSelf: 'flex-start' },
  askChapterText: {
    color: P.bronze,
    fontSize: 14,
    letterSpacing: 1,
    textDecorationLine: 'underline',
    textDecorationColor: P.bronze,
  },
})
