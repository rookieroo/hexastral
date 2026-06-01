/**
 * CompatibilityScore — single-number score (0–100) with concentric ring.
 *
 * Visual: large numeric in ink.brown, ring drawn in ink.gold thickness 2,
 * background ring in ricePaper.aged. The ring fills clockwise from 12 o'clock.
 * Score itself uses Yuán hero typography size.
 */

import { Text, View } from 'react-native'
import { Svg, Circle } from 'react-native-svg'
import { yuanLight, yuanType } from '@zhop/hexastral-tokens/yuan'

export interface CompatibilityScoreProps {
  /** 0–100 */
  score: number
  /** Outer diameter in px */
  size?: number
  /** Optional label rendered under the number */
  label?: string
}

export function CompatibilityScore({ score, size = 180, label }: CompatibilityScoreProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={yuanLight.bgAged}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={yuanLight.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ ...yuanType.hero, color: yuanLight.text }}>{clamped}</Text>
      {label != null && (
        <Text style={{ ...yuanType.caption, color: yuanLight.textSecondary, marginTop: 4 }}>
          {label}
        </Text>
      )}
    </View>
  )
}
