/**
 * SectionHeader — icon + UPPERCASE label + optional hairline divider
 *
 * Matches the repeated pattern across shop, almanac, and reading screens:
 *   [icon]  LABEL TEXT  ─────────────────────
 */

import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

interface SectionHeaderProps {
  label: string
  icon?: ReactNode
  divider?: boolean
}

export function SectionHeader({ label, icon, divider = true }: SectionHeaderProps) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon}
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: colors.textSecondary,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {divider && (
        <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border, marginLeft: 4 }} />
      )}
    </View>
  )
}
