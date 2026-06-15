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
 *   - Theme: 宣纸 (rice-paper) ground. The HOME is now the dark night sky
 *     (SkyHero), so the precious cream document is what blooms IN from the tap
 *     and unrolls against the night — ReadingOverlay's root is the dark night
 *     (shown outside the mask), and the PAPER report floods in. (A brief
 *     2026-06-11 experiment made the report dark, but once the home went dark
 *     that left the bloom invisible — dark-on-dark — so the report is paper
 *     again; the single `P` palette below drives the whole surface in one swap.)
 *   - Icons: lucide-react-native (ArrowLeft / ChevronRight) — kindred's icon
 *     set — replacing `@zhop/hexastral-icons` (not a kindred dep).
 *   - i18n: reading-i18n.ts (this folder).
 */

import type { WuXing } from '@zhop/astro-core'
import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { AncientNumeral, isCjkLocale, kindredFonts } from '@zhop/scenario-kindred'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ArrowLeft, X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SelectionActionBar } from '@/components/SelectionActionBar'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
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

type ClipboardModule = typeof import('expo-clipboard')
let clipboardModule: ClipboardModule | null | undefined
/** Lazy — stale dev clients may lack the ExpoClipboard native module. */
function getClipboard(): ClipboardModule | null {
  if (clipboardModule !== undefined) return clipboardModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clipboardModule = require('expo-clipboard') as ClipboardModule
    return clipboardModule
  } catch {
    clipboardModule = null
    return null
  }
}

/* ── palette — the shared 宣纸 document layer (kindredPaper): paper ground, dark
   ink body, bronze section accent, cinnabar seal. Promoted to @zhop/hexastral-
   tokens so the paywall + settings cream surfaces present on the exact same
   surface — one "document" the dark night unrolls (ReadingOverlay blooms it in
   over the SkyHero home). */
const P = kindredPaper

/* ── 墨儀 type system — the same bundled serifs the 合盘 report uses, so the solo
   report reads as the same hand-set document (display/CJK title · old-style serif
   body · mono labels). Latin for en, Noto serif for CJK. */
interface Fonts {
  title: string
  body: string
  label: string
}
function resolveFonts(locale: string): Fonts {
  const cjk = isCjkLocale(locale)
  return {
    title: cjk ? kindredFonts.cjk : kindredFonts.display,
    body: cjk ? kindredFonts.cjk : kindredFonts.serif,
    label: cjk ? kindredFonts.cjk : kindredFonts.mono,
  }
}

/** 碑拓 numeral seal — a dark stone-rubbing tile holding an ancient numeral; the
 *  chapter marker that fills the 合盘 report's essence-seal slot (dark tile +
 *  ivory rubbing glyph, on the paper document). */
function SealNumeral({ n, size = 46 }: { n: number; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        backgroundColor: kindredDark.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AncientNumeral n={n} size={size * 0.5} color={kindredPaper.bg} strokeWidth={3} />
    </View>
  )
}

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
  /** Top-right close (X). Runs the overlay's reverse-bloom collapse, NOT an
   *  abrupt unmount. Omit to hide the affordance. */
  onRequestClose?: () => void
}

/** ChapterRef.key → server report-chapter slug (reading-cache / chat readingId). */
const CHAPTER_SLUG: Record<'ch1' | 'ch4', string> = {
  ch1: 'ch1_personality',
  ch4: 'ch4_timeline',
}

export function ReadingReport({
  activeChapter,
  setActiveChapter,
  onAskAI,
  onRequestClose,
}: ReadingReportProps) {
  const birth = useSelfBirth()
  const router = useRouter()
  const { t, locale } = useReadingI18n()
  const fonts = useMemo(() => resolveFonts(locale), [locale])

  // Top-right close — same node in both the empty-guard and the full report.
  const closeBtn = onRequestClose ? (
    <Pressable
      onPress={onRequestClose}
      hitSlop={12}
      accessibilityRole='button'
      accessibilityLabel={t('common.close')}
      style={S.headerClose}
    >
      <X color={P.muted} size={20} strokeWidth={1.5} />
    </Pressable>
  ) : null

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
        clockMinutes: birth.clockMinutes,
        calibrate: birth.calibrate,
        longitude: birth.lng,
        timezoneId: birth.timezone,
        city: birth.city,
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

  // 划词 (K3): the picked paragraph drives the action bar; highlights persist per
  // chart (the solo report has no bondId, so chartHash is the stable key).
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  useEffect(() => {
    if (chartHash) void loadHighlights(chartHash).then(setHighlights)
  }, [chartHash])

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
            {closeBtn}
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
  let detailProps: Omit<React.ComponentProps<typeof ChapterDetail>, 'fonts'> | null = null
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
        onPickQuote: setPickedQuote,
        highlightedQuotes: highlights,
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
          <Text style={[S.headerTitle, { fontFamily: fonts.label }]}>{t('reading.title')}</Text>
          {closeBtn}
        </View>

        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          {/* identity header */}
          <Text style={[S.identity, { fontFamily: fonts.label }]}>{identityLine}</Text>
          <Text style={[S.birth, { fontFamily: fonts.label }]}>{birthBadge}</Text>
          {timeIndex == null ? (
            <Text style={[S.caveat, { fontFamily: fonts.label }]}>
              {t('reading.timeUnknownEst')}
            </Text>
          ) : null}

          {/* ch1: personality — summary only; tap drills into ChapterDetail */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch1' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  n={1}
                  label={ch1Meta.label}
                  sub={ch1Meta.sub}
                  summary={ch1Meta.content ?? ch1Meta.placeholder}
                  loading={ch1Meta.loading}
                  fonts={fonts}
                />
              </View>
            )}
          </Pressable>

          {/* ch4: current period (大運 — luck pillar phase) */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch4' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  n={2}
                  label={ch4Meta.label}
                  sub={ch4Meta.sub}
                  summary={ch4Meta.content ?? ch4Meta.placeholder}
                  loading={ch4Meta.loading}
                  fonts={fonts}
                />
              </View>
            )}
          </Pressable>

          {/* ── premium chapters — a quiet mono kicker, no rules (墨儀: whitespace,
              not web dividers). */}
          <Text style={[S.sectionKicker, { fontFamily: fonts.label }]}>
            {t('reading.moreChapters')}
          </Text>

          {/*
           * Pro user (isPro) → full Chapter rows (drill-in). Otherwise the same
           * seal + title row, dimmed (a graded fade down the list), tapping
           * routes to the paywall — no bordered "cards", no chevrons.
           */}
          {LOCKED_CHAPTERS.map((ch, i) => {
            const idx = i as 0 | 1 | 2 | 3
            return (
              <Pressable
                key={ch.sub}
                onPress={() => setActiveChapter({ kind: 'locked', idx })}
                style={({ pressed }) => ({
                  opacity: isPro ? (pressed ? 0.7 : 1) : (0.62 - i * 0.07) * (pressed ? 0.7 : 1),
                })}
              >
                <Chapter
                  n={i + 3}
                  label={t(ch.labelKey)}
                  sub={ch.sub}
                  summary={t(ch.descKey)}
                  loading={false}
                  fonts={fonts}
                  locked={!isPro}
                />
              </Pressable>
            )
          })}

          {/* CTA stays visible until the user is Pro. Routes to the paywall. */}
          {!isPro ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, pressed && { opacity: 0.85 }]}
              onPress={goToPaywall}
            >
              <Text style={[S.unlockText, { fontFamily: fonts.label }]}>{t('reading.unlock')}</Text>
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
          <ChapterDetail {...detailProps} fonts={fonts} />
        </Animated.View>
      ) : null}

      {/* 划词 action bar — slides up when a paragraph is long-pressed. Mirrors the
          synastry report (copy / chat / highlight). The solo report has no
          timeline/what-if, so there's no LivingLayerFab here — just this bar. */}
      <SelectionActionBar
        quote={pickedQuote}
        highlighted={pickedQuote ? highlights.includes(pickedQuote) : false}
        labels={{
          copy: t('reading.copy'),
          chat: t('reading.chat'),
          highlight: t('reading.highlight'),
        }}
        onCopy={() => {
          const Clip = getClipboard()
          if (pickedQuote && Clip) void Clip.setStringAsync(pickedQuote)
          setPickedQuote(null)
        }}
        onChat={
          onAskAI
            ? () => {
                const q = pickedQuote
                setPickedQuote(null)
                // Reuse the active chapter's slug-aware ask (detailProps.onAsk).
                if (q) detailProps?.onAsk?.(q)
              }
            : undefined
        }
        onHighlight={() => {
          const q = pickedQuote
          if (!q) return
          const next = highlights.includes(q)
            ? highlights.filter((x) => x !== q)
            : [...highlights, q]
          setHighlights(next)
          if (chartHash) void saveHighlights(chartHash, next)
          setPickedQuote(null)
        }}
        onClose={() => setPickedQuote(null)}
      />
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
  n,
  label,
  sub,
  summary,
  loading,
  fonts,
  locked,
}: {
  /** 1-based chapter number → the 碑拓 numeral seal. */
  n: number
  label: string
  sub: string
  /** One-paragraph preview; truncated to 2 lines via numberOfLines. */
  summary: string | null
  loading: boolean
  fonts: Fonts
  /** Locked chapters dim the seal a touch but keep the same structure. */
  locked?: boolean
}) {
  return (
    <View style={S.chapter}>
      <View style={S.chapterHead}>
        <SealNumeral n={n} />
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={[S.chapterLabel, { fontFamily: fonts.title }]}>{label}</Text>
          <Text style={[S.chapterSub, { fontFamily: fonts.label }]}>{sub}</Text>
        </View>
        {locked ? <View style={S.lockDot} /> : null}
      </View>
      {loading && !summary ? (
        <View style={S.skeleton}>
          <View style={S.skelLine} />
          <View style={[S.skelLine, { width: '70%' }]} />
        </View>
      ) : summary ? (
        <Text style={[S.chapterSummary, { fontFamily: fonts.body }]} numberOfLines={2}>
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
  onPickQuote,
  highlightedQuotes,
  fonts,
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
  /** 划词 (K3): long-press a paragraph → raise the action bar with this quote. */
  onPickQuote?: (quote: string) => void
  /** Persisted highlighted paragraphs — painted with a cinnabar wash. */
  highlightedQuotes?: string[]
  fonts: Fonts
}) {
  // Paragraph-level ask: split the prose into its '\n\n' blocks (the shape
  // flattenChapterContent produces) so each one can be long-pressed.
  const paragraphs = useMemo(() => (content ? content.split('\n\n') : []), [content])
  const askParagraph = (para: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    // Long-press raises the 划词 action bar (copy / chat / highlight) with this
    // paragraph; fall back to direct chat when no picker is wired.
    if (onPickQuote) onPickQuote(para)
    else onAsk?.(para)
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
          <Text style={[S.detailHeaderSub, { fontFamily: fonts.label }]}>{sub}</Text>
          <View style={S.backBtn} />
        </View>
        <ScrollView contentContainerStyle={S.detailScroll} showsVerticalScrollIndicator={false}>
          {identityLine ? (
            <View style={S.detailIdentity}>
              <Text style={[S.detailIdentityLine, { fontFamily: fonts.label }]}>
                {identityLine}
              </Text>
              {birthBadge ? (
                <Text style={[S.detailBirth, { fontFamily: fonts.label }]}>{birthBadge}</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={[S.detailLabel, { fontFamily: fonts.title }]}>{label}</Text>
          {content ? (
            onAsk ? (
              // 划词 mode: each paragraph is long-pressable → ask AI about it.
              <View>
                {askHint ? (
                  <Text style={[S.askHint, { fontFamily: fonts.label }]}>{askHint}</Text>
                ) : null}
                {paragraphs.map((para, i) => {
                  const isHighlighted = highlightedQuotes?.includes(para)
                  return (
                    <Pressable
                      key={i}
                      onLongPress={() => askParagraph(para)}
                      delayLongPress={350}
                      style={({ pressed }) => [
                        isHighlighted && S.paraHighlighted,
                        pressed && S.paraPressed,
                      ]}
                    >
                      <Text style={[S.detailBody, S.paraBlock, { fontFamily: fonts.body }]}>
                        {para}
                      </Text>
                    </Pressable>
                  )
                })}
                {askChapterLabel ? (
                  <Pressable
                    onPress={() => onAsk(null)}
                    hitSlop={12}
                    accessibilityRole='button'
                    style={({ pressed }) => [S.askChapterBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[S.askChapterText, { fontFamily: fonts.label }]}>
                      {askChapterLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={[S.detailBody, { fontFamily: fonts.body }]}>{content}</Text>
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
            <Text style={[S.detailPlaceholder, { fontFamily: fonts.body }]}>{placeholder}</Text>
          ) : null}

          {locked ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, S.detailUnlock, pressed && { opacity: 0.85 }]}
              onPress={onUnlock}
            >
              <Text style={[S.unlockText, { fontFamily: fonts.label }]}>{unlockLabel}</Text>
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
  // Absolute so the title stays optically centered; sits at the top-right.
  headerClose: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  scroll: { paddingHorizontal: 24, paddingTop: 12 },

  // identity
  identity: { color: P.inkSoft, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  caveat: { color: P.muted, fontSize: 10, marginBottom: 4 },

  // chapter — 碑拓 seal + title; structure by whitespace + a hairline, no widgets
  chapter: {
    paddingVertical: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 16 },
  chapterLabel: { color: P.ink, fontSize: 24, lineHeight: 30, letterSpacing: 0.5 },
  chapterSub: { color: P.bronze, fontSize: 10, letterSpacing: 2.5 },
  // 朱文 open ring — the quiet "locked" mark (replaces the lock/chevron widgets).
  lockDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.2, borderColor: P.cinnabar },
  chapterPressed: { opacity: 0.7 },
  // List-view summary — short preview clamped to 2 lines. Body proper lives in
  // ChapterDetail (二级).
  chapterSummary: { color: P.inkSoft, fontSize: 15, lineHeight: 23 },
  skeleton: { gap: 12 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: P.hairSoft, width: '100%' },

  // premium section — a quiet mono kicker, no rules
  sectionKicker: {
    color: P.muted,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 38,
    marginBottom: 6,
  },

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
  paraHighlighted: {
    backgroundColor: 'rgba(176,74,52,0.1)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  askChapterBtn: { marginTop: 24, alignSelf: 'flex-start' },
  askChapterText: {
    color: P.bronze,
    fontSize: 14,
    letterSpacing: 1,
    textDecorationLine: 'underline',
    textDecorationColor: P.bronze,
  },
})
