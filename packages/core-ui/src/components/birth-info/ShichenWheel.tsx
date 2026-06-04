/**
 * ShichenWheel — looping (首尾相接) 十二时辰 scroll-wheel.
 *
 * A native-feeling vertical picker wheel for the twelve 时辰 (子…亥). Unlike a
 * finite ScrollView the list WRAPS: scrolling past 亥 rolls on into 子 and vice
 * versa, matching the endless barrel of an iOS UIPickerView (2026-06 feedback —
 * "时辰选择器要和原生一致，滚轮、首尾相接").
 *
 * Implementation: the 12 时辰 are laid out `REPEAT` times into one long list and
 * the wheel starts parked in the middle copy. On settle we read the centred row
 * mod 12 → the 时辰, then silently re-park the scroll to the middle copy's
 * equivalent row (animated:false). Because every copy is identical the re-park
 * is invisible, so the user can spin forever in either direction.
 *
 * The per-row fade/scale tracks the LIVE scroll offset through a Reanimated
 * shared value (UI thread) so there are no per-frame React re-renders — the same
 * reanimated-v4 rule the rest of the suite follows. Encoding matches
 * ShichenPicker: 0 = 子 … 11 = 亥.
 */

import * as Haptics from 'expo-haptics'
import { useCallback } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useTheme } from '../../theme'
import type { ShichenIndex } from '../ShichenPicker'

export interface ShichenOption {
  readonly index: ShichenIndex
  readonly branch: string
  readonly range: string
}

/** The twelve 时辰 — single source of truth, re-used by ShichenField. */
export const SHICHEN: ReadonlyArray<ShichenOption> = [
  { index: 0, branch: '子', range: '23:00 – 01:00' },
  { index: 1, branch: '丑', range: '01:00 – 03:00' },
  { index: 2, branch: '寅', range: '03:00 – 05:00' },
  { index: 3, branch: '卯', range: '05:00 – 07:00' },
  { index: 4, branch: '辰', range: '07:00 – 09:00' },
  { index: 5, branch: '巳', range: '09:00 – 11:00' },
  { index: 6, branch: '午', range: '11:00 – 13:00' },
  { index: 7, branch: '未', range: '13:00 – 15:00' },
  { index: 8, branch: '申', range: '15:00 – 17:00' },
  { index: 9, branch: '酉', range: '17:00 – 19:00' },
  { index: 10, branch: '戌', range: '19:00 – 21:00' },
  { index: 11, branch: '亥', range: '21:00 – 23:00' },
]

const ITEM_H = 56
// 5 visible rows — the centred slot plus two neighbours each side. Larger rows
// (vs the 36px date wheels) so the branch glyph reads big and the almanac feel
// lands.
const VISIBLE = 5
const PAD_ROWS = Math.floor(VISIBLE / 2)
const WHEEL_H = ITEM_H * VISIBLE
const N = SHICHEN.length
// Odd copy count so there is a clean middle copy to park in. 7 copies = 84 rows
// = ±42 rows of runway from centre, far past any single fling or drag before the
// silent re-park, so the loop never visibly hits an edge.
const REPEAT = 7
const MIDDLE = Math.floor(REPEAT / 2)
// One flat list = the 12 时辰 laid end-to-end REPEAT times (84 rows). Built by
// repeating the array (not index math) so every element is a real ShichenOption
// — no `undefined`, no non-null assertion.
const LOOP: ShichenOption[] = Array.from({ length: REPEAT }, () => SHICHEN).flat()

export interface ShichenWheelProps {
  /** Current selection (0-11). */
  value: ShichenIndex
  /** Fires (with haptic) whenever the centred 时辰 changes on settle. */
  onChange: (index: ShichenIndex) => void
  /** Brand accent for the centre selection band. */
  accent: string
}

/** Single-column looping 时辰 wheel — branch glyph (big) + clock range. */
export function ShichenWheel({ value, onChange, accent }: ShichenWheelProps) {
  const { colors } = useTheme()
  const aref = useAnimatedRef<Animated.ScrollView>()
  const initialRow = MIDDLE * N + value
  const scrollY = useSharedValue(initialRow * ITEM_H)
  // Last committed index lives on the UI thread so the settle worklet can skip
  // redundant haptics/commits when the wheel lands back on the same 时辰.
  const lastIdx = useSharedValue<number>(value)

  const commit = useCallback(
    (idx: number) => {
      void Haptics.selectionAsync().catch(() => undefined)
      onChange(idx as ShichenIndex)
    },
    [onChange]
  )

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
    onMomentumEnd: (e) => {
      const raw = Math.round(e.contentOffset.y / ITEM_H)
      const idx = ((raw % N) + N) % N
      // Silent re-park to the middle copy so the runway never runs out.
      const home = MIDDLE * N + idx
      if (raw !== home) scrollTo(aref, 0, home * ITEM_H, false)
      if (idx !== lastIdx.value) {
        lastIdx.value = idx
        runOnJS(commit)(idx)
      }
    },
  })

  return (
    <View style={{ height: WHEEL_H, position: 'relative' }}>
      {/* Centre selection band. */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: ITEM_H * PAD_ROWS,
          left: 0,
          right: 0,
          height: ITEM_H,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: accent,
          backgroundColor: `${accent}1A`,
        }}
      />
      <Animated.ScrollView
        ref={aref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate='fast'
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: initialRow * ITEM_H }}
        contentContainerStyle={{ paddingVertical: ITEM_H * PAD_ROWS }}
        onScroll={handler}
      >
        {LOOP.map((s, i) => (
          <WheelRow
            // Positional key — the 12 时辰 repeat, so the row index is the stable
            // identity for this fixed-length list.
            key={i}
            row={i}
            item={s}
            scrollY={scrollY}
            textColor={colors.text}
            rangeColor={colors.secondary}
          />
        ))}
      </Animated.ScrollView>
    </View>
  )
}

function WheelRow({
  row,
  item,
  scrollY,
  textColor,
  rangeColor,
}: {
  row: number
  item: ShichenOption
  scrollY: SharedValue<number>
  textColor: string
  rangeColor: string
}) {
  const animStyle = useAnimatedStyle(() => {
    const d = Math.abs(scrollY.value / ITEM_H - row)
    return {
      opacity: interpolate(d, [0, 1, 2], [1, 0.5, 0.22], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1, 2], [1, 0.86, 0.74], Extrapolation.CLAMP) }],
    }
  })

  return (
    <Animated.View
      style={[
        {
          height: ITEM_H,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        },
        animStyle,
      ]}
    >
      <Text
        style={{ fontSize: 28, color: textColor, fontWeight: '400' }}
      >{`${item.branch}时`}</Text>
      <Text style={{ fontSize: 13, color: rangeColor, fontWeight: '300' }}>{item.range}</Text>
    </Animated.View>
  )
}
