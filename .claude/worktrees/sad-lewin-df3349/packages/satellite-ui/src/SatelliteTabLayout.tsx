import { getTokens } from '@zhop/hexastral-tokens/palette'
import { Tabs } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { View, useColorScheme } from 'react-native'

export interface SatelliteTabItem {
  name: string
  title: string
  icon: LucideIcon
  hidden?: boolean
}

export interface SatelliteTabLayoutProps {
  tabs: SatelliteTabItem[]
}

export function SatelliteTabLayout(props: SatelliteTabLayoutProps) {
  const colors = getTokens(useColorScheme() === 'dark')

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: colors.bg }} />,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.separator,
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 0,
        },
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
            tabBarIcon: ({ color, size }) => <tab.icon color={color} size={size} strokeWidth={1} />,
          }}
        />
      ))}
    </Tabs>
  )
}
