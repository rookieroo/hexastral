/**
 * Onboarding · Screen 0 — Comic-style intro animation.
 *
 * A ~23-second stick-figure parable: lone arrival → fleeting talk → fleeting
 * hug → the one that stays. Sets the emotional thesis (Kindred分 — connection
 * worth keeping) before any form input. Plays only on first launch
 * (gated by AsyncStorage key `yuan_intro_seen_v1` in app/index.tsx);
 * tap anywhere to skip.
 *
 * Style: dark night ground (ADR-0018 ink aesthetic) with ivory ink-brush
 * figures. Reanimated v4 drives positions/opacity; a JS-thread gait phase
 * (useWalkPhase) swings legs/arms while walking; pose changes (walk → talk →
 * hug → sit) are React-state transitions at scripted beats. The single f1↔f2
 * exchange is shaped as three envelopes — F1 greets (short), F2 explains
 * (long), F1 says goodbye (short) — to imply content, not just rhythm.
 */

import { V15Moon } from '@zhop/core-ui/motion'
import { rubbing, zinc } from '@zhop/hexastral-tokens'
import { kindredType } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Path } from 'react-native-svg'
import { type Pose, StickFigure, useWalkPhase } from '@/components/StickFigure'
import { resolveLocale } from '@/lib/i18n'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

const INTRO_COPY: Record<CopyLocale, { tap: string; continue: string }> = {
  en: { tap: 'tap to skip', continue: 'tap to begin' },
  zh: { tap: '轻触跳过', continue: '轻触开始' },
  'zh-Hant': { tap: '輕觸跳過', continue: '輕觸開始' },
  ja: { tap: 'タップでスキップ', continue: 'タップで始める' },
}

function pickIntroCopy(locale: string): { tap: string; continue: string } {
  if (locale === 'en' || locale === 'zh' || locale === 'zh-Hant' || locale === 'ja') {
    return INTRO_COPY[locale]
  }
  return INTRO_COPY.en
}

/* ── Palette (dark ground, ivory ink) ───────────────────────────────────── */
const BG = rubbing.void
const ARC = zinc[600]
const STAR = zinc[400]
const DOT = zinc[300]
const HINT_EARLY = zinc[500]
const HINT_LATE = zinc[300]

/* ── Timeline (ms) ──────────────────────────────────────────────────────── */
const T = {
  starsIn: 800,
  f1WalkIn: 1500,
  f1LookLeft: 3000,
  f1LookRight: 3700,
  f1LookCenter: 4400,
  f2WalkIn: 5000,
  // f1↔f2 exchange shaped as three envelopes
  talkA: 6500, // F1 greets (L, short)
  talkB: 7400, // F2 explains (R, long)
  talkC: 9200, // F1 goodbye (L, short)
  talkEnd: 9900,
  f2WalkOut: 10100,
  f3WalkIn: 12300,
  hug1Start: 13800,
  hug1End: 15300,
  f3WalkOut: 15500,
  f4WalkIn: 17800,
  hug2Start: 19300,
  sitDown: 20500,
  starsBright: 21800,
  ctaIn: 22800,
}

type TalkSide = 'L' | 'R' | null

/* ── Speech dots component ──────────────────────────────────────────────── */

function SpeechDots({
  visible,
  side,
  long,
}: {
  visible: boolean
  side: 'L' | 'R'
  long?: boolean
}) {
  const o1 = useSharedValue(0)
  const o2 = useSharedValue(0)
  const o3 = useSharedValue(0)
  // Longer envelopes cycle a touch slower — reads as a fuller "sentence".
  const step = long ? 280 : 200
  const hold = long ? 520 : 400

  useEffect(() => {
    if (!visible) {
      o1.value = withTiming(0, { duration: 180 })
      o2.value = withTiming(0, { duration: 180 })
      o3.value = withTiming(0, { duration: 180 })
      return
    }
    const loop = () => {
      o1.value = withSequence(
        withTiming(1, { duration: step }),
        withDelay(hold, withTiming(0, { duration: step }))
      )
      o2.value = withDelay(
        step,
        withSequence(
          withTiming(1, { duration: step }),
          withDelay(hold, withTiming(0, { duration: step }))
        )
      )
      o3.value = withDelay(
        step * 2,
        withSequence(
          withTiming(1, { duration: step }),
          withDelay(hold, withTiming(0, { duration: step }))
        )
      )
    }
    loop()
    const interval = setInterval(loop, step * 3 + hold)
    return () => clearInterval(interval)
  }, [visible, step, hold])

  const s1 = useAnimatedStyle(() => ({ opacity: o1.value }))
  const s2 = useAnimatedStyle(() => ({ opacity: o2.value }))
  const s3 = useAnimatedStyle(() => ({ opacity: o3.value }))

  const align = side === 'L' ? 'flex-end' : 'flex-start'

  return (
    <View
      pointerEvents='none'
      style={{ flexDirection: 'row', gap: 3, alignSelf: align as 'flex-end' | 'flex-start' }}
    >
      <Animated.View style={[styles.speechDot, s1]} />
      <Animated.View style={[styles.speechDot, s2]} />
      <Animated.View style={[styles.speechDot, s3]} />
    </View>
  )
}

/* ── Star field ─────────────────────────────────────────────────────────── */

interface Star {
  x: number
  y: number
  r: number
  phase: number
}

function StarField({
  width,
  height,
  brightSv,
}: {
  width: number
  height: number
  brightSv: SharedValue<number>
}) {
  const stars = useMemo<Star[]>(() => {
    // Deterministic positions — no Math.random per project conventions.
    const seeds: Array<[number, number, number, number]> = [
      [0.08, 0.12, 1.2, 0.0],
      [0.18, 0.06, 0.8, 0.3],
      [0.27, 0.22, 1.0, 0.6],
      [0.36, 0.09, 0.9, 0.9],
      [0.44, 0.18, 1.4, 0.2],
      [0.52, 0.04, 0.7, 0.5],
      [0.61, 0.15, 1.1, 0.8],
      [0.69, 0.25, 0.9, 0.1],
      [0.78, 0.08, 1.3, 0.4],
      [0.86, 0.19, 1.0, 0.7],
      [0.93, 0.11, 0.8, 0.0],
      [0.14, 0.3, 0.9, 0.55],
      [0.32, 0.34, 1.1, 0.15],
      [0.58, 0.32, 0.8, 0.85],
      [0.75, 0.36, 1.0, 0.45],
    ]
    return seeds.map(([fx, fy, r, phase]) => ({
      x: fx * width,
      y: fy * height,
      r,
      phase,
    }))
  }, [width, height])

  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents='none'>
      {stars.map((s, i) => (
        <StarDot key={i} star={s} brightSv={brightSv} />
      ))}
    </Svg>
  )
}

function StarDot({ star, brightSv }: { star: Star; brightSv: SharedValue<number> }) {
  // Each star has a per-star phase offset so they twinkle out of sync.
  const twinkle = useSharedValue(0)
  useEffect(() => {
    twinkle.value = withDelay(
      star.phase * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    )
    return () => cancelAnimation(twinkle)
  }, [])

  const animatedProps = useAnimatedProps(() => ({
    opacity: 0.15 + twinkle.value * 0.35 + brightSv.value * 0.45,
  }))

  return (
    <AnimatedCircle cx={star.x} cy={star.y} r={star.r} fill={STAR} animatedProps={animatedProps} />
  )
}

/* ── Main intro screen ──────────────────────────────────────────────────── */

export default function IntroScreen() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const locale = useMemo(() => resolveLocale(), [])
  const copy = useMemo(() => pickIntroCopy(locale), [locale])
  const { width, height } = useWindowDimensions()
  const groundY = height * 0.62
  const center = width / 2

  // Stage X positions
  const offLeft = -120
  const offRight = width + 120
  const slot1 = center - 36 // primary stays here through whole sequence
  const slot2R = center + 80
  // For hug, partner overlaps slot1
  const slotHug = slot1 + 40
  // The one who stays sits shoulder-to-shoulder with f1.
  const slotSit = slot1 - 24

  /* Animated values */
  const arcDraw = useSharedValue(reduced ? 0 : 1) // 1 = hidden, 0 = drawn
  const f1X = useSharedValue(reduced ? slot1 : offLeft)
  const f1Op = useSharedValue(reduced ? 1 : 0)
  const f2X = useSharedValue(offRight)
  const f2Op = useSharedValue(0)
  const f3X = useSharedValue(offRight)
  const f3Op = useSharedValue(0)
  const f4X = useSharedValue(offLeft)
  const f4Op = useSharedValue(0)
  const ctaOp = useSharedValue(reduced ? 1 : 0)
  const skipOp = useSharedValue(0)
  const starsBright = useSharedValue(0)

  /* Pose state — discrete transitions at scripted beats */
  const [f1Pose, setF1Pose] = useState<Pose>('walk')
  const [f2Pose, setF2Pose] = useState<Pose>('walk')
  const [f3Pose, setF3Pose] = useState<Pose>('walk')
  const [f4Pose, setF4Pose] = useState<Pose>('walk')
  const [talkSide, setTalkSide] = useState<TalkSide>(null)
  const [done, setDone] = useState<boolean>(reduced)

  // Continuous gait phase — runs only while some figure is walking.
  const anyWalking =
    f1Pose === 'walk' || f2Pose === 'walk' || f3Pose === 'walk' || f4Pose === 'walk'
  const walkPhase = useWalkPhase(anyWalking)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (reduced) {
      // Reduced-motion: jump to final frame (f1 standing, stars on, CTA visible).
      setF1Pose('stand')
      starsBright.value = 1
      setDone(true)
      return
    }

    const at = (ms: number, fn: () => void) => {
      timersRef.current.push(setTimeout(fn, ms))
    }

    // Background + planet arc drawing in
    arcDraw.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.quad) })
    starsBright.value = withDelay(T.starsIn, withTiming(0.4, { duration: 1200 }))
    skipOp.value = withDelay(800, withTiming(0.45, { duration: 600 }))

    // === Act 1: figure 1 arrives, looks around ===
    f1Op.value = withDelay(T.f1WalkIn, withTiming(1, { duration: 300 }))
    f1X.value = withDelay(
      T.f1WalkIn,
      withTiming(slot1, { duration: 1500, easing: Easing.out(Easing.cubic) })
    )
    at(T.f1WalkIn + 1500, () => setF1Pose('stand'))
    at(T.f1LookLeft, () => setF1Pose('lookL'))
    at(T.f1LookRight, () => setF1Pose('lookR'))
    at(T.f1LookCenter, () => setF1Pose('stand'))

    // === Act 2: figure 2 walks in; A/B/C exchange; figure 2 leaves ===
    at(T.f2WalkIn, () => setF2Pose('walk'))
    f2Op.value = withDelay(T.f2WalkIn, withTiming(1, { duration: 300 }))
    f2X.value = withDelay(
      T.f2WalkIn,
      withTiming(slot2R, { duration: 1300, easing: Easing.out(Easing.cubic) })
    )
    at(T.f2WalkIn + 1300, () => {
      setF2Pose('talk')
      setF1Pose('talk')
    })
    at(T.talkA, () => setTalkSide('L')) // F1 greets — short
    at(T.talkB, () => setTalkSide('R')) // F2 explains — long
    at(T.talkC, () => setTalkSide('L')) // F1 goodbye — short
    at(T.talkEnd, () => setTalkSide(null))
    at(T.f2WalkOut, () => setF2Pose('walk'))
    f2X.value = withDelay(
      T.f2WalkOut,
      withTiming(offRight, { duration: 1700, easing: Easing.in(Easing.cubic) })
    )
    f2Op.value = withDelay(T.f2WalkOut + 1500, withTiming(0, { duration: 300 }))
    at(T.f2WalkOut + 200, () => setF1Pose('stand'))

    // === Act 3: figure 3 walks in, hugs, leaves ===
    at(T.f3WalkIn, () => setF3Pose('walk'))
    f3Op.value = withDelay(T.f3WalkIn, withTiming(1, { duration: 300 }))
    f3X.value = withDelay(
      T.f3WalkIn,
      withTiming(slotHug, { duration: 1500, easing: Easing.out(Easing.cubic) })
    )
    at(T.hug1Start, () => {
      setF3Pose('hug')
      setF1Pose('hug')
    })
    at(T.hug1End, () => {
      setF3Pose('walk')
      setF1Pose('stand')
    })
    f3X.value = withDelay(
      T.f3WalkOut,
      withTiming(offRight, { duration: 1800, easing: Easing.in(Easing.cubic) })
    )
    f3Op.value = withDelay(T.f3WalkOut + 1500, withTiming(0, { duration: 300 }))

    // === Act 4: figure 4 walks in, hugs, both sit shoulder-to-shoulder ===
    at(T.f4WalkIn, () => setF4Pose('walk'))
    f4Op.value = withDelay(T.f4WalkIn, withTiming(1, { duration: 300 }))
    f4X.value = withDelay(
      T.f4WalkIn,
      withTiming(slotSit, { duration: 1500, easing: Easing.out(Easing.cubic) })
    )
    at(T.hug2Start, () => {
      setF4Pose('hug')
      setF1Pose('hug')
    })
    at(T.sitDown, () => {
      setF4Pose('sit')
      setF1Pose('sit')
    })
    starsBright.value = withDelay(T.starsBright, withTiming(1, { duration: 1500 }))

    // === Outro: CTA fades in ===
    ctaOp.value = withDelay(T.ctaIn, withTiming(1, { duration: 800 }))
    skipOp.value = withDelay(T.ctaIn, withTiming(0, { duration: 400 }))
    at(T.ctaIn + 200, () => setDone(true))

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [reduced])

  const handleAdvance = () => {
    router.replace('/(onboarding)/self')
  }

  /* Animated styles */
  const arcStyle = useAnimatedProps(() => ({
    strokeDashoffset: arcDraw.value * 2000,
  }))
  const f1Style = useAnimatedStyle(() => ({
    opacity: f1Op.value,
    transform: [{ translateX: f1X.value - 32 }],
  }))
  const f2Style = useAnimatedStyle(() => ({
    opacity: f2Op.value,
    transform: [{ translateX: f2X.value - 32 }],
  }))
  const f3Style = useAnimatedStyle(() => ({
    opacity: f3Op.value,
    transform: [{ translateX: f3X.value - 32 }],
  }))
  const f4Style = useAnimatedStyle(() => ({
    opacity: f4Op.value,
    transform: [{ translateX: f4X.value - 32 }],
  }))
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOp.value }))
  const skipStyle = useAnimatedStyle(() => ({ opacity: skipOp.value }))

  /* Planet arc path — gentle hill at bottom of screen */
  const arcD = useMemo(() => {
    const y0 = height * 0.85
    const yMid = height * 0.65
    return `M -40 ${y0} Q ${center} ${yMid - 30} ${width + 40} ${y0}`
  }, [width, height, center])

  // Figure container — absolutely positioned; we set top to groundY - figureHeight
  const figTop = groundY - 96 // 64*1.5 figure box height (size=64 -> 128 svg height-ish)

  const AnimatedPath = useMemo(() => Animated.createAnimatedComponent(Path), [])

  return (
    <Pressable style={{ flex: 1, backgroundColor: BG }} onPress={done ? handleAdvance : undefined}>
      {/* Stars layer */}
      <StarField width={width} height={height} brightSv={starsBright} />

      {/* Planet arc */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents='none'>
        <AnimatedPath
          d={arcD}
          stroke={ARC}
          strokeWidth={2.2}
          fill='none'
          strokeLinecap='round'
          strokeDasharray='2000'
          animatedProps={arcStyle}
        />
      </Svg>

      {/* Figures */}
      <Animated.View style={[styles.figure, { top: figTop }, f1Style]}>
        <StickFigure pose={f1Pose} facing={f1Pose === 'lookL' ? 'L' : 'R'} phase={walkPhase} />
      </Animated.View>
      <Animated.View style={[styles.figure, { top: figTop }, f2Style]}>
        <StickFigure pose={f2Pose} facing='L' phase={walkPhase} />
      </Animated.View>
      <Animated.View style={[styles.figure, { top: figTop }, f3Style]}>
        <StickFigure pose={f3Pose} facing='L' phase={walkPhase} />
      </Animated.View>
      <Animated.View style={[styles.figure, { top: figTop }, f4Style]}>
        <StickFigure pose={f4Pose} facing='R' phase={walkPhase} />
      </Animated.View>

      {/* Speech dots overlay during the exchange (one side at a time) */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: figTop - 18,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 80,
        }}
      >
        <View style={{ width: 24 }}>
          <SpeechDots visible={talkSide === 'L'} side='L' />
        </View>
        <View style={{ width: 24 }}>
          <SpeechDots visible={talkSide === 'R'} side='R' long />
        </View>
      </View>

      {/* Brand anchor — V15Moon fades in alongside the CTA at the same vertical
          position the home header uses, so onboarding ends on the same logo
          home starts on. */}
      <Animated.View style={[styles.brand, ctaStyle]} pointerEvents='none'>
        <V15Moon size={64} />
      </Animated.View>

      {/* Skip hint (early) */}
      <Animated.View style={[styles.hint, skipStyle]} pointerEvents='none'>
        <Text style={[kindredType.caption, { color: HINT_EARLY }]}>{copy.tap}</Text>
      </Animated.View>

      {/* Continue CTA (after sequence) */}
      <Animated.View style={[styles.hint, ctaStyle]} pointerEvents='none'>
        <Text style={[kindredType.caption, { color: HINT_LATE, letterSpacing: 3 }]}>
          {copy.continue}
        </Text>
      </Animated.View>

      {/* Always-on tap-to-skip layer when not done */}
      {!done && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleAdvance}
          accessibilityLabel={copy.tap}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  figure: {
    position: 'absolute',
    width: 64,
    left: 0,
  },
  speechDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DOT,
  },
  hint: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  brand: {
    position: 'absolute',
    top: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
})
