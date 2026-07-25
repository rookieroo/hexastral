/**
 * CalendarExpandPanel — week strip ↔ month grid with a continuous height morph.
 *
 * Both layers sit in an overflow-clipped shell; height + opacity animate with
 * Reanimated so the DayView below eases instead of LayoutAnimation-jumping.
 * Horizontal pans stay on each child (day scroll / month paging).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronDownIcon } from '@zhop/hexastral-icons/action'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useState } from 'react'
import { type LayoutChangeEvent, Pressable, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { CalendarStrip } from '@/components/CalendarStrip'
import { WeekStrip } from '@/components/WeekStrip'

/** Matches CalendarStrip month-cell aspect (width / height). */
const CELL_ASPECT = 1.15
const MORPH_MS = 340
const MORPH_EASE = Easing.bezier(0.32, 0.72, 0, 1)

export interface CalendarExpandPanelProps {
  selectedDay: string
  todayIso: string
  onSelectDay: (dateIso: string) => void
  locale: string
  dayLabels?: Record<string, string>
  /** a11y: collapsed → open month; expanded → collapse */
  expandLabel: string
  collapseLabel: string
}

export function CalendarExpandPanel({
  selectedDay,
  todayIso,
  onSelectDay,
  locale,
  dayLabels,
  expandLabel,
  collapseLabel,
}: CalendarExpandPanelProps) {
  const { colors, spacing } = useTheme()
  const { width: screenW } = useWindowDimensions()

  const [expanded, setExpanded] = useState(false)
  /** Keep month mounted after first open so FlatList doesn't remount on every toggle. */
  const [monthMounted, setMonthMounted] = useState(false)

  const weekH = useSharedValue(72)
  const monthH = useSharedValue(estimateMonthHeight(screenW, spacing.xl))
  const progress = useSharedValue(0) // 0 = week, 1 = month

  // Refresh estimate when screen / token spacing changes (rotation, etc.).
  useEffect(() => {
    const est = estimateMonthHeight(screenW, spacing.xl)
    if (monthH.value < 120) monthH.value = est
  }, [screenW, spacing.xl, monthH])

  const onWeekLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height
      if (h > 0) weekH.value = h
    },
    [weekH]
  )

  // When measured month height lands (often after first expand), ease the shell
  // to it instead of snapping — kills the residual jump.
  const onMonthLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height
      if (h <= 0) return
      const prev = monthH.value
      if (Math.abs(prev - h) < 2) return
      monthH.value =
        progress.value > 0.05
          ? withTiming(h, { duration: 200, easing: MORPH_EASE })
          : h
    },
    [monthH, progress]
  )

  // Warm the month layer off-screen so the first expand already has a real height.
  useEffect(() => {
    const id = setTimeout(() => setMonthMounted(true), 280)
    return () => clearTimeout(id)
  }, [])

  const toggle = useCallback(() => {
    const next = !expanded
    if (next) setMonthMounted(true)
    setExpanded(next)
    progress.value = withTiming(next ? 1 : 0, { duration: MORPH_MS, easing: MORPH_EASE })
    void Haptics.selectionAsync().catch(() => undefined)
  }, [expanded, progress])

  const shellStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [weekH.value, monthH.value]),
    overflow: 'hidden' as const,
  }))

  const weekLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0.15, 0]),
  }))

  const monthLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0.2, 1]),
  }))

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }))

  return (
    <View>
      <Animated.View style={shellStyle}>
        <Animated.View
          pointerEvents={expanded ? 'none' : 'auto'}
          onLayout={onWeekLayout}
          style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, weekLayerStyle]}
        >
          <WeekStrip
            selectedDay={selectedDay}
            todayIso={todayIso}
            onSelectDay={onSelectDay}
            locale={locale}
            dayLabels={dayLabels}
          />
        </Animated.View>

        {monthMounted ? (
          <Animated.View
            pointerEvents={expanded ? 'auto' : 'none'}
            onLayout={onMonthLayout}
            style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, monthLayerStyle]}
          >
            <CalendarStrip selectedDay={selectedDay} onSelectDay={onSelectDay} />
          </Animated.View>
        ) : null}
      </Animated.View>

      <Pressable
        onPress={toggle}
        accessibilityRole='button'
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? collapseLabel : expandLabel}
        hitSlop={8}
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.55 : 1,
        })}
      >
        <Animated.View style={chevronStyle}>
          <ChevronDownIcon size={18} color={colors.dim} strokeWidth={1.6} />
        </Animated.View>
      </Pressable>
    </View>
  )
}

function estimateMonthHeight(screenW: number, padXl: number): number {
  const inner = Math.max(0, screenW - padXl * 2)
  const cellH = inner / 7 / CELL_ASPECT
  // month label + weekday row + up to 6 week rows + small pad
  return 44 + 28 + cellH * 6 + 8
}
