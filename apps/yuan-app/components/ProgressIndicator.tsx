/**
 * 6-segment progress indicator for the onboarding flow.
 * Filled segments use ink.gold; unfilled use border opacity.
 */

import { ink } from '@zhop/hexastral-tokens'
import { yuanLight, yuanSpacing } from '@zhop/hexastral-tokens/yuan'
import { View } from 'react-native'

export interface ProgressIndicatorProps {
  step: number // 1-based
  total: number
}

export function ProgressIndicator({ step, total }: ProgressIndicatorProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: yuanSpacing.sm }}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < step
        return (
          <View
            key={i}
            style={{
              width: 24,
              height: 1,
              backgroundColor: filled ? ink.gold : yuanLight.border,
            }}
          />
        )
      })}
    </View>
  )
}
