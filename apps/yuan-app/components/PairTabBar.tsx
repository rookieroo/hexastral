/**
 * PairTabBar — the two-person tab switcher for pair-input.
 *
 * The two onboarding stick figures (extracted from the intro animation) face
 * each other and act as the tabs. The active figure is gold + full opacity;
 * the other is muted. A faint "invisible thread" (echoing welcome.line2)
 * always connects them; on every switch a brighter filament redraws across
 * the gap via animated strokeDashoffset — the same brush-stroke draw the
 * intro arc uses. When both people are complete, the figures adopt the
 * intro "hug" pose with a one-shot scale pulse + success haptic.
 *
 * Controlled + presentational: no draft, no router. Honors reduced motion.
 */

import { ink } from '@zhop/hexastral-tokens'
import { duration, spring } from '@zhop/hexastral-tokens/motion'
import { yuanDark, yuanMotion, yuanType } from '@zhop/hexastral-tokens/yuan'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Line } from 'react-native-svg'
import { StickFigure } from './StickFigure'

const AnimatedLine = Animated.createAnimatedComponent(Line)

const FIG = 26
const BAR_HEIGHT = 78
const THREAD_Y = FIG // ~mid-figure

export type PairTab = 'self' | 'other'

export interface PairTabBarProps {
  active: PairTab
  onChange: (tab: PairTab) => void
  selfLabel: string
  otherLabel: string
  /** Both people are filled in — figures hug + pulse. */
  bothComplete: boolean
}

export function PairTabBar({
  active,
  onChange,
  selfLabel,
  otherLabel,
  bothComplete,
}: PairTabBarProps) {
  const reduced = useReducedMotion()
  const [barWidth, setBarWidth] = useState(0)

  const selfCx = barWidth * 0.25
  const otherCx = barWidth * 0.75
  const threadLen = otherCx - selfCx

  // Bright filament redraws toward the active side on each switch.
  const draw = useSharedValue(reduced ? 0 : 1) // 1 = retracted, 0 = fully drawn
  useEffect(() => {
    if (reduced) {
      draw.value = 0
      return
    }
    draw.value = 1
    draw.value = withTiming(0, {
      duration: yuanMotion.connectingLine.duration,
      easing: Easing.inOut(Easing.quad),
    })
  }, [active, reduced, draw])

  // One-shot scale pulse when the pair becomes complete.
  const pulse = useSharedValue(1)
  useEffect(() => {
    if (!bothComplete) {
      pulse.value = 1
      return
    }
    if (!reduced) {
      pulse.value = withSequence(withSpring(1.08, spring.snap), withSpring(1, spring.snap))
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [bothComplete, reduced, pulse])

  // Figure opacity follows the active tab.
  const selfOp = useSharedValue(active === 'self' ? 1 : 0.5)
  const otherOp = useSharedValue(active === 'other' ? 1 : 0.5)
  useEffect(() => {
    const selfTarget = active === 'self' ? 1 : 0.5
    const otherTarget = active === 'other' ? 1 : 0.5
    if (reduced) {
      selfOp.value = selfTarget
      otherOp.value = otherTarget
    } else {
      selfOp.value = withTiming(selfTarget, { duration: duration.fast })
      otherOp.value = withTiming(otherTarget, { duration: duration.fast })
    }
  }, [active, reduced, selfOp, otherOp])

  const selfStyle = useAnimatedStyle(() => ({
    opacity: selfOp.value,
    transform: [{ scale: pulse.value }],
  }))
  const otherStyle = useAnimatedStyle(() => ({
    opacity: otherOp.value,
    transform: [{ scale: pulse.value }],
  }))
  const threadProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value * threadLen }))

  const pose = bothComplete ? 'hug' : 'stand'

  const press = (tab: PairTab) => {
    if (tab !== active) void Haptics.selectionAsync()
    onChange(tab)
  }

  return (
    <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      {barWidth > 0 && (
        <Svg
          width={barWidth}
          height={BAR_HEIGHT}
          style={StyleSheet.absoluteFill}
          pointerEvents='none'
        >
          {/* Always-present faint thread */}
          <Line
            x1={selfCx}
            y1={THREAD_Y}
            x2={otherCx}
            y2={THREAD_Y}
            stroke={ink.gold}
            strokeOpacity={0.18}
            strokeWidth={1}
          />
          {/* Brighter filament that redraws on switch */}
          <AnimatedLine
            x1={selfCx}
            y1={THREAD_Y}
            x2={otherCx}
            y2={THREAD_Y}
            stroke={ink.gold}
            strokeOpacity={0.5}
            strokeWidth={1.2}
            strokeLinecap='round'
            strokeDasharray={threadLen}
            animatedProps={threadProps}
          />
        </Svg>
      )}

      <Pressable
        onPress={() => press('self')}
        hitSlop={12}
        style={styles.col}
        accessibilityRole='tab'
        accessibilityState={{ selected: active === 'self' }}
        accessibilityLabel={selfLabel}
      >
        <Animated.View style={selfStyle}>
          <StickFigure
            pose={pose}
            facing='R'
            size={FIG}
            stroke={active === 'self' ? ink.gold : yuanDark.textMuted}
          />
        </Animated.View>
        <Text
          style={[
            yuanType.caption,
            { color: active === 'self' ? yuanDark.accent : yuanDark.textMuted, marginTop: 4 },
          ]}
        >
          {selfLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => press('other')}
        hitSlop={12}
        style={styles.col}
        accessibilityRole='tab'
        accessibilityState={{ selected: active === 'other' }}
        accessibilityLabel={otherLabel}
      >
        <Animated.View style={otherStyle}>
          <StickFigure
            pose={pose}
            facing='L'
            size={FIG}
            stroke={active === 'other' ? ink.gold : yuanDark.textMuted}
          />
        </Animated.View>
        <Text
          style={[
            yuanType.caption,
            { color: active === 'other' ? yuanDark.accent : yuanDark.textMuted, marginTop: 4 },
          ]}
        >
          {otherLabel}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
})
