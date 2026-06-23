/**
 * Yuel (kindred) personal deep read — the FULL 合参命书, ported in-app from Yuun
 * (apps/auspice-app/app/reading.tsx). The Yuel/Yuun split, Phase 1: the full
 * personal report now lives self-contained in Yuel. The home self-star and the
 * Settings "your reading" row open this directly — the old 概要 interstitial
 * (summary.tsx) was dropped (2026-06). A kindred://reading hand-off deep-links
 * straight here too.
 *
 * Same 宣纸 document (kindredPaper), same shared engine (@zhop/scenario-yuan
 * compute + cache), so the report reads identically to the Yuun original. Deltas
 * from the Yuun screen, all dependency swaps for the Yuel environment:
 *   - Birth: `useSelfBirth()` (lib/selfBirth) — Yuel's authoritative self birth,
 *     reactive instead of a manual async-load effect. A `kindred://reading?…`
 *     hand-off seeds it via saveSelfBirth only when none is set yet.
 *   - Chapter engine: the kindred-bound reading-cache (lib/solo/reading-cache) —
 *     its own `kindred_reading_ch_` namespace + kindred's HMAC signer.
 *   - i18n: kindred's local reading-i18n (no-arg useReadingI18n()).
 *   - Monetization: the full 命书 is the Yuel Pro anchor — unlocked by the kindred
 *     Pro subscription (getYuanProStatus), NOT a separate purchase and NOT the 合盘
 *     path. The deep chapters are also gated server-side on the `kindred` capability.
 *   - 划词 chat: pushes the in-app (reading)/reading-chat route.
 */

import type { WuXing } from '@zhop/astro-core'
import {
  getTermByZh,
  type ResolvedTerm,
  segmentTextByTerms,
  type Locale as TermLocale,
} from '@zhop/astro-i18n'
import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { isCjkLocale, TermBubble } from '@zhop/scenario-kindred'
import { composeTeaserNarrator } from '@zhop/scenario-yuan/teaser-narrator'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Clock, Lock, RefreshCw, X } from 'lucide-react-native'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Dimensions,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  dayMasterLabel,
  gejuLabel,
  type ReadingStringKey,
  shichenLabel,
  strengthLabel,
  useReadingI18n,
} from '@/components/reading/reading-i18n'
import {
  labelForSeed,
  PERSPECTIVE_PRESETS,
  type PerspectivePreset,
  perspectiveSeed,
  REROLL_UI,
} from '@/components/reading/perspective-presets'
import { ReportBloom } from '@/components/reading/ReportBloom'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { getYuanProStatus } from '@/lib/iap'
import { fetchProAllowance } from '@/lib/pro-allowance'
import { type SelfBirth, saveSelfBirth, useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import {
  analyzeDayunRelation,
  computeDayunChain,
  type DayunRelation,
  type DayunVisible,
  parseBirthInput,
} from '@/lib/solo/reading'
import {
  type CachedChapter,
  type ChapterVersion,
  computeChartHash,
  fetchChapter,
  fetchChapterHistory,
  getCachedChapter,
  rerollChapter,
} from '@/lib/solo/reading-cache'
import { computeZiweiChart, type ZiweiChart } from '@/lib/solo/ziwei'

/** Minimal shape we use — typed locally so the screen needs no expo-clipboard
 *  type dep. Copy degrades to a no-op when the native module is absent rather
 *  than throwing (parity with the rest of the 划词 flow). */
interface ClipboardModule {
  setStringAsync: (text: string) => Promise<void>
}
let clipboardModule: ClipboardModule | null | undefined
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
   ink body, bronze section accent, cinnabar seal. The SAME tokens the 概要 uses,
   so the full read presents as the identical hand-set document. */
const P = kindredPaper

/** Narrow the reading locale to the astro-i18n term locale (drives the language a
 *  tapped term's explanation shows in; the term tokens themselves stay Chinese). */
function termLocale(locale?: string): TermLocale {
  if (locale === 'zh-Hant' || locale === 'zh-TW' || locale === 'zh-HK') return 'zh-Hant'
  if (locale?.startsWith('zh')) return 'zh'
  if (locale?.startsWith('ja')) return 'ja'
  return 'en'
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
 * The six chapters in reading order. ch1/ch4 are the free taste (deterministic
 * teaser; LLM once unlocked); the other four are premium — server report-chapter
 * slugs that generate real chart-grounded prose once the report is unlocked. The
 * report flips through them as a continuous horizontal pager (parity with the 合盘
 * report); the locked four collapse into a trailing unlock wall while unbought.
 */
const REPORT_CHAPTERS = [
  { slug: 'ch1_personality', n: 1, free: true, labelKey: 'reading.ch1Label', sub: 'PERSONALITY' },
  {
    slug: 'ch2_dimensions_static',
    n: 2,
    free: false,
    labelKey: 'reading.lcCareerLabel',
    descKey: 'reading.lcCareerDesc',
    sub: 'CAREER',
  },
  {
    slug: 'ch3_stellar',
    n: 3,
    free: false,
    labelKey: 'reading.lcRelLabel',
    descKey: 'reading.lcRelDesc',
    sub: 'RELATIONSHIPS',
  },
  { slug: 'ch4_timeline', n: 4, free: true, labelKey: 'reading.ch4Label', sub: 'CURRENT PERIOD' },
  {
    slug: 'ch5_hidden',
    n: 5,
    free: false,
    labelKey: 'reading.lcHiddenLabel',
    descKey: 'reading.lcHiddenDesc',
    sub: 'HIDDEN TENSIONS',
  },
  {
    slug: 'ch6_action',
    n: 6,
    free: false,
    labelKey: 'reading.lcActionLabel',
    descKey: 'reading.lcActionDesc',
    sub: 'ACTION PLAN',
  },
] as const satisfies ReadonlyArray<{
  slug: string
  n: number
  free: boolean
  labelKey: ReadingStringKey
  descKey?: ReadingStringKey
  sub: string
}>

const PREMIUM_SLUGS = REPORT_CHAPTERS.filter((c) => !c.free).map((c) => c.slug)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Build a SelfBirth from a `kindred://reading?...` hand-off. A peer app (or a
 * legacy Yuun deep link) can pass the user's own birth so Yuel renders the same
 * chart without re-entry; we only seed Yuel's store when it's empty (Yuel stays
 * authoritative once set). Returns null when the hand-off carries no usable date.
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
}): SelfBirth | null {
  if (!p.date || !DATE_RE.test(p.date)) return null
  const ti = p.time != null ? Number.parseInt(p.time, 10) : Number.NaN
  const timeIndex = Number.isInteger(ti) && ti >= 0 && ti <= 11 ? ti : null
  const lng = p.lng != null ? Number.parseFloat(p.lng) : Number.NaN
  const clock = p.clock != null ? Number.parseInt(p.clock, 10) : Number.NaN
  if (p.gender !== '男' && p.gender !== '女') return null
  return {
    solarDate: p.date,
    timeIndex,
    gender: p.gender,
    city: p.city || undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    timezone: p.tz || undefined,
    clockMinutes: Number.isInteger(clock) && clock >= 0 && clock <= 1439 ? clock : undefined,
    calibrate: p.calibrate == null ? undefined : p.calibrate === '1',
  }
}

export default function FullReadingScreen() {
  const router = useRouter()
  const { t, locale } = useReadingI18n()

  // The personal 命书 is included in Yuel Pro (the subscription anchor) — NOT a
  // separate purchase, and NOT the 合盘 path. `unlocked` rides the kindred Pro
  // entitlement; unbought → the free teaser + a subscribe-to-unlock wall.
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

  /* ── birth (Yuel's authoritative self birth; seeded from a hand-off when empty) ── */
  const handoff = useLocalSearchParams<{
    date?: string
    time?: string
    gender?: string
    city?: string
    lng?: string
    tz?: string
    clock?: string
    calibrate?: string
    /** Tap point of the home star — the 墨晕 entrance spreads from here. */
    ox?: string
    oy?: string
  }>()
  // Primitives so the seed effect doesn't re-run on each render (useLocalSearchParams
  // returns a fresh object every render).
  const { date, time, gender, city, lng, tz, clock, calibrate, ox, oy } = handoff
  const stored = useSelfBirth()
  // Local seed: when there's a hand-off but no stored birth yet, render from the
  // seed immediately and persist it (Yuel stays authoritative once set).
  const [seeded, setSeeded] = useState<SelfBirth | null>(null)
  useEffect(() => {
    if (stored !== null) return
    const s = birthFromHandoff({ date, time, gender, city, lng, tz, clock, calibrate })
    if (!s) return
    setSeeded(s)
    void saveSelfBirth(s).catch(() => {})
  }, [stored, date, time, gender, city, lng, tz, clock, calibrate])

  // undefined while loading; null when neither stored nor a usable hand-off.
  const birth: SelfBirth | null | undefined = stored === undefined ? undefined : (stored ?? seeded)

  // A reading needs a date AND a gender (大运 direction). timeIndex may be null
  // (子时 estimate). SelfBirth always carries a gender, so `ready` reduces to
  // "we have a birth"; the guard still routes an empty store to the self form.
  const ready = birth != null
  const timeIndex = birth?.timeIndex ?? null

  /* ── chart compute (local, via the shared engine) ── */
  const chart = useMemo<FateNatalChart | null>(() => {
    if (!birth) return null
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

  const dayunInfo = useMemo<{
    active: DayunVisible | null
    relation: DayunRelation | null
  } | null>(() => {
    if (!chart || !birth) return null
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

  // Deterministic free-tier 命书 taste (no LLM). The free chapters never call the
  // model, so we compose ch1 (人格) + ch4 (现运) straight from the chart — 日主 ·
  // 旺衰 · 格局 · 喜用神 · 当前大运十神 + the shared 命理词库 — so a non-Pro reader
  // gets real, chart-grounded prose instead of a "生成中…" placeholder that never
  // resolves. Pro users still get the richer LLM chapter; this is the fallback.
  const teaser = useMemo(() => {
    if (!chart) return null
    const soulStars =
      ziwei?.palaces.find((p) => p.name === '命宫')?.majorStars.map((s) => s.name).join(' ') ?? ''
    return composeTeaserNarrator({
      chart,
      dayun: dayunInfo ?? { active: null, relation: null },
      soulPalaceStars: soulStars || null,
      locale,
    })
  }, [chart, ziwei, dayunInfo, locale])

  /* ── LLM cache + fetch ── */
  const [ch1, setCh1] = useState<CachedChapter | null>(null)
  const [ch4, setCh4] = useState<CachedChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [premium, setPremium] = useState<Record<string, CachedChapter | null>>({})
  const [premiumLoading, setPremiumLoading] = useState(false)

  const chartHash = useMemo(() => {
    if (!birth) return ''
    return computeChartHash(birth.solarDate, birth.timeIndex ?? 0, birth.gender)
  }, [birth])

  const draftSolarDate = birth?.solarDate ?? null
  const draftGender = birth?.gender ?? null

  useEffect(() => {
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    // Free tier = the deterministic taste only (the computed teaser), no LLM. An
    // unbought report never fetches; ch1/ch4 fall back to the teaser and the rest
    // live behind the unlock wall.
    if (!isPro) {
      setLoading(false)
      return
    }
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
  }, [isPro, chartHash, draftSolarDate, draftGender, timeIndex])

  // Premium chapters: fetch the four premium slugs once the report is unlocked.
  // Each is cache-first + resolves independently so pages fill in as they generate.
  useEffect(() => {
    if (!isPro) return
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    let cancelled = false
    const b = { solarDate: draftSolarDate, timeIndex: timeIndex ?? 0, gender: draftGender }
    async function loadPremium() {
      setPremiumLoading(true)
      await Promise.all(
        PREMIUM_SLUGS.map(async (slug) => {
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

  // The current pager page (drives 划词 grounding + the page indicator).
  const [chapterIndex, setChapterIndex] = useState(0)

  // 划词 (K3): the long-pressed paragraph drives the action bar; highlights persist
  // per chart (the personal report has no bondId, so chartHash is the stable key).
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  useEffect(() => {
    if (chartHash) void loadHighlights(chartHash).then(setHighlights)
  }, [chartHash])

  // Robust back: this screen is also reached via the `kindred://reading` deep
  // link, where there's no history to pop — go to the reading home instead of a
  // no-op `back()` ("GO_BACK was not handled by any navigator").
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(reading)')
  }
  // The full 命书 is a Yuel Pro benefit, so the unlock wall routes to the
  // subscription paywall (reason:'reading' → the 命书-anchored Pro pitch).
  const openPaywall = () => {
    router.push({ pathname: '/(commerce)/paywall', params: { reason: 'reading' } })
  }

  // 划词 AI chat: push the chat seeded with the chapter slug + (optionally) the
  // long-pressed paragraph as a quoted draft. lib/chat gates it under kindred_pro.
  const handleAskAI = ({ slug, quote }: { slug: string; quote: string | null }) => {
    router.push({
      pathname: '/(reading)/reading-chat',
      params: { slug, ...(quote ? { quote } : {}) },
    })
  }

  // 换视角 (Pro · metered): re-read a chapter through a different voice. The picker
  // opens for `rerollFor`'s slug; a chosen preset regenerates the chapter and swaps
  // its prose in place. Exhausted → soft notice; non-Pro → paywall (server-gated).
  const ru = REROLL_UI[locale]
  const [rerollFor, setRerollFor] = useState<string | null>(null)
  const [rerolling, setRerolling] = useState(false)
  const [rerollNotice, setRerollNotice] = useState<string | null>(null)
  const [rerollRemaining, setRerollRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!rerollNotice) return
    const id = setTimeout(() => setRerollNotice(null), 4500)
    return () => clearTimeout(id)
  }, [rerollNotice])
  // Refresh the monthly 换视角 remaining whenever the picker opens, so the count is
  // current (it also drops as the user re-rolls within the session).
  useEffect(() => {
    if (rerollFor == null) return
    void fetchProAllowance().then((s) => setRerollRemaining(s?.reroll.remaining ?? null))
  }, [rerollFor])

  const applyRerolled = (chapter: CachedChapter) => {
    if (chapter.slug === 'ch1_personality') setCh1(chapter)
    else if (chapter.slug === 'ch4_timeline') setCh4(chapter)
    else setPremium((prev) => ({ ...prev, [chapter.slug]: chapter }))
  }
  const doReroll = (preset: PerspectivePreset) => {
    const slug = rerollFor
    setRerollFor(null)
    if (!slug || !birth) return
    setRerolling(true)
    void (async () => {
      const b = {
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        gender: birth.gender,
      }
      const result = await rerollChapter(slug, chartHash, b, perspectiveSeed(preset, locale))
      setRerolling(false)
      if (result.kind === 'ok') {
        applyRerolled(result.chapter)
        setRerollRemaining((r) => (r != null ? Math.max(0, r - 1) : r))
      } else if (result.kind === 'exhausted') {
        setRerollRemaining(0)
        setRerollNotice(ru.exhausted)
      } else if (result.kind === 'needs_pro') openPaywall()
      else setRerollNotice(ru.failed)
    })()
  }

  // 历史视角 (P4b): all saved versions of a chapter, to swipe-compare. <2 versions
  // (just the original) → a soft "暂无其他视角" notice rather than an empty sheet.
  const [historyVersions, setHistoryVersions] = useState<ChapterVersion[] | null>(null)
  const openHistory = (slug: string) => {
    void fetchChapterHistory(slug).then((versions) => {
      if (versions.length >= 2) setHistoryVersions(versions)
      else setRerollNotice(ru.historyEmpty)
    })
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
              onPress={() => router.push('/(onboarding)/self')}
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

  // Per-slug content sources. Free chapters (ch1/ch4) carry the deterministic
  // teaser (composeTeaserNarrator) until unlocked, then swap to their LLM prose;
  // the four premium slugs resolve into `premium`. No "生成中…" ever shows for a
  // free reader — the teaser is real computed 命理 prose.
  const unlocked = isPro
  const contentBySlug = (slug: string): string | null =>
    slug === 'ch1_personality'
      ? (ch1?.content ?? null)
      : slug === 'ch4_timeline'
        ? (ch4?.content ?? null)
        : (premium[slug]?.content ?? null)
  const teaserBySlug = (slug: string): string | null =>
    slug === 'ch1_personality'
      ? (teaser?.ch1 ?? null)
      : slug === 'ch4_timeline'
        ? (teaser?.ch4 ?? null)
        : null
  const loadingBySlug = (slug: string): boolean =>
    slug === 'ch1_personality'
      ? loading && !ch1
      : slug === 'ch4_timeline'
        ? loading && !ch4
        : unlocked && premiumLoading && !premium[slug]

  // The pages the pager flips through: every chapter once unlocked; only the free
  // taste (ch1/ch4) while unbought, with the locked four folded into the wall.
  const pages = REPORT_CHAPTERS.filter((c) => unlocked || c.free)
  const lockedChapters = REPORT_CHAPTERS.filter((c) => !c.free)
  const screenWidth = Dimensions.get('window').width
  const bloomOrigin = ox != null && oy != null ? { x: Number(ox), y: Number(oy) } : null
  const pageCount = pages.length + (unlocked ? 0 : 1)
  const activeSlug = pages[chapterIndex]?.slug ?? null

  const onPageEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
    if (next !== chapterIndex) setChapterIndex(next)
  }

  return (
    <View style={S.paper}>
      {/* 水墨晕开 entrance — the 宣纸 命书 unrolls in from the tapped star (origin
          passed as ox/oy), then rests. Wraps only the pager; the 划词 bar stays
          outside the mask. */}
      <ReportBloom origin={bloomOrigin}>
        <SafeAreaView style={S.safe} edges={['top']}>
          {/* Clean report — no header chrome (parity with the 合盘 report). A quiet
              close sits top-left; the iOS edge-swipe-back also pops the route. */}
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={t('common.back')}
            style={S.closeBtn}
          >
            <X size={22} color={P.muted} strokeWidth={1.5} />
          </Pressable>

          {/* Six chapters as one continuous horizontal flip; the locked four fold
              into a trailing unlock wall while the report is unbought. */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPageEnd}
            contentOffset={{ x: chapterIndex * screenWidth, y: 0 }}
            style={{ flex: 1 }}
          >
            {pages.map((c, i) => {
              const content = contentBySlug(c.slug)
              return (
                <View key={c.slug} style={{ width: screenWidth }}>
                  <ChapterPage
                    n={c.n}
                    label={t(c.labelKey)}
                    sub={c.sub}
                    locale={locale}
                    content={content}
                    loading={loadingBySlug(c.slug)}
                    teaser={teaserBySlug(c.slug)}
                    identityLine={i === 0 ? identityLine : undefined}
                    birthBadge={i === 0 ? birthBadge : undefined}
                    timeCaveat={
                      i === 0 && timeIndex == null ? t('reading.timeUnknownEst') : undefined
                    }
                    ask={
                      content
                        ? {
                            onAsk: (quote: string | null) => handleAskAI({ slug: c.slug, quote }),
                            askChapterLabel: t('reading.askChapter'),
                            askHint: t('reading.askParagraphHint'),
                            onPickQuote: setPickedQuote,
                            highlightedQuotes: highlights,
                          }
                        : undefined
                    }
                    rerollLabel={ru.button}
                    onReroll={content ? () => setRerollFor(c.slug) : undefined}
                    historyLabel={ru.historyButton}
                    onHistory={content ? () => openHistory(c.slug) : undefined}
                  />
                </View>
              )
            })}
            {!unlocked ? (
              <View key='__wall' style={{ width: screenWidth }}>
                <UnlockWall
                  heading={t('reading.moreChapters')}
                  lockedChapters={lockedChapters.map((c) => ({
                    title: t(c.labelKey),
                    line: c.descKey ? t(c.descKey) : '',
                  }))}
                  ctaLabel={t('reading.unlock')}
                  onUnlock={openPaywall}
                />
              </View>
            ) : null}
          </ScrollView>

          {pageCount > 1 ? <PageDots count={pageCount} index={chapterIndex} /> : null}
        </SafeAreaView>
      </ReportBloom>

      {/* 划词 action bar — slides up when a paragraph is long-pressed (copy / chat /
          highlight). The personal report has no timeline/what-if, so there's no
          living-layer fab — just this bar. */}
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
          // Ground the chat in whatever chapter is currently in view.
          if (q && activeSlug) handleAskAI({ slug: activeSlug, quote: q })
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

      {/* 换视角 picker — pick a voice to re-read the current chapter through. */}
      <PerspectivePicker
        visible={rerollFor != null}
        locale={locale}
        title={ru.title}
        subtitle={ru.subtitle}
        remainingLabel={rerollRemaining != null ? ru.remaining(rerollRemaining) : null}
        onPick={doReroll}
        onClose={() => setRerollFor(null)}
      />

      {/* 历史视角 — swipe-compare saved versions of a chapter. */}
      {historyVersions ? (
        <HistoryView
          versions={historyVersions}
          locale={locale}
          title={ru.historyTitle}
          onClose={() => setHistoryVersions(null)}
        />
      ) : null}

      {/* Regen in progress — a quiet full-screen veil with the 墨晕 idiom. */}
      {rerolling ? (
        <View style={S.rerollVeil} pointerEvents='auto'>
          <Text style={S.rerollVeilText}>{ru.rerolling}</Text>
        </View>
      ) : null}

      {/* Soft notice (exhausted / failed) — a gentle bottom banner, auto-dismisses
          after a few seconds (tap to dismiss sooner). */}
      {rerollNotice ? (
        <Pressable style={S.noticeBar} onPress={() => setRerollNotice(null)}>
          <Text style={S.noticeText}>{rerollNotice}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/* ── PerspectivePicker (换视角 bottom sheet) ─────────────────────────── */

function PerspectivePicker({
  visible,
  locale,
  title,
  subtitle,
  remainingLabel,
  onPick,
  onClose,
}: {
  visible: boolean
  locale: ReturnType<typeof useReadingI18n>['locale']
  title: string
  subtitle: string
  /** "本月还剩 N 次" — null while loading or signed out. */
  remainingLabel?: string | null
  onPick: (preset: PerspectivePreset) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={S.sheetBackdrop} onPress={onClose}>
        <Pressable style={S.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={S.sheetHandle} />
          <View style={S.sheetTitleRow}>
            <Text style={S.sheetTitle}>{title}</Text>
            {remainingLabel ? <Text style={S.sheetRemaining}>{remainingLabel}</Text> : null}
          </View>
          <Text style={S.sheetSubtitle}>{subtitle}</Text>
          <View style={{ gap: 10, marginTop: 18 }}>
            {PERSPECTIVE_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onPick(p)}
                style={({ pressed }) => [S.voiceCard, pressed && { opacity: 0.7 }]}
              >
                <Text style={S.voiceLabel}>{p.label[locale]}</Text>
                <Text style={S.voiceDesc}>{p.desc[locale]}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/* ── HistoryView (历史视角 compare) ──────────────────────────────────── */

function HistoryView({
  versions,
  locale,
  title,
  onClose,
}: {
  versions: ChapterVersion[]
  locale: ReturnType<typeof useReadingI18n>['locale']
  title: string
  onClose: () => void
}) {
  const screenWidth = Dimensions.get('window').width
  const [idx, setIdx] = useState(0)
  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <View style={S.paper}>
        <SafeAreaView style={S.safe} edges={['top']}>
          <View style={S.historyHeader}>
            <Text style={S.historyTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole='button'>
              <X size={22} color={P.muted} strokeWidth={1.5} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
              if (next !== idx) setIdx(next)
            }}
            style={{ flex: 1 }}
          >
            {versions.map((v, i) => (
              <View key={i} style={{ width: screenWidth }}>
                <ScrollView contentContainerStyle={S.historyPageScroll} showsVerticalScrollIndicator={false}>
                  <Text style={S.historyVoice}>{labelForSeed(v.perspectiveSeed, locale)}</Text>
                  {v.content.split('\n\n').map((para, j) => (
                    <Text key={j} style={[S.detailBody, S.paraBlock]}>
                      {para}
                    </Text>
                  ))}
                  <View style={{ height: 60 }} />
                </ScrollView>
              </View>
            ))}
          </ScrollView>
          <PageDots count={versions.length} index={idx} />
        </SafeAreaView>
      </View>
    </Modal>
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

/* ── ChapterPage (one pager page) ───────────────────────────────────── */

function ChapterPage({
  n,
  label,
  sub,
  locale,
  content,
  loading,
  teaser,
  identityLine,
  birthBadge,
  timeCaveat,
  ask,
  rerollLabel,
  onReroll,
}: {
  n: number
  label: string
  sub: string
  /** Reading locale — drives term-gloss explanation language + CJK font choice. */
  locale: string
  /** LLM prose once unlocked + generated; null otherwise. */
  content: string | null
  loading: boolean
  /** Deterministic free teaser (free chapters, pre-unlock) — real computed prose. */
  teaser: string | null
  /** Shown on the first page only — regrounds the chart facts. */
  identityLine?: string
  birthBadge?: string
  timeCaveat?: string
  /** 划词 — only wired when the page has real (unlocked) content. */
  ask?: {
    onAsk: (quote: string | null) => void
    askChapterLabel: string
    askHint: string
    onPickQuote: (quote: string) => void
    highlightedQuotes: string[]
  }
  /** 换视角 — opens the perspective picker for this chapter (Pro, content pages). */
  rerollLabel?: string
  onReroll?: () => void
  /** 历史视角 — opens the saved-versions compare view. */
  historyLabel?: string
  onHistory?: () => void
}) {
  const cjk = isCjkLocale(locale)
  const tLocale = termLocale(locale)
  const [activeTerm, setActiveTerm] = useState<ResolvedTerm | null>(null)
  const paragraphs = useMemo(() => (content ? content.split('\n\n') : []), [content])

  // Tap-to-explain: gloss 命理 terms (日主 / 用神 / 大运 …) with a dotted underline;
  // a tap opens the plain-language meaning. Non-CJK prose renders verbatim.
  const renderProse = (s: string): ReactNode => {
    const segs = segmentTextByTerms(s, { includeSingleChar: !cjk })
    if (segs.length === 1 && !segs[0]?.termZh) return s
    return segs.map((seg, j) =>
      seg.termZh ? (
        <Text
          key={`${j}-${seg.termZh}`}
          onPress={() => {
            const term = getTermByZh(seg.termZh as string, tLocale)
            if (term) setActiveTerm(term)
          }}
          style={{
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            textDecorationColor: P.muted,
          }}
        >
          {seg.text}
        </Text>
      ) : (
        seg.text
      )
    )
  }
  const askParagraph = (para: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    ask?.onPickQuote(para)
  }

  return (
    <View style={S.paper}>
      <ScrollView contentContainerStyle={S.pageScroll} showsVerticalScrollIndicator={false}>
        {identityLine ? (
          <View style={S.detailIdentity}>
            <Text style={S.detailIdentityLine}>{renderProse(identityLine)}</Text>
            {birthBadge ? <Text style={S.detailBirth}>{birthBadge}</Text> : null}
            {timeCaveat ? <Text style={S.caveat}>{timeCaveat}</Text> : null}
          </View>
        ) : null}

        <View style={S.pageHead}>
          <SealNumeral n={n} />
          <Text style={S.detailHeaderSub}>{sub}</Text>
        </View>
        <Text style={S.detailLabel}>{label}</Text>

        {content ? (
          ask ? (
            // 划词 mode: each paragraph is long-pressable → raise the action bar.
            <View>
              {ask.askHint ? <Text style={S.askHint}>{ask.askHint}</Text> : null}
              {paragraphs.map((para, i) => {
                const isHighlighted = ask.highlightedQuotes.includes(para)
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
                    <Text style={[S.detailBody, S.paraBlock]}>{renderProse(para)}</Text>
                  </Pressable>
                )
              })}
              <Pressable
                onPress={() => ask.onAsk(null)}
                hitSlop={12}
                accessibilityRole='button'
                style={({ pressed }) => [S.askChapterBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={S.askChapterText}>{ask.askChapterLabel}</Text>
              </Pressable>
            </View>
          ) : (
            paragraphs.map((para, i) => (
              <Text key={i} style={[S.detailBody, S.paraBlock]}>
                {renderProse(para)}
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
        ) : teaser ? (
          // Deterministic free teaser — render the multi-paragraph prose as body.
          teaser.split('\n\n').map((para, i) => (
            <Text key={i} style={[S.detailBody, S.paraBlock]}>
              {renderProse(para)}
            </Text>
          ))
        ) : null}

        {/* 换视角 + 历史视角 — re-read in another voice / compare saved voices.
            Only on generated (unlocked) pages, under the prose. */}
        {content && onReroll && rerollLabel ? (
          <View style={S.chapterToolRow}>
            <Pressable
              onPress={onReroll}
              hitSlop={8}
              accessibilityRole='button'
              style={({ pressed }) => [S.rerollBtn, pressed && { opacity: 0.6 }]}
            >
              <RefreshCw size={13} color={P.bronze} strokeWidth={1.6} />
              <Text style={S.rerollText}>{rerollLabel}</Text>
            </Pressable>
            {onHistory && historyLabel ? (
              <Pressable
                onPress={onHistory}
                hitSlop={8}
                accessibilityRole='button'
                style={({ pressed }) => [S.rerollBtn, pressed && { opacity: 0.6 }]}
              >
                <Clock size={13} color={P.muted} strokeWidth={1.6} />
                <Text style={S.historyText}>{historyLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>
      <TermBubble
        term={activeTerm}
        onClose={() => setActiveTerm(null)}
        cjk={cjk}
        colors={{ bg: P.bg, ink: P.ink, inkSoft: P.inkSoft, muted: P.muted, cinnabar: P.cinnabar }}
      />
    </View>
  )
}

/* ── UnlockWall (trailing pager page) ───────────────────────────────── */

function UnlockWall({
  heading,
  lockedChapters,
  ctaLabel,
  onUnlock,
}: {
  heading: string
  lockedChapters: Array<{ title: string; line: string }>
  ctaLabel: string
  onUnlock: () => void
}) {
  return (
    <ScrollView contentContainerStyle={S.wallScroll} showsVerticalScrollIndicator={false}>
      <View style={S.wallRule} />
      <Text style={S.wallHeading}>{heading}</Text>
      <View style={S.wallList}>
        {lockedChapters.map((c, i) => (
          <View key={i} style={S.wallCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Lock size={13} color={P.muted} strokeWidth={1.6} />
              <Text style={S.wallCardTitle}>{c.title}</Text>
            </View>
            {c.line ? (
              <Text style={S.wallCardLine} numberOfLines={2}>
                {c.line}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <Pressable
        onPress={onUnlock}
        accessibilityRole='button'
        style={({ pressed }) => [S.unlockBtn, S.wallCta, pressed && { opacity: 0.85 }]}
      >
        <Text style={S.unlockText}>{ctaLabel}</Text>
      </Pressable>
    </ScrollView>
  )
}

/* ── PageDots (chapter position) ────────────────────────────────────── */

function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={S.dots} pointerEvents='none'>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[S.dot, i === index && S.dotActive]} />
      ))}
    </View>
  )
}

/* ── styles ─────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.bg },
  // Paper-backed so the masked report reads as 宣纸 inside ReportBloom's dark surround.
  safe: { flex: 1, backgroundColor: P.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: P.bronze, fontSize: 11, letterSpacing: 4, fontWeight: '300' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  // Quiet close — top-left over the clean report (the OS edge-swipe also pops).
  closeBtn: {
    position: 'absolute',
    top: 6,
    left: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyBody: { paddingHorizontal: 24, paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyText: { color: P.inkSoft, fontSize: 15, lineHeight: 23, textAlign: 'center' },

  caveat: { color: P.muted, fontSize: 10, marginBottom: 4 },

  skeleton: { gap: 12 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: P.hairSoft, width: '100%' },

  unlockBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: P.cinnabar,
    borderRadius: 22,
  },
  unlockText: { color: P.ctaText, fontSize: 13, fontWeight: '600', letterSpacing: 3 },

  // ── chapter page ──
  pageScroll: { paddingHorizontal: 32, paddingTop: 52, paddingBottom: 24 },
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  detailHeaderSub: { color: P.bronze, fontSize: 10, letterSpacing: 3, fontWeight: '600' },
  detailIdentity: { marginBottom: 24 },
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

  // ── unlock wall (trailing page) ──
  wallScroll: { paddingHorizontal: 32, paddingTop: 64, paddingBottom: 48 },
  wallRule: { width: 40, height: 2, backgroundColor: P.cinnabar, marginBottom: 24 },
  wallHeading: { color: P.bronze, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  wallList: { gap: 12, marginTop: 24, marginBottom: 40 },
  wallCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.hair,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  wallCardTitle: { color: P.ink, fontSize: 15, letterSpacing: 0.3 },
  wallCardLine: { color: P.muted, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  wallCta: { alignSelf: 'stretch', marginTop: 0 },

  // ── page dots ──
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.hair },
  dotActive: { backgroundColor: P.cinnabar },

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

  // 换视角 + 历史视角 entries
  chapterToolRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 36 },
  rerollBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  rerollText: { color: P.bronze, fontSize: 13, letterSpacing: 1 },
  historyText: { color: P.muted, fontSize: 13, letterSpacing: 1 },

  // 历史视角 compare view
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  historyTitle: { color: P.bronze, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  historyPageScroll: { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 24 },
  historyVoice: {
    color: P.cinnabar,
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 22,
    textTransform: 'uppercase',
  },

  // 换视角 picker (bottom sheet)
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: P.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.hair,
    marginBottom: 18,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: { color: P.ink, fontSize: 20, letterSpacing: 1 },
  sheetRemaining: { color: P.bronze, fontSize: 12, letterSpacing: 0.5 },
  sheetSubtitle: { color: P.muted, fontSize: 13, lineHeight: 19 },
  voiceCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.hair,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  voiceLabel: { color: P.ink, fontSize: 16, letterSpacing: 0.5 },
  voiceDesc: { color: P.muted, fontSize: 13, lineHeight: 18 },

  // regen veil + soft notice
  rerollVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,18,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rerollVeilText: { color: P.bg, fontSize: 15, letterSpacing: 1 },
  noticeBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: kindredDark.bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  noticeText: { color: P.bg, fontSize: 13, lineHeight: 19, textAlign: 'center' },
})
