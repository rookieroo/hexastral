import { useTheme } from '@zhop/core-ui'
import type React from 'react'
import { useMemo } from 'react'
import { View } from 'react-native'

type TabBarIconProps = { color: string; size: number }

/** Options shape accepted by expo-router `<Tabs screenOptions>` / `<Tabs.Screen options>`. */
export type SatelliteTabScreenOptions = {
  headerShown?: boolean
  href?: null
  title?: string
  tabBarBackground?: () => React.ReactNode
  tabBarStyle?: Record<string, unknown>
  tabBarActiveTintColor?: string
  tabBarInactiveTintColor?: string
  tabBarLabelStyle?: Record<string, unknown>
  tabBarIcon?: (props: TabBarIconProps) => React.ReactNode
}

/**
 * Tab icon type — accepts both @zhop/hexastral-icons components and
 * lucide-react-native icons (ForwardRefExoticComponent). Using a broad
 * React.ComponentType so both shapes fit without type gymnastics.
 */
type TabIcon = React.ComponentType<{
  color?: string
  size?: number
  strokeWidth?: number
  [k: string]: unknown
}>

export interface SatelliteTabItem {
  name: string
  title: string
  icon: TabIcon
  hidden?: boolean
}

export interface SatelliteTabLayoutProps {
  tabs: SatelliteTabItem[]
}

/**
 * The themed tab-bar style. Exported so screens that toggle the bar via
 * `navigation.setOptions` (e.g. hiding it during a splash intro) can restore
 * the exact styling — setting `tabBarStyle` back to `undefined` would drop the
 * theme because React Navigation shallow-merges per-key.
 */
export function buildSatelliteTabBarStyle(colors: { bg: string; separator: string }) {
  return {
    backgroundColor: colors.bg,
    borderTopColor: colors.separator,
    borderTopWidth: 0.5,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 0,
  }
}

/** Shared `screenOptions` for expo-router `<Tabs>` — call from app/(tabs)/_layout.tsx. */
export function useSatelliteTabScreenOptions(): SatelliteTabScreenOptions {
  const { colors } = useTheme()

  return useMemo(
    () => ({
      headerShown: false,
      tabBarBackground: () => <View style={{ flex: 1, backgroundColor: colors.bg }} />,
      tabBarStyle: buildSatelliteTabBarStyle({ bg: colors.bg, separator: colors.separator }),
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: `${colors.secondary}88`,
      tabBarLabelStyle: {
        fontWeight: '600' as const,
        letterSpacing: 1,
        fontSize: 11,
      },
    }),
    [colors.bg, colors.secondary, colors.separator, colors.text],
  )
}

/** Per-tab options for `<Tabs.Screen options={…} />`. */
export function buildSatelliteTabScreenOptions(tab: SatelliteTabItem): SatelliteTabScreenOptions {
  return {
    ...(tab.hidden ? { href: null } : {}),
    title: tab.title,
    tabBarIcon: ({ color, size }: TabBarIconProps) => {
      const Icon = tab.icon
      return (
        <View pointerEvents='none'>
          <Icon color={color} size={size} strokeWidth={1} />
        </View>
      )
    },
  }
}
