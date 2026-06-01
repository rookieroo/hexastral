/**
 * /display — 表盘与桌面组件 (Watch & Widgets). Extracted from Me (2026-06 IA). The
 * page chrome follows the app's light/dark mode; only the live watch + widget
 * previews are dark-only — their dark canvases are hardcoded inside the
 * preview renderers (DailyCard 4 face variants + WidgetCard), so the page
 * around them honors the user's system theme.
 */

import { useTheme } from '@zhop/core-ui'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AccentPicker } from '@/components/AccentPicker'
import { WatchSettings } from '@/components/WatchSettings'
import { useStrings } from '@/lib/i18n-context'

function SectionLabel({ children, color }: { children: string; color: string }) {
  return <Text style={{ color, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
}

export default function DisplaySettingsScreen() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018) — section labels are the page identity. */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        {/* Theme accent — the live watch+widget previews below repaint
            instantly when the variant changes. */}
        <View style={{ gap: spacing.md }}>
          <SectionLabel color={colors.secondary}>{t.themeAccent}</SectionLabel>
          <AccentPicker />
        </View>

        <SectionLabel color={colors.secondary}>{t.watchWidgets}</SectionLabel>
        <WatchSettings />
      </ScrollView>
    </SafeAreaView>
  )
}
