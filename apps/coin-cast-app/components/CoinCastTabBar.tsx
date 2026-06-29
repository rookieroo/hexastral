/**
 * CoinCastTabBar — a bespoke bottom bar (replaces the generic satellite tab bar
 * for this app only). Kindred-restraint: dark ground, hairline top, an amber
 * accent pill behind the focused icon, quiet labels. No notification badge.
 *
 * Typed against a minimal local shape so we don't take a direct dependency on
 * `@react-navigation/bottom-tabs` (it's only a transitive dep here). The real
 * `BottomTabBarProps` object is structurally assignable to this subset.
 */
import { useTheme } from '@zhop/core-ui'
import { Coins, UserRound } from 'lucide-react-native'
import type { ComponentType, ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSatelliteI18n } from '@/lib/i18n'

type TabIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>

const ICONS: Record<string, TabIcon> = { index: Coins, me: UserRound }
const ORACLE_LABEL: Record<string, string> = {
  en: 'Oracle',
  zh: '摇卦',
  'zh-Hant': '搖卦',
  ja: '卦',
}

export interface CoinCastTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean
    }
    navigate: (name: string) => void
  }
}

export function CoinCastTabBar({ state, navigation }: CoinCastTabBarProps): ReactElement {
  const { colors } = useTheme()
  const { t, uiLocale } = useSatelliteI18n()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg,
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const Icon = ICONS[route.name] ?? Coins
        const label = route.name === 'me' ? t('stackMe') : (ORACLE_LABEL[uiLocale] ?? 'Oracle')
        const tint = focused ? colors.accent : `${colors.secondary}99`
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole='button'
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 5 }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: focused ? colors.accentGhost : 'transparent',
              }}
            >
              <Icon color={tint} size={22} strokeWidth={focused ? 2 : 1.6} />
            </View>
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                fontWeight: focused ? '700' : '500',
                color: tint,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
