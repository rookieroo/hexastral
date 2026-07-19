/**
 * Cold-open — mark + wordmark only; tap anywhere.
 * No stacked taglines — keep the first frame quiet.
 */

import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable, Text } from 'react-native'
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

const HINT = {
  en: 'tap',
  zh: '轻触',
  'zh-Hant': '輕觸',
  ja: 'タップ',
} as const

export default function IntroScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const hint = useMemo(() => HINT[locale] ?? HINT.en, [locale])
  const advanced = useRef(false)
  const fade = useSharedValue(1)
  const sceneStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  const go = () => router.replace('/(app)')

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    void markOnboardingComplete()
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
      accessibilityLabel={hint}
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
            gap: spacing.md,
          },
          sceneStyle,
        ]}
      >
        <Animated.View entering={FadeIn.duration(900)}>
          <XingqiMark size={96} color={colors.accent} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200).duration(700)}>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: '500',
              letterSpacing: 4,
            }}
          >
            Xingqi
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(600).duration(800)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + spacing.xl * 2,
          }}
        >
          <Text
            style={{
              color: colors.dim,
              fontSize: 12,
              letterSpacing: 3,
              textTransform: 'lowercase',
            }}
          >
            {hint}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}
