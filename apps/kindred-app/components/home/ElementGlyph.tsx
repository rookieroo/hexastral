/**
 * ElementGlyph — the day-master 五行 as a re-vectored 甲骨/金文 ANCIENT form, not
 * the modern character (founder: "五行意象图都已经设计好了，不应该使用中文").
 *
 * Each element is a hand-authored path set (public-domain 甲骨/金文, re-vectored —
 * NOT a font) in a 100×130 box, drawn as a 碑拓-style rubbing stroke. Ported from
 * the design codex (kindred-design-mock/gen_glyphset.py, 五行·用神 row). The stroke
 * is tinted to the element's colour so the home sigil reads as "your element" and
 * echoes your central star in the sky above. Pass an ivory/cinnabar `color` if you
 * ever want the pure monochrome rubbing instead.
 */

import Svg, { Circle, Path } from 'react-native-svg'

/** 五行 → its element colour (matches packages/hexastral-tokens `wuxingColors`). */
export const WUXING_COLOR: Record<string, string> = {
  木: '#5B8C5A', // wood
  火: '#C25450', // fire
  土: '#A0845C', // earth
  金: '#C4A882', // metal
  水: '#4A6FA5', // water
}

interface GlyphSpec {
  paths: string[]
  fills?: string[]
  dots?: ReadonlyArray<readonly [number, number, number]>
}

const GLYPHS: Record<string, GlyphSpec> = {
  水: {
    paths: [
      'M50,12 C43,30 57,46 50,62 C43,78 57,96 50,118',
      'M33,40 C31,46 31,51 33,57',
      'M31,74 C29,80 29,85 31,91',
      'M67,46 C69,52 69,57 67,63',
      'M69,80 C71,86 71,91 69,97',
    ],
  },
  火: {
    paths: [
      'M50,120 C49,98 51,80 50,56 C49,47 50,40 51,33',
      'M44,112 C41,93 35,80 31,62 C29,55 30,50 32,45',
      'M56,112 C59,93 65,80 69,62 C71,55 70,50 68,45',
      'M46,86 L43,75',
      'M54,86 L57,75',
    ],
  },
  木: {
    paths: [
      'M50,16 L50,116',
      'M50,46 C42,38 34,32 26,26',
      'M50,46 C58,38 66,32 74,26',
      'M50,84 C42,92 34,100 26,110',
      'M50,84 C58,92 66,100 74,110',
    ],
  },
  土: {
    paths: ['M24,108 L76,108', 'M50,108 L50,62'],
    fills: ['M50,40 C61,46 64,55 62,64 L38,64 C36,55 39,46 50,40 Z'],
  },
  金: {
    paths: [
      'M26,54 L50,22 L74,54',
      'M40,42 L60,42',
      'M50,54 L50,106',
      'M34,78 L66,78',
      'M30,106 L70,106',
    ],
    dots: [
      [38, 92, 3.8],
      [62, 92, 3.8],
    ],
  },
}

export function ElementGlyph({
  element,
  color,
  size,
}: {
  element: string
  color: string
  /** Rendered HEIGHT in px; width follows the 100×130 box ratio. */
  size: number
}) {
  const g = GLYPHS[element]
  if (!g) return null
  const w = (size * 100) / 130
  return (
    <Svg width={w} height={size} viewBox='0 0 100 130'>
      {g.fills?.map((d, i) => (
        <Path key={`f${i}`} d={d} fill={color} />
      ))}
      {g.paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={7.6}
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      ))}
      {g.dots?.map(([cx, cy, r], i) => (
        <Circle key={`d${i}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
    </Svg>
  )
}
