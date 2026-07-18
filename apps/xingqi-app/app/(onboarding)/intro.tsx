/**
 * Cold-open — Yuel / Kanyu pattern: mark + lines + tap anywhere.
 * No button sheet; tap → replace into home.
 */

import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiMark } from '@/components/XingqiMark'
import { resolveLocale } from '@/lib/i18n'
import { markOnboardingComplete } from '@/lib/onboarding'

const COPY = {
  en: {
    lines: ['Form and breath,', 'read together.'] as [string, string],
    continue: 'tap to begin',
  },
  zh: {
    lines: ['形与气，', '对照而读。'] as [string, string],
    continue: '轻触开始',
  },
  'zh-Hant': {
    lines: ['形與氣，', '對照而讀。'] as [string, string],
    continue: '輕觸開始',
  },
  ja: {
    lines: ['形と気を、', 'あわせて読む。'] as [string, string],
    continue: 'タップして始める',
  },
} as const

export default function IntroScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale])
  const advanced = useRef(false)
  const fade = useSharedValue(1)
  const sceneStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  const go = () => router.replace('/(app)')

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    void markOnboardingComplete()
    // Keep outer Pressable opaque (colors.bg) so fade never reveals a white card.
    // Navigate mid-fade so home is mounted before intro hits 0.
    fade.value = withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) })
    setTimeout(() => {
      go()
    }, 160)
  }

  return (
    <Pressable
      style={{ flex: 1, backgroundColor: colors.bg }}
      onPress={advance}
      accessibilityRole='button'
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.lg,
            paddingHorizontal: spacing.xl,
          },
          sceneStyle,
        ]}
      >
        <Animated.View entering={FadeIn.duration(800)}>
          <XingqiMark size={88} color={colors.accent} />
        </Animated.View>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '600', letterSpacing: 1 }}>
          Xingqi
        </Text>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
            {copy.lines[0]}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>
            {copy.lines[1]}
          </Text>
        </View>
        <Text
          style={{
            color: colors.dim,
            fontSize: 13,
            letterSpacing: 1,
            marginTop: spacing.xl * 2,
          }}
        >
          {copy.continue}
        </Text>
      </Animated.View>
    </Pressable>
  )
}
