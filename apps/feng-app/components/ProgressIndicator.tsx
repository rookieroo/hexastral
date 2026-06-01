/**
 * 4-segment progress indicator for the (new-site) flow.
 *
 * Mirrors the yuan-app pattern; uses 铜金 accent for filled segments and
 * a translucent border for unfilled. Renders inline above the screen body.
 */

import { View } from 'react-native'
import { useFengTheme } from '@/lib/theme'

export interface ProgressIndicatorProps {
  /** 1-based current step (e.g., 2 of 4). */
  step: number
  total: number
}

export function ProgressIndicator({ step, total }: ProgressIndicatorProps) {
  const { colors } = useFengTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < step
        return (
          <View
            key={i}
            style={{
              width: 28,
              height: 1.5,
              backgroundColor: filled ? colors.accent : colors.border,
            }}
          />
        )
      })}
    </View>
  )
}
