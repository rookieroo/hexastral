/**
 * DateWheelPicker — Android inline drum-roll date selector
 *
 * Replaces the system Dialog picker on Android so both platforms show an
 * in-page spinner wheel, matching the iOS RNDateTimePicker spinner display.
 *
 * Usage:
 *   import { AndroidDatePicker } from '@/components/ui/DateWheelPicker'
 *
 *   <AndroidDatePicker
 *     value={date}
 *     onChange={setDate}
 *     minimumDate={new Date('1900-01-01')}
 *     maximumDate={new Date()}
 *     textColor={colors.text}
 *     dimColor={colors.textSecondary}
 *     borderColor={colors.border}
 *   />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

// ─── Constants ────────────────────────────────────────────────────────────────

export const WHEEL_ITEM_H = 44
export const WHEEL_VISIBLE = 7
export const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE
const WHEEL_PAD = WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2)

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ─── Single column ────────────────────────────────────────────────────────────

interface DateWheelColumnProps {
  data: number[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  formatLabel: (v: number) => string
  textColor: string
  dimColor: string
  borderColor: string
  flex?: number
}

export function DateWheelColumn({
  data,
  selectedIndex,
  onSelect,
  formatLabel,
  textColor,
  dimColor,
  borderColor,
  flex = 1,
}: DateWheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null)
  // lastIdx tracks the last known numeric scroll position (always a number)
  const lastIdx = useRef(selectedIndex ?? 0)
  const didInitScroll = useRef(false)

  // Initial scroll: run after native layout is committed.
  // We do NOT use the `contentOffset` prop because React Native creates a new
  // object reference on every re-render (e.g. from an Animated.View fade-in),
  // which can re-apply the offset before content is fully measured and race
  // with onContentSizeChange, leaving the wheel stuck at a wrong position.
  const handleLayout = useCallback(() => {
    if (didInitScroll.current) return
    didInitScroll.current = true
    const y = lastIdx.current * WHEEL_ITEM_H
    scrollRef.current?.scrollTo({ y, animated: false })
    // Second pass for Android where native layout may lag one frame behind JS
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false })
    }, 100)
  }, [])

  const handleContentSizeChange = useCallback((_w: number, _h: number) => {
    // No-op — initial scroll is handled by onLayout above.
    // Kept as a callback hook for potential future use.
  }, [])

  // Respond to parent-driven index changes (e.g. day clamping after month change)
  useEffect(() => {
    if (selectedIndex === null) return
    if (lastIdx.current !== selectedIndex) {
      lastIdx.current = selectedIndex
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_H, animated: true })
    }
  }, [selectedIndex])

  const handleScrollEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H)
    const clamped = Math.max(0, Math.min(idx, data.length - 1))
    lastIdx.current = clamped
    onSelect(clamped)
  }

  return (
    <View style={{ flex, height: WHEEL_H, overflow: 'hidden' }}>
      {/* Selection hairlines */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          top: WHEEL_PAD,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_H,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor,
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate='fast'
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
      >
        {data.map((v, idx) => {
          const dist = selectedIndex !== null ? Math.abs(idx - selectedIndex) : null
          const isSelected = dist === 0
          const fontSize = isSelected ? 22 : dist === 1 ? 18 : 15
          // null dist = nothing selected → all items uniformly dim
          const opacity =
            dist === null ? 0.28 : isSelected ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.35 : 0.18
          return (
            <View
              key={v}
              style={{ height: WHEEL_ITEM_H, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text
                style={{
                  color: textColor,
                  opacity,
                  fontSize,
                  fontWeight: isSelected ? '400' : '300',
                  letterSpacing: 0.5,
                }}
              >
                {formatLabel(v)}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ─── Three-column date picker ─────────────────────────────────────────────────

interface AndroidDatePickerProps {
  value: Date
  onChange: (date: Date) => void
  minimumDate: Date
  maximumDate: Date
  textColor: string
  dimColor: string
  borderColor: string
  /** Column display order. 'ymd' = Year/Month/Day (CJK default), 'mdy' = Month/Day/Year (western default) */
  columnOrder?: 'ymd' | 'mdy'
}

export function AndroidDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  textColor,
  dimColor,
  borderColor,
  columnOrder = 'ymd',
}: AndroidDatePickerProps) {
  const maxYear = maximumDate.getFullYear()
  const minYear = minimumDate.getFullYear()

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear]
  )
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])

  const [selYear, setSelYear] = useState(value.getFullYear())
  const [selMonth, setSelMonth] = useState(value.getMonth() + 1)
  const [selDay, setSelDay] = useState(value.getDate())

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

  const days = useMemo(
    () => Array.from({ length: getDaysInMonth(selYear, selMonth) }, (_, i) => i + 1),
    [selYear, selMonth, getDaysInMonth]
  )

  const clampedDay = Math.min(selDay, days.length)
  const yearIndex = Math.max(0, years.indexOf(selYear))
  const monthIndex = selMonth - 1
  const dayIndex = clampedDay - 1

  const commit = useCallback(
    (y: number, m: number, d: number) => {
      const maxD = getDaysInMonth(y, m)
      onChange(new Date(y, m - 1, Math.min(d, maxD)))
    },
    [onChange, getDaysInMonth]
  )

  const colProps = { textColor, dimColor, borderColor }

  const yearCol = (
    <DateWheelColumn
      key='year'
      data={years}
      selectedIndex={yearIndex}
      onSelect={(idx) => {
        const y = years[idx]
        if (y === undefined) return
        setSelYear(y)
        commit(y, selMonth, selDay)
      }}
      formatLabel={(v) => String(v)}
      {...colProps}
    />
  )

  const monthCol = (
    <DateWheelColumn
      key='month'
      data={months}
      selectedIndex={monthIndex}
      onSelect={(idx) => {
        const m = months[idx]
        if (m === undefined) return
        setSelMonth(m)
        commit(selYear, m, selDay)
      }}
      formatLabel={(v) =>
        columnOrder === 'mdy' ? (MONTH_NAMES_FULL[v - 1] ?? String(v)) : String(v).padStart(2, '0')
      }
      flex={columnOrder === 'mdy' ? 2 : 1}
      {...colProps}
    />
  )

  const dayCol = (
    <DateWheelColumn
      key='day'
      data={days}
      selectedIndex={dayIndex}
      onSelect={(idx) => {
        const d = days[idx]
        if (d === undefined) return
        setSelDay(d)
        commit(selYear, selMonth, d)
      }}
      formatLabel={(v) => String(v).padStart(2, '0')}
      {...colProps}
    />
  )

  const columns = columnOrder === 'mdy' ? [monthCol, dayCol, yearCol] : [yearCol, monthCol, dayCol]

  return <View style={{ flexDirection: 'row', height: WHEEL_H }}>{columns}</View>
}
