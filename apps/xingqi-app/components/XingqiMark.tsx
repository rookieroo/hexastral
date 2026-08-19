/**
 * XingqiMark — three qi beads on a qi arc.
 * Paper/ink beads (not a single-tint lockup, not the retired jade greens).
 */

import { useTheme } from '@zhop/core-ui'
import { faceOraclePalette } from '@zhop/hexastral-tokens/satellites'
import Svg, { Circle, Path } from 'react-native-svg'

interface XingqiMarkProps {
  size?: number
}

export function XingqiMark({ size = 64 }: XingqiMarkProps) {
  const { isDark, colors } = useTheme()
  const arc = isDark ? faceOraclePalette.jadeOnDark : faceOraclePalette.jade
  const beadLo = isDark ? colors.dim : faceOraclePalette.beadMist
  const beadMid = isDark ? faceOraclePalette.jadeOnDark : faceOraclePalette.jadeBright
  const beadHi = isDark ? faceOraclePalette.jadeOnDarkBright : faceOraclePalette.jade
  return (
    <Svg
      width={size}
      height={size}
      viewBox='0 0 64 64'
      accessibilityRole='image'
      accessibilityLabel='Syel'
    >
      <Path
        d='M18 36 C24 29 28 27 32 27 C37 27 41 30 46 33'
        stroke={arc}
        strokeWidth={1.8}
        strokeLinecap='round'
        fill='none'
        opacity={0.42}
      />
      <Circle cx={18} cy={36} r={4.4} fill={beadLo} />
      <Circle cx={32} cy={27} r={3.4} fill={beadMid} />
      <Circle cx={46} cy={33} r={2.7} fill={beadHi} />
    </Svg>
  )
}
