/**
 * 本月深度 — Yuun's monthly pulse at the timeline HEAD (ADR-0026).
 *
 * The deterministic 本月运势 (composeMonthlyFortune — instant, offline, free) plus the
 * Pro 本月深度 deep-read: the one tangible LLM, borrowed from Yuel and rendered in Yuun's
 * dark idiom. Self-contained — loads the device birth, computes the chart, and fetches
 * the structured depth on tap via the shared @zhop/scenario-yuan client (lib/monthly-depth).
 * A MoonLoader covers the fetch; a cached depth paints instantly on revisit.
 */

import { useTheme } from '@zhop/core-ui'
import { composeMonthlyFortune } from '@zhop/scenario-yuan/monthly-fortune'
import { computeFateNatalChart, type FateNatalChart } from '@zhop/scenario-yuan/natal'
import { Moon } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceBirthInfo, getAuspiceBirthInfo } from '@/lib/birth'
import { fetchMonthlyDepth, getCachedMonthlyDepth, type MonthlyDepth } from '@/lib/monthly-depth'
import { MoonLoader } from './MoonLoader'

type Lc = 'en' | 'zh' | 'zh-Hant' | 'ja'
const asLc = (l: string): Lc => (l === 'zh' || l === 'zh-Hant' || l === 'ja' ? l : 'en')

const CTA: Record<Lc, { read: string; loading: string; failed: string }> = {
  en: { read: 'Read this month', loading: 'Reading…', failed: 'Tap to retry' },
  zh: { read: '深读本月', loading: '正在深读…', failed: '点按重试' },
  'zh-Hant': { read: '深讀本月', loading: '正在深讀…', failed: '點按重試' },
  ja: { read: '今月を深読み', loading: '深読み中…', failed: 'タップで再試行' },
}

export function MonthlyDepthCard({
  isPro,
  locale,
  onNeedPro,
}: {
  isPro: boolean
  locale: string
  onNeedPro: () => void
}) {
  const { colors } = useTheme()
  const lc = asLc(locale)
  const [birth, setBirth] = useState<AuspiceBirthInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void getAuspiceBirthInfo().then((b) => {
      if (!cancelled) setBirth(b)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const chart = useMemo<FateNatalChart | null>(() => {
    if (!birth?.gender) return null
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

  const fortune = useMemo(
    () => (chart ? composeMonthlyFortune({ chart, locale: lc }) : null),
    [chart, lc]
  )

  const chartHash = useMemo(
    () => (birth?.gender ? `${birth.solarDate}-${birth.timeIndex ?? 0}-${birth.gender}` : ''),
    [birth]
  )

  const [depth, setDepth] = useState<MonthlyDepth | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  // Paint a cached depth instantly on revisit (same chart + month + locale).
  useEffect(() => {
    if (!chartHash || !fortune) return
    void getCachedMonthlyDepth(chartHash, fortune.monthKey, lc).then((d) => {
      if (d) setDepth(d)
    })
  }, [chartHash, fortune, lc])

  const loadDepth = useCallback(async () => {
    if (!chart || !fortune || !birth?.gender || loading) return
    if (!isPro) {
      onNeedPro()
      return
    }
    setLoading(true)
    setFailed(false)
    const res = await fetchMonthlyDepth(
      chartHash,
      { ...fortune, locale: lc },
      {
        birthDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        gender: birth.gender,
        isPro: true,
        user: {
          dayMasterStem: chart.dayMaster,
          dayMasterStrength: chart.geju.dayMasterStrength,
          favorableElement: chart.geju.favorableElement,
          unfavorableElement: chart.geju.unfavorableElement,
        },
      }
    )
    setLoading(false)
    if (res.kind === 'ok') setDepth(res.depth)
    else if (res.kind === 'needs_pro') onNeedPro()
    else setFailed(true)
  }, [chart, fortune, birth, chartHash, lc, isPro, loading, onNeedPro])

  if (!fortune) return null
  const cta = CTA[lc]

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 18, gap: 10 }}>
      <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 1 }}>
        {fortune.monthLabel} · {fortune.ganZhi}
      </Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '500' }}>
        {fortune.headline}
      </Text>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, opacity: 0.85 }}>
        {fortune.body}
      </Text>

      {depth ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <View style={{ height: 1, backgroundColor: colors.dim, opacity: 0.25 }} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{depth.title}</Text>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, opacity: 0.85 }}>
            {depth.overview}
          </Text>
          {depth.themes.map((th) => (
            <View key={th.label} style={{ gap: 3 }}>
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '500' }}>
                {th.label}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, opacity: 0.8 }}>
                {th.body}
              </Text>
            </View>
          ))}
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, opacity: 0.85 }}>
            {depth.advice}
          </Text>
          <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20 }}>{depth.watchFor}</Text>
        </View>
      ) : loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <MoonLoader size={40} />
          <Text style={{ color: colors.dim, fontSize: 12, marginTop: 8 }}>{cta.loading}</Text>
        </View>
      ) : (
        <Pressable
          onPress={loadDepth}
          accessibilityRole='button'
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            marginTop: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Moon size={15} color={colors.accent} strokeWidth={1.7} />
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '500' }}>
            {failed ? cta.failed : cta.read}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
