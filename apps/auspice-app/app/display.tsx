/**
 * /display — 组件预览 (home widgets on both platforms; Lock Screen + Watch on iOS).
 * Android ships home widgets only — no lock screen, no watch.
 * Page + previews follow light/dark (宣纸 / 星空).
 */

import { useTheme } from '@zhop/core-ui'
import { Platform, ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { WatchSettings } from '@/components/WatchSettings'
import { useStrings } from '@/lib/i18n-context'

export default function DisplaySettingsScreen() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const title = Platform.OS === 'android' ? t.widgetsAndroidTitle : t.watchWidgets
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{title}</Text>
        <WatchSettings />
      </ScrollView>
    </SafeAreaView>
  )
}
