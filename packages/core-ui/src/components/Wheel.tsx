/**
 * Wheel — one vertical snap-scroll column for the date/time pickers.
 *
 * Shared by LunarDateWheels + SolarDateWheels so 农历 and 阳历 entry render with
 * one identical look on every platform (the native Android date spinner used to
 * be the odd one out — see BirthDateField).
 *
 * `loop` enables 首尾相连 (seamless wrap) for bounded cyclic columns — month and
 * day: the items are tripled and the list silently re-centers onto the middle
 * copy when scrolling settles, so spinning past either end continues without a
 * dead-stop. Year stays non-loop (a bounded range — wrapping 1900↔today would
 * read as a bug, matching iOS's own date wheel).
 */

import * as Haptics from 'expo-haptics'
import { useCallback, useMemo, useRef } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useTheme } from '../theme'

export const WHEEL_ITEM_HEIGHT = 36
/** 7 visible rows — 5 read as "crammed at the top" on modern phone heights. */
export const WHEEL_VISIBLE_ROWS = 7
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS
/** Padding rows above/below the centred slot: (visible - 1) / 2. */
const PAD_ROWS = (WHEEL_VISIBLE_ROWS - 1) / 2

export interface WheelItem<T> {
  key: string
  label: string
  value: T
}

export function Wheel<T>({
  items,
  selectedKey,
  onSelect,
  accent,
  loop = false,
}: {
  items: WheelItem<T>[]
  selectedKey: string
  onSelect: (value: T) => void
  accent: string
  /** Seamless wrap (首尾相连). Use for cyclic columns (month / day), not year. */
  loop?: boolean
}) {
  const { colors } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const n = items.length

  const selectedIdx = Math.max(
    0,
    items.findIndex((it) => it.key === selectedKey)
  )

  // Loop renders three copies; the live "centred" copy is the middle one, so
  // there is always a full copy above and below to scroll into.
  const canLoop = loop && n > 1
  const rendered = useMemo(
    () => (canLoop ? [...items, ...items, ...items] : items),
    [items, canLoop]
  )
  const restingIdx = canLoop ? n + selectedIdx : selectedIdx
  const initialOffset = restingIdx * WHEEL_ITEM_HEIGHT

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y
      const rawIdx = Math.round(y / WHEEL_ITEM_HEIGHT)
      const realIdx = canLoop ? ((rawIdx % n) + n) % n : Math.max(0, Math.min(n - 1, rawIdx))
      // Re-centre into the middle copy (instant, no animation) so the next spin
      // always has runway in both directions.
      if (canLoop) {
        const target = (n + realIdx) * WHEEL_ITEM_HEIGHT
        if (Math.abs(y - target) > 0.5) {
          scrollRef.current?.scrollTo({ y: target, animated: false })
        }
      }
      const picked = items[realIdx]
      if (picked && picked.key !== selectedKey) {
        void Haptics.selectionAsync().catch(() => undefined)
        onSelect(picked.value)
      }
    },
    [canLoop, n, items, onSelect, selectedKey]
  )

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Centre selection band — the wheel's primary affordance. */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: WHEEL_ITEM_HEIGHT * PAD_ROWS,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: accent,
          backgroundColor: `${accent}22`,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate='fast'
        contentOffset={{ x: 0, y: initialOffset }}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * PAD_ROWS }}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {rendered.map((it, i) => {
          // Fade by distance from the resting centred row → the rounded "wheel"
          // look. Neighbours stay near full strength so the next value is legible.
          const distance = Math.abs(i - restingIdx)
          const colorForRow = distance <= 1 ? colors.text : colors.secondary
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.7 : 0.45
          return (
            <View
              key={`${it.key}-${i}`}
              style={{
                height: WHEEL_ITEM_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colorForRow,
                  fontWeight: distance === 0 ? '600' : '400',
                  opacity,
                }}
              >
                {it.label}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
