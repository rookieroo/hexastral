/**
 * AncientSeal — renders one hand-authored glyph as a square seal/chop.
 *
 * The shared primitive behind the 碑拓 chapter seals (black tile · white glyph)
 * and the 用神 key (cinnabar tile · paper glyph). Geometry is ported verbatim
 * from the proven design study, so it renders identically to the mock.
 *
 * NOTE: the stone-rubbing erosion/speckle texture (feTurbulence/feDisplacement)
 * is not portable to react-native-svg filters — this renders the clean solid
 * form. The carved texture is a Skia follow-up (see ReadingOverlay's InkBloom).
 */

import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { type AncientGlyph, GLYPHS, type GlyphKey } from '../glyphs'

export interface AncientSealProps {
  glyph: GlyphKey
  /** Rendered tile size (square), in px. */
  size: number
  /** Tile (ground) colour. */
  tile: string
  /** Glyph (ink) colour. */
  ink: string
  /** Corner radius (px). Default size * 0.085. */
  radius?: number
  /** Stroke width in glyph units (scaled with the glyph). Default 8. */
  strokeWidth?: number
  /** Fraction of the tile the glyph spans. Default 0.82 (fills the 印面). */
  inset?: number
  /** Render the tile as an outline (朱文) instead of a filled tile (碑拓). */
  outline?: boolean
  outlineWidth?: number
}

export function AncientSeal({
  glyph,
  size,
  tile,
  ink,
  radius,
  strokeWidth = 8,
  inset = 0.82,
  outline = false,
  outlineWidth = 2.6,
}: AncientSealProps) {
  const g: AncientGlyph = GLYPHS[glyph]
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
          strokeWidth={outlineWidth}
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
