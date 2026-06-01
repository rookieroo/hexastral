/**
 * FlyingStarsGrid — 3×3 玄空 palace plate.
 *
 * Phase H · F3 Bucket B. Renders the 9 palaces in 洛书 layout with each
 * palace's mountain (山) / facing (水) / annual (流年) stars stacked as
 * numerals. Background tint is driven by `classifyStar` over the user's
 * `currentYuanYun`, so 当令/生气 palaces read warm and 死气/煞气 palaces
 * read cool — matching the synthesis-prompt's 旺/退/死 framing.
 *
 * The compute payload comes from `FengReport.compute.flyingStars`; the
 * report screen passes that subtree directly via `result`.
 *
 * Layout (洛书):
 *   ┌─────┬─────┬─────┐
 *   │  巽 │  离 │  坤 │  ← top row  (4 / 9 / 2)
 *   ├─────┼─────┼─────┤
 *   │  震 │  中 │  兑 │  ← middle   (3 / 5 / 7)
 *   ├─────┼─────┼─────┤
 *   │  艮 │  坎 │  乾 │  ← bottom   (8 / 1 / 6)
 *   └─────┴─────┴─────┘
 *
 * Caller owns sizing and outer padding; component fills its container width
 * and computes height from it (square aspect).
 */

import {
  type BaguaPalace,
  classifyStar,
  type FlyingStarsResult,
  type StarQuality,
} from '@zhop/astro-core'
import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

/** 洛书 layout — order matches the 3×3 grid top-to-bottom, left-to-right. */
const LUOSHU_ORDER: ReadonlyArray<BaguaPalace | '中'> = [
  '巽',
  '离',
  '坤',
  '震',
  '中',
  '兑',
  '艮',
  '坎',
  '乾',
]

const QUALITY_TINT: Record<StarQuality, string> = {
  当令: 'rgba(176, 141, 91, 0.32)', // copper, strongest
  生气: 'rgba(176, 141, 91, 0.18)', // copper, mid
  退气: 'rgba(168, 159, 142, 0.14)', // rice mute, neutral
  死气: 'rgba(60, 70, 80, 0.10)', // ink, cool
  煞气: 'rgba(155, 34, 38, 0.18)', // cinnabar, warning
}

const QUALITY_LABEL: Record<StarQuality, string> = {
  当令: '旺',
  生气: '生',
  退气: '退',
  死气: '死',
  煞气: '煞',
}

const STAR_COLORS = {
  mountain: '#0F1E26', // ink teal — solid bone
  facing: '#9B2226', // cinnabar — flowing
  annual: '#B08D5B', // copper gold — the year's overlay
} as const

export interface FlyingStarsGridProps {
  /** The full compute result. Component reads combined + currentYuanYun. */
  result: FlyingStarsResult
  /** Surface background tint for the outer card. */
  backgroundColor?: string
  /** Hairline border / divider color. */
  borderColor?: string
  /** Label color for palace names. */
  labelColor?: string
}

function PalaceCell({
  palace,
  data,
  yuanYun,
  borderColor,
  labelColor,
}: {
  palace: BaguaPalace | '中'
  data: FlyingStarsResult['combined'][BaguaPalace | '中']
  yuanYun: FlyingStarsResult['currentYuanYun']['yuanYun']
  borderColor: string
  labelColor: string
}) {
  // 中宫 isn't classified the same way — show neutral. Other palaces classify
  // by the *facing* star (主宰 palace fortune in 玄空).
  const quality: StarQuality = palace === '中' ? '退气' : classifyStar(data.facing, yuanYun)
  return (
    <View
      style={[
        styles.cell,
        { borderColor, backgroundColor: QUALITY_TINT[quality] },
      ]}
    >
      <View style={styles.cellHeader}>
        <Text style={[styles.palaceLabel, { color: labelColor }]}>{palace}</Text>
        <Text style={[styles.qualityChip, { color: labelColor }]}>{QUALITY_LABEL[quality]}</Text>
      </View>
      <View style={styles.starsRow}>
        <Text style={[styles.star, { color: STAR_COLORS.mountain }]}>{data.mountain}</Text>
        <Text style={[styles.star, { color: STAR_COLORS.facing }]}>{data.facing}</Text>
        <Text style={[styles.star, { color: STAR_COLORS.annual }]}>{data.annual}</Text>
      </View>
    </View>
  )
}

const PalaceCellMemo = memo(PalaceCell)

export const FlyingStarsGrid = memo(function FlyingStarsGrid({
  result,
  backgroundColor = 'transparent',
  borderColor = 'rgba(176, 141, 91, 0.35)',
  labelColor = '#0F1E26',
}: FlyingStarsGridProps) {
  const yuanYun = result.currentYuanYun.yuanYun
  return (
    <View style={[styles.root, { backgroundColor, borderColor }]}>
      <View style={styles.grid}>
        {LUOSHU_ORDER.map((palace) => (
          <PalaceCellMemo
            key={palace}
            palace={palace}
            data={result.combined[palace]}
            yuanYun={yuanYun}
            borderColor={borderColor}
            labelColor={labelColor}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot color={STAR_COLORS.mountain} label='山' />
        <LegendDot color={STAR_COLORS.facing} label='向' />
        <LegendDot color={STAR_COLORS.annual} label='年' />
      </View>
    </View>
  )
})

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    aspectRatio: 1,
    borderWidth: 0.5,
    padding: 8,
    gap: 8,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '33.3333%',
    height: '33.3333%',
    borderWidth: 0.5,
    padding: 6,
    gap: 4,
    justifyContent: 'space-between',
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  palaceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  qualityChip: {
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.7,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  star: {
    fontSize: 18,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
})
