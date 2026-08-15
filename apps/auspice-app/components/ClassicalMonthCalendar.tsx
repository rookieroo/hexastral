/**
 * ClassicalMonthCalendar — 通书式月历 (黄历原声首页).
 *
 * A month grid in the traditional almanac style: weekday headers 日…六, each
 * cell carries 公历日 / 农历名 / 建除字 (computed client-side from the
 * deterministic engine — no extra API field). Today is ringed, the selected
 * day is filled, tapping a day drills the home content onto that date.
 * zh-only surface (the classical home only renders for zh).
 */

import { calculateDailyAlmanac } from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceMonthPayload, fetchAuspiceMonth } from '@/lib/api'
import { lunarCellLabel } from '@/lib/calendar-display'
import type { Locale } from '@/lib/i18n'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function ClassicalMonthCalendar({
  selectedDay,
  todayIso,
  onSelectDay,
  locale,
}: {
  /** ISO date the home content is showing (drives which cell is filled). */
  selectedDay: string
  todayIso: string
  onSelectDay: (iso: string) => void
  locale: Locale
}) {
  const { colors, spacing } = useTheme()
  const [monthOffset, setMonthOffset] = useState(0)

  // Displayed month = selectedDay's month shifted by the chevrons.
  const base = useMemo(() => {
    const [y, m] = selectedDay.split('-').map(Number)
    const total = (y ?? 1970) * 12 + ((m ?? 1) - 1) + monthOffset
    return { year: Math.floor(total / 12), month: (total % 12) + 1 }
  }, [selectedDay, monthOffset])

  const [payload, setPayload] = useState<AuspiceMonthPayload | null>(null)
  useEffect(() => {
    let alive = true
    setPayload(null)
    fetchAuspiceMonth(base.year, base.month, locale)
      .then((p) => {
        if (alive) setPayload(p)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [base.year, base.month, locale])

  const cells = useMemo(() => {
    const first = new Date(base.year, base.month - 1, 1)
    const startWeekday = first.getDay() // 0 = Sunday
    const daysInMonth = new Date(base.year, base.month, 0).getDate()
    const out: Array<number | null> = []
    for (let i = 0; i < startWeekday; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) out.push(d)
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [base])

  // 建除字 per day — deterministic engine, cheap (≤31 calls).
  const officerByDay = useMemo(() => {
    const map = new Map<number, string>()
    for (let d = 1; d <= 31; d++) {
      map.set(d, calculateDailyAlmanac({ year: base.year, month: base.month, day: d }).dayOfficer)
    }
    return map
  }, [base])

  const lunarName = (day: number): string => {
    const cell = payload?.days.find((c) => c.day === day)
    return cell ? lunarCellLabel(cell, locale) || '' : ''
  }

  return (
    <View
      style={{
        marginHorizontal: spacing.xl,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      {/* Month header — 通书式 「丙午年 六月」 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => setMonthOffset((v) => v - 1)}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel='上个月'
        >
          <ChevronRightIcon
            size={18}
            color={colors.secondary}
            strokeWidth={1.6}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 15, letterSpacing: 2 }}>
          {base.year}年{base.month}月
        </Text>
        <Pressable
          onPress={() => setMonthOffset((v) => v + 1)}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel='下个月'
        >
          <ChevronRightIcon size={18} color={colors.secondary} strokeWidth={1.6} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 1 }}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ gap: 4 }}>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 4 }}>
            {cells.slice(row * 7, row * 7 + 7).map((d, col) => {
              if (d === null) {
                return <View key={`x-${row}-${col}`} style={{ flex: 1, minHeight: 52 }} />
              }
              const iso = isoOf(base.year, base.month, d)
              const isToday = iso === todayIso
              const isSelected = iso === selectedDay
              return (
                <Pressable
                  key={iso}
                  onPress={() => onSelectDay(iso)}
                  accessibilityRole='button'
                  accessibilityLabel={iso}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 52,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    paddingVertical: 4,
                    backgroundColor: isSelected ? colors.accent : 'transparent',
                    borderWidth: isToday && !isSelected ? 1 : 0,
                    borderColor: colors.accent,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: isSelected ? '#fff' : colors.text,
                      fontSize: 13,
                      fontWeight: isToday ? '700' : '400',
                    }}
                  >
                    {d}
                  </Text>
                  <Text
                    style={{
                      color: isSelected ? '#ffffffcc' : colors.secondary,
                      fontSize: 10,
                    }}
                  >
                    {lunarName(d) || ' '}
                  </Text>
                  <Text
                    style={{
                      color: isSelected ? '#ffffffcc' : colors.dim,
                      fontSize: 10,
                      letterSpacing: 1,
                    }}
                  >
                    {officerByDay.get(d) ?? ''}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}
