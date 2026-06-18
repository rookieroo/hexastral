/**
 * IntroLogo — the calm cold-open visual (2026-06): the brand moon (a soft bloom +
 * slow breath), the YUEL wordmark, a couple of quiet lines, and a "tap to begin"
 * hint, on the shared dark ground. Replaces the retired two-stars IntroThread
 * (turned off for pacing/perf — see git history if it's ever wanted back).
 *
 * The hand-off (`exit` 0→1, host-driven on tap): the scene fades to the dark ground
 * while the moon settles to pair-input's centred resting moon (restY, size 64), so
 * the route swap into onboarding reads as ONE continuous Logo, not a cut.
 *
 * The starfield is STATIC here (`paused`) — no per-star twinkle loop — so the
 * cold-open can't reproduce the old intro's "手机发烫" churn.
 */

import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { kindredFonts } from '@zhop/scenario-kindred'
import { useEffect } from 'react'
import { type StyleProp, StyleSheet, type TextStyle, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Circle as SvgCircle,
  Defs as SvgDefs,
  RadialGradient as SvgRadial,
  Stop as SvgStop,
} from 'react-native-svg'
import { StarField } from '@/components/IntroScene'
import { KindredMoon } from '@/components/KindredMoon'

const BG = kindredDark.bg
const INK = '#f4f3ef'
const HALO = '#c4a882'
const HALO_HOT = '#e6c88c'
const MOON = 96

function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}
function clamp01(x: number): number {
  'worklet'
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export interface IntroLogoProps {
  /** A couple of short tagline lines under the wordmark. */
  lines: string[]
  /** "tap to begin" — the only way forward; the host owns the tap. */
  hint: string
  /** Host-driven exit 0→1: fade the scene, settle the moon to pair-input's mark. */
  exit: SharedValue<number>
}

export function IntroLogo({ lines, hint, exit }: IntroLogoProps) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()
  // pair-input's moon rests at safeTop + scroll-paddingTop(lg 24) + half-moon(32);
  // the exit lands the moon EXACTLY here so the cross-fade swap doesn't hop.
  const restY = useSafeAreaInsets().top + 24 + 32

  const appear = useSharedValue(reduced ? 1 : 0)
  // Text reveal runs on its OWN slower clock so the wordmark + lines fade in one at a
  // time, perceptibly — the shared `appear` (moon/hint) was too quick to read the
  // stagger ("太快了没有感知"). The moon/hint keep the snappier `appear`.
  const textIn = useSharedValue(reduced ? 1 : 0)
  const breath = useSharedValue(0)
  useEffect(() => {
    if (reduced) return
    appear.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    textIn.value = withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) })
    breath.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    )
  }, [reduced, appear, textIn, breath])

  // Static faint field — one constant brightness, `paused` so the deterministic sky
  // just sits there for depth (no 30-node twinkle loop).
  const fieldBright = useSharedValue(0.5)

  // The moon: blooms in centre-high, then on exit settles to pair-input's resting
  // moon (centred, restY, size 64). A faint breath while it presides.
  const moonStyle = useAnimatedStyle(() => {
    const a = appear.value
    const e = exit.value
    const yc = lerp(height * 0.4, restY, e)
    const s = lerp((0.88 + 0.12 * a) * (1 + breath.value * 0.03), 64 / MOON, e)
    return {
      opacity: Math.max(a, e),
      transform: [{ translateY: yc - MOON / 2 }, { scale: s }],
    }
  })
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: (0.35 * appear.value + 0.12 * breath.value) * (1 - exit.value),
    transform: [{ scale: 0.8 + 0.2 * appear.value }],
  }))

  // Wordmark + lines fade + rise in under the moon on a slight per-line stagger (see
  // StaggerText); the whole block fades out together on exit.
  const textWrapStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }))
  const hintStyle = useAnimatedStyle(() => ({
    opacity: appear.value * (0.42 + 0.18 * breath.value) * (1 - exit.value),
  }))
  const exitStyle = useAnimatedStyle(() => ({ opacity: exit.value }))

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={StyleSheet.absoluteFill} pointerEvents='none'>
        <StarField width={width} height={height} brightSv={fieldBright} paused />
      </View>

      {/* wordmark + lines, centred under the moon's rest spot — each fades + rises in
          on a slight stagger (wordmark → line 1 → line 2). */}
      <Animated.View
        style={[S.textWrap, { top: height * 0.52 }, textWrapStyle]}
        pointerEvents='none'
      >
        <StaggerText progress={textIn} order={0} style={S.wordmark}>
          YUEL
        </StaggerText>
        {lines.map((line, i) => (
          <StaggerText key={line} progress={textIn} order={i + 1} style={S.line}>
            {line}
          </StaggerText>
        ))}
      </Animated.View>

      <Animated.Text style={[S.hint, hintStyle]} pointerEvents='none'>
        {hint}
      </Animated.Text>

      {/* exit ground — fades in UNDER the moon, so the moon survives the fade and
          morphs into the onboarding mark. */}
      <Animated.View
        pointerEvents='none'
        style={[StyleSheet.absoluteFill, { backgroundColor: BG }, exitStyle]}
      />

      {/* the moon (logo) — blooms, presides, then settles to pair-input's mark. */}
      <Animated.View
        pointerEvents='none'
        style={[S.moonBox, { left: (width - MOON) / 2 }, moonStyle]}
      >
        <Animated.View pointerEvents='none' style={[S.bloom, bloomStyle]}>
          <Svg width={MOON * 2.6} height={MOON * 2.6}>
            <SvgDefs>
              <SvgRadial id='logobloom' cx='50%' cy='50%' r='50%'>
                <SvgStop offset='0' stopColor={HALO_HOT} stopOpacity='0.5' />
                <SvgStop offset='0.45' stopColor={HALO} stopOpacity='0.1' />
                <SvgStop offset='1' stopColor={HALO} stopOpacity='0' />
              </SvgRadial>
            </SvgDefs>
            <SvgCircle cx={MOON * 1.3} cy={MOON * 1.3} r={MOON * 1.3} fill='url(#logobloom)' />
          </Svg>
        </Animated.View>
        <KindredMoon size={MOON} />
      </Animated.View>
    </View>
  )
}

/** One line of cold-open text that fades + rises in on a per-line stagger, driven by
 *  the slow `textIn` clock + its `order` (wordmark 0 → line 1 → line 2). */
function StaggerText({
  progress,
  order,
  style,
  children,
}: {
  progress: SharedValue<number>
  order: number
  style: StyleProp<TextStyle>
  children: string
}) {
  const aStyle = useAnimatedStyle(() => {
    // base + order*offset = when this line starts; /window = how long it fades. Wide
    // offset + slow window (on the 2.8s textIn clock) so the stagger is perceptible:
    // ≈0.67s between lines, each fading over ≈0.95s.
    const o = clamp01((progress.value - (0.06 + order * 0.24)) / 0.34)
    return { opacity: o, transform: [{ translateY: (1 - o) * 8 }] }
  })
  return <Animated.Text style={[style, aStyle]}>{children}</Animated.Text>
}

const S = StyleSheet.create({
  moonBox: {
    position: 'absolute',
    top: 0,
    width: MOON,
    height: MOON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    position: 'absolute',
    width: MOON * 2.6,
    height: MOON * 2.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  wordmark: {
    fontFamily: kindredFonts.mono,
    fontSize: 15,
    letterSpacing: 5,
    color: INK,
    marginBottom: 22,
  },
  line: {
    fontFamily: kindredFonts.serif,
    fontSize: 16,
    lineHeight: 25,
    color: 'rgba(244,243,239,0.72)',
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: 'rgba(244,243,239,0.6)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
