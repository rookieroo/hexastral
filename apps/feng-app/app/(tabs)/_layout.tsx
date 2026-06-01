/**
 * (tabs) layout — 4-tab bottom nav.
 *
 * Icons via lucide-react-native to match the rest of the workspace.
 */

import { Tabs } from 'expo-router'
import { Compass, Home, Scroll, User } from 'lucide-react-native'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { useFengTheme } from '@/lib/theme'

export default function TabsLayout() {
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMute,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: t.tab_sites,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name='compass'
        options={{
          title: t.tab_compass,
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name='readings'
        options={{
          title: t.tab_readings,
          tabBarIcon: ({ color, size }) => <Scroll color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: t.tab_profile,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
