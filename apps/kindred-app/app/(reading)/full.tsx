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
 *   - Monetization: kindred Pro (lib/iap getYuanProStatus) + the /(commerce)/paywall
 *     route, in place of Yuun's auspice_pro + AuspicePaywallSheet.
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
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  dayMasterLabel,
  gejuLabel,
  type ReadingStringKey,
  shichenLabel,
  strengthLabel,
  useReadingI18n,
} from '@/components/reading/reading-i18n'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { getYuanProStatus } from '@/lib/iap'
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
  computeChartHash,
  fetchChapter,
  getCachedChapter,
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
 * The 4 premium chapters — each maps to a server report-chapter slug so a Pro
 * user generates real chart-grounded prose (parity with the free ch1/ch4);
 * non-Pro keeps the static teaser + paywall.
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

/** Targets the chapter detail view — null = list view. */
type ChapterRef = { kind: 'free'; key: 'ch1' | 'ch4' } | { kind: 'locked'; idx: 0 | 1 | 2 | 3 }

/** Free ChapterRef.key → server report-chapter slug (chat readingId grounding). */
const CHAPTER_SLUG: Record<'ch1' | 'ch4', string> = {
  ch1: 'ch1_personality',
  ch4: 'ch4_timeline',
}

export default function FullReadingScreen() {
  const router = useRouter()
  const { t, locale } = useReadingI18n()

  // Kindred has no reactive entitlement context (bond reports are server-gated);
  // the personal report gates client-side, so poll the IAP status once. Mirrors
  // the Yuun original's hasEntitlement(…, 'auspice_pro') boolean.
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
  }>()
  // Primitives so the seed effect doesn't re-run on each render (useLocalSearchParams
  // returns a fresh object every render).
  const { date, time, gender, city, lng, tz, clock, calibrate } = handoff
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
    // Free tier = the deterministic taste only (identity + computed chapter
    // summaries), no LLM. Non-Pro never fetches a chapter; the rows + detail fall
    // back to the computed placeholders and the chapter detail carries the
    // unlock CTA.
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

  // The chapter DETAIL is an in-screen sub-view (state), not a route — so the iOS
  // edge-swipe-back would pop the whole 命书 to the home, skipping the chapter
  // list. Intercept the route removal while a chapter is open and fold back to
  // the list instead; only the list view actually leaves the screen.
  const navigation = useNavigation()
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (activeChapter) {
        e.preventDefault()
        setActiveChapter(null)
      }
    })
    return sub
  }, [navigation, activeChapter])

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
  const openPaywall = () => {
    router.push({ pathname: '/(commerce)/paywall', params: { reason: 'chapters' } })
  }

  // 划词 AI chat: push the chat seeded with the chapter slug + (optionally) the
  // long-pressed paragraph as a quoted draft. lib/chat gates it under kindred_pro.
  const handleAskAI = ({ slug, quote }: { slug: string; quote: string | null }) => {
    router.push({
      pathname: '/(reading)/reading-chat',
      params: { slug, ...(quote ? { quote } : {}) },
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

  // Free placeholder = the deterministic teaser (composeTeaserNarrator), NOT a
  // "生成中…" string: it never generates for free, so we hand back real computed
  // 命理 prose. `loading` only ever flips true for Pro (the LLM fetch); a non-Pro
  // reader sees the teaser immediately.
  const ch1Meta = {
    label: t('reading.ch1Label'),
    sub: 'PERSONALITY',
    content: ch1?.content ?? null,
    loading: loading && !ch1,
    placeholder: teaser?.ch1 ?? t('reading.genAnalysis'),
  }
  const ch4Meta = {
    label: t('reading.ch4Label'),
    sub: 'CURRENT PERIOD',
    content: ch4?.content ?? null,
    loading: loading && !ch4,
    placeholder: teaser?.ch4 ?? t('reading.genAnalysis'),
  }

  /* ── detail view props (rendered as a slide-in overlay). ── */
  const detailChapter = activeChapter ?? lastActiveRef.current
  let detailProps: React.ComponentProps<typeof ChapterDetail> | null = null
  if (detailChapter) {
    const back = () => setActiveChapter(null)
    if (detailChapter.kind === 'free') {
      const key = detailChapter.key
      const m = key === 'ch1' ? ch1Meta : ch4Meta
      // Free → the deterministic placeholder + unlock CTA (no LLM). The 划词 chat
      // only attaches once a Pro user has the real generated chapter.
      const llm = m.content
      detailProps = {
        locale,
        label: m.label,
        sub: m.sub,
        content: llm,
        loading: m.loading,
        placeholder: m.placeholder,
        locked: !isPro,
        unlockLabel: t('reading.unlock'),
        backLabel: t('common.back'),
        onBack: back,
        onUnlock: openPaywall,
        identityLine,
        birthBadge,
        ...(llm
          ? {
              // 划词 AI chat (K3) — long-press a paragraph or tap the chapter CTA.
              onAsk: (quote: string | null) => handleAskAI({ slug: CHAPTER_SLUG[key], quote }),
              askChapterLabel: t('reading.askChapter'),
              askHint: t('reading.askParagraphHint'),
              onPickQuote: setPickedQuote,
              highlightedQuotes: highlights,
            }
          : {}),
      }
    } else {
      const lc = LOCKED_CHAPTERS[detailChapter.idx]
      if (lc) {
        const raw = isPro ? (premium[lc.slug]?.content ?? null) : null
        detailProps = {
          locale,
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
  locale,
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
  /** Reading locale — drives term-gloss explanation language + CJK font choice. */
  locale: string
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
  const cjk = isCjkLocale(locale)
  const tLocale = termLocale(locale)
  const [activeTerm, setActiveTerm] = useState<ResolvedTerm | null>(null)
  // Tap-to-explain (parity with the synastry ChapterCard): gloss 命理 terms in the
  // prose — 日主 / 用神 / 七杀 / 命宫 / 大运 … — each a soft dotted underline, a tap
  // opens its plain-language meaning in the reader's language. Non-CJK prose has no
  // Chinese tokens to match, so it renders verbatim.
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
              <Text style={S.detailIdentityLine}>{renderProse(identityLine)}</Text>
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
                      <Text style={[S.detailBody, S.paraBlock]}>{renderProse(para)}</Text>
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
          ) : placeholder ? (
            // A multi-paragraph placeholder is the deterministic free teaser
            // (composeTeaserNarrator) — render it as real body prose. A single
            // block is a premium chapter's short italic tease.
            placeholder.includes('\n\n') ? (
              placeholder.split('\n\n').map((para, i) => (
                <Text key={i} style={[S.detailBody, S.paraBlock]}>
                  {renderProse(para)}
                </Text>
              ))
            ) : (
              <Text style={S.detailPlaceholder}>{renderProse(placeholder)}</Text>
            )
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
      <TermBubble
        term={activeTerm}
        onClose={() => setActiveTerm(null)}
        cjk={cjk}
        colors={{ bg: P.bg, ink: P.ink, inkSoft: P.inkSoft, muted: P.muted, cinnabar: P.cinnabar }}
      />
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
