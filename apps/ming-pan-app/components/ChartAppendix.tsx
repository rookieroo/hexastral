/**
 * ChartAppendix — collapsible chart data with distinct 八字 and 紫微 sections.
 *
 * Two clear sections:
 *   1. 八字命盘 — four pillars, wuxing distribution, dayun timeline
 *   2. 紫微命盘 — key palaces with major stars and brightness
 *
 * Collapsed by default. Available for users who want the raw chart data.
 */
import type { WuXing } from '@zhop/astro-core'
import { ChevronDownIcon } from '@zhop/hexastral-icons/action'
import { DaYunIcon } from '@zhop/hexastral-icons/domain'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import {
  dayMasterLabel,
  elementLabel,
  fiveElementsClassLabel,
  palaceLabel,
  type StringKey,
  starArchetypeLabel,
  strengthLabel,
  useI18n,
  usesStarArchetype,
} from '@/lib/i18n'
import type { FateNatalChart } from '@/lib/natal'
import type { DayunVisible, WuxingCount } from '@/lib/reading'
import type { ZiweiChart } from '@/lib/ziwei'

const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水']

/**
 * Key palaces to display in the ziwei summary, keyed by iztro's zh-CN palace
 * names. Note only 命宫 carries the 宫 suffix; the rest are bare (an earlier
 * version matched 夫妻宫 / 财帛宫 etc. and silently rendered nothing).
 */
const KEY_PALACES = ['命宫', '夫妻', '财帛', '官禄', '福德'] as const

/** Four-pillar position → i18n key. */
const PILLAR_KEY: Record<'year' | 'month' | 'day' | 'hour', StringKey> = {
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
}

export function ChartAppendix({
  chart,
  wuxingCount,
  maxElem,
  yongElem,
  dayunSteps,
  ziwei,
}: ChartAppendixProps) {
  const { t, locale } = useI18n()
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
          <ChevronDownIcon size={18} color={C.muted} />
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
              geju: chart.geju.primary,
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
              const labelColor = isYong ? '#b06a4e' : isMax ? C.gold : C.creamDim
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
          <View style={[S.fieldRow, { marginTop: 16 }]}>
            <DaYunIcon size={13} color={C.gold} />
            <Text style={[S.fieldLabel, S.fieldLabelInRow]}>{t('appendix.dayun')}</Text>
          </View>
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

/* ── palette ── */
const C = {
  cream: '#E9E2D2',
  creamDim: '#b5ac9a',
  muted: '#8A8170',
  dim: '#5A5446',
  gold: '#C2A878',
  bronze: '#9b8c66',
  cinnabar: '#9B2226',
  hairline: 'rgba(233,226,210,0.12)',
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
  headerLabel: { color: C.muted, fontFamily: 'Songti SC', fontSize: 14, letterSpacing: 2 },
  headerSub: { color: C.gold, fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },
  content: { marginTop: 16 },

  // section headers
  sectionTitle: { color: C.cream, fontFamily: 'Songti SC', fontSize: 16, letterSpacing: 2 },
  sectionSub: {
    color: C.gold,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionDivider: {
    height: 0.5,
    backgroundColor: C.hairline,
    marginVertical: 20,
  },
  fieldLabel: {
    color: C.gold,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 10,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fieldLabelInRow: { marginBottom: 0 },

  // pillars
  pillarsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  pillarCol: { alignItems: 'center', gap: 3 },
  pillarLabel: { color: C.gold, fontSize: 10, letterSpacing: 2 },
  pillarGod: { color: C.muted, fontSize: 9 },
  pillarGz: { color: C.cream, fontFamily: 'Songti SC', fontSize: 20, fontWeight: '500' },
  pillarGzDay: { color: C.cinnabar, fontWeight: '600' },
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
    backgroundColor: 'rgba(233,226,210,0.08)',
    overflow: 'hidden',
  },
  wxFill: { height: 5, borderRadius: 3, backgroundColor: C.dim },
  wxFillMax: { backgroundColor: C.gold },
  wxFillYong: { backgroundColor: '#b06a4e' },
  wxNum: { fontSize: 10, color: C.muted, width: 18, textAlign: 'right' },
  wxNumYong: { color: C.cinnabar, fontWeight: '600' },

  // dayun
  dayunRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  dayunNode: { alignItems: 'center', gap: 3 },
  dayunGz: { color: C.dim, fontFamily: 'Songti SC', fontSize: 10 },
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
  dayunAgeNow: { color: C.cinnabar, fontWeight: '600' },

  // ziwei palaces
  palaceList: { gap: 8, marginTop: 4 },
  palaceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  palaceName: { color: C.muted, fontSize: 11, width: 48, letterSpacing: 1 },
  palaceNameSoul: { color: C.gold, fontWeight: '600' },
  palaceNameEn: { width: 72, letterSpacing: 0 },
  palaceStars: { color: C.creamDim, fontSize: 12, flex: 1 },
  palaceStarsSoul: { color: C.cream },
})
