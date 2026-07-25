/**
 * WeekStrip — compact ±7 day horizontal picker for the Today home.
 *
 * Centers the viewport on today when present in the window; otherwise on
 * `selectedDay`. Tap a cell to switch the embedded day detail below.
 * Sub-labels show lunisolar day names / localized solar terms from month grid data.
 */

import { useTheme } from '@zhop/core-ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native'

const WINDOW = 7
/** Fixed cell width so we can scroll without waiting on per-cell layouts. */
const CELL_W = 52

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function addDays(iso: string, delta: number): string {
  const parts = iso.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function weekdayLabel(iso: string, locale: string): string {
  const parts = iso.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const dt = new Date(y, m - 1, d)
  if (locale === 'en') {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()] ?? ''
  }
  if (locale === 'ja') {
    return ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()] ?? ''
  }
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()] ?? ''
}

export interface WeekStripProps {
  selectedDay: string
  todayIso: string
  onSelectDay: (dateIso: string) => void
  locale: string
  /** Lunisolar / solar-term sub-label per ISO date (from month grid). */
  dayLabels?: Record<string, string>
}

export function WeekStrip({
  selectedDay,
  todayIso,
  onSelectDay,
  locale,
  dayLabels,
}: WeekStripProps) {
  const { colors, spacing } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const [viewportW, setViewportW] = useState(0)

  const days = useMemo(() => {
    const arr: string[] = []
    for (let i = -WINDOW; i <= WINDOW; i++) {
      arr.push(addDays(selectedDay, i))
    }
    return arr
  }, [selectedDay])

  const gap = spacing.sm
  const padH = spacing.xl

  const centerTarget = useCallback(
    (iso: string, animated: boolean) => {
      if (viewportW <= 0) return
      const idx = days.indexOf(iso)
      if (idx < 0) return
      const cellCenter = padH + idx * (CELL_W + gap) + CELL_W / 2
      const x = Math.max(0, cellCenter - viewportW / 2)
      scrollRef.current?.scrollTo({ x, animated })
    },
    [days, gap, padH, viewportW]
  )

  // Prefer today in the middle of the strip when it's in the ±7 window.
  useEffect(() => {
    const target = days.includes(todayIso) ? todayIso : selectedDay
    // First paint: snap without animation so today is centered immediately.
    const id = requestAnimationFrame(() => centerTarget(target, false))
    return () => cancelAnimationFrame(id)
  }, [centerTarget, days, selectedDay, todayIso])

  const onViewportLayout = (e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width)
  }

  return (
    <View onLayout={onViewportLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padH,
          gap,
        }}
      >
        {days.map((iso) => {
          const dayNum = Number(iso.slice(8, 10))
          const isSelected = iso === selectedDay
          const isToday = iso === todayIso
          const wd = weekdayLabel(iso, locale)
          const sub = dayLabels?.[iso] ?? ''
          return (
            <Pressable
              key={iso}
              onPress={() => onSelectDay(iso)}
              accessibilityRole='button'
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={sub ? `${iso}, ${sub}` : iso}
              style={({ pressed }) => ({
                width: CELL_W,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: isToday && !isSelected ? 1 : 0,
                borderColor: isToday && !isSelected ? colors.accent : 'transparent',
                backgroundColor: isSelected ? colors.accent : colors.card,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: isSelected ? colors.bg : colors.dim,
                  fontSize: 10,
                  letterSpacing: 0.5,
                }}
              >
                {wd}
              </Text>
              <Text
                style={{
                  color: isSelected ? colors.bg : colors.text,
                  fontSize: 16,
                  fontWeight: isSelected ? '700' : '400',
                  marginTop: 2,
                }}
              >
                {dayNum}
              </Text>
              {sub ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? colors.bg : colors.dim,
                    fontSize: 9,
                    marginTop: 2,
                    maxWidth: CELL_W - 8,
                    opacity: isSelected ? 0.85 : 1,
                  }}
                >
                  {sub}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
