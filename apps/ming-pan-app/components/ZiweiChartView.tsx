import type { ModeTokens } from '@zhop/hexastral-tokens/palette'
import { StyleSheet, Text, View } from 'react-native'

import {
  fiveElementsClassLabel,
  palaceLabel,
  starArchetypeLabel,
  useI18n,
  usesStarArchetype,
} from '@/lib/i18n'
import type { ZiweiChart } from '@/lib/ziwei'

interface Props {
  chart: ZiweiChart
  colors: ModeTokens
}

/**
 * Clean, scannable 紫微 chart: an airy summary header over a single
 * hairline-divided list. Each palace is one compact row (name + 干支 on the
 * left, major stars inline on the right) instead of a bordered card per
 * palace — the dense per-card / chip-per-star layout read as cluttered.
 */
export function ZiweiChartView({ chart, colors }: Props) {
  const { t, locale } = useI18n()
  const archetype = usesStarArchetype(locale)
  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <Text style={[styles.fiveEl, { color: colors.text }]}>
          {fiveElementsClassLabel(chart.fiveElementsClass, locale)}
        </Text>
        {/* 命主/身主 are stars outside the 14 主星 set, so we omit them under en. */}
        {archetype ? null : (
          <Text style={[styles.soulBody, { color: colors.secondary }]}>
            {t('ziwei.soulBody', { soul: chart.soul, body: chart.body })}
          </Text>
        )}
      </View>

      <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.separator }]}>
        {chart.palaces.map((p, i) => {
          const isMing = p.name === '命宫'
          return (
            <View
              key={p.index}
              style={[
                styles.row,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.separator,
                },
              ]}
            >
              <View style={[styles.label, archetype && styles.labelEn]}>
                <Text style={[styles.name, { color: isMing ? colors.accent : colors.text }]}>
                  {palaceLabel(p.name, locale)}
                </Text>
                {p.isBodyPalace ? (
                  <Text style={[styles.tag, { color: colors.accent }]}>{t('ziwei.bodyTag')}</Text>
                ) : null}
              </View>
              <Text style={[styles.gz, { color: colors.dim }]}>
                {p.heavenlyStem}
                {p.earthlyBranch}
              </Text>
              <View style={styles.stars}>
                {p.majorStars.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.dim }]}>{t('ziwei.empty')}</Text>
                ) : (
                  p.majorStars.map((s) => (
                    <Text key={s.name} style={[styles.star, { color: colors.text }]}>
                      {archetype ? starArchetypeLabel(s.name, locale) : s.name}
                      {!archetype && s.brightness ? (
                        <Text style={{ color: colors.dim }}>{s.brightness}</Text>
                      ) : null}
                      {!archetype && s.mutagen ? (
                        <Text style={{ color: colors.accent }}>化{s.mutagen}</Text>
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

const styles = StyleSheet.create({
  root: { width: '100%' },
  summary: { alignItems: 'center', paddingVertical: 18, gap: 5 },
  fiveEl: { fontSize: 20, fontWeight: '600', letterSpacing: 1 },
  soulBody: { fontSize: 13, letterSpacing: 0.5 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 10 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 56 },
  labelEn: { width: 84 },
  name: { fontSize: 14, fontWeight: '600' },
  tag: { fontSize: 10, fontWeight: '600' },
  gz: { fontSize: 12, width: 30, paddingTop: 1 },
  stars: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  star: { fontSize: 14, fontWeight: '500' },
  empty: { fontSize: 13 },
})
