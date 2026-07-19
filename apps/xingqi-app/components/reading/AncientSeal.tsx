/**
 * AncientSeal — 碑拓 tile rendering a hand-authored 甲骨/金文 glyph.
 */

import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

import { type AncientGlyph, type XingqiGlyphKey, XINGQI_GLYPHS } from '@/lib/ancient-glyphs'

export function AncientSeal({
  glyph,
  size,
  tile,
  ink,
  radius,
  strokeWidth = 8,
  inset = 0.82,
  outline = false,
}: {
  glyph: XingqiGlyphKey
  size: number
  tile: string
  ink: string
  radius?: number
  strokeWidth?: number
  inset?: number
  outline?: boolean
}) {
  const g: AncientGlyph = XINGQI_GLYPHS[glyph]
  const [bw, bh] = g.box
  const target = size * inset
  const scale = Math.min(target / bw, target / bh)
  const tx = (size - bw * scale) / 2
  const ty = (size - bh * scale) / 2
  const r = radius ?? size * 0.085

  const stroke = (d: string, key: string) => (
    <Path
      key={key}
      d={d}
      stroke={ink}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      fill='none'
    />
  )

  return (
    <Svg width={size} height={size}>
      {outline ? (
        <Rect
          x={1.5}
          y={1.5}
          width={size - 3}
          height={size - 3}
          rx={r}
          fill='none'
          stroke={tile}
          strokeWidth={2.4}
        />
      ) : (
        <Rect x={0} y={0} width={size} height={size} rx={r} fill={tile} />
      )}
      <G transform={`translate(${tx},${ty}) scale(${scale})`}>
        {g.fills?.map((d, i) => (
          <Path key={`f${i}`} d={d} fill={ink} />
        ))}
        {g.strokes?.map((d, i) => stroke(d, `s${i}`))}
        {g.dots?.map(([cx, cy, rad], i) => (
          <Circle key={`d${i}`} cx={cx} cy={cy} r={rad} fill={ink} />
        ))}
        {g.twin?.map((part, i) => (
          <G key={`t${i}`} transform={`translate(${part.dx},0)`}>
            {part.paths.map((d, j) => stroke(d, `t${i}-${j}`))}
          </G>
        ))}
      </G>
    </Svg>
  )
}
