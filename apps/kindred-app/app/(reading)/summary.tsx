/**
 * Personal 命书 概要 (summary) — Yuel's concise, local-compute taste of the
 * personal reading. The Yuel/Yuun split: synastry (合盘) is Yuel's job; the FULL
 * personal 八字+紫微 命书 (chaptered LLM deep-read + 划词 chat) lives in Yuun. Yuel
 * keeps only this 概要 — identity + a deterministic personality teaser + what the
 * full book covers — and a CTA that hands off to Yuun for the rest.
 *
 * Everything here is pure client compute (no LLM, no network), so it's free and
 * instant. The "完整命书 →" CTA opens `auspice://reading` (App Store if Yuun isn't
 * installed — the 概要 already delivered value, so the store hop is an upsell, not
 * a wall). Reached from the home's self-star and from Settings.
 */

import type { WuXing } from '@zhop/astro-core'
import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  dayMasterLabel,
  elementLabel,
  gejuLabel,
  shichenLabel,
  strengthLabel,
  useReadingI18n,
} from '@/components/reading/reading-i18n'
import { openAuspiceReading } from '@/lib/auspice-handoff'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart } from '@/lib/solo/natal'
import { analyzeDayunRelation, computeDayunChain, parseBirthInput } from '@/lib/solo/reading'
import { computeZiweiChart } from '@/lib/solo/ziwei'

const P = kindredPaper

/** The full 命书's six chapters — listed here as a teaser of what Yuun unlocks. */
/** The 命书's chapters — a teaser of what the full book in Yuun covers. NOTE:
 *  Relationships is intentionally omitted here — that's Yuel's own turf (synastry
 *  合盘), so the personal-report TOC doesn't advertise a competing chapter. */
const CHAPTER_LABEL_KEYS = [
  'reading.ch1Label',
  'reading.lcCareerLabel',
  'reading.ch4Label',
  'reading.lcHiddenLabel',
  'reading.lcActionLabel',
] as const

export default function ReadingSummaryScreen() {
  const router = useRouter()
  const birth = useSelfBirth()
  const { t, locale } = useReadingI18n()

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

  const dayunActive = useMemo(() => {
    if (!chart || !birth) return null
    try {
      const bd = parseBirthInput(birth.solarDate, birth.timeIndex ?? 0)
      const { steps, currentVisibleIndex } = computeDayunChain(bd, birth.gender)
      const active = steps[currentVisibleIndex] ?? steps[0] ?? null
      const relation = active ? analyzeDayunRelation(active, chart.dayMaster) : null
      return active ? { active, relation } : null
    } catch {
      return null
    }
  }, [chart, birth])

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(reading)')
  }

  const openFull = () => {
    void openAuspiceReading(
      birth
        ? {
            solarDate: birth.solarDate,
            timeIndex: birth.timeIndex,
            gender: birth.gender,
            city: birth.city,
            lng: birth.lng,
            timezone: birth.timezone,
            clockMinutes: birth.clockMinutes,
            calibrate: birth.calibrate,
          }
        : null
    )
  }

  // Loading / no-birth → send to the self form (Yuel's onboarding self step).
  if (birth === undefined) {
    return <View style={S.paper} />
  }
  if (birth === null || !chart) {
    return (
      <View style={S.paper}>
        <SafeAreaView style={S.safe} edges={['top']}>
          <Header onBack={goBack} title={t('reading.title')} backLabel={t('common.back')} />
          <View style={S.emptyBody}>
            <Text style={S.emptyText}>{t('reading.needBirth')}</Text>
            <Pressable
              style={({ pressed }) => [S.cta, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(onboarding)/self')}
            >
              <Text style={S.ctaText}>{t('reading.goSetBirth')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const ziweiMing = ziwei?.palaces.find((p) => p.name === '命宫')
  const ziweiLabel = ziweiMing?.majorStars.map((s) => s.name).join(' ') ?? ''
  const timeIndex = birth.timeIndex ?? null
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
  const currentPeriodTeaser = dayunActive?.active
    ? t('reading.dayunActive', {
        gz: `${dayunActive.active.ganZhi.stem}${dayunActive.active.ganZhi.branch}`,
        start: dayunActive.active.startAge,
        end: dayunActive.active.endAge,
      }) + (dayunActive.relation ? ` · ${dayunActive.relation.label}` : '')
    : null

  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <Header onBack={goBack} title={t('reading.title')} backLabel={t('common.back')} />
        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          <Text style={S.identity}>{identityLine}</Text>
          <Text style={S.birth}>{birthBadge}</Text>

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
            <Text style={S.ctaText}>{t('reading.openFullInYuun')}</Text>
          </Pressable>
          <Text style={S.ctaHint}>{t('reading.fullInYuunHint')}</Text>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function Header({
  onBack,
  title,
  backLabel,
}: {
  onBack: () => void
  title: string
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
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 24 },

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
  ctaHint: { color: P.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 10 },
})
