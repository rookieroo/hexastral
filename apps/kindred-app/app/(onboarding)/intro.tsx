/**
 * Onboarding · Screen 0 — Comic-style intro animation.
 *
 * A stick-figure parable about 缘分, played scene-by-scene at a deliberate pace
 * (~20s). It is Yuel's intuitive thesis, told as FOUR people / THREE pairings —
 * "you" plus three who arrive in turn:
 *
 *   0 · arrival     — you come into the world alone (look around)
 *   1 · 相识没能在一起 — someone you reach for, hands almost meet, but never hold
 *   2 · 相知在一起又分开 — someone you come to know (talk → embrace), then part
 *   3 · 最后在一起     — the one who stays: embrace, then sit shoulder-to-shoulder
 *
 * Each pairing has a distinct visual verb (reach-that-misses / talk+hug+part /
 * hug+stay) and a HELD beat so it lands. The final tableau: the pair sits with
 * their BACKS to the viewer gazing up at a moon that swells large — which the
 * next screen (pair-input) shrinks + moves into the form's logo (the magic move).
 *
 * Plays only on first launch (AsyncStorage `yuan_intro_seen_v1`, gated in
 * app/index.tsx); tap ANYWHERE, at ANY time, skips to pair-input.
 *
 * Figures are an articulated ink-brush rig (components/StickFigure.tsx): joints
 * are shared values, so pose changes TWEEN (no snap) and limbs bend at the
 * elbow/knee. The gait is distance-driven (useGroundedGait) so feet plant on the
 * planet's curve (groundYAt) instead of sliding. Reanimated v4 drives everything;
 * the whole tempo is one SPEED knob (see Timeline). Scenery (sky / ground /
 * galaxy / glow / dust) lives in components/IntroScene.tsx.
 */

import { useHaptic } from '@zhop/core-ui'
import { MoonPhaseLoader, SKIN_CINNABAR_INK } from '@zhop/core-ui/motion'
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
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { FigureGlow, groundYAt, IntroStage, WalkDust } from '@/components/IntroScene'
import {
  FEET_Y,
  type Pose,
  SIT_BACK_Y,
  StickFigure,
  useGroundedGait,
} from '@/components/StickFigure'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  continue: string
  /** One caption per act — arrival, the near-miss, the one who parts, the one who stays. */
  acts: [string, string, string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  // The thesis builds across four captions, each more personal and warmer than
  // the last: you start alone → some you reach for but can't hold → some you
  // come to know then part → but one is meant to stay (the CTA picks it up).
  en: {
    continue: 'tap to begin',
    acts: [
      'you come into the world alone',
      'some you reach for, but never hold',
      'some you come to know, then let go',
      'but one of them is meant to stay',
    ],
  },
  zh: {
    continue: '轻触开始',
    acts: [
      '你来到这世上，独自一人',
      '有人与你相识，却没能在一起',
      '有人与你相知，却终究分开',
      '但总有一个人，会留在你身边',
    ],
  },
  'zh-Hant': {
    continue: '輕觸開始',
    acts: [
      '你來到這世上，獨自一人',
      '有人與你相識，卻沒能在一起',
      '有人與你相知，卻終究分開',
      '但總有一個人，會留在你身邊',
    ],
  },
  ja: {
    continue: 'タップで始める',
    acts: [
      'あなたはひとりで、この世に来た',
      '出会っても、結ばれない人がいる',
      '深く知り合っても、別れる人もいる',
      'それでも、あなたのそばに残る人がいる',
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
const HINT_LATE = zinc[300]
/** Caption colour steps up one notch per act — the parable's hierarchy, in light. */
const ACT_COLORS = [zinc[500], zinc[400], zinc[300], ricePaper.ivory] as const

/* ── Timeline (ms) ────────────────────────────────────────────────────────
 * One tempo knob for the whole parable. `at()` scales every scheduled trigger
 * by SPEED and `d()` scales every inline animation duration by the same factor,
 * so the sequence keeps its choreography (no new overlaps) at any tempo. The T
 * entries are the ORIGINAL ms; SPEED 0.82 plays them ~1.2× faster (~20s for the
 * four beats). Each connect moment (reach / hug) HOLDS ~1.6–1.8s so it lands;
 * the persistent "tap to begin" hint means nobody is forced to wait it out.
 * Lower SPEED = snappier, higher = more deliberate. */
const SPEED = 0.82
/** Scale an animation duration/delay by SPEED (rounded). Triggers go through at(). */
const d = (ms: number): number => Math.round(ms * SPEED)

/* Final-scene focal moon — the pair gazes up at it; it swells, then pair-input
 * shrinks + moves it into place (the magic move). Tune freely on device. */
const FOCAL_MOON_SIZE = 100
const FOCAL_MOON_MAX_SCALE = 1.7

const T = {
  starsIn: 800,
  f1WalkIn: 1500,
  f1LookL: 3300,
  f1LookR: 4100,
  f1Center: 4900,
  // Beat 1 (相识没能在一起): f2 approaches, both reach, hands almost meet, f2 goes.
  f2WalkIn: 5600,
  reachStart: 7100, // both extend a hand — a held, wistful near-miss
  reachHold: 8900, // f2 begins to turn away
  f2WalkOut: 9300,
  // Beat 2 (相知在一起又分开): f3 approaches, a warm exchange, an embrace, then parts.
  f3WalkIn: 11200,
  talkA: 12700, // F1 greets (L, short)
  talkB: 13500, // F3 explains (R, long)
  talkC: 14900, // F1 answers (L, short)
  talkEnd: 15500,
  hug1Start: 15900,
  hug1End: 17600, // f3 releases and walks away (the separation)
  f3WalkOut: 17900,
  // Beat 3 (最后在一起): the one who stays — embrace (offset), then sit together.
  f4WalkIn: 19600,
  hug2Start: 21200,
  sitDown: 22600,
  starsBright: 23600,
  ctaIn: 24200,
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
  height: number,
  /** Shared 0..1 looping clock for idle breathing (so held poses aren't frozen). */
  breath: SharedValue<number>,
  /** Per-figure phase offset (0..1) so figures don't breathe in unison. */
  breathPhase: number
) {
  const walking = pose === 'walk'
  // The seated mass rests on its rounded base, slightly above standing feet.
  const baseline = pose === 'sit' || pose === 'sitBack' ? SIT_BACK_Y : FEET_Y
  return useAnimatedStyle(() => {
    const gy = groundYAt(xSv.value, width, height)
    const bob = walking ? (1 - Math.abs(Math.sin(phaseSv.value * Math.PI * 2))) * 2 : 0
    // Idle breathing — a gentle chest rise/fall on every NON-walking pose, so a
    // held figure reads as alive instead of frozen. Walking already bobs.
    const breathing = walking ? 0 : Math.sin((breath.value + breathPhase) * Math.PI * 2) * 1
    return {
      opacity: opSv.value,
      transform: [{ translateX: xSv.value - 32 }, { translateY: gy - baseline - bob - breathing }],
    }
  })
}

/* ── Main intro screen ──────────────────────────────────────────────────── */

export default function IntroScreen() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const haptic = useHaptic()
  const locale = useMemo(() => resolveLocale(), [])
  const copy = useMemo(() => pickIntroCopy(locale), [locale])
  const { width, height } = useWindowDimensions()
  const center = width / 2

  // Stage X positions. "You" (f1) holds slot1 the whole way; the three who
  // arrive all come from the right and connect on f1's right (so f1's reach/hug
  // faces right consistently) — except the one who STAYS sits in from the left.
  const offLeft = -120
  const offRight = width + 120
  const slot1 = center - 36 // f1 home
  const slotReach = center + 28 // f2 near-miss reach — close, hands almost meet
  const slotHug = center + 6 // f3 talk + embrace — close enough to wrap
  const slotSit = slot1 - 22 // f4 sits shoulder-to-shoulder, to f1's left

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
  // Idle-breathing clock — one continuous 0..1 loop the figures sample (phase-
  // offset) so held poses gently breathe / gesture instead of freezing. Off when
  // the OS requests reduced motion.
  const breath = useSharedValue(0)
  // One persistent bottom hint — "tap to begin" — visible (dimmed) from the
  // first beat so the user always knows they can leave, brightening to full
  // once the parable lands.
  const ctaOp = useSharedValue(reduced ? 1 : 0)
  const starsBright = useSharedValue(reduced ? 1 : 0)
  // Halo behind an embracing / sitting pair — follows the pair between slots.
  const glowX = useSharedValue(slot1)
  const glowOp = useSharedValue(0)
  // Act caption opacity + gentle camera push-in on the final act.
  const actOp = useSharedValue(reduced ? 1 : 0)
  const stageScale = useSharedValue(1)
  // Focal moon — static phase 0.25 (right-lit), the SAME phase/skin pair-input
  // opens on. Fades in + swells over the final scene; ends big + centered so
  // pair-input can shrink + move it into place (the magic move).
  const introMoonPhase = useSharedValue(0.25)
  const moonOp = useSharedValue(reduced ? 1 : 0)
  const moonScale = useSharedValue(reduced ? FOCAL_MOON_MAX_SCALE : 0.9)

  /* Pose state — discrete transitions at scripted beats; the rig tweens between them */
  const [f1Pose, setF1Pose] = useState<Pose>('walk')
  const [f2Pose, setF2Pose] = useState<Pose>('walk')
  const [f3Pose, setF3Pose] = useState<Pose>('walk')
  const [f4Pose, setF4Pose] = useState<Pose>('walk')
  const [talkSide, setTalkSide] = useState<TalkSide>(null)
  const [done, setDone] = useState<boolean>(reduced)
  // Current act caption index (-1 = none yet).
  const [act, setAct] = useState(reduced ? 3 : -1)
  // Heading per arriving figure (drives facing + dust): they enter facing left,
  // then leave facing right.
  const [f2Heading, setF2Heading] = useState<'L' | 'R'>('L')
  const [f3Heading, setF3Heading] = useState<'L' | 'R'>('L')

  // Distance-driven gait per figure — one phase derived from ground travel.
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

    // at() scales every scheduled trigger by SPEED (see Timeline note), so the
    // whole parable retimes without re-choreographing.
    const at = (ms: number, fn: () => void) => {
      timersRef.current.push(setTimeout(fn, d(ms)))
    }

    // Background + planet arc drawing in
    arcDraw.value = withTiming(0, { duration: d(900), easing: Easing.out(Easing.quad) })
    // The hint shows early (dimmed) and stays for the whole parable.
    ctaOp.value = withDelay(d(800), withTiming(0.45, { duration: d(600) }))

    // Ambient light steps up one notch per beat (full bloom at the very end) —
    // the four scenes' hierarchy, expressed in light. Driven via at() so later
    // steps don't cancel earlier pending ones.
    at(T.starsIn, () => {
      starsBright.value = withTiming(0.2, { duration: d(1200) })
    })
    at(T.f2WalkIn, () => {
      starsBright.value = withTiming(0.35, { duration: d(800) })
    })
    at(T.f3WalkIn, () => {
      starsBright.value = withTiming(0.5, { duration: d(800) })
    })
    at(T.f4WalkIn, () => {
      starsBright.value = withTiming(0.65, { duration: d(800) })
    })

    // Act captions — silent-film intertitles, in at each act's beat, out before
    // the next. The final caption (the thesis) stays through the CTA.
    const caption = (idx: number, inMs: number, outMs?: number) => {
      at(inMs, () => {
        setAct(idx)
        actOp.value = withTiming(1, { duration: d(600) })
      })
      if (outMs !== undefined) {
        at(outMs, () => {
          actOp.value = withTiming(0, { duration: d(400) })
        })
      }
    }
    caption(0, T.f1WalkIn + 700, T.f2WalkIn - 700)
    caption(1, T.reachStart, T.f2WalkOut + 1200)
    caption(2, T.talkA, T.f3WalkOut + 1300)
    caption(3, T.hug2Start) // the thesis — holds through the CTA

    // === Act 0: figure 1 arrives, looks around (head leads, body follows) ===
    f1Op.value = withDelay(d(T.f1WalkIn), withTiming(1, { duration: d(300) }))
    f1X.value = withDelay(
      d(T.f1WalkIn),
      withTiming(slot1, { duration: d(1500), easing: Easing.out(Easing.cubic) })
    )
    at(T.f1WalkIn + 1500, () => setF1Pose('stand'))
    at(T.f1LookL, () => setF1Pose('lookL'))
    at(T.f1LookR, () => setF1Pose('lookR'))
    at(T.f1Center, () => setF1Pose('stand'))

    // === Act 1 (相识没能在一起): f2 approaches; both reach; hands never meet ===
    // The walk-OUT animations are scheduled inside at() callbacks. A second
    // pending withDelay on the same shared value would CANCEL the walk-in one
    // (reanimated replaces pending animations on assignment), leaving the figure
    // invisible at its off-screen start.
    at(T.f2WalkIn, () => {
      setF2Pose('walk')
      setF2Heading('L')
      f2Op.value = withTiming(1, { duration: d(300) })
      f2X.value = withTiming(slotReach, { duration: d(1400), easing: Easing.out(Easing.cubic) })
    })
    at(T.reachStart, () => {
      // Both extend a hand — they almost touch, and hold there.
      setF2Pose('reach')
      setF1Pose('reach')
      void haptic('selection')
    })
    at(T.reachHold, () => {
      // f2 turns and goes; f1's reaching arm slowly lowers (follow-through).
      setF2Pose('walk')
      setF2Heading('R')
      f2X.value = withTiming(offRight, { duration: d(1700), easing: Easing.in(Easing.cubic) })
    })
    at(T.reachHold + 500, () => setF1Pose('stand'))
    at(T.f2WalkOut + 1500, () => {
      f2Op.value = withTiming(0, { duration: d(300) })
    })

    // === Act 2 (相知在一起又分开): f3 approaches, a warm exchange, an embrace, parts ===
    at(T.f3WalkIn, () => {
      setF3Pose('walk')
      setF3Heading('L')
      f3Op.value = withTiming(1, { duration: d(300) })
      f3X.value = withTiming(slotHug, { duration: d(1500), easing: Easing.out(Easing.cubic) })
    })
    at(T.f3WalkIn + 1500, () => {
      setF3Pose('talk')
      setF1Pose('talk')
    })
    at(T.talkA, () => setTalkSide('L')) // F1 greets — short
    at(T.talkB, () => setTalkSide('R')) // F3 explains — long
    at(T.talkC, () => setTalkSide('L')) // F1 answers — short
    at(T.talkEnd, () => setTalkSide(null))
    at(T.hug1Start, () => {
      // f3 initiates the embrace; f1 answers a breath later (never lockstep).
      setF3Pose('hug')
      glowX.value = (slot1 + slotHug) / 2
      glowOp.value = withTiming(0.85, { duration: d(700), easing: Easing.out(Easing.quad) })
      void haptic('light')
    })
    at(T.hug1Start + 350, () => setF1Pose('hug'))
    at(T.hug1End, () => {
      // The embrace ends; f3 walks away; the glow fades with them.
      setF3Pose('walk')
      setF3Heading('R')
      f3X.value = withTiming(offRight, { duration: d(1800), easing: Easing.in(Easing.cubic) })
      glowOp.value = withTiming(0, { duration: d(900) })
    })
    at(T.hug1End + 450, () => setF1Pose('stand')) // f1 lingers a beat, then stands
    at(T.f3WalkOut + 1500, () => {
      f3Op.value = withTiming(0, { duration: d(300) })
    })

    // === Act 3 (最后在一起): the one who stays — embrace, then sit together ===
    at(T.f4WalkIn, () => setF4Pose('walk'))
    f4Op.value = withDelay(d(T.f4WalkIn), withTiming(1, { duration: d(300) }))
    f4X.value = withDelay(
      d(T.f4WalkIn),
      withTiming(slotSit, { duration: d(1500), easing: Easing.out(Easing.cubic) })
    )
    at(T.hug2Start, () => {
      setF4Pose('hug')
      glowX.value = (slot1 + slotSit) / 2
      glowOp.value = withTiming(0.85, { duration: d(700), easing: Easing.out(Easing.quad) })
      void haptic('medium')
    })
    at(T.hug2Start + 400, () => setF1Pose('hug'))
    at(T.sitDown, () => {
      // Backs to the viewer, gazing up at the moon; legs hidden in front.
      setF1Pose('sitBack')
      glowOp.value = withTiming(0.5, { duration: d(1200) })
      void haptic('light')
    })
    at(T.sitDown + 650, () => setF4Pose('sitBack'))
    // Big camera push on the pair + the focal moon swells in above them — the
    // "拉近镜头放大人和月亮" final tableau that hands off to the form.
    at(T.hug2Start, () => {
      stageScale.value = withTiming(1.45, { duration: d(4500), easing: Easing.out(Easing.quad) })
      moonOp.value = withTiming(1, { duration: d(1600) })
      moonScale.value = withTiming(FOCAL_MOON_MAX_SCALE, {
        duration: d(4200),
        easing: Easing.out(Easing.quad),
      })
    })
    at(T.starsBright, () => {
      starsBright.value = withTiming(1, { duration: d(1500) })
    })

    // === Outro: the persistent hint brightens to full ===
    at(T.ctaIn, () => {
      ctaOp.value = withTiming(1, { duration: d(800) })
    })
    at(T.ctaIn + 200, () => setDone(true))

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [reduced])

  const handleAdvance = () => {
    router.replace('/(onboarding)/pair-input')
  }

  /* Animated styles — figures follow the ground arc and bob with their stride */
  const f1Style = useFigureStyle(f1X, f1Op, gait1, f1Pose, width, height, breath, 0)
  const f2Style = useFigureStyle(f2X, f2Op, gait2, f2Pose, width, height, breath, 0.37)
  const f3Style = useFigureStyle(f3X, f3Op, gait3, f3Pose, width, height, breath, 0.6)
  const f4Style = useFigureStyle(f4X, f4Op, gait4, f4Pose, width, height, breath, 0.85)

  // Run the idle-breathing clock for the whole scene (continuous, linear — the
  // figures take a sine of it, so the breath itself eases). ~3.4s/cycle.
  useEffect(() => {
    if (reduced) return
    breath.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.linear }), -1, false)
    return () => {
      breath.value = 0
    }
  }, [reduced, breath])
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOp.value }))
  const actStyle = useAnimatedStyle(() => ({ opacity: actOp.value }))
  const stageStyle = useAnimatedStyle(() => ({ transform: [{ scale: stageScale.value }] }))
  const focalMoonStyle = useAnimatedStyle(() => ({
    opacity: moonOp.value,
    transform: [{ scale: moonScale.value }],
  }))

  // Anchor for overlays (glow, speech dots): figure-box top when standing at slot1.
  const centerFigTop = groundYAt(slot1, width, height) - FEET_Y

  return (
    // Tap ANYWHERE, at ANY time, skips straight to pair-input — the intro is
    // never a wall. The persistent bottom hint advertises it from the first frame.
    <Pressable style={{ flex: 1, backgroundColor: BG }} onPress={handleAdvance}>
      {/* Stage — scenery + figures; pushes in slightly during the final act */}
      <Animated.View style={[StyleSheet.absoluteFillObject, stageStyle]}>
        {/* Scenery — stars + galaxy + planet ground (or AI backdrop plates) */}
        <IntroStage width={width} height={height} drawSv={arcDraw} brightSv={starsBright} />

        {/* Halo behind embracing / sitting pairs (under the figures) */}
        <FigureGlow xSv={glowX} opacitySv={glowOp} top={centerFigTop - 10} size={150} />

        {/* Figures — each carries a distinct `seed` so a pair never holds the
            same pose identically or as a pure mirror. f1 (you) holds slot1; the
            three others arrive in turn. */}
        <Animated.View style={[styles.figure, f1Style]}>
          <StickFigure
            pose={f1Pose}
            facing={f1Pose === 'lookL' ? 'L' : 'R'}
            gaitPhaseSv={gait1}
            breath={breath}
            breathPhase={0}
            seed={1}
          />
          <WalkDust active={f1Pose === 'walk'} heading='R' />
        </Animated.View>
        <Animated.View style={[styles.figure, f2Style]}>
          <StickFigure
            pose={f2Pose}
            facing={f2Heading}
            gaitPhaseSv={gait2}
            breath={breath}
            breathPhase={0.37}
            seed={2}
          />
          <WalkDust active={f2Pose === 'walk'} heading={f2Heading} />
        </Animated.View>
        <Animated.View style={[styles.figure, f3Style]}>
          <StickFigure
            pose={f3Pose}
            facing={f3Heading}
            gaitPhaseSv={gait3}
            breath={breath}
            breathPhase={0.6}
            seed={3}
          />
          <WalkDust active={f3Pose === 'walk'} heading={f3Heading} />
        </Animated.View>
        <Animated.View style={[styles.figure, f4Style]}>
          <StickFigure
            pose={f4Pose}
            facing='R'
            gaitPhaseSv={gait4}
            breath={breath}
            breathPhase={0.85}
            seed={4}
          />
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

      {/* Focal moon — the pair gazes up at it. Fades in + swells over the final
          scene and ends big + centered so pair-input can shrink + move it into
          place (the magic move). Same cinnabar phase-0.25 moon. */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            // Mid-lower: below the caption (~0.3h), above the seated pair, so the
            // form moon can travel a real distance UP into its resting spot.
            top: height * 0.45 - FOCAL_MOON_SIZE / 2,
            left: 0,
            right: 0,
            alignItems: 'center',
          },
          focalMoonStyle,
        ]}
        pointerEvents='none'
      >
        <MoonPhaseLoader size={FOCAL_MOON_SIZE} phase={introMoonPhase} skin={SKIN_CINNABAR_INK} />
      </Animated.View>

      {/* Persistent bottom hint — always "tap to begin", dimmed during the
          parable, full brightness once it lands. Tapping works the whole time. */}
      <Animated.View style={[styles.hint, ctaStyle]} pointerEvents='none'>
        <Text style={[kindredType.caption, { color: HINT_LATE, letterSpacing: 3 }]}>
          {copy.continue}
        </Text>
      </Animated.View>

      {/* Always-on tap-to-begin layer while the parable plays */}
      {!done && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleAdvance}
          accessibilityLabel={copy.continue}
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
})
