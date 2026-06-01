/**
 * RevealMoment — the emotional peak shown after a bond is created.
 *
 * Total runtime: ~2.7s, choreographed:
 *   t=0     dark-mode crossfade from rice-paper bg → rubbing.void
 *   t=0     A chart wheel slides in from top-left (rotate -180→0, spring)
 *   t=200   B chart wheel slides in from bottom-right (rotate +180→0, spring)
 *   t=1000  both wheels converge (translate toward center)
 *   t=1200  5 gold connecting lines stroke-dash draw, staggered 100ms
 *   t=2000  Cinnabar 緣 seal stamps down (scale 1.5→1.0, rotate -8→0, 320ms)
 *           Haptics.impactAsync(Heavy) fires synchronously
 *   t=2200  "你们的相遇" line 1 fades in
 *   t=2300  "并非偶然" line 2 fades in
 *   t=2680  "阅读你们的故事 →" CTA fades in
 *
 * Designed to be shown ONCE per bond (first reveal). On subsequent visits the
 * screen renders the terminal state directly without animation. Pass
 * `playAnimation={false}` to skip.
 *
 * Respect a11y: when `useReducedMotion()` returns true, skip all animations.
 */

import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { Svg, Circle, Path } from 'react-native-svg'
import { cinnabar, ink, ricePaper, rubbing } from '@zhop/hexastral-tokens'
import { yuanType } from '@zhop/hexastral-tokens/yuan'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const STAMP_EASING = Easing.bezier(0.32, 0.0, 0.67, 0.32)

export interface RevealMomentProps {
  /** A user's day-master glyph (天干), e.g. "甲" */
  selfGlyph?: string
  /** B user's day-master glyph */
  otherGlyph?: string
  /** Skip animations on subsequent visits */
  playAnimation?: boolean
  /** CTA callback — tap "阅读你们的故事 →" */
  onContinue: () => void
  /** Localized strings; defaults Chinese */
  copy?: {
    line1?: string
    line2?: string
    cta?: string
  }
}

const DEFAULT_COPY = {
  line1: '你们的相遇',
  line2: '并非偶然',
  cta: '阅读你们的故事  →',
} as const

const SCREEN_WIDTH_HINT = 360

export function RevealMoment({
  selfGlyph = '甲',
  otherGlyph = '乙',
  playAnimation = true,
  onContinue,
  copy,
}: RevealMomentProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }
  const reduced = useReducedMotion()
  const animate = playAnimation && !reduced

  // Initial values: if not animating, jump to terminal state immediately
  const bgFade = useSharedValue(animate ? 0 : 1)
  const wheelAOpacity = useSharedValue(animate ? 0 : 1)
  const wheelARotate = useSharedValue(animate ? -180 : 0)
  const wheelAOffset = useSharedValue(animate ? -40 : 0)
  const wheelBOpacity = useSharedValue(animate ? 0 : 1)
  const wheelBRotate = useSharedValue(animate ? 180 : 0)
  const wheelBOffset = useSharedValue(animate ? 40 : 0)
  const lineProgress = useSharedValue(animate ? 1 : 0)
  const sealScale = useSharedValue(animate ? 1.5 : 1.0)
  const sealOpacity = useSharedValue(animate ? 0 : 1)
  const sealRotate = useSharedValue(animate ? -8 : 0)
  const text1Opacity = useSharedValue(animate ? 0 : 1)
  const text2Opacity = useSharedValue(animate ? 0 : 1)
  const ctaOpacity = useSharedValue(animate ? 0 : 1)

  useEffect(() => {
    if (!animate) return

    // t=0
    bgFade.value = withTiming(1, { duration: 600 })
    wheelAOpacity.value = withTiming(1, { duration: 800 })
    wheelARotate.value = withTiming(0, { duration: 800 })

    // t=200
    wheelBOpacity.value = withDelay(200, withTiming(1, { duration: 800 }))
    wheelBRotate.value = withDelay(200, withTiming(0, { duration: 800 }))

    // t=1000 — wheels converge
    wheelAOffset.value = withDelay(1000, withTiming(0, { duration: 600 }))
    wheelBOffset.value = withDelay(1000, withTiming(0, { duration: 600 }))

    // t=1200 — connecting lines draw
    lineProgress.value = withDelay(1200, withTiming(0, { duration: 1000 }))

    // t=2000 — seal stamp + haptic
    const stampTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      sealScale.value = withTiming(1.0, { duration: 320, easing: STAMP_EASING })
      sealOpacity.value = withTiming(1.0, { duration: 320 })
      sealRotate.value = withTiming(0, { duration: 320, easing: STAMP_EASING })
    }, 2000)

    // t=2200 / t=2300 / t=2680 — text fades
    text1Opacity.value = withDelay(2200, withTiming(1, { duration: 480 }))
    text2Opacity.value = withDelay(2300, withTiming(1, { duration: 480 }))
    ctaOpacity.value = withDelay(2680, withTiming(1, { duration: 480 }))

    return () => clearTimeout(stampTimer)
  }, [animate])

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgFade.value }))
  const wheelAStyle = useAnimatedStyle(() => ({
    opacity: wheelAOpacity.value,
    transform: [
      { translateX: wheelAOffset.value - 60 },
      { translateY: -80 },
      { rotate: `${wheelARotate.value}deg` },
    ],
  }))
  const wheelBStyle = useAnimatedStyle(() => ({
    opacity: wheelBOpacity.value,
    transform: [
      { translateX: wheelBOffset.value + 60 },
      { translateY: 80 },
      { rotate: `${wheelBRotate.value}deg` },
    ],
  }))
  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [
      { scale: sealScale.value },
      { rotate: `${sealRotate.value}deg` },
    ],
  }))
  const text1Style = useAnimatedStyle(() => ({ opacity: text1Opacity.value }))
  const text2Style = useAnimatedStyle(() => ({ opacity: text2Opacity.value }))
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }))

  return (
    <View style={styles.root}>
      {/* Background — rice-paper underneath, void crossfading over */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: ricePaper.ivory }]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]}>
        <LinearGradient
          colors={[rubbing.void, rubbing.stone, rubbing.void]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* A and B chart wheels — minimal 12-sector radial + center glyph */}
      <Animated.View style={[styles.wheelContainer, wheelAStyle]}>
        <ChartWheel glyph={selfGlyph} />
      </Animated.View>
      <Animated.View style={[styles.wheelContainer, wheelBStyle]}>
        <ChartWheel glyph={otherGlyph} />
      </Animated.View>

      {/* Connecting lines between wheels — 5 gold paths, animated stroke-dashoffset */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {CONNECTING_LINES.map((d, i) => (
          <ConnectingLine key={i} d={d} delay={i * 100} progress={lineProgress} />
        ))}
      </Svg>

      {/* Cinnabar seal */}
      <View style={styles.sealAnchor} pointerEvents="none">
        <Animated.View style={[styles.seal, sealStyle]}>
          <Text style={styles.sealGlyph}>緣</Text>
        </Animated.View>
      </View>

      {/* Text lines */}
      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text style={[yuanType.title, styles.textLine, text1Style]}>
          {merged.line1}
        </Animated.Text>
        <Animated.Text style={[yuanType.title, styles.textLine, text2Style]}>
          {merged.line2}
        </Animated.Text>
      </View>

      {/* CTA */}
      <Animated.View style={[styles.ctaWrapper, ctaStyle]}>
        <Pressable onPress={onContinue} hitSlop={16}>
          <Text style={[yuanType.heading, styles.cta]}>{merged.cta}</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ChartWheel({ glyph }: { glyph: string }) {
  const size = 140
  const r = size / 2 - 2
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ink.gold}
          strokeWidth={1}
          fill="none"
        />
        {/* 12 radial dividers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          const x1 = size / 2 + Math.cos(angle) * (r * 0.55)
          const y1 = size / 2 + Math.sin(angle) * (r * 0.55)
          const x2 = size / 2 + Math.cos(angle) * r
          const y2 = size / 2 + Math.sin(angle) * r
          return (
            <Path
              key={i}
              d={`M${x1},${y1} L${x2},${y2}`}
              stroke={ink.goldMuted}
              strokeWidth={0.5}
            />
          )
        })}
      </Svg>
      <Text style={{ fontSize: 36, color: ink.gold, fontWeight: '300' }}>{glyph}</Text>
    </View>
  )
}

function ConnectingLine({
  d,
  delay,
  progress,
}: {
  d: string
  delay: number
  progress: Animated.SharedValue<number>
}) {
  const animatedProps = useAnimatedStyle(() => ({
    opacity: 1,
  }))
  // strokeDashoffset is animated via reanimated; we use Animated.View wrapper
  return (
    <AnimatedPath
      d={d}
      stroke={ink.gold}
      strokeWidth={0.75}
      fill="none"
      strokeDasharray="300"
      strokeDashoffset={progress.value * 300}
      strokeLinecap="round"
      style={animatedProps}
    />
  )
}

// 5 hand-drawn-ish curve paths connecting A wheel (left, y~25%) to B wheel (right, y~75%).
// Tuned for ~360px viewport; precise positions adapt at runtime via SVG viewBox.
const CONNECTING_LINES = [
  'M 120 100 Q 180 150, 240 200',
  'M 130 110 Q 200 160, 230 210',
  'M 110 90 Q 170 145, 250 195',
  'M 125 95 Q 190 155, 235 205',
  'M 115 105 Q 195 150, 245 200',
]

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ricePaper.ivory,
  },
  wheelContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    marginLeft: -70,
    marginTop: -70,
  },
  sealAnchor: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    marginLeft: -48,
    marginTop: -48,
  },
  seal: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: cinnabar.seal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealGlyph: {
    fontSize: 48,
    lineHeight: 56,
    color: ink.gold,
    fontWeight: '400',
  },
  textBlock: {
    position: 'absolute',
    top: '65%',
    width: '100%',
    alignItems: 'center',
  },
  textLine: {
    color: ricePaper.ivory,
    textAlign: 'center',
  },
  ctaWrapper: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    color: ink.gold,
  },
})
