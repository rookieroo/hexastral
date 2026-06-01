/**
 * Magic Move Spike — now thin consumer of @zhop/core-ui/motion.
 *
 * V15Moon (visual) and useMagicMove (translate between slot refs) were
 * extracted from this spike into the core-ui package. This file is now just
 * a stage shell: splash/home layout + content fades + the magic-move hook
 * wiring. The actual moon rendering and translate animation live in core-ui.
 *
 * Route: /spike/flip-magic
 */

import { useMagicMove, V15Moon } from '@zhop/core-ui/motion'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const PHONE_W = 320
const PHONE_H = 680
const MOON_SIZE = 150

const DUR = 580
const EASE = Easing.bezier(0.4, 0, 0.2, 1)
const EASE_CONTENT = Easing.out(Easing.cubic)
const AUTO_SPLASH_HOLD = 1500
const AUTO_HOME_HOLD = 2400

export default function FlipMagicSpike() {
  const phoneRef = useAnimatedRef<View>()
  const splashSlotRef = useAnimatedRef<View>()
  const heroSlotRef = useAnimatedRef<View>()

  const magic = useMagicMove({ phoneRef, duration: DUR, easing: EASE })

  // Content opacities + rise (caller owns these; magic-move only handles moon translate)
  const splashBgOpacity = useSharedValue(1)
  const splashTextOpacity = useSharedValue(1)
  const homeContentOpacity = useSharedValue(0)
  const homeContentY = useSharedValue(10)

  const [stage, setStage] = useState<'splash' | 'home'>('splash')

  // FPS
  const [fps, setFps] = useState(0)
  const fpsShared = useSharedValue(0)
  const _frames = useSharedValue(0)
  const _lastT = useSharedValue(0)
  useFrameCallback((info) => {
    'worklet'
    _frames.value += 1
    if (_lastT.value === 0) _lastT.value = info.timestamp
    const elapsed = info.timestamp - _lastT.value
    if (elapsed >= 500) {
      fpsShared.value = Math.round((_frames.value * 1000) / elapsed)
      _frames.value = 0
      _lastT.value = info.timestamp
    }
  }, true)
  useAnimatedReaction(
    () => fpsShared.value,
    (cur, prev) => {
      if (cur !== prev && cur > 0) runOnJS(setFps)(cur)
    }
  )

  // Snap moon to splash slot on mount (once layout settles)
  useEffect(() => {
    const t = setTimeout(() => magic.snapTo(splashSlotRef), 60)
    return () => clearTimeout(t)
  }, [magic, splashSlotRef])

  const goHome = () => {
    magic.moveTo(heroSlotRef)
    splashBgOpacity.value = withTiming(0, { duration: DUR, easing: EASE })
    splashTextOpacity.value = withTiming(0, {
      duration: Math.round(DUR * 0.6),
      easing: EASE,
    })
    homeContentOpacity.value = withTiming(1, {
      duration: Math.round(DUR * 0.7),
      easing: EASE_CONTENT,
    })
    homeContentY.value = withTiming(0, {
      duration: Math.round(DUR * 0.7),
      easing: EASE_CONTENT,
    })
    setTimeout(() => setStage('home'), DUR)
  }

  const goSplash = () => {
    magic.moveTo(splashSlotRef)
    splashBgOpacity.value = withTiming(1, { duration: DUR, easing: EASE })
    splashTextOpacity.value = withTiming(1, {
      duration: Math.round(DUR * 0.6),
      easing: EASE,
    })
    homeContentOpacity.value = withTiming(0, {
      duration: Math.round(DUR * 0.4),
      easing: EASE,
    })
    homeContentY.value = withTiming(10, {
      duration: Math.round(DUR * 0.4),
      easing: EASE,
    })
    setTimeout(() => setStage('splash'), DUR)
  }

  // Auto-loop
  useEffect(() => {
    if (stage === 'splash') {
      const t = setTimeout(goHome, AUTO_SPLASH_HOLD)
      return () => clearTimeout(t)
    }
    const t = setTimeout(goSplash, AUTO_HOME_HOLD)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const splashBgStyle = useAnimatedStyle(() => ({
    opacity: splashBgOpacity.value,
  }))
  const splashTextStyle = useAnimatedStyle(() => ({
    opacity: splashTextOpacity.value,
  }))
  const homeContentStyle = useAnimatedStyle(() => ({
    opacity: homeContentOpacity.value,
    transform: [{ translateY: homeContentY.value }],
  }))

  const onPhoneTap = stage === 'splash' ? goHome : goSplash

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Magic Move · core-ui Consumer</Text>
      <Text style={styles.sub}>V15Moon + useMagicMove · FPS {fps || '—'}</Text>

      <Pressable onPress={onPhoneTap}>
        <View ref={phoneRef} collapsable={false} style={styles.phone}>
          <Animated.View style={[styles.absFill, styles.splashBg, splashBgStyle]} />
          <View style={[styles.absFill, styles.homeBg]} />

          <View style={styles.shareNav}>
            <View style={styles.shareDot} />
            <View style={[styles.shareDot, { marginLeft: 4 }]} />
            <View style={[styles.shareDot, { marginLeft: 4 }]} />
          </View>

          {/* Splash layout — centred slot + wm + wms */}
          <Animated.View style={[styles.splashLayout, splashTextStyle]}>
            <View ref={splashSlotRef} collapsable={false} style={styles.moonSlot} />
            <Text style={styles.wm}>
              HEXASTRAL <Text style={styles.wmCn}>命</Text>
            </Text>
            <Text style={styles.wms}>LIFELONG BIRTH CHART</Text>
          </Animated.View>

          {/* Home layout — hk + slot + sig + sigs + pills */}
          <Animated.View style={[styles.homeLayout, homeContentStyle]}>
            <Text style={styles.hk}>今日 · 庚子</Text>
            <View ref={heroSlotRef} collapsable={false} style={styles.moonSlot} />
            <Text style={styles.sig}>宜 静思 · 忌 远行</Text>
            <Text style={styles.sigs}>今日命签</Text>
            <View style={styles.pills}>
              <Text style={styles.pill}>木旺</Text>
              <Text style={styles.pill}>水相</Text>
              <Text style={styles.pill}>火休</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.ctaWrap, homeContentStyle]} pointerEvents='none'>
            <View style={styles.cta}>
              <View style={styles.ctaDot} />
              <Text style={styles.ctaText}>展开命书</Text>
            </View>
          </Animated.View>

          {/* THE ONE MOON — animated translate via useMagicMove */}
          <Animated.View style={[styles.moonAbs, magic.moonStyle]} pointerEvents='none'>
            <V15Moon size={MOON_SIZE} />
          </Animated.View>
        </View>
      </Pressable>

      <View style={styles.controls}>
        <Pressable
          onPress={onPhoneTap}
          style={({ pressed }) => [
            styles.btn,
            { opacity: pressed ? 0.7 : 1 },
            stage === 'splash' ? styles.btnPrimary : styles.btnGhost,
          ]}
        >
          <Text style={stage === 'splash' ? styles.btnTextPrimary : styles.btnText}>
            {stage === 'splash' ? '▶  magic move' : '↩  back to splash'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070605',
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  title: {
    color: '#C2A878',
    fontSize: 11,
    letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sub: {
    color: '#8A8170',
    fontSize: 11,
    marginBottom: 12,
    textAlign: 'center',
  },
  phone: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233,226,210,0.1)',
    backgroundColor: '#0C0B0A',
  },
  absFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  splashBg: { backgroundColor: '#EAE3D2' },
  homeBg: { backgroundColor: '#0C0B0A' },

  shareNav: {
    position: 'absolute',
    top: 18,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E9E2D2',
    opacity: 0.8,
  },

  splashLayout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonSlot: { width: MOON_SIZE, height: MOON_SIZE },
  wm: {
    color: '#2a241a',
    fontSize: 20,
    letterSpacing: 6,
    marginTop: 24,
  },
  wmCn: { color: '#9B2226', fontSize: 20 },
  wms: {
    color: '#9b8c66',
    fontSize: 9,
    letterSpacing: 5,
    marginTop: 7,
  },

  homeLayout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 50,
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  hk: {
    color: '#C2A878',
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  sig: {
    color: '#E9E2D2',
    fontSize: 23,
    letterSpacing: 2,
    marginTop: 6,
  },
  sigs: {
    color: '#5A5446',
    fontSize: 10.5,
    letterSpacing: 2,
    marginTop: 6,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    justifyContent: 'center',
  },
  pill: {
    color: '#8A8170',
    fontSize: 10.5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(233,226,210,0.2)',
  },

  ctaWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
  },
  cta: {
    height: 48,
    borderRadius: 13,
    backgroundColor: '#9B2226',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f4ecdc',
    marginRight: 10,
    opacity: 0.85,
  },
  ctaText: {
    color: '#f4ecdc',
    fontSize: 13,
    letterSpacing: 3,
  },

  moonAbs: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MOON_SIZE,
    height: MOON_SIZE,
  },

  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  btn: {
    paddingHorizontal: 22,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#9B2226' },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(194,168,120,0.4)',
    backgroundColor: '#17150f',
  },
  btnTextPrimary: { color: '#f4ecdc', fontSize: 13, letterSpacing: 3 },
  btnText: { color: '#E9E2D2', fontSize: 12, letterSpacing: 2 },
})
