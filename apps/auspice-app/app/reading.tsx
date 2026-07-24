/**
 * Yuun (auspice) personal 命书 概要 (summary) — Yuun's concise, local-compute taste
 * of the personal reading. Phase 2 of the Yuel/Yuun split: the FULL 6-chapter
 * 八字+紫微 命书 (chaptered LLM deep-read + 划词 chat) moved to Yuel. Yuun keeps only
 * this 概要 — identity + a deterministic personality teaser + the current period +
 * what the full book covers — and a CTA that hands off to Yuel for the rest.
 *
 * Everything here is pure client compute (no LLM, no network, no paywall), so it's
 * free and instant. The "深读你的命书 →" CTA opens `yuel://reading` (App Store if
 * Yuel isn't installed — the 概要 already delivered value, so the store hop is an
 * upsell, not a wall). Reached from the home action card and the Me tab.
 *
 * Birth: `getAuspiceBirthInfo()` (lib/birth) — async-loaded into state, with an
 * optional `gender` (so the screen guards a birth that hasn't filled in gender yet
 * and routes the user to Me). The `yuel://reading` deep-link seeding is retained
 * (harmless) so a Yuel hand-off that lands here still renders the same chart.
 */

import type { WuXing } from '@zhop/astro-core'
import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  type AuspiceBirthInfo,
  getAuspiceBirthInfo,
  type ShichenIndex,
  setAuspiceBirthInfo,
} from '@/lib/birth'
import type { Locale as AppLocale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { openKindredReading } from '@/lib/kindred-handoff'

/* ── palette — the shared 宣纸 document layer (kindredPaper): paper ground, dark
   ink body, bronze section accent, cinnabar seal. The SAME tokens Yuel's report
   uses, so the Yuun 概要 presents as the identical hand-set document. */
const P = kindredPaper

/** Auspice locale → the reading engine's narrower locale set (zh-Hans → zh). */
function toReadingLocale(l: AppLocale): ReadingLocale {
  return l === 'zh-Hans' ? 'zh' : l
}

/** The full 命书's chapters — listed here as a teaser of what Yuel unlocks. */
const CHAPTER_LABEL_KEYS = [
  'reading.ch1Label',
  'reading.lcCareerLabel',
  'reading.ch4Label',
  'reading.lcHiddenLabel',
  'reading.lcActionLabel',
] as const satisfies ReadonlyArray<ReadingStringKey>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Build an AuspiceBirthInfo from a `yuel://reading?...` hand-off. Yuel passes
 * the user's own birth so Yuun renders the same chart without re-entry; we only
 * seed Yuun's store when it's empty (Yuun stays authoritative once set). Returns
 * null when the hand-off carries no usable date.
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

export default function ReadingScreen() {
  const router = useRouter()
  const { locale: appLocale } = useStrings()
  const locale = toReadingLocale(appLocale)
  const { t } = useReadingI18n(locale)

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
        // No Yuun birth yet — seed from the hand-off (and persist, so the next
        // Yuun open already has it). Yuun stays authoritative once set.
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

  // Robust back: this screen is also reached via the `yuel://reading` deep link
  // from Yuel, where there's no history to pop — go to the home instead of a
  // no-op `back()` ("GO_BACK was not handled by any navigator").
  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }

  // The 概要 already delivered value locally; the FULL 命书 lives in Yuel, so the
  // CTA hands the user (and their birth, to skip re-entry) over to Yuel.
  const openFull = () => {
    void openKindredReading(birth ?? null)
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
              style={({ pressed }) => [S.cta, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(tabs)/me')}
            >
              <Text style={S.ctaText}>{t('reading.goSetBirth')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  /* ── display (deterministic, local) ── */
  const ziweiMing = ziwei?.palaces.find((pl) => pl.name === '命宫')
  const ziweiLabel = ziweiMing?.majorStars.map((s) => s.name).join(' ') ?? ''
  const birthBadge = `${birth.solarDate} · ${
    timeIndex != null ? shichenLabel(timeIndex, locale) : t('birth.timeUnknown')
  }`

  const identityLine =
    `${dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale)} · ${gejuLabel(chart.geju.primary, locale)} · ${t('label.self', { s: strengthLabel(chart.geju.dayMasterStrength, locale) })}` +
    (ziweiLabel ? ` · ${t('label.soulPalaceInline', { stars: ziweiLabel })}` : '')

  // Deterministic personality teaser (the same template the full ch1 falls back to).
  const personalityTeaser = t('reading.ch1Placeholder', {
    stem: chart.dayMaster,
    el: elementLabel(chart.dayMasterWuXing as WuXing, locale),
    geju: gejuLabel(chart.geju.primary, locale),
    soul: ziweiLabel ? t('reading.soulPalaceClause', { stars: ziweiLabel }) : '',
  })
  const currentPeriodTeaser = dayunInfo?.active
    ? t('reading.dayunActive', {
        gz: `${dayunInfo.active.ganZhi.stem}${dayunInfo.active.ganZhi.branch}`,
        start: dayunInfo.active.startAge,
        end: dayunInfo.active.endAge,
      }) + (dayunInfo.relation ? ` · ${dayunInfo.relation.label}` : '')
    : null

  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <Header title={t('reading.title')} onBack={goBack} backLabel={t('common.back')} />
        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          <Text style={S.identity}>{identityLine}</Text>
          <Text style={S.birth}>{birthBadge}</Text>
          {timeIndex == null ? <Text style={S.caveat}>{t('reading.timeUnknownEst')}</Text> : null}

          {/* Deterministic taste — who you are + your current period. */}
          <Text style={S.teaserLabel}>{t('reading.ch1Label')}</Text>
          <Text style={S.teaserBody}>{personalityTeaser}</Text>

          {currentPeriodTeaser ? (
            <>
              <Text style={S.teaserLabel}>{t('reading.ch4Label')}</Text>
              <Text style={S.teaserBody}>{currentPeriodTeaser}</Text>
            </>
          ) : null}

          {/* What the full 命书 covers — a numbered contents list, the upsell. */}
          <Text style={S.tocKicker}>{t('reading.moreChapters')}</Text>
          <View style={S.tocList}>
            {CHAPTER_LABEL_KEYS.map((k, i) => (
              <View key={k} style={S.tocRow}>
                <Text style={S.tocNum}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={S.tocLabel}>{t(k)}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [S.cta, pressed && { opacity: 0.85 }]}
            onPress={openFull}
          >
            <Text style={S.ctaText}>{t('reading.openFullInYuel')}</Text>
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
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

/* ── styles ─────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.bg },
  safe: { flex: 1 },

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

  identity: { color: P.inkSoft, fontSize: 13, letterSpacing: 1, marginBottom: 4, lineHeight: 20 },
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  caveat: { color: P.muted, fontSize: 10, marginBottom: 20 },

  teaserLabel: {
    color: P.bronze,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  teaserBody: { color: P.ink, fontSize: 16, lineHeight: 27 },

  tocKicker: {
    color: P.muted,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 36,
    marginBottom: 2,
  },
  tocList: { marginTop: 2 },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },
  tocNum: { color: P.bronze, fontSize: 12, letterSpacing: 1, minWidth: 20 },
  tocLabel: { color: P.ink, fontSize: 16, letterSpacing: 0.3, opacity: 0.9 },

  cta: {
    alignSelf: 'stretch',
    marginTop: 32,
    paddingVertical: 14,
    backgroundColor: P.cinnabar,
    borderRadius: 22,
    alignItems: 'center',
  },
  ctaText: { color: P.ctaText, fontSize: 14, fontWeight: '600', letterSpacing: 2 },
})
