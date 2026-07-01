/**
 * BaZhaiWheel — 8-direction wheel showing how the user's 命卦 maps onto
 * their building. Four lucky wedges in copper, four unlucky in muted ink,
 * with the 命卦 trigram glyph at the center.
 *
 * Phase H · F3 Bucket B. Designed for in-chapter rendering on the
 * `personal_fit` chapter where the synthesis prompt references the
 * user's 八宅 fit. Geometry uses feng-shui convention: 0° = N (坎),
 * clockwise.
 *
 * If `result.fit` is present (caller provided sitPalace+doorPalace), the
 * 坐山 and 大门 palaces get a hairline marker on their outer edge so the
 * user can see at a glance whether the building lands on lucky or unlucky
 * territory.
 */

import type { BaguaPalace, BaZhaiResult, DirectionKind } from '@zhop/astro-core'
import { memo } from 'react'
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg'

// Palace center angles (degrees from true north, clockwise) — matches
// PALACE_CENTERS in astro-core/feng/twenty-four-mountains.ts.
const PALACE_CENTER_DEG: Record<BaguaPalace, number> = {
  坎: 0,
  艮: 45,
  震: 90,
  巽: 135,
  离: 180,
  坤: 225,
  兑: 270,
  乾: 315,
}

const PALACES_CW: ReadonlyArray<BaguaPalace> = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾']

const LUCKY_COLOR = '#D4D4D8' // zinc-300 (neutral accent)
const LUCKY_FILL = 'rgba(228, 228, 231, 0.20)'
const UNLUCKY_COLOR = '#5F6770' // ink-mute
const UNLUCKY_FILL = 'rgba(95, 103, 112, 0.10)'

/** Tighter qualifier shown beside each palace label. */
const KIND_GLYPH: Record<DirectionKind, string> = {
  生气: '★',
  天医: '✚',
  延年: '◆',
  伏位: '·',
  绝命: '✕',
  五鬼: '✖',
  六煞: '·',
  祸害: '·',
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  // SVG y grows down. 0° = N (up), clockwise.
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const a = polar(cx, cy, r, startDeg)
  const b = polar(cx, cy, r, endDeg)
  // Each wedge spans 45° → small-arc flag is 0.
  return `M${cx},${cy} L${a.x},${a.y} A${r},${r} 0 0 1 ${b.x},${b.y} Z`
}

export interface BaZhaiWheelProps {
  /** Compute payload from `FengReport.compute.baZhai`. */
  result: BaZhaiResult
  /** Diameter in points. */
  size: number
  /** Ring + label color. Defaults to zinc-50 (light on dark). */
  strokeColor?: string
}

export const BaZhaiWheel = memo(function BaZhaiWheel({
  result,
  size,
  strokeColor = '#FAFAFA',
}: BaZhaiWheelProps) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 2
  const rLabel = rOuter * 0.78
  const rGlyph = rOuter * 0.46
  const rCenter = rOuter * 0.22

  const verdictByPalace: Map<BaguaPalace, { kind: DirectionKind; lucky: boolean }> = new Map()
  for (const v of result.lucky) verdictByPalace.set(v.palace, { kind: v.kind, lucky: true })
  for (const v of result.unlucky) verdictByPalace.set(v.palace, { kind: v.kind, lucky: false })

  const sitPalace = result.fit?.sitVerdict.palace
  const doorPalace = result.fit?.doorVerdict.palace

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Wedges */}
      <G>
        {PALACES_CW.map((palace) => {
          const center = PALACE_CENTER_DEG[palace]
          const verdict = verdictByPalace.get(palace)
          const lucky = verdict?.lucky ?? false
          return (
            <Path
              key={`wedge-${palace}`}
              d={wedgePath(cx, cy, rOuter, center - 22.5, center + 22.5)}
              fill={lucky ? LUCKY_FILL : UNLUCKY_FILL}
              stroke={lucky ? LUCKY_COLOR : UNLUCKY_COLOR}
              strokeWidth={0.5}
              strokeOpacity={0.55}
            />
          )
        })}
      </G>

      {/* Outer ring */}
      <Circle cx={cx} cy={cy} r={rOuter} fill='none' stroke={strokeColor} strokeWidth={0.75} />

      {/* Palace labels + verdict glyphs */}
      <G>
        {PALACES_CW.map((palace) => {
          const center = PALACE_CENTER_DEG[palace]
          const verdict = verdictByPalace.get(palace)
          const labelPt = polar(cx, cy, rLabel, center)
          const glyphPt = polar(cx, cy, rGlyph, center)
          const color = verdict?.lucky ? LUCKY_COLOR : UNLUCKY_COLOR
          return (
            <G key={`label-${palace}`}>
              <SvgText
                x={labelPt.x}
                y={labelPt.y + 5}
                textAnchor='middle'
                fontSize={14}
                fontWeight='600'
                fill={color}
              >
                {palace}
              </SvgText>
              <SvgText
                x={glyphPt.x}
                y={glyphPt.y + 3}
                textAnchor='middle'
                fontSize={9}
                fontWeight='400'
                fill={color}
                opacity={0.85}
              >
                {verdict ? `${KIND_GLYPH[verdict.kind]} ${verdict.kind}` : ''}
              </SvgText>
            </G>
          )
        })}
      </G>

      {/* 坐山 / 大门 markers — hairline arc on the outer edge */}
      {sitPalace ? (
        <Path
          d={wedgePath(
            cx,
            cy,
            rOuter + 1,
            PALACE_CENTER_DEG[sitPalace] - 22.5,
            PALACE_CENTER_DEG[sitPalace] + 22.5
          )}
          fill='none'
          stroke='#B4726E'
          strokeWidth={1.5}
          strokeOpacity={0.85}
        />
      ) : null}
      {doorPalace ? (
        <Path
          d={wedgePath(
            cx,
            cy,
            rOuter + 1,
            PALACE_CENTER_DEG[doorPalace] - 22.5,
            PALACE_CENTER_DEG[doorPalace] + 22.5
          )}
          fill='none'
          // Neutral zinc + a dash distinguishes 门 from the solid rose 坐 marker
          // WITHOUT a saturated hue (the report's "brightness not colour" law).
          stroke='#D4D4D8'
          strokeWidth={1.5}
          strokeOpacity={0.9}
          strokeDasharray='4 3'
        />
      ) : null}

      {/* Center disc with 命卦 glyph + group label */}
      <Circle
        cx={cx}
        cy={cy}
        r={rCenter}
        fill={LUCKY_FILL}
        stroke={LUCKY_COLOR}
        strokeWidth={0.5}
      />
      <SvgText
        x={cx}
        y={cy - 2}
        textAnchor='middle'
        fontSize={20}
        fontWeight='600'
        fill={strokeColor}
      >
        {result.mingGua}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 14}
        textAnchor='middle'
        fontSize={9}
        fontWeight='400'
        fill={strokeColor}
        opacity={0.7}
      >
        {result.group}
      </SvgText>
    </Svg>
  )
})
