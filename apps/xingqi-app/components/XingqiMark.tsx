/**
 * XingqiMark — locked brand mark: three qi beads on a qi arc (white → jade),
 * a small "qi flow" that stays legible at icon scale.
 * Raster SSOT: assets/mark.svg → icon.png / splash.png / adaptive-icon.png
 */

import Svg, { Circle, Path } from 'react-native-svg'

interface XingqiMarkProps {
  size?: number
  /** Deep jade for the trailing bead. Default brand deep jade. */
  color?: string
}

export function XingqiMark({ size = 64, color = '#3F7B5C' }: XingqiMarkProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox='0 0 64 64'
      accessibilityRole='image'
      accessibilityLabel='Xingqi'
    >
      {/* qi arc threading the three beads (rises, then settles) */}
      <Path
        d='M18 36 C24 29 28 27 32 27 C37 27 41 30 46 33'
        stroke='#52A878'
        strokeWidth={1.5}
        strokeLinecap='round'
        fill='none'
        opacity={0.34}
      />
      {/* three qi beads: white source → bright jade → deep jade (high contrast on dark) */}
      <Circle cx={18} cy={36} r={4.4} fill='#FAFAFA' />
      <Circle cx={32} cy={27} r={3.4} fill='#5FB98A' />
      <Circle cx={46} cy={33} r={2.7} fill={color} opacity={0.95} />
    </Svg>
  )
}
