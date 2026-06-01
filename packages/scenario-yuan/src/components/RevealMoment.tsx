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

import { cinnabar, ink, ricePaper, rubbing } from '@zhop/hexastral-tokens'
import { yuanType } from '@zhop/hexastral-tokens/yuan'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Circle, Path, Svg } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const STAMP_EASING = Easing.bezier(0.32, 0.0, 0.67, 0.32)

// Golden-ratio constants used to place the thread's Bézier control points.
// 1/φ and 1/φ² are the canonical "balanced" positions along an AB segment that
// avoid mid-point symmetry; the eye reads them as natural rather than mechanical.
const PHI_INV = 0.6180339887498949
const PHI_INV_SQ = 0.38196601125010515

// Two anchor points (A wheel center / B wheel center) in the SVG viewport.
// Matches the post-convergence positions of the chart wheels — see styles
// below: container at left:50% top:30% with translateX±60 and translateY±80.
// We approximate the viewport as 360×640 for path drawing; SVG scales.
const A_X = 120
const A_Y = 192 // 30% of 640
const B_X = 240
const B_Y = 352 // 30% of 640 + 160px gap

const VEC_X = B_X - A_X
const VEC_Y = B_Y - A_Y
const LEN = Math.sqrt(VEC_X * VEC_X + VEC_Y * VEC_Y)
const PERP_X = -VEC_Y / LEN
const PERP_Y = VEC_X / LEN

// Five strands. Phases are evenly spaced around 2π so the bundle drifts as a
// woven group rather than a single line. Amplitudes vary mildly to give the
// thread "personality" — the widest strand frames the bundle.
const STRANDS: ReadonlyArray<{ phase: number; amp: number; ampShift: number }> = [
  { phase: 0.0, amp: 22, ampShift: 6 },
  { phase: 1.2566, amp: 14, ampShift: 4 }, // 2π/5
  { phase: 2.5133, amp: 26, ampShift: 8 },
  { phase: 3.7699, amp: 16, ampShift: 5 },
  { phase: 5.0265, amp: 12, ampShift: 3 },
]

const WAFT_PERIOD_MS = 5200

// Hint kept to document the design coordinate space — paths/positions assume
// a ~360×640 reference viewport that the SVG scales to fit the device.

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
  // Continuous 0→2π loop driving the strand waft; starts after the draw-in.
  const waftPhase = useSharedValue(0)
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

    // t=1200 — connecting lines draw (stroke-dashoffset → 0)
    lineProgress.value = withDelay(1200, withTiming(0, { duration: 1000 }))

    // After the draw-in finishes (~t=2200), start an infinite slow waft cycle
    // so the bundle reads as a living red thread rather than static geometry.
    waftPhase.value = withDelay(
      2200,
      withRepeat(withTiming(Math.PI * 2, { duration: WAFT_PERIOD_MS, easing: Easing.linear }), -1)
    )

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
    transform: [{ scale: sealScale.value }, { rotate: `${sealRotate.value}deg` }],
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

      {/* Connecting lines between wheels — 5 cinnabar threads, golden-ratio
          Bézier control points with a continuous sin-driven waft. */}
      <Svg
        style={StyleSheet.absoluteFillObject}
        viewBox='0 0 360 640'
        preserveAspectRatio='xMidYMid meet'
        pointerEvents='none'
      >
        {STRANDS.map((strand, i) => (
          <ConnectingThread
            key={i}
            strand={strand}
            progress={lineProgress}
            waft={waftPhase}
          />
        ))}
      </Svg>

      {/* Cinnabar seal */}
      <View style={styles.sealAnchor} pointerEvents='none'>
        <Animated.View style={[styles.seal, sealStyle]}>
          <Text style={styles.sealGlyph}>緣</Text>
        </Animated.View>
      </View>

      {/* Text lines */}
      <View style={styles.textBlock} pointerEvents='none'>
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
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={ink.gold} strokeWidth={1} fill='none' />
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

/**
 * A single red-thread strand. The path is recomputed on every UI-thread frame:
 *  - Start/end anchored at A and B (chart-wheel centers).
 *  - Two cubic-Bézier control points placed at the golden-ratio splits along
 *    AB (1/φ and 1/φ²), then displaced perpendicular to AB by a sin wave.
 *  - Each strand's wave has its own phase + amplitude so the bundle weaves
 *    instead of moving in lockstep.
 *  - `strokeDashoffset` interpolates the initial draw-in (progress 1→0).
 */
function ConnectingThread({
  strand,
  progress,
  waft,
}: {
  strand: { phase: number; amp: number; ampShift: number }
  progress: SharedValue<number>
  waft: SharedValue<number>
}) {
  const animatedProps = useAnimatedProps(() => {
    'worklet'
    const t = waft.value + strand.phase
    const amp = strand.amp + strand.ampShift * Math.sin(t * 0.5)
    const wave1 = Math.sin(t) * amp
    const wave2 = Math.sin(t + Math.PI / 3) * amp * 0.7

    const cp1x = A_X + VEC_X * PHI_INV + PERP_X * wave1
    const cp1y = A_Y + VEC_Y * PHI_INV + PERP_Y * wave1
    const cp2x = A_X + VEC_X * PHI_INV_SQ + PERP_X * wave2
    const cp2y = A_Y + VEC_Y * PHI_INV_SQ + PERP_Y * wave2

    return {
      d: `M${A_X},${A_Y} C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${B_X},${B_Y}`,
      strokeDashoffset: progress.value * 360,
    }
  })

  return (
    <AnimatedPath
      stroke={cinnabar.seal}
      strokeWidth={1}
      strokeOpacity={0.85}
      fill='none'
      strokeDasharray='360'
      strokeLinecap='round'
      animatedProps={animatedProps}
    />
  )
}

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
