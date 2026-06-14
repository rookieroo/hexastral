/**
 * Toggle — the HexAstral switch.
 *
 * Replaces React Native's platform `Switch`, whose Android Material rendering
 * clashed with the rest of the (iOS-leaning) UI. This is one consistent pill +
 * sliding knob on both platforms, themed to the brand accent, animated with
 * reanimated and a selection haptic on flip (house motion rules).
 */

import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../theme'

const TRACK_W = 50
const TRACK_H = 30
const KNOB = 26
const PAD = 2
const TRAVEL = TRACK_W - KNOB - PAD * 2

export interface ToggleProps {
  value: boolean
  onValueChange: (next: boolean) => void
  /** On-state track colour. Defaults to the theme accent. */
  accent?: string
  disabled?: boolean
  accessibilityLabel?: string
}

export function Toggle({
  value,
  onValueChange,
  accent,
  disabled,
  accessibilityLabel,
}: ToggleProps) {
  const { colors } = useTheme()
  const onColor = accent ?? colors.accent
  const progress = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 })
  }, [value, progress])

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.separator, onColor]),
  }))
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }))

  return (
    <Pressable
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined)
        onValueChange(!value)
      }}
    >
      <Animated.View
        style={[
          {
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            padding: PAD,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  )
}
