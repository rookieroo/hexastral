/**
 * 假如 — the personal forward-decision (what-if) screen.
 *
 * "假如我在未来某个窗口推进某件事，哪个时机最合？" Ranks the chart's next 12 流月 windows by
 * 喜用神 favorability + 十神 relation (composeWhatIf, deterministic + offline) and re-weights
 * them per "move" (事业 / 求财 / 学业 / 关系) — the move leans on its real 十神, the windows
 * are shared, exactly like the 合盘 make-if. Reached from the personal report's living-layer
 * FAB. Forward-only by design.
 */

import { kindredPaper } from '@zhop/hexastral-tokens/kindred'
import {
  composeWhatIf,
  type WhatIfFavor,
  type WhatIfRelation,
  type WhatIfWindow,
} from '@zhop/scenario-yuan/what-if'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type Locale, useReadingI18n } from '@/components/reading/reading-i18n'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'

const P = kindredPaper

type Move = 'career' | 'wealth' | 'study' | 'relationship'
const MOVES: readonly Move[] = ['career', 'wealth', 'study', 'relationship']

/** Each move leans on its real 十神; the windows (favorability) are shared. */
const MOVE_LEAN: Record<Move, Partial<Record<WhatIfRelation, number>>> = {
  career: { authority: 2, seal: 1 }, // 官杀承位 + 印贵人
  wealth: { wealth: 2, output: 1 }, // 财 + 食伤才华
  study: { seal: 2, output: 1 }, // 印契文 + 食伤
  relationship: { wealth: 1, self: 1 }, // 财 / 比劫
}

const COPY: Record<
  string,
  {
    title: string
    intro: string
    favorable: (el: string) => string
    best: string
    upcoming: string
    moves: Record<Move, string>
    favor: Record<WhatIfFavor, string>
    rel: Record<WhatIfRelation, string>
  }
> = {
  en: {
    title: 'What if',
    intro: 'Of the next 12 months, which windows lean your way for a move?',
    favorable: (el) => `Your favourable element is ${el}.`,
    best: 'BEST WINDOWS',
    upcoming: 'NEXT 12 MONTHS',
    moves: { career: 'Career', wealth: 'Money', study: 'Study', relationship: 'Relationship' },
    favor: { good: 'with you', guard: 'hold', mixed: 'mixed' },
    rel: {
      self: 'Self · allies',
      output: 'Expression',
      wealth: 'Drive · gain',
      authority: 'Standing',
      seal: 'Support',
    },
  },
  zh: {
    title: '假如',
    intro: '未来 12 个月，哪些窗口顺你的势？',
    favorable: (el) => `你的喜用是${el}。`,
    best: '最佳窗口',
    upcoming: '未来 12 个月',
    moves: { career: '事业', wealth: '求财', study: '学业', relationship: '关系' },
    favor: { good: '顺势', guard: '守成', mixed: '取舍' },
    rel: {
      self: '比劫 · 立身',
      output: '食伤 · 才华',
      wealth: '财 · 进取',
      authority: '官杀 · 承位',
      seal: '印 · 贵人',
    },
  },
  'zh-Hant': {
    title: '假如',
    intro: '未來 12 個月，哪些窗口順你的勢？',
    favorable: (el) => `你的喜用是${el}。`,
    best: '最佳窗口',
    upcoming: '未來 12 個月',
    moves: { career: '事業', wealth: '求財', study: '學業', relationship: '關係' },
    favor: { good: '順勢', guard: '守成', mixed: '取捨' },
    rel: {
      self: '比劫 · 立身',
      output: '食傷 · 才華',
      wealth: '財 · 進取',
      authority: '官殺 · 承位',
      seal: '印 · 貴人',
    },
  },
  ja: {
    title: 'もしも',
    intro: 'これからの12か月、動くなら順風はどの月？',
    favorable: (el) => `あなたの喜用は${el}。`,
    best: '好機',
    upcoming: '今後12か月',
    moves: { career: '仕事', wealth: '財', study: '学び', relationship: '関係' },
    favor: { good: '順風', guard: '守り', mixed: '取捨' },
    rel: {
      self: '比劫 · 自立',
      output: '食傷 · 才華',
      wealth: '財 · 進取',
      authority: '官殺 · 承位',
      seal: '印 · 貴人',
    },
  },
}

const favorColor = (f: WhatIfFavor) => (f === 'good' ? P.cinnabar : f === 'guard' ? P.muted : P.bronze)

export default function WhatIfScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t, locale } = useReadingI18n()
  const birth = useSelfBirth()
  const [move, setMove] = useState<Move>('career')

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

  const result = useMemo(() => (chart ? composeWhatIf({ chart, locale }) : null), [chart, locale])

  // Re-rank the shared windows by the selected move's 十神 lean (ties → earliest first).
  const ranked = useMemo(() => {
    if (!result) return []
    const lean = MOVE_LEAN[move]
    return result.windows
      .map((w) => ({ w, rank: w.score + (lean[w.relation] ?? 0) }))
      .sort((a, b) => b.rank - a.rank || a.w.monthKey.localeCompare(b.w.monthKey))
      .map((x) => x.w)
  }, [result, move])

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(reading)')
  }

  const c = COPY[locale] ?? COPY.en

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
        {chart && result ? (
          <>
            <Text style={S.title}>{c.title}</Text>
            <Text style={S.intro}>{c.intro}</Text>
            <Text style={S.favorable}>{c.favorable(result.favorableElement)}</Text>

            {/* Move chips — re-weight the shared windows. */}
            <View style={S.chipRow}>
              {MOVES.map((m) => {
                const on = m === move
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMove(m)}
                    hitSlop={6}
                    style={[S.chip, on && S.chipOn]}
                  >
                    <Text style={[S.chipText, on && S.chipTextOn]}>{c.moves[m]}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Best windows for the selected move. */}
            <Text style={[S.kicker, { marginTop: 28 }]}>{c.best}</Text>
            {ranked.slice(0, 3).map((w) => (
              <WindowCard key={w.monthKey} w={w} favorLabel={c.favor[w.favor]} relLabel={c.rel[w.relation]} highlight />
            ))}

            {/* The full forward strip in chronological order. */}
            <Text style={[S.kicker, { marginTop: 28 }]}>{c.upcoming}</Text>
            <View style={S.strip}>
              {result.windows.map((w) => (
                <View key={w.monthKey} style={S.stripRow}>
                  <View style={[S.dot, { backgroundColor: favorColor(w.favor) }]} />
                  <Text style={S.stripMonth}>{w.monthLabel}</Text>
                  <Text style={S.stripGz}>{w.ganZhi}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[S.stripFavor, { color: favorColor(w.favor) }]}>
                    {c.favor[w.favor]}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ height: 60 }} />
          </>
        ) : (
          <Text style={S.empty}>{t('reading.needBirth')}</Text>
        )}
      </ScrollView>
    </View>
  )
}

function WindowCard({
  w,
  favorLabel,
  relLabel,
  highlight,
}: {
  w: WhatIfWindow
  favorLabel: string
  relLabel: string
  highlight?: boolean
}) {
  return (
    <View style={[S.card, highlight && { borderColor: `${P.cinnabar}55` }]}>
      <View style={S.cardHead}>
        <Text style={S.cardMonth}>{w.monthLabel}</Text>
        <Text style={[S.cardFavor, { color: favorColor(w.favor) }]}>{favorLabel}</Text>
      </View>
      <View style={S.cardBody}>
        <Text style={[S.cardGz, w.favor === 'good' && { color: P.cinnabar }]}>{w.ganZhi}</Text>
        <Text style={S.cardEl}>
          {w.element} · {relLabel}
        </Text>
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

  title: { color: P.ink, fontSize: 30, letterSpacing: 2, marginBottom: 12 },
  intro: { color: P.inkSoft, fontSize: 15, lineHeight: 23 },
  favorable: { color: P.muted, fontSize: 12, letterSpacing: 0.5, marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.hair,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  chipOn: { backgroundColor: P.cinnabar, borderColor: P.cinnabar },
  chipText: { color: P.inkSoft, fontSize: 13, letterSpacing: 0.5 },
  chipTextOn: { color: P.ctaText },

  kicker: { color: P.cinnabar, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.hair,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: P.hairSoft,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardMonth: { color: P.inkSoft, fontSize: 13, letterSpacing: 0.5 },
  cardFavor: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  cardBody: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 8 },
  cardGz: { color: P.ink, fontSize: 24, letterSpacing: 2 },
  cardEl: { color: P.muted, fontSize: 12, letterSpacing: 0.5 },

  strip: { gap: 2 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stripMonth: { color: P.inkSoft, fontSize: 13, width: 96 },
  stripGz: { color: P.ink, fontSize: 15, letterSpacing: 1 },
  stripFavor: { fontSize: 11, letterSpacing: 1 },
})
