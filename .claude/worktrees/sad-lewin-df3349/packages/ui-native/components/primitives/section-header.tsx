/**
 * SectionHeader — icon + UPPERCASE label + horizontal separator.
 */
import type { ReactNode } from 'react'
import { View, Text } from 'react-native'

interface IosPalette {
  secondary: string
  separator: string
}

interface SectionHeaderProps {
  label: string
  icon?: ReactNode
  ios: IosPalette
}

export function SectionHeader({ label, icon, ios }: SectionHeaderProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: ios.secondary,
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ height: 0.5, backgroundColor: ios.separator, marginBottom: 16 }} />
    </View>
  )
}
