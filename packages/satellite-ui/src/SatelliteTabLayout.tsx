import { useTheme } from '@zhop/core-ui'
import { Tabs } from 'expo-router'
import type React from 'react'
import { View } from 'react-native'

/**
 * Tab icon type — accepts both @zhop/hexastral-icons components and
 * lucide-react-native icons (ForwardRefExoticComponent). Using a broad
 * React.ComponentType so both shapes fit without type gymnastics.
 */
type TabIcon = React.ComponentType<{
  color?: string
  size?: number
  strokeWidth?: number
  [k: string]: any
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

export function SatelliteTabLayout(props: SatelliteTabLayoutProps) {
  const { colors } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: colors.bg }} />,
        tabBarStyle: buildSatelliteTabBarStyle({ bg: colors.bg, separator: colors.separator }),
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: `${colors.secondary}88`,
        tabBarLabelStyle: {
          fontWeight: '600',
          letterSpacing: 1,
          fontSize: 11,
        },
      }}
    >
      {props.tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            href: tab.hidden ? null : undefined,
            title: tab.title,
            tabBarIcon: ({ color, size }) => {
              const Icon = tab.icon
              // Wrap in a pointerEvents="none" View so the SVG element
              // doesn't intercept touches meant for the tab bar Pressable.
              return (
                <View pointerEvents='none'>
                  <Icon color={color} size={size} strokeWidth={1} />
                </View>
              )
            },
          }}
        />
      ))}
    </Tabs>
  )
}
