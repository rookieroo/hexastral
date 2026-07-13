/**
 * NotificationsSection — push toggles grouped in one card (matches Library pattern).
 */

import { Toggle, useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'
import { useStrings } from '@/lib/i18n-context'
import { SettingsCard, SettingsSection } from './SettingsSection'

export interface NotificationToggleItem {
  id: string
  label: string
  hint?: string
  value: boolean
  onToggle: (next: boolean) => void | Promise<void>
  showPro: boolean
}

function NotificationToggleRow({
  label,
  hint,
  value,
  onToggle,
  showPro,
  divider,
}: NotificationToggleItem & { divider?: boolean }) {
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
      <View style={{ flex: 1, gap: hint ? 4 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{label}</Text>
          {showPro ? (
            <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>PRO</Text>
          ) : null}
        </View>
        {hint ? (
          <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onToggle} accent={colors.accent} />
    </View>
  )
}

export function NotificationsSection({ rows }: { rows: NotificationToggleItem[] }) {
  const { spacing } = useTheme()
  const { t } = useStrings()

  if (rows.length === 0) return null

  return (
    <SettingsSection title={t.settingsNotifications}>
      <SettingsCard>
        {rows.map((row, index) => (
          <NotificationToggleRow
            key={row.id}
            {...row}
            divider={index < rows.length - 1}
          />
        ))}
      </SettingsCard>
      <View style={{ height: spacing.xs }} />
    </SettingsSection>
  )
}
