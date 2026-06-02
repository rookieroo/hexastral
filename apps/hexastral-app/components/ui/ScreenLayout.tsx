/**
 * ScreenLayout — standard back-button + scroll wrapper
 *
 * Opt-in: use for simple screens with a back button + scrollable content.
 * Screens with complex headers, tab bars, or custom navigation are excluded.
 *
 * Props:
 *   showBack      — render BackButton at top (default: true)
 *   edges         — SafeAreaView edges (default: top/left/right)
 *   scrollable    — wrap children in ScrollView (default: true)
 *   contentStyle  — style applied to ScrollView contentContainer or inner View
 *   headerRight   — optional element rendered at top-right (e.g. icon button)
 */

import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { ScrollView, View } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { useTheme } from '@/lib/theme'

interface ScreenLayoutProps {
  children: ReactNode
  showBack?: boolean
  edges?: Edge[]
  scrollable?: boolean
  contentStyle?: ViewStyle
  headerRight?: ReactNode
}

export function ScreenLayout({
  children,
  showBack = true,
  edges = ['top', 'left', 'right'],
  scrollable = true,
  contentStyle,
  headerRight,
}: ScreenLayoutProps) {
  const { colors } = useTheme()
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      {(showBack || headerRight) && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {showBack ? <BackButton /> : <View />}
          {headerRight ? <View style={{ paddingRight: 20 }}>{headerRight}</View> : null}
        </View>
      )}
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingHorizontal: 24, paddingBottom: 48 }, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  )
}
