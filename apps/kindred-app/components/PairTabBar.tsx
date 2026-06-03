/**
 * PairTabBar — the You / TA segmented tab bar for the pair-input onboarding
 * screen.
 *
 * Two stick-figure mascots (components/StickFigure) sit as the two tab labels —
 * "you" on the left, "TA" on the right. The active tab's figure tints gold
 * (kindredDark.accent), the inactive one reads muted. A thin connecting thread
 * is drawn between the two figures; it starts faint (a hint of the relationship
 * to come) and brightens + fully "completes" once BOTH sides have enough birth
 * data, paying off the welcome line "between two people there are invisible
 * threads". The draw is a reanimated v4 width interpolation (never RN Animated,
 * per house rules), and tab switches fire a light expo-haptics tap.
 *
 * Presentational only: the parent owns which tab is active and whether each
 * side is "complete". This component renders the segmented control + thread.
 */

import { kindredDark, kindredType } from '@zhop/hexastral-tokens/kindred'
import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { StickFigure } from './StickFigure'

export type PairTab = 'self' | 'other'

interface PairTabBarProps {
  /** Which tab is currently shown. */
  active: PairTab
  /** Switch tabs — fires the parent's setter. */
  onChange: (tab: PairTab) => void
  /** Localized tab labels — left ("You"), right (the partner, e.g. "TA"). */
  selfLabel: string
  otherLabel: string
  /** Whether each side has enough data to count as filled (drives the thread). */
  selfFilled: boolean
  otherFilled: boolean
}

/** Mascot box size for the tab labels — small enough to sit inline with text. */
const FIG_SIZE = 26

export function PairTabBar({
  active,
  onChange,
  selfLabel,
  otherLabel,
  selfFilled,
  otherFilled,
}: PairTabBarProps) {
  // The thread "completes" (draws full width + brightens) only once both sides
  // carry data; until then it lingers as a faint hint between the figures.
  const bothFilled = selfFilled && otherFilled
  const progress = useSharedValue(bothFilled ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(bothFilled ? 1 : 0, { duration: 1000 })
  }, [bothFilled, progress])

  const threadStyle = useAnimatedStyle(() => ({
    // 18% baseline hint → full span; opacity follows the same curve.
    width: `${18 + progress.value * 82}%`,
    opacity: 0.3 + progress.value * 0.7,
  }))

  const select = (tab: PairTab) => {
    if (tab === active) return
    void Haptics.selectionAsync().catch(() => undefined)
    onChange(tab)
  }

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          borderWidth: 0.5,
          borderColor: kindredDark.border,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <TabCell
          label={selfLabel}
          facing='R'
          active={active === 'self'}
          onPress={() => select('self')}
        />
        <View style={{ width: 0.5, backgroundColor: kindredDark.border }} />
        <TabCell
          label={otherLabel}
          facing='L'
          active={active === 'other'}
          onPress={() => select('other')}
        />
      </View>

      {/* Connecting thread — centered hairline that grows between the pair. */}
      <View style={{ height: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ height: 1, backgroundColor: kindredDark.accent }, threadStyle]} />
      </View>
    </View>
  )
}

function TabCell({
  label,
  facing,
  active,
  onPress,
}: {
  label: string
  facing: 'L' | 'R'
  active: boolean
  onPress: () => void
}) {
  const tint = active ? kindredDark.accent : kindredDark.textMuted
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='tab'
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: active ? `${kindredDark.accent}14` : 'transparent',
      }}
    >
      <StickFigure pose='stand' facing={facing} size={FIG_SIZE} stroke={tint} />
      <Text style={[kindredType.caption, { color: tint, fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
    </Pressable>
  )
}
