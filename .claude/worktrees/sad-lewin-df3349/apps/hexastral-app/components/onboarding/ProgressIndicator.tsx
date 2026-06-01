/**
 * 5-segment hairline progress indicator for the form-as-conversation
 * birth-info onboarding (Phase C.1). Mirrors the yuan-app pattern but uses
 * hexastral-app's IosPalette tokens so it auto-themes Light/Dark.
 */

import { View } from 'react-native'
import { useIosPalette } from '@/lib/theme'

export interface ProgressIndicatorProps {
  /** 1-based step number. */
  step: number
  total: number
}

export function ProgressIndicator({ step, total }: ProgressIndicatorProps) {
  const ios = useIosPalette()
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < step
        return (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: indicator segments are positional
            key={i}
            style={{
              width: 24,
              height: 1,
              backgroundColor: filled ? ios.text : ios.separator,
              opacity: filled ? 0.85 : 1,
            }}
          />
        )
      })}
    </View>
  )
}
