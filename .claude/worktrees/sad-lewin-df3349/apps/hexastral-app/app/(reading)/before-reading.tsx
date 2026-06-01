/**
 * 解读前引导 — 原生 iOS formSheet
 *
 * 使用 Expo Router presentation: 'formSheet'，
 * 无遮罩层，原生层级关系自然展示前后 page 栈。
 *
 * 路由参数: ?type=yiching|meihua|fengshui|stellar
 * 用法: router.push('/before-reading?type=stellar')
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Heart, Star } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrigramIcon } from '@/components/divination/TrigramIcon'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

type ReadingType = 'yiching' | 'meihua' | 'stellar' | 'synastry'

const TYPE_CONFIG: Record<ReadingType, { bodyKeys: string[]; icon: (color: string) => ReactNode }> =
  {
    yiching: {
      bodyKeys: ['before_reading_modal_body_yiching'],
      icon: (color) => <TrigramIcon size={22} color={color} />,
    },
    meihua: {
      bodyKeys: ['before_reading_modal_body_meihua'],
      icon: (color) => <TrigramIcon size={22} color={color} />,
    },
    stellar: {
      bodyKeys: ['before_reading_modal_body_stellar'],
      icon: (color) => <Star size={22} color={color} />,
    },
    synastry: {
      bodyKeys: ['before_reading_modal_body_synastry'],
      icon: (color) => <Heart size={22} color={color} strokeWidth={1.5} />,
    },
  }

export default function BeforeReadingScreen() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const router = useRouter()
  const params = useLocalSearchParams<{ type?: string }>()

  const insets = useSafeAreaInsets()
  const type = (params.type as ReadingType) ?? 'yiching'
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.yiching

  // Icon accent: gold for divination (卜), purple for charts (命/山)
  const accentColor = type === 'stellar' ? colors.primary : colors.accent

  const bodyTexts = config.bodyKeys.map((key) => t(key as Parameters<typeof t>[0]))

  return (
    <View style={{ flex: 1, backgroundColor: colors.card, flexDirection: 'column' }}>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.45, 0.75],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      {/* Custom header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: `${colors.border}80`,
          flexShrink: 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {config.icon(accentColor)}
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
            {t('before_reading_modal_title')}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            await AsyncStorage.setItem('hexastral_before_reading_confirmed', type)
            router.back()
          }}
          hitSlop={12}
          style={{ padding: 4 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: accentColor }}>Done</Text>
        </Pressable>
      </View>

      {/* Scrollable body — fills remaining space */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {bodyTexts.map((text, i) => (
          <View key={i}>
            {i > 0 && (
              <View
                style={{ height: 0.5, backgroundColor: `${colors.border}60`, marginVertical: 20 }}
              />
            )}
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                lineHeight: 26,
              }}
            >
              {text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer button — always visible at bottom of flex column */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          backgroundColor: colors.card,
          borderTopWidth: 0.5,
          borderTopColor: `${colors.border}60`,
          flexShrink: 0,
        }}
      >
        <Pressable
          onPress={async () => {
            await AsyncStorage.setItem('hexastral_before_reading_confirmed', type)
            router.back()
          }}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            borderRadius: 0,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.background,
              letterSpacing: 0.5,
            }}
          >
            {t('before_reading_modal_confirm')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
