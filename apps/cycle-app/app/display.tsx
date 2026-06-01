/**
 * /display — 表盘与桌面组件 (Watch & Widgets). Extracted from Me (2026-06 IA). The
 * watch face + widgets are dark-only surfaces, so this page is FORCED dark
 * regardless of the app's light/dark mode (nested CoreUIProvider mode='dark').
 * One live preview (watch + 桌面组件) reflecting the current selection; the
 * template + 月相 skin pickers sit below it.
 */

import { CoreUIProvider, useTheme } from '@zhop/core-ui'
import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { WatchSettings } from '@/components/WatchSettings'
import { useStrings } from '@/lib/i18n-context'

export default function DisplaySettingsScreen() {
  return (
    <CoreUIProvider brand='cycle' mode='dark'>
      <DisplayInner />
    </CoreUIProvider>
  )
}

function DisplayInner() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018) — the section label is the page identity. */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.watchWidgets}
        </Text>
        <WatchSettings />
      </ScrollView>
    </SafeAreaView>
  )
}
