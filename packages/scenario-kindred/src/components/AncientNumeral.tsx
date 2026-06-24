/**
 * AncientNumeral — 一二三亖𠄡六 (1–6) in hand-authored 积画 brush strokes. The 5
 * is the barred 𠄡 (not a bare ✕) so it never reads as a multiply sign.
 * The single numeral system for the whole report: chapter layer indices in the
 * gutter, and the chapter number in the footer. Never Arabic/Roman.
 */

import Svg, { Path } from 'react-native-svg'
import { NUMERALS } from '../glyphs'

export interface AncientNumeralProps {
  /** 1–6. */
  n: number
  size?: number
  color: string
  strokeWidth?: number
}

export function AncientNumeral({ n, size = 22, color, strokeWidth = 3 }: AncientNumeralProps) {
  const paths = NUMERALS[n] ?? []
  return (
    <Svg width={size} height={size} viewBox='0 0 46 46'>
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          fill='none'
          strokeLinecap='round'
        />
      ))}
    </Svg>
  )
}
