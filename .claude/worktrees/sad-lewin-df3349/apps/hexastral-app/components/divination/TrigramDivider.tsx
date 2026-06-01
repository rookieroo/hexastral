/**
 * TrigramDivider — Eastern 八卦 trigram line as section divider
 *
 * Renders a horizontal row of yin (broken ──  ──) and yang (solid ────) lines
 * using a randomly seeded trigram pattern. Much more distinctive than a plain
 * hairline and immediately signals "Eastern metaphysical" identity.
 *
 * Usage: <TrigramDivider trigram={[1,0,1]} />   ← ☲ 離 (fire)
 *        <TrigramDivider />                      ← default ☰ 乾 (heaven)
 */

import type { ViewStyle } from 'react-native'
import { View } from 'react-native'
import { useTheme } from '@/lib/theme'

interface TrigramDividerProps {
  /** 3-element array: 1 = yang (solid), 0 = yin (broken). Bottom-up like I Ching. */
  trigram?: [number, number, number]
  /** Line thickness */
  lineHeight?: number
  /** Gap between lines */
  gap?: number
  /** Horizontal margin */
  marginHorizontal?: number
  /** Override line color */
  color?: string
  /** Additional container styles */
  style?: ViewStyle
}

/** Named trigrams for semantic use across the app */
export const TRIGRAMS = {
  qian: [1, 1, 1] as [number, number, number], // ☰ 乾 Heaven
  kun: [0, 0, 0] as [number, number, number], // ☷ 坤 Earth
  li: [1, 0, 1] as [number, number, number], // ☲ 離 Fire
  kan: [0, 1, 0] as [number, number, number], // ☵ 坎 Water
  zhen: [0, 0, 1] as [number, number, number], // ☳ 震 Thunder
  xun: [1, 1, 0] as [number, number, number], // ☴ 巽 Wind
  gen: [1, 0, 0] as [number, number, number], // ☶ 艮 Mountain
  dui: [0, 1, 1] as [number, number, number], // ☱ 兌 Lake
} as const

export function TrigramDivider({
  trigram = TRIGRAMS.qian,
  lineHeight = 1,
  gap = 3,
  marginHorizontal = 0,
  color,
  style,
}: TrigramDividerProps) {
  const { colors } = useTheme()
  const lineColor = color ?? colors.border

  // Render bottom-up: trigram[0] is bottom line
  const lines = [...trigram].reverse()

  return (
    <View style={[{ gap, marginHorizontal, paddingVertical: 4 }, style]}>
      {lines.map((yang, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', height: lineHeight }}>
          {yang === 1 ? (
            // Yang — solid line
            <View style={{ flex: 1, height: lineHeight, backgroundColor: lineColor }} />
          ) : (
            // Yin — broken line with gap
            <>
              <View style={{ flex: 1, height: lineHeight, backgroundColor: lineColor }} />
              <View style={{ width: 8 }} />
              <View style={{ flex: 1, height: lineHeight, backgroundColor: lineColor }} />
            </>
          )}
        </View>
      ))}
    </View>
  )
}
