/**
 * WeekStrip — compact ±7 day horizontal picker for the Today home.
 *
 * Centers on `selectedDay`; tap a cell to switch the embedded day detail below.
 * Sub-labels show lunisolar day names / localized solar terms from month grid data.
 */

import { useTheme } from '@zhop/core-ui'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'

const WINDOW = 7

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

  const days = useMemo(() => {
    const arr: string[] = []
    for (let i = -WINDOW; i <= WINDOW; i++) {
      arr.push(addDays(selectedDay, i))
    }
    return arr
  }, [selectedDay])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
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
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 12,
              borderWidth: isToday && !isSelected ? 1 : 0,
              borderColor: isToday && !isSelected ? colors.accent : 'transparent',
              backgroundColor: isSelected ? colors.accent : colors.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: isSelected ? '#fff' : colors.dim,
                fontSize: 10,
                letterSpacing: 0.5,
              }}
            >
              {wd}
            </Text>
            <Text
              style={{
                color: isSelected ? '#fff' : colors.text,
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
                  color: isSelected ? 'rgba(255,255,255,0.85)' : colors.dim,
                  fontSize: 9,
                  marginTop: 2,
                  maxWidth: 40,
                }}
              >
                {sub}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
