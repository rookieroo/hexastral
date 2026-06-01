/**
 * BaguaCompassOverlay — SVG 24山 ring with optional 8-bagua wedge tinting.
 *
 * The component renders a transparent SVG that callers can layer on top of
 * any image (satellite tile, room photo, etc.). Geometry uses feng-shui
 * convention: 0° = N, clockwise.
 *
 * Shared between Fēng app (FacingCalibrator screen) and Compass satellite
 * (compass tab) so the visual identity stays consistent.
 *
 * Performance: pure SVG, no Reanimated worklets — caller can wrap in
 * `Animated.View` to rotate.
 */

import { TWENTY_FOUR_MOUNTAINS } from '@zhop/astro-core'
import { memo } from 'react'
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg'

export interface BaguaCompassOverlayProps {
  /** Diameter in points. The overlay is square. */
  size: number
  /**
   * Rotation applied to the entire ring (degrees). Positive = clockwise.
   * Useful when callers want the cardinal labels to track a heading.
   */
  rotation?: number
  /** Whether to fill the 8 bagua wedges with translucent color. */
  showWedges?: boolean
  /** Whether to render 24 山 names + tick marks. */
  showMountains?: boolean
  /** Whether to render the N/E/S/W cardinal letters. */
  showCardinals?: boolean
  ringColor?: string
  labelColor?: string
  labelMajorColor?: string
  cardinalColor?: string
}

const BAGUA_WEDGES: ReadonlyArray<{
  name: string
  startDeg: number
  endDeg: number
  fill: string
}> = [
  { name: '坎', startDeg: 337.5, endDeg: 22.5, fill: 'rgba(20,40,90,0.12)' },
  { name: '艮', startDeg: 22.5, endDeg: 67.5, fill: 'rgba(120,80,40,0.12)' },
  { name: '震', startDeg: 67.5, endDeg: 112.5, fill: 'rgba(30,120,50,0.12)' },
  { name: '巽', startDeg: 112.5, endDeg: 157.5, fill: 'rgba(70,140,40,0.12)' },
  { name: '离', startDeg: 157.5, endDeg: 202.5, fill: 'rgba(190,40,30,0.12)' },
  { name: '坤', startDeg: 202.5, endDeg: 247.5, fill: 'rgba(150,100,40,0.12)' },
  { name: '兑', startDeg: 247.5, endDeg: 292.5, fill: 'rgba(190,170,40,0.12)' },
  { name: '乾', startDeg: 292.5, endDeg: 337.5, fill: 'rgba(150,150,170,0.12)' },
]

function compassToSvg(deg: number): number {
  return deg - 90
}
function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (compassToSvg(deg) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  let sweep = endDeg - startDeg
  if (sweep < 0) sweep += 360
  const largeArc = sweep > 180 ? 1 : 0
  const a = polar(cx, cy, rOuter, startDeg)
  const b = polar(cx, cy, rOuter, endDeg)
  const c = polar(cx, cy, rInner, endDeg)
  const d = polar(cx, cy, rInner, startDeg)
  return [
    `M ${a.x} ${a.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${d.x} ${d.y}`,
    'Z',
  ].join(' ')
}

const CARDINALS: ReadonlyArray<[string, number]> = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['W', 270],
]

export const BaguaCompassOverlay = memo(function BaguaCompassOverlay({
  size,
  rotation = 0,
  showWedges = true,
  showMountains = true,
  showCardinals = true,
  ringColor = 'rgba(255,255,255,0.55)',
  labelColor = 'rgba(255,255,255,0.85)',
  labelMajorColor = '#E6B450',
  cardinalColor = '#ffffff',
}: BaguaCompassOverlayProps) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 4
  const rRingInner = rOuter - 22
  const rWedgeInner = size * 0.18

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G origin={`${cx},${cy}`} rotation={rotation}>
        {showWedges
          ? BAGUA_WEDGES.map((w) => {
              const d = wedgePath(cx, cy, rWedgeInner, rRingInner, w.startDeg, w.endDeg)
              let mid = (w.startDeg + w.endDeg) / 2
              if (w.endDeg < w.startDeg) mid = (mid + 180) % 360
              const labelPos = polar(cx, cy, (rWedgeInner + rRingInner) / 2, mid)
              return (
                <G key={w.name}>
                  <Path d={d} fill={w.fill} stroke='rgba(0,0,0,0.15)' strokeWidth={0.6} />
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + 5}
                    fontSize={14}
                    textAnchor='middle'
                    fill={labelColor}
                  >
                    {w.name}
                  </SvgText>
                </G>
              )
            })
          : null}
        {showMountains ? (
          <>
            <Circle cx={cx} cy={cy} r={rOuter} stroke={ringColor} strokeWidth={1} fill='none' />
            <Circle cx={cx} cy={cy} r={rRingInner} stroke={ringColor} strokeWidth={1} fill='none' />
            {TWENTY_FOUR_MOUNTAINS.map((m) => {
              const tickOuter = polar(cx, cy, rOuter, m.centerDeg)
              const tickInner = polar(cx, cy, rOuter - 6, m.centerDeg)
              const labelPos = polar(cx, cy, (rOuter + rRingInner) / 2 + 1, m.centerDeg)
              const isCardinal = m.dragon === '天元' && m.centerDeg % 90 === 0
              return (
                <G key={m.name}>
                  <Line
                    x1={tickOuter.x}
                    y1={tickOuter.y}
                    x2={tickInner.x}
                    y2={tickInner.y}
                    stroke={isCardinal ? labelMajorColor : ringColor}
                    strokeWidth={isCardinal ? 1.5 : 0.8}
                  />
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + 4}
                    fontSize={isCardinal ? 13 : 10}
                    fill={isCardinal ? labelMajorColor : labelColor}
                    textAnchor='middle'
                  >
                    {m.name}
                  </SvgText>
                </G>
              )
            })}
          </>
        ) : null}
        {showCardinals
          ? CARDINALS.map(([label, deg]) => {
              const pos = polar(cx, cy, rOuter + 14, deg)
              return (
                <SvgText
                  key={label}
                  x={pos.x}
                  y={pos.y + 5}
                  fontSize={13}
                  fontWeight='700'
                  textAnchor='middle'
                  fill={cardinalColor}
                >
                  {label}
                </SvgText>
              )
            })
          : null}
      </G>
    </Svg>
  )
})
