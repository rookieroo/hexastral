/**
 * AncientNumeral — 积画 1–6 (Yuel parity). Unified report numeral system.
 */

import Svg, { Path } from 'react-native-svg'

import { NUMERALS } from '@/lib/ancient-numerals'

export function AncientNumeral({
  n,
  size = 22,
  color,
  strokeWidth = 3,
}: {
  n: number
  size?: number
  color: string
  strokeWidth?: number
}) {
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
