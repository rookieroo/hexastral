/**
 * /display — 表盘与桌面组件 (Watch & Widgets).
 * Page + previews follow light/dark (宣纸 / 星空).
 */

import { useTheme } from '@zhop/core-ui'
import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { WatchSettings } from '@/components/WatchSettings'
import { useStrings } from '@/lib/i18n-context'

export default function DisplaySettingsScreen() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.watchWidgets}
        </Text>
        <WatchSettings />
      </ScrollView>
    </SafeAreaView>
  )
}
