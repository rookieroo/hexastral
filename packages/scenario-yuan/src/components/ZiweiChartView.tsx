/**
 * ZiweiChartView — clean, scannable 紫微 12-palace native chart.
 *
 * Ported from ming-pan-app per ADR-0021 / ADR-0022, then extracted to scenario-yuan
 * (Phase 0d). ming-pan passed a `colors` prop (it supports both modes); kindred had
 * inlined a dark-only palette. The shared component RESTORES the `colors` prop +
 * takes the reader's `locale`, so Yuel (dark) and Yuun bring their own theme + locale.
 *
 * Layout: an airy summary header (五行局 + 命主/身主) over a single hairline-divided
 * list. Each palace is one compact row (name + 干支 left, major stars inline right).
 */

import { ink } from '@zhop/hexastral-tokens'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ZiweiChart } from '../ziwei'
import type { Locale } from './reading-i18n'
import {
  fiveElementsClassLabel,
  palaceLabel,
  starArchetypeLabel,
  useReadingI18n,
  usesStarArchetype,
} from './reading-i18n'

/** The dark-surface colours the chart draws on — injected by the host app. */
export interface ZiweiChartColors {
  text: string
  textSecondary: string
  textMuted: string
  card: string
  separator: string
}

interface Props {
  chart: ZiweiChart
  /** Reader's locale — injected by the app (shared package never auto-resolves). */
  locale: Locale
  colors: ZiweiChartColors
}

export function ZiweiChartView({ chart, locale, colors }: Props) {
  const { t } = useReadingI18n(locale)
  const archetype = usesStarArchetype(locale)
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <Text style={styles.fiveEl}>{fiveElementsClassLabel(chart.fiveElementsClass, locale)}</Text>
        {/* 命主/身主 are stars outside the 14 主星 set, so we omit them under en. */}
        {archetype ? null : (
          <Text style={styles.soulBody}>
            {t('ziwei.soulBody', { soul: chart.soul, body: chart.body })}
          </Text>
        )}
      </View>

      <View style={styles.list}>
        {chart.palaces.map((p, i) => {
          const isMing = p.name === '命宫'
          return (
            <View key={p.index} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.label, archetype && styles.labelEn]}>
                <Text style={[styles.name, isMing && styles.nameMing]}>
                  {palaceLabel(p.name, locale)}
                </Text>
                {p.isBodyPalace ? <Text style={styles.tag}>{t('ziwei.bodyTag')}</Text> : null}
              </View>
              <Text style={styles.gz}>
                {p.heavenlyStem}
                {p.earthlyBranch}
              </Text>
              <View style={styles.stars}>
                {p.majorStars.length === 0 ? (
                  <Text style={styles.empty}>{t('ziwei.empty')}</Text>
                ) : (
                  p.majorStars.map((s) => (
                    <Text key={s.name} style={styles.star}>
                      {archetype ? starArchetypeLabel(s.name, locale) : s.name}
                      {!archetype && s.brightness ? (
                        <Text style={styles.starDim}>{s.brightness}</Text>
                      ) : null}
                      {!archetype && s.mutagen ? (
                        <Text style={styles.starAccent}>化{s.mutagen}</Text>
                      ) : null}
                    </Text>
                  ))
                )}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function makeStyles(c: ZiweiChartColors) {
  return StyleSheet.create({
    root: { width: '100%' },
    summary: { alignItems: 'center', paddingVertical: 18, gap: 5 },
    fiveEl: { color: c.text, fontSize: 20, fontWeight: '600', letterSpacing: 1 },
    soulBody: { color: c.textSecondary, fontSize: 13, letterSpacing: 0.5 },
    list: {
      backgroundColor: c.card,
      borderColor: c.separator,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 10 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    label: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 56 },
    labelEn: { width: 84 },
    name: { color: c.text, fontSize: 14, fontWeight: '600' },
    nameMing: { color: ink.gold },
    tag: { color: ink.gold, fontSize: 10, fontWeight: '600' },
    gz: { color: c.textMuted, fontSize: 12, width: 30, paddingTop: 1 },
    stars: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    star: { color: c.text, fontSize: 14, fontWeight: '500' },
    starDim: { color: c.textMuted },
    starAccent: { color: ink.gold },
    empty: { color: c.textMuted, fontSize: 13 },
  })
}
