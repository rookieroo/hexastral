/**
 * MonthlyFortune — the 本月运势 (this-month forecast) block.
 *
 * Two layers on one paper card:
 *   - the deterministic taste (composeMonthlyFortune) — free, instant, offline, and
 *     self-refreshing as the 流月 turns;
 *   - for Pro, a "深读本月" affordance that fetches an LLM depth expanding the same
 *     grounding (P6b), cached per month + chart so it paints instantly on a revisit.
 *
 * Lives in its own screen (app/(reading)/month.tsx), reached from the home doorway —
 * it used to sit inside the 当前大运 chapter, which buried it four pages deep (2026-06).
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { composeMonthlyFortune } from '@zhop/scenario-yuan/monthly-fortune'
import { Moon } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Locale } from '@/components/reading/reading-i18n'
import {
  fetchMonthlyDepth,
  getCachedMonthlyDepth,
  type MonthlyDepth,
} from '@/lib/solo/monthly-depth'
import type { FateNatalChart } from '@/lib/solo/natal'

const P = kindredPaper

const FORTUNE_KICKER: Record<string, string> = {
  en: 'THIS MONTH',
  zh: '本月运势',
  'zh-Hant': '本月運勢',
  ja: '今月の運勢',
}

/** Copy for the Pro 流年深读 affordance + its section labels. */
const DEPTH_UI_EN = {
  cta: 'Read deeper',
  loading: 'Reading this month…',
  failed: 'Couldn’t load the deep read — tap to retry',
  advice: 'DO',
  watch: 'WATCH',
}

const DEPTH_UI: Record<string, typeof DEPTH_UI_EN> = {
  en: DEPTH_UI_EN,
  zh: {
    cta: '深读本月',
    loading: '正在深读本月…',
    failed: '深读加载失败，点按重试',
    advice: '宜',
    watch: '忌',
  },
  'zh-Hant': {
    cta: '深讀本月',
    loading: '正在深讀本月…',
    failed: '深讀載入失敗，點按重試',
    advice: '宜',
    watch: '忌',
  },
  ja: {
    cta: '今月を深読み',
    loading: '今月を深読み中…',
    failed: '深読みの取得に失敗しました。タップで再試行',
    advice: '吉',
    watch: '注意',
  },
}

export function MonthlyFortune({
  chart,
  locale,
  isPro,
  chartHash,
  onNeedPro,
}: {
  chart: FateNatalChart
  locale: Locale
  isPro: boolean
  chartHash: string
  onNeedPro: () => void
}) {
  const fortune = composeMonthlyFortune({ chart, locale })
  const du = DEPTH_UI[locale] ?? DEPTH_UI_EN
  // Fixed tag column so the 宜/忌 (DO/WATCH) labels share one width and the advice
  // text in both rows starts at the same x — the longest label is en "WATCH".
  const tagWidth = locale === 'en' ? 56 : locale === 'ja' ? 34 : 22

  const [depth, setDepth] = useState<MonthlyDepth | null>(null)
  const [depthLoading, setDepthLoading] = useState(false)
  const [depthFailed, setDepthFailed] = useState(false)

  // Cache-first: a depth generated earlier this month (in THIS language) paints
  // instantly. Keyed by locale so an en device never shows a previously-cached zh depth.
  useEffect(() => {
    if (!isPro || !chartHash) return
    let cancelled = false
    void getCachedMonthlyDepth(chartHash, fortune.monthKey, locale).then((d) => {
      // Always set (null clears a stale other-locale depth on a language switch).
      if (!cancelled) setDepth(d)
    })
    return () => {
      cancelled = true
    }
  }, [isPro, chartHash, fortune.monthKey, locale])

  const loadDepth = () => {
    if (depthLoading) return
    setDepthLoading(true)
    setDepthFailed(false)
    void fetchMonthlyDepth(chartHash, {
      monthKey: fortune.monthKey,
      monthLabel: fortune.monthLabel,
      ganZhi: fortune.ganZhi,
      element: fortune.element,
      headline: fortune.headline,
      body: fortune.body,
      locale,
    }).then((r) => {
      setDepthLoading(false)
      if (r.kind === 'ok') setDepth(r.depth)
      else if (r.kind === 'needs_pro') onNeedPro()
      else setDepthFailed(true)
    })
  }

  return (
    <View style={S.block}>
      <View style={S.head}>
        <Text style={S.kicker}>{FORTUNE_KICKER[locale] ?? FORTUNE_KICKER.en}</Text>
        <Text style={S.meta}>
          {fortune.monthLabel} · {fortune.ganZhi}
        </Text>
      </View>
      <Text style={S.headline}>{fortune.headline}</Text>
      {fortune.body.split('\n\n').map((para, i) => (
        <Text key={i} style={[S.body, i > 0 && { marginTop: 8 }]}>
          {para}
        </Text>
      ))}

      {/* 流年深读 (Pro) — the LLM depth, lazily fetched under the free taste. */}
      {isPro ? (
        depth ? (
          <View style={S.depthBlock}>
            <View style={S.depthRule} />
            <Text style={S.depthTitle}>{depth.title}</Text>
            <Text style={[S.body, { marginTop: 8 }]}>{depth.overview}</Text>
            {depth.themes.map((th, i) => (
              <View key={i} style={{ marginTop: 14 }}>
                <Text style={S.depthThemeLabel}>{th.label}</Text>
                <Text style={[S.body, { marginTop: 3 }]}>{th.body}</Text>
              </View>
            ))}
            <View style={S.depthAdviceRow}>
              <Text style={[S.depthTag, { width: tagWidth }]}>{du.advice}</Text>
              <Text style={S.depthAdviceText}>{depth.advice}</Text>
            </View>
            <View style={S.depthAdviceRow}>
              <Text style={[S.depthTag, S.depthTagWatch, { width: tagWidth }]}>{du.watch}</Text>
              <Text style={S.depthAdviceText}>{depth.watchFor}</Text>
            </View>
          </View>
        ) : depthLoading ? (
          <View style={[S.depthBlock, S.depthSkeleton]}>
            <Text style={S.depthCtaText}>{du.loading}</Text>
          </View>
        ) : (
          <Pressable
            onPress={loadDepth}
            hitSlop={8}
            accessibilityRole='button'
            style={({ pressed }) => [S.depthCta, pressed && { opacity: 0.6 }]}
          >
            <Moon size={13} color={P.cinnabar} strokeWidth={1.6} />
            <Text style={S.depthCtaText}>{depthFailed ? du.failed : du.cta}</Text>
          </Pressable>
        )
      ) : null}
    </View>
  )
}

const S = StyleSheet.create({
  block: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.hair,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: P.hairSoft,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kicker: { color: P.cinnabar, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  meta: { color: P.muted, fontSize: 10, letterSpacing: 1 },
  headline: { color: P.ink, fontSize: 18, letterSpacing: 1, marginBottom: 10 },
  body: { color: P.inkSoft, fontSize: 14, lineHeight: 23, letterSpacing: 0.2 },

  depthCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  depthCtaText: { color: P.cinnabar, fontSize: 13, letterSpacing: 0.8 },
  depthBlock: { marginTop: 18 },
  depthSkeleton: { opacity: 0.6 },
  depthRule: { width: 28, height: 1, backgroundColor: P.cinnabar, marginBottom: 14, opacity: 0.7 },
  depthTitle: { color: P.ink, fontSize: 16, letterSpacing: 0.8 },
  depthThemeLabel: { color: P.bronze, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  depthAdviceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 },
  depthTag: { color: P.cinnabar, fontSize: 12, letterSpacing: 1, fontWeight: '600' },
  depthTagWatch: { color: P.muted },
  depthAdviceText: { flex: 1, color: P.inkSoft, fontSize: 14, lineHeight: 22 },
})
