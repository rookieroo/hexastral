/**
 * CalendarStrip — horizontal-paging month grid for the cycle home screen.
 *
 * Auspice's home is "Calendar + day detail" (per user feedback 2026-06-02):
 * the calendar dominates the top portion; tap any cell to switch the
 * embedded day detail below. `selectedDay` is owned by the parent so the
 * day-detail re-fetches alongside selection.
 *
 * Layout:
 *   - Fixed month-label row (year · month · 农历 month name + "Today" pill
 *     when off-anchor)
 *   - Fixed weekday row (日 一 二 ...)
 *   - Horizontal swipeable strip of `MonthCell` grids (`FlatList pagingEnabled`)
 *
 * Performance:
 *   - ±24 months around anchor, ~3 cells mounted at once via FlatList
 *     windowing.
 *   - Session-scope `Map` cache so paging back is instant.
 */

import { useTheme } from '@zhop/core-ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import { type AuspiceMonthDay, type AuspiceMonthPayload, fetchAuspiceMonth } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'

/** Half-window of months loaded around the anchor. 4-year browsable window. */
const WINDOW = 24
const WEEKDAYS_BY_LOCALE: Record<Locale, readonly string[]> = {
  'zh-Hans': ['日', '一', '二', '三', '四', '五', '六'],
  'zh-Hant': ['日', '一', '二', '三', '四', '五', '六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
}
/** Cell aspect ratio (width / height). >1 → wider than tall — matches iOS Calendar feel. */
const CELL_ASPECT = 1.15

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

export interface CalendarStripProps {
  /** ISO YYYY-MM-DD of the currently-selected day. Highlighted in the grid. */
  selectedDay: string
  /** Fires when the user taps a day cell. Parent updates its own state. */
  onSelectDay: (dateIso: string) => void
}

export function CalendarStrip({ selectedDay, onSelectDay }: CalendarStripProps) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const { width: screenWidth } = useWindowDimensions()

  const now = useMemo(() => new Date(), [])
  const anchor = useMemo(() => ({ year: now.getFullYear(), month: now.getMonth() + 1 }), [now])
  const todayKey = ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const months = useMemo<MonthRef[]>(() => {
    const arr: MonthRef[] = []
    for (let offset = -WINDOW; offset <= WINDOW; offset++) {
      const m0 = anchor.month - 1 + offset
      const year = anchor.year + Math.floor(m0 / 12)
      const month = (((m0 % 12) + 12) % 12) + 1
      arr.push({ year, month })
    }
    return arr
  }, [anchor.year, anchor.month])

  const anchorIndex = WINDOW
  const [visibleIndex, setVisibleIndex] = useState(anchorIndex)
  const listRef = useRef<FlatList<MonthRef>>(null)

  // Session-scope cache so paging back to a month is instant.
  const cacheRef = useRef<Map<string, AuspiceMonthPayload>>(new Map())

  // Per-month lunar header lifted up so the fixed top row can display it.
  const [lunarHeaders, setLunarHeaders] = useState<Record<string, string>>({})
  const onCellHeader = useCallback((key: string, header: string) => {
    setLunarHeaders((prev) => (prev[key] === header ? prev : { ...prev, [key]: header }))
  }, [])

  const visibleMonth = months[visibleIndex] ?? anchor
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

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
      setVisibleIndex(idx)
    },
    [screenWidth]
  )

  const goToToday = useCallback(() => {
    listRef.current?.scrollToIndex({ index: anchorIndex, animated: true })
    setVisibleIndex(anchorIndex)
    onSelectDay(todayKey)
  }, [anchorIndex, onSelectDay, todayKey])

  const renderItem = useCallback(
    ({ item }: { item: MonthRef }) => (
      <MonthCell
        year={item.year}
        month={item.month}
        locale={locale}
        todayKey={todayKey}
        selectedDay={selectedDay}
        cache={cacheRef.current}
        onCellHeader={onCellHeader}
        onPressDay={onSelectDay}
        width={screenWidth}
      />
    ),
    [locale, todayKey, selectedDay, onCellHeader, onSelectDay, screenWidth]
  )

  return (
    <View>
      {/* Month label row — year · month + lunar header subtitle + Today pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexShrink: 1 }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
            {visibleMonth.year} · {pad(visibleMonth.month)}
          </Text>
          {visibleLunarHeader && locale !== 'en' ? (
            // Drop the redundant leading "{lunarYear}年 " (the 阳历 year already shows
            // above) — one row, just the 农历 month, e.g. "五月".
            <Text style={{ color: colors.secondary, fontSize: 13 }}>
              {visibleLunarHeader.replace(/^\d+年\s*/, '')}
            </Text>
          ) : null}
        </View>
        {visibleIndex !== anchorIndex ? (
          <Pressable
            onPress={goToToday}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t.today}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: colors.accent,
              backgroundColor: colors.accentGhost,
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
              }}
            >
              {t.today}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Weekday row */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: 4,
        }}
      >
        {(WEEKDAYS_BY_LOCALE[locale] ?? WEEKDAYS_BY_LOCALE['zh-Hans']).map((w, wi) => (
          <Text
            key={wi}
            style={{
              flex: 1,
              textAlign: 'center',
              color: colors.secondary,
              fontSize: 12,
            }}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* Horizontal swipeable month grid */}
      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={(item) => `${item.year}-${item.month}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={anchorIndex}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={renderItem}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews
      />
    </View>
  )
}

// ── MonthCell ───────────────────────────────────────────────────────────────

interface MonthCellProps {
  year: number
  month: number
  locale: Locale
  todayKey: string
  selectedDay: string
  cache: Map<string, AuspiceMonthPayload>
  onCellHeader: (key: string, header: string) => void
  onPressDay: (dateIso: string) => void
  width: number
}

function MonthCell({
  year,
  month,
  locale,
  todayKey,
  selectedDay,
  cache,
  onCellHeader,
  onPressDay,
  width,
}: MonthCellProps) {
  const { colors, spacing } = useTheme()
  const cacheKey = `${year}-${month}-${locale}`

  const [data, setData] = useState<AuspiceMonthPayload | null>(() => cache.get(cacheKey) ?? null)
  const [loading, setLoading] = useState<boolean>(() => !cache.has(cacheKey))

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

  return (
    <View style={{ width, paddingHorizontal: spacing.xl, paddingTop: 2 }}>
      {loading && !data ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, i) => {
          if (cell === null) {
            return (
              <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: CELL_ASPECT }} />
            )
          }
          const key = ymd(year, month, cell.day)
          const isToday = key === todayKey
          const isSelected = key === selectedDay
          return (
            <Pressable
              key={key}
              onPress={() => onPressDay(key)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: CELL_ASPECT,
                padding: 2,
              }}
            >
              <DayCell
                dayNum={cell.day}
                data={cell.data}
                isToday={isToday}
                isSelected={isSelected}
                colors={colors}
                locale={locale}
              />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── DayCell ─────────────────────────────────────────────────────────────────

interface DayCellColors {
  text: string
  accent: string
  accentGhost: string
  secondary: string
  dim: string
  separator: string
  bg: string
}

function DayCell({
  dayNum,
  data,
  isToday,
  isSelected,
  colors,
  locale,
}: {
  dayNum: number
  data: AuspiceMonthDay | null
  isToday: boolean
  isSelected: boolean
  colors: DayCellColors
  locale: Locale
}) {
  // Cell shading: en highlights ONLY public holidays (the 黄历 吉凶 rating is 命理
  // a non-CJK audience can't read — same founder call as the sub-label). zh / tw /
  // ja keep the 吉凶 shading.
  let bg = 'transparent'
  if (data) {
    if (data.publicHoliday) bg = colors.accentGhost
    else if (locale !== 'en' && data.overallRating >= 4) bg = colors.accentGhost
    else if (locale !== 'en' && data.overallRating <= 2) bg = 'rgba(155,34,38,0.06)'
  }
  if (isSelected) bg = colors.accent

  // The dim sub-label: en sees ONLY public holidays — 节气 / 农历 day names are
  // 历法/命理 a non-CJK audience can't read (founder call: prefer holidays over
  // terms users won't understand). zh / tw / ja keep the full almanac chain.
  const hasHoliday = data?.publicHoliday !== null && data?.publicHoliday !== undefined
  const lowerText =
    locale === 'en'
      ? (data?.publicHoliday ?? '')
      : (data?.publicHoliday ?? data?.solarTermName ?? data?.lunarDayName ?? '')
  const strong =
    locale === 'en'
      ? hasHoliday
      : hasHoliday
        ? true
        : data?.solarTermName !== null && data?.solarTermName !== undefined
          ? true
          : data?.isLunarFirst === true || data?.isLunarFifteenth === true

  const numColor = isSelected ? '#fff' : isToday ? colors.accent : colors.text
  const lowerColor = isSelected ? '#fff' : strong ? colors.accent : colors.dim

  // The 流日 五行 element is intentionally NOT shown as a per-cell dot here.
  // 30 days × 5 colors made the month read as visual noise; the day's 干支 +
  // color now lives only on the selected-day detail card below, where it
  // carries information instead of competing with it. (2026-06 home audit.)

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: isToday && !isSelected ? 1 : 0,
        borderColor: isToday && !isSelected ? colors.accent : 'transparent',
        backgroundColor: bg,
        gap: 1,
      }}
    >
      <Text style={{ color: numColor, fontSize: 14, fontWeight: isSelected ? '700' : '400' }}>
        {dayNum}
      </Text>
      {lowerText ? (
        <Text
          style={{ color: lowerColor, fontSize: 9, fontWeight: strong ? '600' : '400' }}
          numberOfLines={1}
        >
          {lowerText}
        </Text>
      ) : null}
    </View>
  )
}
