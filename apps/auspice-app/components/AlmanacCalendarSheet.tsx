/**
 * AlmanacCalendarSheet — ink-line month picker for classical home.
 * Opens from the large day number; select closes and reports ISO date.
 */

import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { MoonLoader } from '@/components/MoonLoader'
import { almanacPalette, weekdayFromIso } from '@/lib/almanac-palette'
import { useAlmanacTheme } from '@/lib/almanac-theme-context'
import { type AuspiceMonthDay, type AuspiceMonthPayload, fetchAuspiceMonth } from '@/lib/api'
import {
  defaultCalendarDisplayMode,
  lunarCellLabel,
  lunarHeaderLabel,
} from '@/lib/calendar-display'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'

const WINDOW = 24
const CELL_ASPECT = 1.15
/** Always 6 week rows so Feb (4) and 31-day Saturday-start months share one sheet height. */
const GRID_WEEKS = 6
const CELL_PAD_X = 16
const WEEK_RULE = 0.5

const WEEKDAYS_BY_LOCALE: Record<Locale, readonly string[]> = {
  'zh-Hans': ['日', '一', '二', '三', '四', '五', '六'],
  'zh-Hant': ['日', '一', '二', '三', '四', '五', '六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

interface MonthRef {
  year: number
  month: number
}

export function AlmanacCalendarSheet({
  visible,
  onClose,
  selectedDay,
  todayIso,
  onSelectDay,
  /** When set, days before this ISO are not selectable (classical: lock past). */
  minDayIso,
}: {
  visible: boolean
  onClose: () => void
  selectedDay: string
  todayIso: string
  onSelectDay: (dateIso: string) => void
  minDayIso?: string
}) {
  const { mode } = useTheme()
  const { t, locale } = useStrings()
  const { theme } = useAlmanacTheme()
  const P = almanacPalette(mode === 'dark', theme, weekdayFromIso(selectedDay), locale)
  const { width: screenWidth } = useWindowDimensions()
  const minIso = minDayIso ?? '0000-01-01'

  const now = useMemo(() => {
    const [y, m] = todayIso.split('-').map(Number)
    return { year: y ?? new Date().getFullYear(), month: m ?? new Date().getMonth() + 1 }
  }, [todayIso])

  const months = useMemo<MonthRef[]>(() => {
    const arr: MonthRef[] = []
    for (let offset = -WINDOW; offset <= WINDOW; offset++) {
      const m0 = now.month - 1 + offset
      const year = now.year + Math.floor(m0 / 12)
      const month = (((m0 % 12) + 12) % 12) + 1
      arr.push({ year, month })
    }
    return arr
  }, [now.year, now.month])

  const anchorIndex = WINDOW
  const selectedIndex = useMemo(() => {
    const [y, m] = selectedDay.split('-').map(Number)
    if (!y || !m) return anchorIndex
    return months.findIndex((ref) => ref.year === y && ref.month === m)
  }, [selectedDay, months, anchorIndex])

  const [visibleIndex, setVisibleIndex] = useState(selectedIndex >= 0 ? selectedIndex : anchorIndex)
  const listRef = useRef<FlatList<MonthRef>>(null)
  const cacheRef = useRef<Map<string, AuspiceMonthPayload>>(new Map())
  const [lunarHeaders, setLunarHeaders] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!visible) return
    const idx = selectedIndex >= 0 ? selectedIndex : anchorIndex
    setVisibleIndex(idx)
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false })
    })
  }, [visible, selectedIndex, anchorIndex])

  const onCellHeader = useCallback((key: string, header: string) => {
    setLunarHeaders((prev) => (prev[key] === header ? prev : { ...prev, [key]: header }))
  }, [])

  const visibleMonth = months[visibleIndex] ?? months[anchorIndex]!
  const visibleKey = `${visibleMonth.year}-${visibleMonth.month}-${locale}`
  const visibleLunarHeader = lunarHeaders[visibleKey] ?? null

  const getItemLayout = useCallback(
    (_: ArrayLike<MonthRef> | null | undefined, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  )

  const gridHeight = useMemo(() => {
    const cellW = (screenWidth - CELL_PAD_X * 2) / 7
    const cellH = cellW / CELL_ASPECT
    return GRID_WEEKS * (cellH + WEEK_RULE) + 4
  }, [screenWidth])

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
      setVisibleIndex(idx)
    },
    [screenWidth]
  )

  const pick = useCallback(
    (iso: string) => {
      if (iso < minIso) return
      onSelectDay(iso)
      onClose()
    },
    [onSelectDay, onClose, minIso]
  )

  const goToToday = useCallback(() => {
    listRef.current?.scrollToIndex({ index: anchorIndex, animated: true })
    setVisibleIndex(anchorIndex)
    pick(todayIso)
  }, [anchorIndex, pick, todayIso])

  const renderItem = useCallback(
    ({ item }: { item: MonthRef }) => (
      <InkMonthCell
        year={item.year}
        month={item.month}
        locale={locale}
        todayKey={todayIso}
        selectedDay={selectedDay}
        minDayIso={minIso}
        cache={cacheRef.current}
        onCellHeader={onCellHeader}
        onPressDay={pick}
        width={screenWidth}
        P={P}
      />
    ),
    [locale, todayIso, selectedDay, minIso, onCellHeader, pick, screenWidth, P]
  )

  const showTodayChip = visibleIndex !== anchorIndex || selectedDay !== todayIso

  const title =
    locale === 'en'
      ? `${t.openMonth} · ${visibleMonth.year}.${pad(visibleMonth.month)}`
      : `${t.openMonth} · ${visibleMonth.year}年${visibleMonth.month}月`

  return (
    <SatelliteBottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: P.dim, fontSize: 12, letterSpacing: 1 }} numberOfLines={1}>
            {visibleLunarHeader ? lunarHeaderLabel(visibleLunarHeader, locale) : ' '}
          </Text>
          <Pressable
            onPress={goToToday}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t.goToday}
            pointerEvents={showTodayChip ? 'auto' : 'none'}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 0.5,
              borderColor: showTodayChip ? P.ink : 'transparent',
              opacity: showTodayChip ? (pressed ? 0.55 : 1) : 0,
            })}
          >
            <Text style={{ color: P.gold, fontSize: 12, letterSpacing: 1 }}>{t.today}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
          {(WEEKDAYS_BY_LOCALE[locale] ?? WEEKDAYS_BY_LOCALE['zh-Hans']).map((w, wi) => (
            <Text
              key={wi}
              style={{
                flex: 1,
                textAlign: 'center',
                color: P.dim,
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {w}
            </Text>
          ))}
        </View>

        <View style={{ borderTopWidth: 0.5, borderTopColor: P.ink, marginHorizontal: 4 }} />

        <FlatList
          ref={listRef}
          data={months}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedIndex >= 0 ? selectedIndex : anchorIndex}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderItem}
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={3}
          style={{ height: gridHeight }}
        />
      </View>
    </SatelliteBottomSheet>
  )
}

type InkPalette = ReturnType<typeof almanacPalette>

function InkMonthCell({
  year,
  month,
  locale,
  todayKey,
  selectedDay,
  minDayIso,
  cache,
  onCellHeader,
  onPressDay,
  width,
  P,
}: {
  year: number
  month: number
  locale: Locale
  todayKey: string
  selectedDay: string
  minDayIso: string
  cache: Map<string, AuspiceMonthPayload>
  onCellHeader: (key: string, header: string) => void
  onPressDay: (dateIso: string) => void
  width: number
  P: InkPalette
}) {
  const cacheKey = `${year}-${month}-${locale}`
  const [data, setData] = useState<AuspiceMonthPayload | null>(() => cache.get(cacheKey) ?? null)
  const [loading, setLoading] = useState(!cache.has(cacheKey))

  useEffect(() => {
    const cached = cache.get(cacheKey)
    if (cached) {
      if (cached.lunarMonthHeader) onCellHeader(cacheKey, cached.lunarMonthHeader)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchAuspiceMonth(year, month, locale)
      .then((payload) => {
        cache.set(cacheKey, payload)
        if (cancelled) return
        setData(payload)
        if (payload.lunarMonthHeader) onCellHeader(cacheKey, payload.lunarMonthHeader)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [year, month, locale, cacheKey, cache, onCellHeader])

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<{ day: number; data: AuspiceMonthDay | null } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      data: data?.days[i] ?? null,
    })),
  ]

  const innerWidth = width - CELL_PAD_X * 2
  const cellW = innerWidth / 7
  const cellH = cellW / CELL_ASPECT
  const weeks: Array<typeof cells> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const last = weeks[weeks.length - 1]
  if (last) {
    while (last.length < 7) last.push(null)
  }
  while (weeks.length < GRID_WEEKS) {
    weeks.push(Array.from({ length: 7 }, () => null))
  }
  const mode = defaultCalendarDisplayMode(locale)

  return (
    <View
      style={{
        width,
        height: GRID_WEEKS * (cellH + WEEK_RULE) + 4,
        paddingHorizontal: CELL_PAD_X,
        paddingTop: 4,
      }}
    >
      {weeks.map((week, wi) => (
        <View
          key={`w-${wi}`}
          style={{
            flexDirection: 'row',
            borderBottomWidth: WEEK_RULE,
            borderBottomColor: P.line,
          }}
        >
          {week.map((cell, ci) => {
            if (cell === null) {
              return <View key={`pad-${wi}-${ci}`} style={{ width: cellW, height: cellH }} />
            }
            const key = ymd(year, month, cell.day)
            const isToday = key === todayKey
            const isSelected = key === selectedDay
            const isPast = key < minDayIso
            const lunar = cell.data ? lunarCellLabel(cell.data, locale, mode) : ''
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (!isPast) onPressDay(key)
                }}
                disabled={isPast}
                style={{
                  width: cellW,
                  height: cellH,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderLeftWidth: ci === 0 ? 0 : WEEK_RULE,
                  borderLeftColor: P.line,
                  backgroundColor: isSelected ? P.goldSoft : 'transparent',
                  opacity: isPast ? 0.35 : 1,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? P.ink : isToday ? P.ink : isPast ? P.dim : P.ink,
                    fontSize: 15,
                    fontWeight: isSelected || isToday ? '700' : '400',
                  }}
                >
                  {cell.day}
                </Text>
                {lunar ? (
                  <Text
                    style={{ color: isSelected ? P.ink : P.dim, fontSize: 9 }}
                    numberOfLines={1}
                  >
                    {lunar}
                  </Text>
                ) : null}
                {isToday && !isSelected ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: P.ink,
                    }}
                  />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      ))}
      {loading && !data ? (
        <View
          pointerEvents='none'
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MoonLoader />
        </View>
      ) : null}
    </View>
  )
}
