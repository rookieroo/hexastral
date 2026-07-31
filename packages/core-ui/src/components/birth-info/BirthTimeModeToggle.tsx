/**
 * Segmented control: Birth hour (时辰) ↔ Exact time (+ city).
 * Modes are mutually exclusive — hosts clear precise fields on `shichen`.
 */

import * as Haptics from 'expo-haptics'
import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../../theme'
import type { BirthTimeMode } from './birthTimeMode'

export interface BirthTimeModeToggleLabels {
  shichen: string
  precise: string
}

export interface BirthTimeModeToggleProps {
  value: BirthTimeMode
  onChange: (mode: BirthTimeMode) => void
  accent: string
  labels: BirthTimeModeToggleLabels
}

export function BirthTimeModeToggle({ value, onChange, accent, labels }: BirthTimeModeToggleProps) {
  const { colors, spacing } = useTheme()

  const options: Array<{ key: BirthTimeMode; label: string }> = [
    { key: 'shichen', label: labels.shichen },
    { key: 'precise', label: labels.precise },
  ]

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
      }}
    >
      {options.map((opt) => {
        const selected = value === opt.key
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              if (selected) return
              void Haptics.selectionAsync().catch(() => undefined)
              onChange(opt.key)
            }}
            accessibilityRole='button'
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: selected ? accent : colors.separator,
              // Tint fill + accent text — solid accent+#fff fails on light accents
              // (Yuel moonlight #FBF8F2, Feng zinc).
              backgroundColor: selected ? `${accent}1F` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: selected ? accent : colors.text,
                fontSize: 14,
                fontWeight: selected ? '600' : '400',
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
