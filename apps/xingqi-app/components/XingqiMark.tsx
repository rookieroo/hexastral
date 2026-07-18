/**
 * XingqiMark — locked brand mark: three qi beads (wave + size + white→jade).
 * Raster SSOT: assets/mark.svg → icon.png / splash.png / adaptive-icon.png
 */

import Svg, { Circle } from 'react-native-svg'

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
      {/* Wave ↑ · ↓ · return · white → jade dissolve */}
      <Circle cx={22} cy={30.2} r={3.2} fill='#FAFAFA' opacity={1} />
      <Circle cx={32} cy={34.2} r={2.25} fill='#52A878' opacity={0.75} />
      <Circle cx={42} cy={31.4} r={1.45} fill={color} opacity={0.4} />
    </Svg>
  )
}
