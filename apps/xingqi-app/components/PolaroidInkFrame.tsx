/**
 * Photo-window ink — sketched onto the well, not the outer plate.
 */

import { useTheme } from '@zhop/core-ui'
import type { ReactNode } from 'react'
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

import {
  POLAROID_INK_LEN,
  POLAROID_WELL_INK,
  POLAROID_WELL_INK_GHOST,
} from '@/lib/polaroid-ink'

const AnimatedPath = Animated.createAnimatedComponent(Path)

function InkSvg({ children }: { children: ReactNode }) {
  return (
    <Svg
      pointerEvents='none'
      viewBox='0 0 100 100'
      preserveAspectRatio='none'
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {children}
    </Svg>
  )
}

export function PolaroidInkFrame({
  active = false,
  drawn,
}: {
  active?: boolean
  drawn?: SharedValue<number>
}) {
  const { colors } = useTheme()
  const ghostW = active ? 1.2 : 1
  const inkW = active ? 1.65 : 1.35
  const ghostProps = useAnimatedProps(() => {
    const t = drawn ? drawn.value : 1
    return {
      strokeDashoffset: POLAROID_INK_LEN * (1 - t),
      opacity: 0.12 + 0.22 * t,
    }
  })
  const inkProps = useAnimatedProps(() => {
    const t = drawn ? drawn.value : 1
    return {
      strokeDashoffset: POLAROID_INK_LEN * (1 - t),
      opacity: 0.2 + 0.72 * t,
    }
  })
  if (!drawn) {
    return (
      <InkSvg>
        <Path
          d={POLAROID_WELL_INK_GHOST}
          fill='none'
          stroke={colors.text}
          strokeWidth={ghostW}
          strokeLinecap='round'
          strokeLinejoin='round'
          opacity={0.34}
        />
        <Path
          d={POLAROID_WELL_INK}
          fill='none'
          stroke={colors.text}
          strokeWidth={inkW}
          strokeLinecap='round'
          strokeLinejoin='round'
          opacity={0.92}
        />
      </InkSvg>
    )
  }
  return (
    <InkSvg>
      <AnimatedPath
        d={POLAROID_WELL_INK_GHOST}
        fill='none'
        stroke={colors.text}
        strokeWidth={ghostW}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeDasharray={POLAROID_INK_LEN}
        animatedProps={ghostProps}
      />
      <AnimatedPath
        d={POLAROID_WELL_INK}
        fill='none'
        stroke={colors.text}
        strokeWidth={inkW}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeDasharray={POLAROID_INK_LEN}
        animatedProps={inkProps}
      />
    </InkSvg>
  )
}
