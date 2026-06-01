/**
 * DetailRow — horizontal label / value pair
 *
 * Used in reading detail screens and settings summaries.
 * Value can be a string (renders as textSecondary) or arbitrary ReactNode.
 */

import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

interface DetailRowProps {
  label: string
  value: string | ReactNode
}

export function DetailRow({ label, value }: DetailRowProps) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
      }}
    >
      <Text style={{ fontSize: 15, color: colors.text }}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>{value}</Text>
      ) : (
        value
      )}
    </View>
  )
}
