/**
 * DetailRow — label/value pair row for reading details and settings.
 */
import { View, Text } from 'react-native'
import type { ReactNode } from 'react'

interface IosPalette {
  text: string
  secondary: string
  separator: string
}

interface DetailRowProps {
  label: string
  value?: string | ReactNode
  ios: IosPalette
  /** Show a bottom separator (default: true) */
  separator?: boolean
}

export function DetailRow({ label, value, ios, separator = true }: DetailRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: separator ? 0.5 : 0,
        borderBottomColor: ios.separator,
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 14, color: ios.secondary, flexShrink: 0 }}>{label}</Text>
      {typeof value === 'string' ? (
        <Text
          style={{ fontSize: 14, color: ios.text, textAlign: 'right', flex: 1 }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  )
}
