/**
 * 流年 — the personal timeline screen (大运 arc + 本月运势).
 *
 * The home doorway beside "打开命书" opens this (it replaced the standalone 本月运势:
 * 本月运势 is the nearest slice of a longer 流年/大运 arc, so it lives here as the top
 * section). Also the destination of the personal report's living-layer Timeline disc.
 *
 * Deterministic + offline: the 大运 chain (computeDayunChain) and each step's 十神
 * framing (analyzeDayunRelation) are pure compute; 本月运势 carries the localised prose
 * (+ Pro 流年深读). Structural atoms (干支 · 年龄 · 年份) are language-neutral, so the
 * timeline reads correctly on any device locale.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MonthlyFortune } from '@/components/reading/MonthlyFortune'
import { type Locale, useReadingI18n } from '@/components/reading/reading-i18n'
import { getYuanProStatus } from '@/lib/iap'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import {
  analyzeDayunRelation,
  computeDayunChain,
  type DayunRelation,
  type DayunVisible,
  parseBirthInput,
} from '@/lib/solo/reading'
import { computeChartHash } from '@/lib/solo/reading-cache'

const P = kindredPaper

const KICKER: Record<string, { dayun: string; year: string }> = {
  en: { dayun: 'LIFE PHASES', year: 'YOUR YEAR' },
  zh: { dayun: '大运', year: '流年' },
  'zh-Hant': { dayun: '大運', year: '流年' },
  ja: { dayun: '大運', year: '流年' },
}

/** Short, localised 十神 framing per 大运 (the relation kind → a one-word tone). */
const REL_LABEL: Record<DayunRelation['kind'], Record<string, string>> = {
  self: { en: 'Self · allies', zh: '比劫 · 立身', 'zh-Hant': '比劫 · 立身', ja: '比劫 · 自立' },
  output: { en: 'Expression', zh: '食伤 · 才华', 'zh-Hant': '食傷 · 才華', ja: '食傷 · 才華' },
  wealth: { en: 'Drive · gain', zh: '财 · 进取', 'zh-Hant': '財 · 進取', ja: '財 · 進取' },
  authority: { en: 'Standing', zh: '官杀 · 承位', 'zh-Hant': '官殺 · 承位', ja: '官殺 · 承位' },
  seal: { en: 'Support', zh: '印 · 贵人', 'zh-Hant': '印 · 貴人', ja: '印 · 貴人' },
}

export default function TimelineScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t, locale } = useReadingI18n()
  const birth = useSelfBirth()

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

  const dayun = useMemo<DayunVisible[]>(() => {
    if (!birth) return []
    try {
      const bd = parseBirthInput(birth.solarDate, birth.timeIndex ?? 0)
      return computeDayunChain(bd, birth.gender).steps
    } catch {
      return []
    }
  }, [birth])

  const chartHash = useMemo(() => {
    if (!birth) return ''
    return computeChartHash(birth.solarDate, birth.timeIndex ?? 0, birth.gender)
  }, [birth])

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(reading)')
  }
  const openPaywall = () => {
    router.push({ pathname: '/(commerce)/paywall', params: { reason: 'reading' } })
  }

  const k = KICKER[locale] ?? KICKER.en

  return (
    <View style={S.paper}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole='button'
        accessibilityLabel={t('common.back')}
        style={[S.closeBtn, { top: insets.top + 6 }]}
      >
        <X size={22} color={P.muted} strokeWidth={1.5} />
      </Pressable>
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingTop: insets.top + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        {chart && birth ? (
          <>
            {/* 本月运势 — the nearest slice of the arc. */}
            <Text style={S.sectionKicker}>{k.year}</Text>
            <MonthlyFortune
              chart={chart}
              locale={locale}
              isPro={isPro}
              chartHash={chartHash}
              onNeedPro={openPaywall}
            />

            {/* 大运 arc — the long phases, current highlighted. */}
            {dayun.length > 0 ? (
              <View style={{ marginTop: 36 }}>
                <Text style={S.sectionKicker}>{k.dayun}</Text>
                <View style={S.rail}>
                  {dayun.map((step) => {
                    const kind = analyzeDayunRelation(step, chart.dayMaster).kind
                    const relLabel = REL_LABEL[kind][locale] ?? REL_LABEL[kind].en
                    return (
                      <DayunRow key={step.index} step={step} relLabel={relLabel} locale={locale} />
                    )
                  })}
                </View>
              </View>
            ) : null}
            <View style={{ height: 60 }} />
          </>
        ) : (
          <Text style={S.empty}>{t('reading.needBirth')}</Text>
        )}
      </ScrollView>
    </View>
  )
}

function DayunRow({
  step,
  relLabel,
  locale,
}: {
  step: DayunVisible
  relLabel: string
  locale: Locale
}) {
  const gz = `${step.ganZhi.stem}${step.ganZhi.branch}`
  const ages = `${step.startAge}–${step.endAge}`
  const years = `${step.startYear}–${step.endYear}`
  const agesSuffix = locale === 'en' ? '' : '岁'
  return (
    <View style={S.row}>
      <View style={S.dotCol}>
        <View style={[S.dot, step.isCurrent && S.dotCurrent]} />
        <View style={S.dotLine} />
      </View>
      <View style={[S.rowBody, step.isCurrent && S.rowBodyCurrent]}>
        <View style={S.rowHead}>
          <Text style={[S.gz, step.isCurrent && { color: P.cinnabar }]}>{gz}</Text>
          <Text style={S.ages}>
            {ages}
            {agesSuffix} · {years}
          </Text>
        </View>
        <Text style={S.relLabel}>{relLabel}</Text>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.bg },
  closeBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    elevation: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  empty: { color: P.inkSoft, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 40 },
  sectionKicker: {
    color: P.cinnabar,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // 大运 rail
  rail: { gap: 0 },
  row: { flexDirection: 'row', gap: 14 },
  dotCol: { alignItems: 'center', width: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6, backgroundColor: P.hair },
  dotCurrent: { backgroundColor: P.cinnabar },
  dotLine: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: P.hair },
  rowBody: { flex: 1, paddingBottom: 22 },
  rowBodyCurrent: {},
  rowHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  gz: { color: P.ink, fontSize: 22, letterSpacing: 2 },
  ages: { color: P.muted, fontSize: 11, letterSpacing: 0.5 },
  relLabel: { color: P.inkSoft, fontSize: 13, letterSpacing: 0.5, marginTop: 3 },
})
