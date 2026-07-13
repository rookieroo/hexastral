/**
 * Settings building blocks — modular Me / Settings screen (Today-first IA).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import type { LucideIcon } from 'lucide-react-native'
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
  icon: Icon,
  onPress,
  divider,
  badge,
}: {
  label: string
  hint?: string
  icon?: LucideIcon
  onPress: () => void
  divider?: boolean
  badge?: string
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
      {Icon ? <Icon size={18} color={colors.accent} /> : null}
      <View style={{ flex: 1, gap: hint ? 4 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
          {badge ? (
            <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>{badge}</Text>
          ) : null}
        </View>
        {hint ? (
          <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
    </Pressable>
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
