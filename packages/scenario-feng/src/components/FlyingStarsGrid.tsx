/**
 * FlyingStarsGrid — 玄空飞星盘 (an ink 排盘 plate, not a flexbox grid).
 *
 * Phase H · F3 Bucket B, redesigned. Renders the 9 palaces in 洛书 layout
 * (南上 / 离 on top, the traditional 排盘 orientation) as a hand-inked square
 * plate on 宣纸. Each palace carries the canonical 挨星 arrangement:
 *
 *     山★            向★        ← the two 挨星 (mountain top-left, facing top-right)
 *          運              ← 地盘/元运 star, drawn as a faint watermark behind
 *       卦名      年        ← palace trigram + this year's 流年 overlay
 *
 * Star numerals are coloured by the 紫白九星 convention (muted for cream paper):
 * 1白水 6白金 8白土=auspicious, 7赤 9紫 warm, 2黑 5黄 ominous earth. 旺衰 (from
 * `classifyStar` over the reader's `currentYuanYun`) drives a subtle cell wash +
 * a 朱砂 corner mark on 煞气 palaces — so the plate reads 旺/退/死 at a glance
 * while staying legible ink-on-paper.
 *
 * The compute payload comes from `FengReport.compute.flyingStars`; the report
 * screen passes that subtree directly via `result`. Caller owns outer width;
 * the plate is square and the caption/legend stack beneath it.
 */

import {
  type BaguaPalace,
  classifyStar,
  type FlyingStarsResult,
  type StarQuality,
} from '@zhop/astro-core'
import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg'

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

// Zinc-tonal 九星 — fortune is encoded by BRIGHTNESS on the dark plate, not hue
// (紫白 rainbow dropped with the theme). Auspicious stars read bright; 凶 read
// dim; only the great 五黄 煞 carries the single reserved desaturated red.
const STAR9: Record<number, string> = {
  1: '#E4E4E7', // 一白 · 旺 → bright
  2: '#8A8083', // 二黑 · 病 → dim (warm-gray)
  3: '#C7CACF', // 三碧
  4: '#C7CACF', // 四绿
  5: '#B4726E', // 五黄 · 廉贞大煞 → the ONLY red
  6: '#E4E4E7', // 六白 · 金 → bright
  7: '#8A8083', // 七赤 · 破军 → dim
  8: '#FAFAFA', // 八白 · 财 → brightest
  9: '#EDECEF', // 九紫 · 喜 → bright
}

const INK = '#E4E4E7' // numerals / 卦名 on the dark plate
const CINNABAR = '#B4726E' // reserved 煞 mark (desaturated), NOT decorative
const COPPER = '#A1A1AA' // 流年 overlay — dim neutral

const QUALITY_WASH: Record<StarQuality, string> = {
  当令: 'rgba(250,250,250,0.07)', // brightest lift
  生气: 'rgba(250,250,250,0.035)',
  退气: 'rgba(0,0,0,0)',
  死气: 'rgba(0,0,0,0.10)', // sink into the ground
  煞气: 'rgba(180,114,110,0.10)', // the single danger tint
}

const QUALITY_TAG: Record<StarQuality, string> = {
  当令: '旺',
  生气: '生',
  退气: '退',
  死气: '死',
  煞气: '煞',
}

const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

// Plate coordinate system (square). Everything is drawn in this space and the
// <Svg> scales it to the container width.
const S = 300
const M = 12 // outer margin to the grid
const C = (S - M * 2) / 3 // cell size

export interface FlyingStarsGridProps {
  /** The full compute result. Component reads combined + currentYuanYun. */
  result: FlyingStarsResult
  /** Surface background tint for the outer card (behind the plate). */
  backgroundColor?: string
  /** Hairline border / divider color. Defaults to a warm ink. */
  borderColor?: string
  /** Label color for palace names + caption. */
  labelColor?: string
}

function PalaceCell({
  palace,
  index,
  data,
  yuanYun,
}: {
  palace: BaguaPalace | '中'
  index: number
  data: FlyingStarsResult['combined'][BaguaPalace | '中']
  yuanYun: FlyingStarsResult['currentYuanYun']['yuanYun']
}) {
  const col = index % 3
  const row = Math.floor(index / 3)
  const x0 = M + col * C
  const y0 = M + row * C
  const cx = x0 + C / 2
  // 中宫 has no 挨星 fortune the same way; classify others by their 向星.
  const quality: StarQuality = palace === '中' ? '退气' : classifyStar(data.facing, yuanYun)
  const isSha = quality === '煞气'

  return (
    <>
      <Rect x={x0} y={y0} width={C} height={C} fill={QUALITY_WASH[quality]} />

      {/* 運星 — the 地盘 base, a faint ghost behind the 挨星 */}
      <SvgText
        x={cx}
        y={y0 + C / 2 + 15}
        fill={INK}
        opacity={0.1}
        fontSize={46}
        fontWeight='700'
        textAnchor='middle'
      >
        {data.period}
      </SvgText>

      {/* 山星 top-left · 向星 top-right — the two 挨星 you actually read */}
      <SvgText
        x={x0 + 21}
        y={y0 + 31}
        fill={STAR9[data.mountain] ?? INK}
        fontSize={20}
        fontWeight='700'
        textAnchor='middle'
      >
        {data.mountain}
      </SvgText>
      <SvgText
        x={x0 + C - 21}
        y={y0 + 31}
        fill={STAR9[data.facing] ?? INK}
        fontSize={20}
        fontWeight='700'
        textAnchor='middle'
      >
        {data.facing}
      </SvgText>

      {/* 旺衰 tag between the 挨星 */}
      <SvgText
        x={cx}
        y={y0 + 22}
        fill={isSha ? CINNABAR : INK}
        opacity={0.62}
        fontSize={10}
        textAnchor='middle'
      >
        {QUALITY_TAG[quality]}
      </SvgText>

      {/* 卦名 bottom-left · 流年 bottom-right */}
      <SvgText
        x={x0 + 20}
        y={y0 + C - 12}
        fill={INK}
        opacity={0.8}
        fontSize={13}
        fontWeight='600'
        textAnchor='middle'
      >
        {palace}
      </SvgText>
      <SvgText
        x={x0 + C - 18}
        y={y0 + C - 12}
        fill={COPPER}
        fontSize={11}
        fontWeight='600'
        textAnchor='middle'
      >
        {data.annual}
      </SvgText>

      {isSha ? <Circle cx={x0 + C - 9} cy={y0 + 9} r={2.6} fill={CINNABAR} /> : null}
    </>
  )
}

const PalaceCellMemo = memo(PalaceCell)

export const FlyingStarsGrid = memo(function FlyingStarsGrid({
  result,
  backgroundColor = 'transparent',
  borderColor = 'rgba(228,228,231,0.30)',
  labelColor = INK,
}: FlyingStarsGridProps) {
  const yuanYun = result.currentYuanYun.yuanYun
  const gridEnd = M + C * 3

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <View style={styles.plate}>
        <Svg width='100%' height='100%' viewBox={`0 0 ${S} ${S}`}>
          {/* double frame — a classic bordered plate */}
          <Rect
            x={4}
            y={4}
            width={S - 8}
            height={S - 8}
            fill='none'
            stroke={borderColor}
            strokeWidth={1.4}
          />
          <Rect
            x={M - 2}
            y={M - 2}
            width={C * 3 + 4}
            height={C * 3 + 4}
            fill='none'
            stroke={borderColor}
            strokeWidth={0.6}
            opacity={0.7}
          />

          {LUOSHU_ORDER.map((palace, i) => (
            <PalaceCellMemo
              key={palace}
              palace={palace}
              index={i}
              data={result.combined[palace]}
              yuanYun={yuanYun}
            />
          ))}

          {/* grid lines drawn last so they sit crisp over the washes */}
          {[1, 2].map((k) => (
            <Line
              key={`v${k}`}
              x1={M + C * k}
              y1={M}
              x2={M + C * k}
              y2={gridEnd}
              stroke={borderColor}
              strokeWidth={0.8}
            />
          ))}
          {[1, 2].map((k) => (
            <Line
              key={`h${k}`}
              x1={M}
              y1={M + C * k}
              x2={gridEnd}
              y2={M + C * k}
              stroke={borderColor}
              strokeWidth={0.8}
            />
          ))}
        </Svg>
      </View>

      <Text style={[styles.caption, { color: labelColor }]}>
        坐 {result.sitMountain.name}　向 {result.faceMountain.name}　·
        {CN_NUM[result.buildYuanYun.yuanYun]}運 {result.chartMethod}
        {result.isCompoundFacing ? ' · 兼向' : ''}
      </Text>

      <View style={styles.legend}>
        <LegendItem color={INK} label='山 挨星' />
        <LegendItem color={CINNABAR} label='向 挨星' />
        <LegendItem color={COPPER} label='流年' />
      </View>
    </View>
  )
})

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  plate: {
    width: '100%',
    aspectRatio: 1,
  },
  caption: {
    fontSize: 12.5,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.85,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
})
