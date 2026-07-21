/**
 * Cold-open — mark + wordmark only; tap anywhere.
 * Mark flies toward the home-header corner, then we replace onto (app)
 * with no stack animation (root + nested index both use animation: none).
 */

import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable, Text, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
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

const INTRO_MARK = 96
const HOME_MARK = 28
const FLY_MS = 480

export default function IntroScreen() {
  const router = useRouter()
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const locale = resolveLocale()
  const hint = useMemo(() => HINT[locale] ?? HINT.en, [locale])
  const advanced = useRef(false)

  const markScale = useSharedValue(1)
  const markTx = useSharedValue(0)
  const markTy = useSharedValue(0)
  const chromeOpacity = useSharedValue(1)

  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: markTx.value },
      { translateY: markTy.value },
      { scale: markScale.value },
    ],
  }))
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }))

  const landOnHome = () => {
    router.replace('/(app)' as never)
  }

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    void markOnboardingComplete()

    const homeX = spacing.xl + HOME_MARK / 2
    const homeY = insets.top + spacing.md + HOME_MARK / 2
    const introX = width / 2
    const introY = height / 2 - 12
    const easing = Easing.out(Easing.cubic)

    markTx.value = withTiming(homeX - introX, { duration: FLY_MS, easing })
    markTy.value = withTiming(homeY - introY, { duration: FLY_MS, easing })
    chromeOpacity.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) })
    markScale.value = withTiming(
      HOME_MARK / INTRO_MARK,
      { duration: FLY_MS, easing },
      (finished) => {
        if (finished) runOnJS(landOnHome)()
      }
    )
  }

  return (
    <Pressable
      style={{ flex: 1, backgroundColor: colors.bg }}
      onPress={advance}
      accessibilityRole='button'
      accessibilityLabel={hint}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
        }}
      >
        <Animated.View style={markStyle}>
          <XingqiMark size={INTRO_MARK} color={colors.accent} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200).duration(700)} style={chromeStyle}>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: '500',
              letterSpacing: 4,
            }}
          >
            Syel
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(600).duration(800)}
          style={[
            chromeStyle,
            {
              position: 'absolute',
              bottom: insets.bottom + spacing.xl * 2,
            },
          ]}
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
