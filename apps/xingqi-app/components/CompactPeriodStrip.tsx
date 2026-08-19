import { useTheme } from '@zhop/core-ui'
import { Pressable, Text, View } from 'react-native'

import type { PeriodDot } from '@/lib/care-notes'

export function CompactPeriodStrip({
  label,
  dots,
  onPress,
}: {
  label: string
  dots: PeriodDot[]
  onPress: () => void
}) {
  const { colors, spacing } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={{
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        paddingTop: spacing.md,
        gap: 10,
      }}
    >
      <Text
        style={{
          fontFamily: 'IBMPlexMono',
          color: colors.dim,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end' }}>
        {dots.map((dot) => (
          <View key={dot.key} style={{ alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.accent,
                opacity: dot.lit ? 1 : 0.28,
              }}
            />
            <Text style={{ color: colors.dim, fontSize: 11 }}>{dot.label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  )
}
