/**
 * ChartAppendix — collapsible chart data with distinct 八字 and 紫微 sections.
 *
 * Ported from ming-pan-app/components/ChartAppendix.tsx per ADR-0021 K1 /
 * ADR-0022. Adaptations for kindred:
 *   - dark-only palette inlined from `@zhop/hexastral-tokens` (ricePaper/ink/
 *     cinnabar) + `kindred` tokens, replacing ming-pan's bespoke `C` cream
 *     palette (which was already a dark surface, so the mapping is near 1:1).
 *   - icons: ming-pan used `@zhop/hexastral-icons` (not a kindred dep); the
 *     collapse chevron is lucide-react-native `ChevronDown` (already used in
 *     kindred), and the 大运 domain glyph is dropped for a plain gold label.
 *   - i18n: reading-i18n.ts (this folder) instead of ming-pan's lib/i18n.
 *
 * Two sections, collapsed by default:
 *   1. 八字命盘 — four pillars, wuxing distribution, dayun timeline
 *   2. 紫微命盘 — key palaces with major stars and brightness
 */
import type { WuXing } from '@zhop/astro-core'
import { cinnabar, ink, ricePaper } from '@zhop/hexastral-tokens'
import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import type { FateNatalChart } from '../natal'
import type { DayunVisible, WuxingCount } from '../reading'
import type { ZiweiChart } from '../ziwei'
import type { Locale } from './reading-i18n'
import {
  dayMasterLabel,
  elementLabel,
  fiveElementsClassLabel,
  gejuLabel,
  palaceLabel,
  type ReadingStringKey,
  starArchetypeLabel,
  strengthLabel,
  useReadingI18n,
  usesStarArchetype,
} from './reading-i18n'

const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水']

/**
 * Key palaces to display in the ziwei summary, keyed by iztro's zh-CN palace
 * names. Note only 命宫 carries the 宫 suffix; the rest are bare.
 */
const KEY_PALACES = ['命宫', '夫妻', '财帛', '官禄', '福德'] as const

/** Four-pillar position → i18n key. */
const PILLAR_KEY: Record<'year' | 'month' | 'day' | 'hour', ReadingStringKey> = {
  year: 'pillar.year',
  month: 'pillar.month',
  day: 'pillar.day',
  hour: 'pillar.hour',
}

interface ChartAppendixProps {
  chart: FateNatalChart
  wuxingCount: WuxingCount
  maxElem: WuXing
  yongElem: WuXing
  dayunSteps: DayunVisible[]
  ziwei?: ZiweiChart | null
  /** Reader's locale — injected by the app (shared package never auto-resolves). */
  locale: Locale
}

export function ChartAppendix({
  chart,
  wuxingCount,
  maxElem,
  yongElem,
  dayunSteps,
  ziwei,
  locale,
}: ChartAppendixProps) {
  const { t } = useReadingI18n(locale)
  const archetype = usesStarArchetype(locale)
  const [expanded, setExpanded] = useState(false)
  const rotation = useSharedValue(0)

  const toggle = () => {
    setExpanded((prev) => !prev)
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 250 })
  }

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <View style={S.root}>
      <Pressable onPress={toggle} style={S.header} hitSlop={8}>
        <View style={S.headerLeft}>
          <Text style={S.headerLabel}>{t('appendix.title')}</Text>
          <Text style={S.headerSub}>CHART DATA</Text>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={18} color={C.muted} strokeWidth={1.4} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <View style={S.content}>
          {/* ════ 八字命盘 ════ */}
          <Text style={S.sectionTitle}>{t('appendix.bazi')}</Text>
          <Text style={S.sectionSub}>BAZI</Text>

          {/* 四柱 */}
          <View style={S.pillarsRow}>
            {(['year', 'month', 'day', 'hour'] as const).map((key) => {
              const gz = chart.pillars[key]
              const label = t(PILLAR_KEY[key])
              const god = key === 'day' ? t('label.dayMaster') : chart.shishen[key].name
              return (
                <View key={key} style={S.pillarCol}>
                  <Text style={S.pillarLabel}>{label}</Text>
                  <Text style={S.pillarGod}>{god}</Text>
                  <Text style={[S.pillarGz, key === 'day' && S.pillarGzDay]}>
                    {gz.stem}
                    {gz.branch}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* 日主 + 格局 */}
          <Text style={S.metaLine}>
            {t('appendix.metaLine', {
              dm: dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale),
              geju: gejuLabel(chart.geju.primary, locale),
              self: t('label.self', { s: strengthLabel(chart.geju.dayMasterStrength, locale) }),
            })}
          </Text>
          <Text style={S.metaSub}>
            {t('home.favorAvoid', {
              fav: elementLabel(chart.geju.favorableElement, locale),
              unfav: elementLabel(chart.geju.unfavorableElement, locale),
            })}
          </Text>

          {/* 五行 */}
          <Text style={[S.fieldLabel, { marginTop: 16 }]}>{t('appendix.wuxing')}</Text>
          <View style={S.wuxingCol}>
            {WUXING_ORDER.map((k) => {
              const n = wuxingCount[k]
              const total = Object.values(wuxingCount).reduce((s, v) => s + v, 0) || 1
              const pct = Math.round((n / total) * 100)
              const isMax = k === maxElem && k !== yongElem
              const isYong = k === yongElem
              const labelColor = isYong ? C.cinnabarLite : isMax ? C.gold : C.creamDim
              return (
                <View key={k} style={S.wxRow}>
                  <Text style={[S.wxLabel, { color: labelColor }]}>{elementLabel(k, locale)}</Text>
                  <View style={S.wxTrack}>
                    <View
                      style={[
                        S.wxFill,
                        { width: `${pct}%` },
                        isMax && S.wxFillMax,
                        isYong && S.wxFillYong,
                      ]}
                    />
                  </View>
                  <Text style={[S.wxNum, isYong && S.wxNumYong]}>{n}</Text>
                </View>
              )
            })}
          </View>

          {/* 大运 */}
          <Text style={[S.fieldLabel, { marginTop: 16 }]}>{t('appendix.dayun')}</Text>
          <View style={S.dayunRow}>
            {dayunSteps.map((n) => (
              <View key={`${n.index}`} style={S.dayunNode}>
                <Text style={[S.dayunGz, n.isCurrent && S.dayunGzNow]}>
                  {n.ganZhi.stem}
                  {n.ganZhi.branch}
                </Text>
                <View style={[S.dayunDot, n.isCurrent && S.dayunDotNow]} />
                <Text style={[S.dayunAge, n.isCurrent && S.dayunAgeNow]}>{n.startAge}</Text>
              </View>
            ))}
          </View>

          {/* ════ 紫微命盘 ════ */}
          {ziwei ? (
            <>
              <View style={S.sectionDivider} />
              <Text style={S.sectionTitle}>{t('appendix.ziwei')}</Text>
              <Text style={S.sectionSub}>ZIWEI</Text>

              <Text style={S.metaSub}>
                {fiveElementsClassLabel(ziwei.fiveElementsClass, locale)}
              </Text>

              <View style={S.palaceList}>
                {KEY_PALACES.map((name) => {
                  const palace = ziwei.palaces.find((p) => p.name === name)
                  if (!palace) return null
                  const stars = palace.majorStars
                    .map((s) =>
                      archetype
                        ? starArchetypeLabel(s.name, locale)
                        : `${s.name}${s.brightness ? `(${s.brightness})` : ''}`
                    )
                    .join(archetype ? ' · ' : ' ')
                  const isSoul = name === '命宫'
                  return (
                    <View key={name} style={S.palaceRow}>
                      <Text
                        style={[
                          S.palaceName,
                          isSoul && S.palaceNameSoul,
                          archetype && S.palaceNameEn,
                        ]}
                      >
                        {palaceLabel(name, locale)}
                      </Text>
                      <Text style={[S.palaceStars, isSoul && S.palaceStarsSoul]}>
                        {stars || '—'}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/* ── palette — kindred dark ink (ADR-0021 §5). Mapped from ming-pan's `C`
   cream palette onto the shared tokens: cream → ricePaper.ivory, gold →
   ink.gold, cinnabar → cinnabar.seal. ── */
const C = {
  cream: ricePaper.ivory,
  creamDim: 'rgba(245,240,232,0.65)',
  muted: 'rgba(245,240,232,0.45)',
  dim: 'rgba(245,240,232,0.28)',
  gold: ink.gold,
  cinnabar: cinnabar.seal,
  cinnabarLite: cinnabar.bright,
  hairline: 'rgba(245,240,232,0.12)',
  trackBg: 'rgba(245,240,232,0.08)',
} as const

/* ── styles ── */
const S = StyleSheet.create({
  root: { borderTopWidth: 0.5, borderTopColor: C.hairline, paddingTop: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLabel: { color: C.muted, fontSize: 14, letterSpacing: 2 },
  headerSub: { color: C.gold, fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },
  content: { marginTop: 16 },

  // section headers
  sectionTitle: { color: C.cream, fontSize: 16, letterSpacing: 2 },
  sectionSub: {
    color: C.gold,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionDivider: { height: 0.5, backgroundColor: C.hairline, marginVertical: 20 },
  fieldLabel: {
    color: C.gold,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 10,
  },

  // pillars
  pillarsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  pillarCol: { alignItems: 'center', gap: 3 },
  pillarLabel: { color: C.gold, fontSize: 10, letterSpacing: 2 },
  pillarGod: { color: C.muted, fontSize: 9 },
  pillarGz: { color: C.cream, fontSize: 20, fontWeight: '500' },
  pillarGzDay: { color: C.cinnabarLite, fontWeight: '600' },
  metaLine: { color: C.creamDim, fontSize: 13, letterSpacing: 0.5 },
  metaSub: { color: C.muted, fontSize: 12, marginTop: 4 },

  // wuxing
  wuxingCol: { gap: 6 },
  wxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wxLabel: { width: 44, fontSize: 11, letterSpacing: 0.3 },
  wxTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.trackBg,
    overflow: 'hidden',
  },
  wxFill: { height: 5, borderRadius: 3, backgroundColor: C.dim },
  wxFillMax: { backgroundColor: C.gold },
  wxFillYong: { backgroundColor: C.cinnabarLite },
  wxNum: { fontSize: 10, color: C.muted, width: 18, textAlign: 'right' },
  wxNumYong: { color: C.cinnabarLite, fontWeight: '600' },

  // dayun
  dayunRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  dayunNode: { alignItems: 'center', gap: 3 },
  dayunGz: { color: C.dim, fontSize: 10 },
  dayunGzNow: { color: C.gold, fontWeight: '600' },
  dayunDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: C.dim,
    backgroundColor: 'transparent',
  },
  dayunDotNow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cinnabar,
    borderColor: C.cinnabar,
  },
  dayunAge: { color: C.dim, fontSize: 8 },
  dayunAgeNow: { color: C.cinnabarLite, fontWeight: '600' },

  // ziwei palaces
  palaceList: { gap: 8, marginTop: 4 },
  palaceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  palaceName: { color: C.muted, fontSize: 11, width: 48, letterSpacing: 1 },
  palaceNameSoul: { color: C.gold, fontWeight: '600' },
  palaceNameEn: { width: 72, letterSpacing: 0 },
  palaceStars: { color: C.creamDim, fontSize: 12, flex: 1 },
  palaceStarsSoul: { color: C.cream },
})
