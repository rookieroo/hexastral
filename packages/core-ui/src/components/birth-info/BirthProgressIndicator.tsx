/**
 * BirthProgressIndicator — 5-segment hairline progress chrome.
 *
 * Lifted from hexastral-app's `(birth)/_layout.tsx` pattern. Becomes the
 * HexAstral family visual signature: same shape, every multi-step flow.
 *
 * Geometry: each segment 24×1px, gap 6px, row centered.
 * Active fill: `colors.text`. Inactive: `colors.separator`.
 * Accent color overrides the active fill when provided (per-app branding).
 */

import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme'

export interface BirthProgressIndicatorProps {
  /** 1-based current step. */
  step: number
  /** Total number of segments. Defaults to 5 (date / time / gender / place / review). */
  total?: number
  /** Override the active-segment fill. Defaults to `colors.text`. */
  accentColor?: string
}

export function BirthProgressIndicator({
  step,
  total = 5,
  accentColor,
}: BirthProgressIndicatorProps) {
  const { colors } = useTheme()
  const activeFill = accentColor ?? colors.text
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.segment, { backgroundColor: i < step ? activeFill : colors.separator }]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    width: 24,
    height: 1,
  },
})
