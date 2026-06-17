/**
 * Yuun (auspice) personal deep read — 合参命书 for the signed-in lower layer of
 * the two-tier model (the anonymous daily 黄历 stays in (tabs)). This is the
 * Yuun-side mirror of Yuel's solo reading (apps/kindred-app/components/reading/
 * ReadingReport.tsx): the SAME 宣纸 document, the SAME shared engine
 * (@zhop/scenario-yuan compute + cache), so the personal report reads identically
 * across the two apps (the Yuel/Yuun split, Phase 1b).
 *
 * Deltas from Yuel's ReadingReport:
 *   - It's a routed SCREEN (app/reading.tsx) with its own header + back, not the
 *     ReadingOverlay bloom — auspice has no SkyHero ink-mask home.
 *   - Birth: `getAuspiceBirthInfo()` (lib/birth) — async-loaded into state, with
 *     `timeIndex: number | null` + an optional `gender` (so the screen guards a
 *     birth that hasn't filled in gender yet and routes the user to Me).
 *   - Monetization: auspice entitlements (`hasEntitlement(…, 'auspice_pro')`) +
 *     the existing AuspicePaywallSheet (which gates sign-in at subscribe), in
 *     place of Yuel's RevenueCat /paywall route.
 *   - Chapter engine: the auspice-bound reading-cache (lib/reading-cache) — its
 *     own `auspice_report_*` namespace + the portfolio HMAC signer.
 *   - 划词 selection + AI chat are Phase 2 (not wired here yet).
 */

import type { WuXing } from '@zhop/astro-core'
import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import {
  dayMasterLabel,
  elementLabel,
  gejuLabel,
  type Locale as ReadingLocale,
  type ReadingStringKey,
  shichenLabel,
  strengthLabel,
  useReadingI18n,
} from '@zhop/scenario-yuan/components'
import { computeFateNatalChart, type FateNatalChart } from '@zhop/scenario-yuan/natal'
import {
  analyzeDayunRelation,
  computeDayunChain,
  type DayunRelation,
  type DayunVisible,
  parseBirthInput,
} from '@zhop/scenario-yuan/reading'
import { computeZiweiChart, type ZiweiChart } from '@zhop/scenario-yuan/ziwei'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import {
  type AuspiceBirthInfo,
  getAuspiceBirthInfo,
  type ShichenIndex,
  setAuspiceBirthInfo,
} from '@/lib/birth'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import type { Locale as AppLocale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import {
  type CachedChapter,
  computeChartHash,
  fetchChapter,
  getCachedChapter,
} from '@/lib/reading-cache'

/** Minimal shape we use — typed locally so the screen needs no expo-clipboard
 *  type dep (auspice doesn't list it yet). */
interface ClipboardModule {
  setStringAsync: (text: string) => Promise<void>
}
let clipboardModule: ClipboardModule | null | undefined
/** Lazy — copy degrades to a no-op when the native module is absent rather than
 *  throwing (parity with Yuel's defensive getClipboard). */
function getClipboard(): ClipboardModule | null {
  if (clipboardModule !== undefined) return clipboardModule
  try {
    clipboardModule = require('expo-clipboard') as ClipboardModule
    return clipboardModule
  } catch {
    clipboardModule = null
    return null
  }
}

/* ── palette — the shared 宣纸 document layer (kindredPaper): paper ground, dark
   ink body, bronze section accent, cinnabar seal. The SAME tokens Yuel's report
   uses, so the Yuun personal read presents as the identical hand-set document. */
const P = kindredPaper

/** Auspice locale → the reading engine's narrower locale set (zh-Hans → zh). */
function toReadingLocale(l: AppLocale): ReadingLocale {
  return l === 'zh-Hans' ? 'zh' : l
}

/** 碑拓 numeral seal — dark stone-rubbing tile holding the chapter number. */
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
      <Text style={{ color: P.bg, fontSize: size * 0.42, fontWeight: '600' }}>{n}</Text>
    </View>
  )
}

/**
 * The 4 premium chapters — each maps to a server report-chapter slug so a Pro
 * user generates real chart-grounded prose (parity with the free ch1/ch4);
 * non-Pro keeps the static teaser + paywall. Same mapping as Yuel's solo report.
 */
const LOCKED_CHAPTERS = [
  {
    sub: 'CAREER',
    slug: 'ch2_dimensions_static',
    labelKey: 'reading.lcCareerLabel',
    descKey: 'reading.lcCareerDesc',
    detailKey: 'reading.lcCareerDetail',
  },
  {
    sub: 'RELATIONSHIPS',
    slug: 'ch3_stellar',
    labelKey: 'reading.lcRelLabel',
    descKey: 'reading.lcRelDesc',
    detailKey: 'reading.lcRelDetail',
  },
  {
    sub: 'HIDDEN TENSIONS',
    slug: 'ch5_hidden',
    labelKey: 'reading.lcHiddenLabel',
    descKey: 'reading.lcHiddenDesc',
    detailKey: 'reading.lcHiddenDetail',
  },
  {
    sub: 'ACTION PLAN',
    slug: 'ch6_action',
    labelKey: 'reading.lcActionLabel',
    descKey: 'reading.lcActionDesc',
    detailKey: 'reading.lcActionDetail',
  },
] as const satisfies ReadonlyArray<{
  sub: string
  slug: string
  labelKey: ReadingStringKey
  descKey: ReadingStringKey
  detailKey: ReadingStringKey
}>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Build an AuspiceBirthInfo from a Yuel `auspice://reading?...` hand-off (Phase 3).
 * Yuel passes the user's own birth so Yuun renders the same chart without re-entry;
 * we only seed Yuun's store when it's empty (Yuun stays authoritative once set).
 * Returns null when the hand-off carries no usable date.
 */
function birthFromHandoff(p: {
  date?: string
  time?: string
  gender?: string
  city?: string
  lng?: string
  tz?: string
  clock?: string
  calibrate?: string
}): AuspiceBirthInfo | null {
  if (!p.date || !DATE_RE.test(p.date)) return null
  const ti = p.time != null ? Number.parseInt(p.time, 10) : Number.NaN
  const timeIndex: ShichenIndex | null =
    Number.isInteger(ti) && ti >= 0 && ti <= 11 ? (ti as ShichenIndex) : null
  const lng = p.lng != null ? Number.parseFloat(p.lng) : Number.NaN
  const clock = p.clock != null ? Number.parseInt(p.clock, 10) : Number.NaN
  return {
    solarDate: p.date,
    timeIndex,
    gender: p.gender === '男' || p.gender === '女' ? p.gender : undefined,
    city: p.city || undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    timezone: p.tz || undefined,
    clockMinutes: Number.isInteger(clock) && clock >= 0 && clock <= 1439 ? clock : undefined,
    calibrate: p.calibrate == null ? undefined : p.calibrate === '1',
  }
}

/** Targets the chapter detail view — null = list view. */
type ChapterRef = { kind: 'free'; key: 'ch1' | 'ch4' } | { kind: 'locked'; idx: 0 | 1 | 2 | 3 }

/** Free ChapterRef.key → server report-chapter slug (chat readingId grounding). */
const CHAPTER_SLUG: Record<'ch1' | 'ch4', string> = {
  ch1: 'ch1_personality',
  ch4: 'ch4_timeline',
}

export default function ReadingScreen() {
  const router = useRouter()
  const { locale: appLocale } = useStrings()
  const locale = toReadingLocale(appLocale)
  const { t } = useReadingI18n(locale)

  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const [paywallOpen, setPaywallOpen] = useState(false)

  /* ── birth (async from AsyncStorage; seeded from a Yuel hand-off when empty) ── */
  const handoff = useLocalSearchParams<{
    date?: string
    time?: string
    gender?: string
    city?: string
    lng?: string
    tz?: string
    clock?: string
    calibrate?: string
  }>()
  // Primitives so the load effect doesn't re-run on each render (useLocalSearchParams
  // returns a fresh object every render).
  const { date, time, gender, city, lng, tz, clock, calibrate } = handoff
  const [birth, setBirth] = useState<AuspiceBirthInfo | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const saved = await getAuspiceBirthInfo()
        if (cancelled) return
        if (saved) {
          setBirth(saved)
          return
        }
        // No Yuun birth yet — seed from the Yuel hand-off (and persist, so the
        // next Yuun open already has it). Yuun stays authoritative once set.
        const seeded = birthFromHandoff({ date, time, gender, city, lng, tz, clock, calibrate })
        if (seeded) {
          await setAuspiceBirthInfo(seeded).catch(() => {})
          if (!cancelled) setBirth(seeded)
        } else if (!cancelled) {
          setBirth(null)
        }
      } catch {
        if (!cancelled) setBirth(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [date, time, gender, city, lng, tz, clock, calibrate])

  // A reading needs a date AND a gender (大运 direction). timeIndex may be null
  // (子时 estimate). Anything short of that routes the user back to Me to finish.
  const ready = birth != null && !!birth.gender
  const timeIndex = birth?.timeIndex ?? null

  /* ── chart compute (local, via the shared engine) ── */
  const chart = useMemo<FateNatalChart | null>(() => {
    if (!birth || !birth.gender) return null
    try {
      return computeFateNatalChart({
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        clockMinutes: birth.clockMinutes ?? undefined,
        calibrate: birth.calibrate ?? undefined,
        longitude: birth.lng,
        timezoneId: birth.timezone ?? undefined,
        city: birth.city,
        gender: birth.gender,
      })
    } catch {
      return null
    }
  }, [birth])

  const ziwei = useMemo<ZiweiChart | null>(() => {
    if (!birth || !birth.gender) return null
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

  const dayunInfo = useMemo<{
    active: DayunVisible | null
    relation: DayunRelation | null
  } | null>(() => {
    if (!chart || !birth || !birth.gender) return null
    try {
      const bd = parseBirthInput(birth.solarDate, birth.timeIndex ?? 0)
      const { steps, currentVisibleIndex } = computeDayunChain(bd, birth.gender)
      const active = steps[currentVisibleIndex] ?? steps[0] ?? null
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
  const [premium, setPremium] = useState<Record<string, CachedChapter | null>>({})
  const [premiumLoading, setPremiumLoading] = useState(false)

  const chartHash = useMemo(() => {
    if (!birth || !birth.gender) return ''
    return computeChartHash(birth.solarDate, birth.timeIndex ?? 0, birth.gender)
  }, [birth])

  const draftSolarDate = birth?.solarDate ?? null
  const draftGender = birth?.gender ?? null

  useEffect(() => {
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    let cancelled = false
    const b = { solarDate: draftSolarDate, timeIndex: timeIndex ?? 0, gender: draftGender }
    async function load() {
      const [cached1, cached4] = await Promise.all([
        getCachedChapter('ch1_personality', chartHash),
        getCachedChapter('ch4_timeline', chartHash),
      ])
      if (cancelled) return
      const ch1Promise = cached1
        ? Promise.resolve(cached1)
        : fetchChapter('ch1_personality', chartHash, b)
      const ch4Promise = cached4
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

  // Premium chapters: fetch the 4 LOCKED_CHAPTERS once the user is Pro. Each is
  // cache-first + resolves independently so rows fill in as they generate.
  useEffect(() => {
    if (!isPro) return
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    let cancelled = false
    const b = { solarDate: draftSolarDate, timeIndex: timeIndex ?? 0, gender: draftGender }
    async function loadPremium() {
      setPremiumLoading(true)
      await Promise.all(
        LOCKED_CHAPTERS.map(async ({ slug }) => {
          const cached = await getCachedChapter(slug, chartHash)
          const ch = cached ?? (await fetchChapter(slug, chartHash, b))
          if (!cancelled) setPremium((prev) => ({ ...prev, [slug]: ch }))
        })
      )
      if (!cancelled) setPremiumLoading(false)
    }
    void loadPremium()
    return () => {
      cancelled = true
    }
  }, [isPro, chartHash, draftSolarDate, draftGender, timeIndex])

  const [activeChapter, setActiveChapter] = useState<ChapterRef | null>(null)
  const lastActiveRef = useRef<ChapterRef | null>(null)
  if (activeChapter) lastActiveRef.current = activeChapter

  // 划词 (K3): the long-pressed paragraph drives the action bar; highlights persist
  // per chart (the personal report has no bondId, so chartHash is the stable key).
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  useEffect(() => {
    if (chartHash) void loadHighlights(chartHash).then(setHighlights)
  }, [chartHash])

  const goBack = () => router.back()
  const openPaywall = () => setPaywallOpen(true)

  // 划词 AI chat: push the chat seeded with the chapter slug + (optionally) the
  // long-pressed paragraph as a quoted draft. lib/chat gates it under auspice_pro.
  const handleAskAI = ({ slug, quote }: { slug: string; quote: string | null }) => {
    router.push({ pathname: '/reading-chat', params: { slug, ...(quote ? { quote } : {}) } })
  }

  /* ── empty / not-ready guard ── */
  if (birth === undefined) {
    // Still loading birth from storage — a quiet header, no flash of the prompt.
    return (
      <View style={S.paper}>
        <SafeAreaView edges={['top']}>
          <Header title={t('reading.title')} onBack={goBack} backLabel={t('common.back')} />
        </SafeAreaView>
      </View>
    )
  }

  if (!ready || !chart) {
    return (
      <View style={S.paper}>
        <SafeAreaView style={S.safe} edges={['top']}>
          <Header title={t('reading.title')} onBack={goBack} backLabel={t('common.back')} />
          <View style={S.emptyBody}>
            <Text style={S.emptyText}>{t('reading.needBirth')}</Text>
            <Pressable
              style={({ pressed }) => [S.unlockBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(tabs)/me')}
            >
              <Text style={S.unlockText}>{t('reading.goSetBirth')}</Text>
            </Pressable>
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
    `${dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale)} · ${gejuLabel(chart.geju.primary, locale)} · ${t('label.self', { s: strengthLabel(chart.geju.dayMasterStrength, locale) })}` +
    (ziweiLabel ? ` · ${t('label.soulPalaceInline', { stars: ziweiLabel })}` : '')

  const ch1Meta = {
    label: t('reading.ch1Label'),
    sub: 'PERSONALITY',
    content: ch1?.content ?? null,
    loading: loading && !ch1,
    placeholder: t('reading.ch1Placeholder', {
      stem: chart.dayMaster,
      el: elementLabel(chart.dayMasterWuXing as WuXing, locale),
      geju: gejuLabel(chart.geju.primary, locale),
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

  /* ── detail view props (rendered as a slide-in overlay). ── */
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
        onUnlock: openPaywall,
        identityLine,
        birthBadge,
        // 划词 AI chat (K3) — long-press a paragraph or tap the chapter CTA.
        onAsk: (quote: string | null) => handleAskAI({ slug: CHAPTER_SLUG[key], quote }),
        askChapterLabel: t('reading.askChapter'),
        askHint: t('reading.askParagraphHint'),
        onPickQuote: setPickedQuote,
        highlightedQuotes: highlights,
      }
    } else {
      const lc = LOCKED_CHAPTERS[detailChapter.idx]
      if (lc) {
        const raw = isPro ? (premium[lc.slug]?.content ?? null) : null
        detailProps = {
          label: t(lc.labelKey),
          sub: lc.sub,
          content: raw,
          loading: isPro && premiumLoading && !raw,
          placeholder: t(lc.detailKey),
          locked: !isPro,
          unlockLabel: t('reading.unlock'),
          backLabel: t('common.back'),
          onBack: back,
          onUnlock: openPaywall,
          // Once unlocked + generated, ground it + enable 划词 chat (same as free).
          ...(raw
            ? {
                identityLine,
                birthBadge,
                onAsk: (quote: string | null) => handleAskAI({ slug: lc.slug, quote }),
                askChapterLabel: t('reading.askChapter'),
                askHint: t('reading.askParagraphHint'),
                onPickQuote: setPickedQuote,
                highlightedQuotes: highlights,
              }
            : {}),
        }
      }
    }
  }

  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <Header title={t('reading.title')} onBack={goBack} backLabel={t('common.back')} />

        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          <Text style={S.identity}>{identityLine}</Text>
          <Text style={S.birth}>{birthBadge}</Text>
          {timeIndex == null ? <Text style={S.caveat}>{t('reading.timeUnknownEst')}</Text> : null}

          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch1' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  n={1}
                  label={ch1Meta.label}
                  sub={ch1Meta.sub}
                  summary={ch1Meta.content ?? ch1Meta.placeholder}
                  loading={ch1Meta.loading}
                />
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch4' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  n={2}
                  label={ch4Meta.label}
                  sub={ch4Meta.sub}
                  summary={ch4Meta.content ?? ch4Meta.placeholder}
                  loading={ch4Meta.loading}
                />
              </View>
            )}
          </Pressable>

          <Text style={S.sectionKicker}>{t('reading.moreChapters')}</Text>

          {LOCKED_CHAPTERS.map((ch, i) => {
            const idx = i as 0 | 1 | 2 | 3
            const pc = isPro ? premium[ch.slug] : null
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
                  summary={pc?.content ?? t(ch.descKey)}
                  loading={isPro && premiumLoading && !pc}
                  locked={!isPro}
                />
              </Pressable>
            )
          })}

          {!isPro ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, pressed && { opacity: 0.85 }]}
              onPress={openPaywall}
            >
              <Text style={S.unlockText}>{t('reading.unlock')}</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>

      {activeChapter && detailProps ? (
        <Animated.View
          entering={SlideInRight.duration(280)}
          exiting={SlideOutRight.duration(240)}
          style={S.detailOverlay}
        >
          <ChapterDetail {...detailProps} />
        </Animated.View>
      ) : null}

      {/* 划词 action bar — slides up when a paragraph is long-pressed (copy / chat /
          highlight). Mirrors Yuel's reading; the personal report has no
          timeline/what-if, so there's no living-layer fab — just this bar. */}
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
        onChat={() => {
          const q = pickedQuote
          setPickedQuote(null)
          // Reuse the active chapter's slug-aware ask (detailProps.onAsk).
          if (q) detailProps?.onAsk?.(q)
        }}
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

      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </View>
  )
}

/* ── Header ─────────────────────────────────────────────────────────── */

function Header({
  title,
  onBack,
  backLabel,
}: {
  title: string
  onBack: () => void
  backLabel: string
}) {
  return (
    <View style={S.header}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole='button'
        accessibilityLabel={backLabel}
        style={({ pressed }) => [S.backBtn, pressed && { opacity: 0.6 }]}
      >
        <ArrowLeft size={20} color={P.inkSoft} strokeWidth={1.5} />
      </Pressable>
      <Text style={S.headerTitle}>{title}</Text>
      <View style={S.backBtn} />
    </View>
  )
}

/* ── Chapter (list-card) ────────────────────────────────────────────── */

function Chapter({
  n,
  label,
  sub,
  summary,
  loading,
  locked,
}: {
  n: number
  label: string
  sub: string
  summary: string | null
  loading: boolean
  locked?: boolean
}) {
  return (
    <View style={S.chapter}>
      <View style={S.chapterHead}>
        <SealNumeral n={n} />
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={S.chapterLabel}>{label}</Text>
          <Text style={S.chapterSub}>{sub}</Text>
        </View>
        {locked ? <View style={S.lockDot} /> : null}
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

/* ── ChapterDetail (single-chapter focused view) ────────────────────── */

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
  identityLine?: string
  birthBadge?: string
  /** 划词 chat (K3): quote = long-pressed paragraph, null = whole chapter. */
  onAsk?: (quote: string | null) => void
  askChapterLabel?: string
  askHint?: string
  /** 划词: long-press a paragraph → raise the action bar with this quote. */
  onPickQuote?: (quote: string) => void
  /** Persisted highlighted paragraphs — painted with a cinnabar wash. */
  highlightedQuotes?: string[]
}) {
  const paragraphs = useMemo(() => (content ? content.split('\n\n') : []), [content])
  const askParagraph = (para: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
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
                      <Text style={[S.detailBody, S.paraBlock]}>{para}</Text>
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
                    <Text style={S.askChapterText}>{askChapterLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              paragraphs.map((para, i) => (
                <Text key={i} style={[S.detailBody, S.paraBlock]}>
                  {para}
                </Text>
              ))
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

/* ── styles ─────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.bg },
  safe: { flex: 1 },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: P.bronze, fontSize: 11, letterSpacing: 4, fontWeight: '300' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 24, paddingTop: 12 },

  emptyBody: { paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyText: { color: P.inkSoft, fontSize: 15, lineHeight: 23, textAlign: 'center' },

  identity: { color: P.inkSoft, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  caveat: { color: P.muted, fontSize: 10, marginBottom: 4 },

  chapter: {
    paddingVertical: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 16 },
  chapterLabel: { color: P.ink, fontSize: 24, lineHeight: 30, letterSpacing: 0.5 },
  chapterSub: { color: P.bronze, fontSize: 10, letterSpacing: 2.5 },
  lockDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.2, borderColor: P.cinnabar },
  chapterPressed: { opacity: 0.7 },
  chapterSummary: { color: P.inkSoft, fontSize: 15, lineHeight: 23 },
  skeleton: { gap: 12 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: P.hairSoft, width: '100%' },

  sectionKicker: {
    color: P.muted,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 38,
    marginBottom: 6,
  },

  unlockBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: P.cinnabar,
    borderRadius: 22,
  },
  unlockText: { color: P.ctaText, fontSize: 13, fontWeight: '600', letterSpacing: 3 },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
  paraBlock: { marginBottom: 20 },
  detailPlaceholder: { color: P.inkSoft, fontSize: 16, lineHeight: 28, fontStyle: 'italic' },
  detailUnlock: { marginTop: 40 },

  // 划词 AI chat (K3)
  askHint: { color: P.muted, fontSize: 12, letterSpacing: 0.5, marginBottom: 16 },
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
