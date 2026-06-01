/**
 * Hexastral 4-Tab Layout — Eastern metaphysical terminology
 * 命 Fate | 缘 Bonds | 卦 Oracle | 道 Path
 *
 * Old feature tabs (stellar, yiching, fengshui, natal, physiognomy, profile, shop)
 * remain as stack-navigable screens but are hidden from the tab bar.
 */

import { Tabs } from 'expo-router'
import { Circle, Compass, Heart, Star } from 'lucide-react-native'
import { View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function TabLayout() {
  const { colors } = useTheme()
  const { t } = useI18n()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: colors.background }} />,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 0,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: `${colors.textSecondary}88`,
        tabBarLabelStyle: {
          fontWeight: '600',
          letterSpacing: 1,
        },
      }}
    >
      {/* 命 Fate — Daily fortune + star chart */}
      <Tabs.Screen
        name='index'
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, size }) => <Star color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* 缘 Bonds — Social + compatibility */}
      <Tabs.Screen
        name='friends'
        options={{
          title: t('tab_friends'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* 卦 Oracle — Divination quick questions */}
      <Tabs.Screen
        name='void'
        options={{
          title: t('tab_void'),
          tabBarIcon: ({ color, size }) => <Circle color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* 道 Path — Profile + Settings */}
      <Tabs.Screen
        name='you'
        options={{
          title: t('tab_you'),
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* Hidden screens — accessible via stack navigation */}
      <Tabs.Screen name='shop' options={{ href: null }} />
      <Tabs.Screen name='yiching' options={{ href: null }} />
      <Tabs.Screen name='stellar' options={{ href: null }} />
      <Tabs.Screen name='synastry' options={{ href: null }} />
      <Tabs.Screen name='natal' options={{ href: null }} />
      <Tabs.Screen name='profile' options={{ href: null }} />
      {/* Report book lives inside (tabs) so the bottom tab bar persists when
          the user opens the TOC or a chapter detail. */}
      <Tabs.Screen name='report' options={{ href: null }} />
    </Tabs>
  )
}
