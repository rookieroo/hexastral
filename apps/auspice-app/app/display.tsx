/**
 * /display — 表盘与桌面组件 (Watch & Widgets). Extracted from Me (2026-06 IA). The
 * page chrome follows the app's light/dark mode; only the live watch + widget
 * previews are dark-only — their dark canvases are hardcoded inside the
 * preview renderers (DailyCard 4 face variants + WidgetCard), so the page
 * around them honors the user's system theme.
 *
 * Accent color lives in /me, not here — the watch face and widget have their
 * own brand-anchored ink-on-paper palette (cream + copper + 五行 干支 ink) and
 * don't honor the app accent, so the picker would be misleading on this page.
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
