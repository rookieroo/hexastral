/**
 * Seal case mark — nested squares (印), not a gear.
 */

import Svg, { Rect } from 'react-native-svg'

export function SealMark({
  size = 22,
  color,
  accessibilityLabel = '印匣',
}: {
  size?: number
  color: string
  accessibilityLabel?: string
}) {
  const inset = size * 0.18
  const inner = size * 0.36
  const innerOrigin = (size - inner) / 2
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessibilityRole='image'
      accessibilityLabel={accessibilityLabel}
    >
      <Rect
        x={inset}
        y={inset}
        width={size - inset * 2}
        height={size - inset * 2}
        stroke={color}
        strokeWidth={1.4}
        fill='none'
      />
      <Rect
        x={innerOrigin}
        y={innerOrigin}
        width={inner}
        height={inner}
        stroke={color}
        strokeWidth={1.2}
        fill='none'
      />
    </Svg>
  )
}
