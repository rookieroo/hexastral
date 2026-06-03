/**
 * Onboarding · Screen 0 — Comic-style intro animation.
 *
 * A ~23-second stick-figure parable: lone arrival → fleeting talk → fleeting
 * hug → the one that stays. Sets the emotional thesis (Kindred分 — connection
 * worth keeping) before any form input. Plays only on first launch
 * (gated by AsyncStorage key `yuan_intro_seen_v1` in app/index.tsx);
 * tap anywhere to skip.
 *
 * Style: dark night ground (ADR-0018 ink aesthetic, dark-only) with ivory
 * ink-brush figures. Reanimated v4 drives positions/opacity. The gait is
 * distance-driven (useGroundedGait): legs are tied to ground travel so feet
 * plant instead of sliding, and every figure's Y follows the planet's curve
 * (groundYAt) so feet stay on the rim while walking up the hill. Pose changes
 * (walk → talk → hug → sit) are React-state transitions at scripted beats.
 *
 * The parable's four acts are layered: ambient light steps up one notch per
 * act, a caption (silent-film intertitle) names each act in an ever-brighter
 * tone, and the camera pushes in slightly on the final act — arrival, passing,
 * brief warmth, then the one who stays.
 *
 * Scenery (sky / ground / galaxy / glow / dust) lives in
 * components/IntroScene.tsx — including the slot for AI-generated backdrop
 * plates (see assets/intro/README.md).
 */

import { V15Moon } from '@zhop/core-ui/motion'
import { ricePaper, rubbing, zinc } from '@zhop/hexastral-tokens'
import { kindredType } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  type DerivedValue,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { FigureGlow, groundYAt, IntroStage, WalkDust } from '@/components/IntroScene'
import { FEET_Y, type Pose, StickFigure, useGroundedGait } from '@/components/StickFigure'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  tap: string
  continue: string
  /** One caption per act — arrival, passing, brief warmth, the one who stays. */
  acts: [string, string, string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  en: {
    tap: 'tap to skip',
    continue: 'tap to begin',
    acts: ['you arrive alone', 'some pass by', 'some stay a while', 'one stays'],
  },
  zh: {
    tap: '轻触跳过',
    continue: '轻触开始',
    acts: ['一个人来到世上', '有人擦肩而过', '有人短暂停留', '有人留了下来'],
  },
  'zh-Hant': {
    tap: '輕觸跳過',
    continue: '輕觸開始',
    acts: ['一個人來到世上', '有人擦肩而過', '有人短暫停留', '有人留了下來'],
  },
  ja: {
    tap: 'タップでスキップ',
    continue: 'タップで始める',
    acts: [
      'ひとりで生まれてくる',
      'すれ違う人もいる',
      'しばらく寄り添う人も',
      'となりに残る人がいる',
    ],
  },
}

function pickIntroCopy(locale: string): IntroCopy {
  if (locale === 'en' || locale === 'zh' || locale === 'zh-Hant' || locale === 'ja') {
    return INTRO_COPY[locale]
  }
  return INTRO_COPY.en
}

/* ── Palette (dark ground, ivory ink) ───────────────────────────────────── */
const BG = rubbing.void
const DOT = zinc[300]
const HINT_EARLY = zinc[500]
const HINT_LATE = zinc[300]
/** Caption colour steps up one notch per act — the parable's hierarchy, in light. */
const ACT_COLORS = [zinc[500], zinc[400], zinc[300], ricePaper.ivory] as const

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

/* ── Grounded figure style ──────────────────────────────────────────────── */

/**
 * useFigureStyle — places a figure so its feet sit on the planet's rim at its
 * current X (groundYAt), and adds a stride-synced body bob while walking:
 * highest mid-stride (passing pose), settling at each foot contact.
 */
function useFigureStyle(
  xSv: SharedValue<number>,
  opSv: SharedValue<number>,
  phaseSv: DerivedValue<number>,
  pose: Pose,
  width: number,
  height: number
) {
  const walking = pose === 'walk'
  // `sit` rests on the crossed shins (y≈72 of 80) rather than the feet (y≈76).
  const baseline = pose === 'sit' ? FEET_Y - 6.4 : FEET_Y
  return useAnimatedStyle(() => {
    const gy = groundYAt(xSv.value, width, height)
    const bob = walking ? (1 - Math.abs(Math.sin(phaseSv.value * Math.PI * 2))) * 2 : 0
    return {
      opacity: opSv.value,
      transform: [{ translateX: xSv.value - 32 }, { translateY: gy - baseline - bob }],
    }
  })
}

/* ── Main intro screen ──────────────────────────────────────────────────── */

export default function IntroScreen() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const locale = useMemo(() => resolveLocale(), [])
  const copy = useMemo(() => pickIntroCopy(locale), [locale])
  const { width, height } = useWindowDimensions()
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
  const starsBright = useSharedValue(reduced ? 1 : 0)
  // Halo behind an embracing / sitting pair — follows the pair between slots.
  const glowX = useSharedValue(slot1 - 12)
  const glowOp = useSharedValue(0)
  // Act caption opacity + gentle camera push-in on the final act.
  const actOp = useSharedValue(reduced ? 1 : 0)
  const stageScale = useSharedValue(1)

  /* Pose state — discrete transitions at scripted beats */
  const [f1Pose, setF1Pose] = useState<Pose>('walk')
  const [f2Pose, setF2Pose] = useState<Pose>('walk')
  const [f3Pose, setF3Pose] = useState<Pose>('walk')
  const [f4Pose, setF4Pose] = useState<Pose>('walk')
  const [talkSide, setTalkSide] = useState<TalkSide>(null)
  const [done, setDone] = useState<boolean>(reduced)
  // Current act caption index (-1 = none yet).
  const [act, setAct] = useState(reduced ? 3 : -1)
  // Movement direction per figure (for the dust trail) — f2/f3 enter moving
  // left, then leave moving right; f1/f4 only ever move right.
  const [f2Heading, setF2Heading] = useState<'L' | 'R'>('L')
  const [f3Heading, setF3Heading] = useState<'L' | 'R'>('L')

  // Distance-driven gait per figure — legs follow ground travel, no foot-slide.
  const gait1 = useGroundedGait(f1X)
  const gait2 = useGroundedGait(f2X)
  const gait3 = useGroundedGait(f3X)
  const gait4 = useGroundedGait(f4X)

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
    skipOp.value = withDelay(800, withTiming(0.45, { duration: 600 }))

    // Ambient light steps up one notch per act (full bloom at the very end) —
    // the four scenes' hierarchy, expressed in light. Driven via at() so later
    // steps don't cancel earlier pending ones.
    at(T.starsIn, () => {
      starsBright.value = withTiming(0.2, { duration: 1200 })
    })
    at(T.f2WalkIn, () => {
      starsBright.value = withTiming(0.35, { duration: 800 })
    })
    at(T.f3WalkIn, () => {
      starsBright.value = withTiming(0.5, { duration: 800 })
    })
    at(T.f4WalkIn, () => {
      starsBright.value = withTiming(0.65, { duration: 800 })
    })

    // Act captions — silent-film intertitles, in at each act's beat, out
    // before the next. The final caption (the thesis) stays through the CTA.
    const caption = (idx: number, inMs: number, outMs?: number) => {
      at(inMs, () => {
        setAct(idx)
        actOp.value = withTiming(1, { duration: 600 })
      })
      if (outMs !== undefined) {
        at(outMs, () => {
          actOp.value = withTiming(0, { duration: 400 })
        })
      }
    }
    caption(0, T.f1WalkIn + 700, T.f2WalkIn - 600)
    caption(1, T.talkA, T.f2WalkOut + 1200)
    caption(2, T.hug1Start, T.f3WalkOut + 1400)
    caption(3, T.hug2Start)

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
    at(T.f2WalkOut, () => {
      setF2Pose('walk')
      setF2Heading('R')
    })
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
      // Halo swells around the embrace...
      glowX.value = slot1 + 20
      glowOp.value = withTiming(0.85, { duration: 700, easing: Easing.out(Easing.quad) })
    })
    at(T.hug1End, () => {
      setF3Pose('walk')
      setF3Heading('R')
      setF1Pose('stand')
      // ...and dies down when this one, too, walks away.
      glowOp.value = withTiming(0, { duration: 900 })
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
      // The halo returns over the pair that stays...
      glowX.value = slot1 - 12
      glowOp.value = withTiming(0.85, { duration: 700, easing: Easing.out(Easing.quad) })
    })
    at(T.sitDown, () => {
      setF4Pose('sit')
      setF1Pose('sit')
      // ...and settles into a softer, steady warmth as they sit.
      glowOp.value = withTiming(0.5, { duration: 1200 })
    })
    // Camera pushes in slightly on the pair that stays; the sky fully blooms.
    at(T.hug2Start, () => {
      stageScale.value = withTiming(1.04, { duration: 3500, easing: Easing.out(Easing.quad) })
    })
    at(T.starsBright, () => {
      starsBright.value = withTiming(1, { duration: 1500 })
    })

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

  /* Animated styles — figures follow the ground arc and bob with their stride */
  const f1Style = useFigureStyle(f1X, f1Op, gait1.phaseSv, f1Pose, width, height)
  const f2Style = useFigureStyle(f2X, f2Op, gait2.phaseSv, f2Pose, width, height)
  const f3Style = useFigureStyle(f3X, f3Op, gait3.phaseSv, f3Pose, width, height)
  const f4Style = useFigureStyle(f4X, f4Op, gait4.phaseSv, f4Pose, width, height)
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOp.value }))
  const skipStyle = useAnimatedStyle(() => ({ opacity: skipOp.value }))
  const actStyle = useAnimatedStyle(() => ({ opacity: actOp.value }))
  const stageStyle = useAnimatedStyle(() => ({ transform: [{ scale: stageScale.value }] }))

  // Anchor for overlays (glow, speech dots): figure-box top when standing at slot1.
  const centerFigTop = groundYAt(slot1, width, height) - FEET_Y

  return (
    <Pressable style={{ flex: 1, backgroundColor: BG }} onPress={done ? handleAdvance : undefined}>
      {/* Stage — scenery + figures; pushes in slightly during the final act */}
      <Animated.View style={[StyleSheet.absoluteFillObject, stageStyle]}>
        {/* Scenery — stars + galaxy + planet ground (or AI backdrop plates) */}
        <IntroStage width={width} height={height} drawSv={arcDraw} brightSv={starsBright} />

        {/* Halo behind embracing / sitting pairs (under the figures) */}
        <FigureGlow xSv={glowX} opacitySv={glowOp} top={centerFigTop - 10} size={150} />

        {/* Figures */}
        <Animated.View style={[styles.figure, f1Style]}>
          <StickFigure pose={f1Pose} facing={f1Pose === 'lookL' ? 'L' : 'R'} phase={gait1.phase} />
          <WalkDust active={f1Pose === 'walk'} heading='R' />
        </Animated.View>
        <Animated.View style={[styles.figure, f2Style]}>
          <StickFigure pose={f2Pose} facing='L' phase={gait2.phase} />
          <WalkDust active={f2Pose === 'walk'} heading={f2Heading} />
        </Animated.View>
        <Animated.View style={[styles.figure, f3Style]}>
          <StickFigure pose={f3Pose} facing='L' phase={gait3.phase} />
          <WalkDust active={f3Pose === 'walk'} heading={f3Heading} />
        </Animated.View>
        <Animated.View style={[styles.figure, f4Style]}>
          <StickFigure pose={f4Pose} facing='R' phase={gait4.phase} />
          <WalkDust active={f4Pose === 'walk'} heading='R' />
        </Animated.View>

        {/* Speech dots overlay during the exchange (one side at a time) */}
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            top: centerFigTop - 18,
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
      </Animated.View>

      {/* Act caption — names the current act, one notch brighter each time */}
      <Animated.View style={[styles.caption, { top: height * 0.3 }, actStyle]} pointerEvents='none'>
        <Text
          style={[
            kindredType.caption,
            { color: ACT_COLORS[act] ?? ACT_COLORS[0], letterSpacing: 2 },
          ]}
        >
          {act >= 0 ? copy.acts[act] : ''}
        </Text>
      </Animated.View>

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
    top: 0,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
