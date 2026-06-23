/**
 * 本月 — the lightweight 本月运势 screen.
 *
 * Per ADR-0026, this is the SOLE living extension of Yuel's personal report: the
 * deterministic 本月运势 card + its Pro 本月深度 (流年深读). The interactive personal
 * timeline (大运 arc) and 假如 what-if were retired to 运 (Yuun), which owns the personal
 * life-map + decision engine; Yuel keeps only this monthly pulse. Reached from the home
 * doorway beside "打开命书".
 *
 * Deterministic + offline: 本月运势 carries the localised prose (+ Pro 本月深度).
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MonthlyFortune } from '@/components/reading/MonthlyFortune'
import { useReadingI18n } from '@/components/reading/reading-i18n'
import { getYuanProStatus } from '@/lib/iap'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import { computeChartHash } from '@/lib/solo/reading-cache'

const P = kindredPaper

const KICKER: Record<string, string> = {
  en: 'THIS MONTH',
  zh: '本月',
  'zh-Hant': '本月',
  ja: '今月',
}

export default function MonthScreen() {
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

  const kicker = KICKER[locale] ?? KICKER.en

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
            <Text style={S.sectionKicker}>{kicker}</Text>
            <MonthlyFortune
              chart={chart}
              locale={locale}
              isPro={isPro}
              chartHash={chartHash}
              onNeedPro={openPaywall}
            />
            <View style={{ height: 60 }} />
          </>
        ) : (
          <Text style={S.empty}>{t('reading.needBirth')}</Text>
        )}
      </ScrollView>
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
})
