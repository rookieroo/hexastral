/**
 * Hexastral 3-Tab Layout — Personal Fate flagship per ADR-0007 / Phase J · J.3.3
 * 命 Fate | 书 Report | 我 You
 *
 * Bonds (Kindred) lives in the Kindred companion now; tap a DiscoveryCard on the Fate
 * home to deep-link. Oracle (卦/void) is folded into the Fate home as a card
 * strip or surfaced via DiscoveryCard to coin-cast / numerology.
 *
 * Old feature tabs (stellar, yiching, fengshui, natal, physiognomy, profile,
 * shop, friends, void) remain as stack-navigable screens but are hidden from
 * the tab bar.
 */

import { Tabs } from 'expo-router'
import { BookOpen, Compass, Star } from 'lucide-react-native'
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
      {/* 命 Fate — Daily fortune + star chart + discovery cards */}
      <Tabs.Screen
        name='index'
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, size }) => <Star color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* 书 Report — Personal life-chart book (was hidden; now primary tab) */}
      <Tabs.Screen
        name='report'
        options={{
          title: t('tab_report'),
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* 我 You — Profile + Settings */}
      <Tabs.Screen
        name='you'
        options={{
          title: t('tab_you'),
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} strokeWidth={1} />,
        }}
      />
      {/* Hidden screens — accessible via stack navigation. `friends`,
          `void`, `yiching` were deleted in Phase J · J.3.2 and are no
          longer registered. */}
      <Tabs.Screen name='shop' options={{ href: null }} />
      <Tabs.Screen name='stellar' options={{ href: null }} />
      <Tabs.Screen name='synastry' options={{ href: null }} />
      <Tabs.Screen name='natal' options={{ href: null }} />
      <Tabs.Screen name='profile' options={{ href: null }} />
    </Tabs>
  )
}
