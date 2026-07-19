/**
 * Settings building blocks — Yuun-style section / card / row.
 */

import { Toggle, useTheme } from '@zhop/core-ui'
import { ChevronRight } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

export function SettingsSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  const { colors, spacing } = useTheme()
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

export function SettingsRow({
  label,
  hint,
  onPress,
  divider,
  badge,
  danger,
  trailing,
}: {
  label: string
  hint?: string
  onPress: () => void
  divider?: boolean
  badge?: string
  danger?: boolean
  trailing?: string
}) {
  const { colors, spacing } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: colors.separator,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: hint ? 4 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: danger ? colors.accent : colors.text, fontSize: 15, flex: 1 }}>
            {label}
          </Text>
          {badge ? (
            <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>{badge}</Text>
          ) : null}
        </View>
        {hint ? (
          <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      {trailing ? (
        <Text style={{ color: colors.accent, fontSize: 13 }}>{trailing}</Text>
      ) : (
        <ChevronRight size={16} color={colors.dim} strokeWidth={1.4} />
      )}
    </Pressable>
  )
}

export function SettingsToggleRow({
  label,
  value,
  onValueChange,
  badge,
  divider,
}: {
  label: string
  value: boolean
  onValueChange: (next: boolean) => void
  badge?: string
  divider?: boolean
}) {
  const { colors, spacing } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: colors.separator,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{label}</Text>
        {badge ? (
          <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>{badge}</Text>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onValueChange} accent={colors.accent} />
    </View>
  )
}

export function SettingsCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
      {children}
    </View>
  )
}
