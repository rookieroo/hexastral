/**
 * FateHomeHero — Hero-first home (Phase C.2).
 *
 * Replaces the dense top-of-tab with a 2:3 photographable area:
 *   - Top: SVG visual blending today's solar term hint, lunar phase glyph,
 *     and the day's pillar glyph in concentric rings.
 *   - Bottom: 1–2 sentence "今日金句" pulled from `signal.content.goldenLine`,
 *     with the dense DailySignalCard continuing below the fold.
 *
 * Visual spec (Ink Brutalism, App Store screenshot-ready):
 *   - Vertical 2:3 region inset by page horizontals (24)
 *   - Hairline-divided from the masthead above and from the dense card below
 *   - Crossfades on `dayKey` rollover via reanimated v4 (300ms)
 *
 * Props mirror what the home tab already computes — no new server data.
 */

import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { type IosPalette, useTheme } from '@/lib/theme'

interface FateHomeHeroProps {
  /** Stable per-day key — Asia/Shanghai YYYY-MM-DD. Drives the crossfade. */
  dayKey: string
  /** Today's day-pillar two-char label (e.g. "甲子" → already localized). */
  dayLabel: string
  /** Today's solar term name (already localized). */
  jieqi: string
  /** Today's lunar phase fraction in [0,1). 0 = new, 0.5 = full. */
  lunarPhase: number
  /** Today's golden line — 1–2 sentences. Optional; falls back to a quiet hint. */
  goldenLine?: string | null
  /** Section label localized (e.g. "今日金句"). */
  goldenLineLabel: string
  /** Loading state — show shimmer text. */
  isLoading?: boolean
  /** Theme tokens. */
  ios: IosPalette
  /** Tap-through (e.g. open the full signal card). Optional. */
  onPress?: () => void
}

/**
 * Lay out three concentric SVG rings: outermost ink stroke, middle gold ring
 * stamped with the day-pillar, innermost lunar disc with phase shading.
 */
function HeroVisual({
  size,
  dayLabel,
  jieqi,
  lunarPhase,
  ios,
  isDark,
}: {
  size: number
  dayLabel: string
  jieqi: string
  lunarPhase: number
  ios: IosPalette
  isDark: boolean
}) {
  const cx = size / 2
  const cy = size / 2
  const outerR = (size / 2) * 0.94
  const ringR = (size / 2) * 0.7
  const moonR = (size / 2) * 0.46
  const ink = ios.text
  const gold = isDark ? '#C4A882' : '#A87B33'
  const lit = isDark ? '#F4F1EA' : '#FAFAF7'
  const shadow = isDark ? '#1A1A1F' : '#3C2415'
  const gradientId = `fate-hero-moon-${Math.round(lunarPhase * 1000)}`
  const limbId = `fate-hero-limb-${Math.round(lunarPhase * 1000)}`

  // Lunar phase: 0 → all shadow (new), 0.5 → all lit (full), 1 → back to new.
  // Shadow opacity drops linearly from 1 (new) to 0 (full) and back, with the
  // gradient direction flipped past 0.5 so the dark side switches limbs.
  const litRatio = 1 - Math.abs(0.5 - lunarPhase) * 2 // 0..1
  const waxing = lunarPhase < 0.5
  const shadowStart = waxing ? '20%' : '80%'
  const shadowEnd = waxing ? '80%' : '20%'

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={gradientId} x1='0%' y1='0%' x2='100%' y2='0%'>
          <Stop offset={shadowStart} stopColor={shadow} stopOpacity={1 - litRatio} />
          <Stop offset={shadowEnd} stopColor={shadow} stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={limbId} cx='50%' cy='50%' r='50%'>
          <Stop offset='70%' stopColor={shadow} stopOpacity={0} />
          <Stop offset='100%' stopColor={shadow} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>

      {/* Outer hairline ring — the “page edge” */}
      <Circle cx={cx} cy={cy} r={outerR} stroke={ink} strokeWidth={0.6} fill='none' opacity={0.3} />

      {/* Middle gold ring with day pillar + jieqi labels */}
      <Circle
        cx={cx}
        cy={cy}
        r={ringR}
        stroke={gold}
        strokeWidth={0.8}
        fill='none'
        opacity={0.55}
      />
      <SvgText
        x={cx}
        y={cy - ringR - 8}
        fill={gold}
        fontSize={11}
        fontWeight='500'
        letterSpacing={2.4}
        textAnchor='middle'
      >
        {jieqi.toUpperCase()}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + ringR + 18}
        fill={ink}
        fontSize={13}
        fontWeight='400'
        letterSpacing={3}
        textAnchor='middle'
        opacity={0.78}
      >
        {dayLabel}
      </SvgText>

      {/* Lunar disc */}
      <G>
        <Circle cx={cx} cy={cy} r={moonR} fill={lit} />
        <Circle cx={cx} cy={cy} r={moonR} fill={`url(#${gradientId})`} />
        <Circle cx={cx} cy={cy} r={moonR} fill={`url(#${limbId})`} />
        <Circle
          cx={cx}
          cy={cy}
          r={moonR}
          stroke={ink}
          strokeWidth={0.4}
          fill='none'
          opacity={0.15}
        />
      </G>
    </Svg>
  )
}

export function FateHomeHero({
  dayKey,
  dayLabel,
  jieqi,
  lunarPhase,
  goldenLine,
  goldenLineLabel,
  isLoading,
  ios,
  onPress,
}: FateHomeHeroProps) {
  const { isDark } = useTheme()
  const opacity = useSharedValue(1)
  const translateY = useSharedValue(0)

  // Crossfade on day rollover. Keying off `dayKey` means it only fires once
  // when the calendar day actually flips — not on every re-render.
  useEffect(() => {
    opacity.value = 0
    translateY.value = 6
    opacity.value = withTiming(1, { duration: 320 })
    translateY.value = withTiming(0, { duration: 320 })
  }, [dayKey, opacity, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  // Hero region target ratio is 2:3. We don't measure parent here — the
  // outer screen owns horizontal padding (24); pick a stable height.
  const visualSize = 192

  const body = (
    <Animated.View
      style={[
        {
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 22,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View style={{ width: visualSize, height: visualSize, alignItems: 'center' }}>
        <HeroVisual
          size={visualSize}
          dayLabel={dayLabel}
          jieqi={jieqi}
          lunarPhase={lunarPhase}
          ios={ios}
          isDark={isDark}
        />
      </View>

      <View style={{ marginTop: 18, alignItems: 'center', maxWidth: 320 }}>
        <Text
          style={{
            color: ios.secondary,
            fontSize: 10,
            fontWeight: '300',
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {goldenLineLabel}
        </Text>
        <Text
          style={{
            color: ios.text,
            fontSize: 18,
            lineHeight: 26,
            fontWeight: '400',
            textAlign: 'center',
            fontStyle: goldenLine ? 'normal' : 'italic',
            opacity: isLoading ? 0.45 : 1,
          }}
          numberOfLines={3}
        >
          {goldenLine ?? '—'}
        </Text>
      </View>
    </Animated.View>
  )

  if (!onPress) return body
  return (
    <Pressable accessibilityRole='button' onPress={onPress} hitSlop={8}>
      {body}
    </Pressable>
  )
}
