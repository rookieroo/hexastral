/**
 * Cold-open — Fēng's first-run intro (Yuel cold-open parity, no Skia).
 *
 * A slowly-turning 罗盘 (the premium LuopanDial, same craft as the loader) under
 * the 風 wordmark, a couple of quiet lines, and a 朱砂 "tap to
 * begin". The tap is the ONLY way forward — the scene never auto-advances. On
 * tap the scene fades to the 墨 night ground, the flag is set, then we replace
 * into the home (which rises from the same night, so the hand-off is continuous).
 *
 * Reached ONLY on first launch (boot in `app/index.tsx` reads the seen-flag).
 */

import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FengMark } from '@/components/FengMark'
import { LuopanDial } from '@/components/LuopanDial'
import { type Locale, resolveLocale } from '@/lib/i18n'
import { markFengIntroSeen } from '@/lib/onboarding'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface IntroCopy {
  lines: [string, string]
  continue: string
}

const INTRO_COPY: Record<Locale, IntroCopy> = {
  zh: { lines: ['天地之间，自有其气。', '观山理水，安顿此身。'], continue: '轻触开始' },
  'zh-Hant': { lines: ['天地之間，自有其氣。', '觀山理水，安頓此身。'], continue: '輕觸開始' },
  ja: {
    lines: ['天地には、気の流れがある。', '地を読み、住まいを調える。'],
    continue: 'タップして始める',
  },
  en: { lines: ['The land has a shape.', 'Let it settle you.'], continue: 'tap to begin' },
}

export default function IntroScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const copy = useMemo(() => INTRO_COPY[resolveLocale()], [])
  const reduceMotion = useReducedMotion()

  const spin = useSharedValue(0)
  const fade = useSharedValue(1)
  const advanced = useRef(false)

  useEffect(() => {
    if (reduceMotion) return
    spin.value = withRepeat(withTiming(360, { duration: 48000, easing: Easing.linear }), -1, false)
  }, [spin, reduceMotion])

  const plateStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${spin.value}deg` }] }))
  const sceneStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  const go = () => router.replace({ pathname: '/(tabs)', params: { fromIntro: '1' } })

  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    void markFengIntroSeen()
    fade.value = withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(go)()
    })
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole='button'>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: FENG_PALETTE.night,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.xl,
          },
          sceneStyle,
        ]}
      >
        <StatusBar style='light' />

        <Animated.View
          entering={FadeIn.duration(900)}
          style={{ marginBottom: spacing.xxl + spacing.md }}
        >
          <FengMark size={60} />
        </Animated.View>

        {/* Slowly-turning 综合盘 — the same instrument as the Compass tab + loader,
            with its own 磁针 + 海底十字 built in. */}
        <View style={{ width: 264, height: 264, alignItems: 'center', justifyContent: 'center' }}>
          {/* soft neutral glow behind the plate (layered translucent, no Skia). */}
          <View
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: 'rgba(228,228,231,0.03)',
            }}
          />
          <Animated.View style={plateStyle}>
            <LuopanDial size={264} detail='full' />
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeIn.delay(400).duration(1000)}
          style={{ alignItems: 'center', gap: 6, marginTop: spacing.xl }}
        >
          <Text style={{ color: FENG_PALETTE.rice, fontSize: 17, letterSpacing: 1 }}>
            {copy.lines[0]}
          </Text>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 15, letterSpacing: 1 }}>
            {copy.lines[1]}
          </Text>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(1400).duration(1200)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + spacing.xxl,
            color: FENG_PALETTE.copperGold,
            fontSize: 13,
            letterSpacing: 2,
            opacity: 0.8,
          }}
        >
          {copy.continue}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}
