/**
 * Home — Today-first IA: WeekStrip + yi/ji + For you (push anchor).
 *
 * Full month grid lives on `/calendar` (swipe right). Settings via swipe left.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DayView } from '@/components/DayView'
import { DualTzBanner } from '@/components/DualTzBanner'
import { MoonLoader } from '@/components/MoonLoader'
import { WeekStrip } from '@/components/WeekStrip'
import {
  type AuspiceDayPayload,
  fetchAuspiceBootstrap,
  fetchAuspiceDay,
  fetchAuspiceMonth,
  primeFromBootstrap,
} from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { dayIdentityLunarLabel, lunarCellLabel } from '@/lib/calendar-display'
import type { Locale } from '@/lib/i18n'
import { localizeCultureEntry, localizeSolarTermName } from '@/lib/culture'
import { resolveCultureTargetId } from '@/lib/culture-preview'
import { useStrings } from '@/lib/i18n-context'
import { syncTodayWidget } from '@/lib/widget-bridge'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function todayIsoString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDaysIso(iso: string, delta: number): string {
  const parts = iso.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export default function HomeScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const params = useLocalSearchParams<{ day?: string; focus?: string }>()

  const todayIso = useMemo(() => todayIsoString(), [])
  const initialDay = useMemo(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    return typeof candidate === 'string' && DATE_RE.test(candidate) ? candidate : todayIso
  }, [params.day, todayIso])

  const focusPersonal = useMemo(() => {
    const f = Array.isArray(params.focus) ? params.focus[0] : params.focus
    return f === 'personal'
  }, [params.focus])

  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [weekLabels, setWeekLabels] = useState<Record<string, string>>({})
  const scrollRef = useRef<ScrollView>(null)
  const dayViewOffsetRef = useRef(0)
  const personalOffsetRef = useRef(0)

  useEffect(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    if (typeof candidate === 'string' && DATE_RE.test(candidate)) {
      setSelectedDay(candidate)
    }
  }, [params.day])

  const [dayData, setDayData] = useState<AuspiceDayPayload | null>(null)
  const [dayLoading, setDayLoading] = useState(true)
  const [dayError, setDayError] = useState<string | null>(null)
  const primedRef = useRef(false)

  const loadDay = useCallback(() => {
    setDayLoading(true)
    setDayError(null)
    getAuspiceBirthDate()
      .then((birthDate) => {
        if (!primedRef.current) {
          primedRef.current = true
          return fetchAuspiceBootstrap(selectedDay, locale, birthDate).then((b) => {
            primeFromBootstrap(b, selectedDay, locale, birthDate)
            return b as AuspiceDayPayload
          })
        }
        return fetchAuspiceDay(selectedDay, birthDate)
      })
      .then((d) => setDayData(d))
      .catch((e: unknown) => setDayError(e instanceof Error ? e.message : String(e)))
      .finally(() => setDayLoading(false))
  }, [selectedDay, locale])

  useFocusEffect(
    useCallback(() => {
      loadDay()
    }, [loadDay])
  )

  useEffect(() => {
    if (dayData) void syncTodayWidget(dayData.date, dayData.day, dayData.personalization, t, locale)
  }, [dayData, t, locale])

  useEffect(() => {
    if (focusPersonal && dayData && !dayLoading) {
      const y = dayViewOffsetRef.current + personalOffsetRef.current
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true })
      })
    }
  }, [focusPersonal, dayData, dayLoading])

  // Lunisolar sub-labels for the ±7 week strip (may span two gregorian months).
  useEffect(() => {
    let alive = true
    const monthKeys = new Set<string>()
    for (let i = -7; i <= 7; i++) {
      monthKeys.add(addDaysIso(selectedDay, i).slice(0, 7))
    }
    void Promise.all(
      [...monthKeys].map(async (ym) => {
        const [y, m] = ym.split('-').map(Number)
        if (!y || !m) return null
        return fetchAuspiceMonth(y, m, locale)
      })
    )
      .then((payloads) => {
        if (!alive) return
        const labels: Record<string, string> = {}
        for (const payload of payloads) {
          if (!payload) continue
          for (const cell of payload.days) {
            labels[cell.date] = lunarCellLabel(cell, locale)
          }
        }
        setWeekLabels(labels)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [selectedDay, locale])

  const navLockRef = useRef(false)
  const goToCalendar = useCallback(() => {
    if (navLockRef.current) return
    navLockRef.current = true
    router.push('/calendar' as Href)
    setTimeout(() => {
      navLockRef.current = false
    }, 600)
  }, [router])
  const goToMe = useCallback(() => {
    if (navLockRef.current) return
    navLockRef.current = true
    router.push('/me')
    setTimeout(() => {
      navLockRef.current = false
    }, 600)
  }, [router])

  const { activeOffsetX, failOffsetY, commitDx, maxDy, hintDelayMs } = SWIPE_TO_ME
  const commitRightDx = -commitDx
  const homeSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onEnd((e) => {
          if (Math.abs(e.translationY) >= maxDy) return
          if (e.translationX < commitDx) runOnJS(goToMe)()
          else if (e.translationX > commitRightDx) runOnJS(goToCalendar)()
        }),
    [goToCalendar, goToMe, activeOffsetX, failOffsetY, commitDx, commitRightDx, maxDy]
  )

  const hintFade = useSharedValue(0)
  useEffect(() => {
    const HINT_EASE = Easing.bezier(0.4, 0, 0.2, 1)
    const id = setTimeout(() => {
      hintFade.value = withTiming(0.55, { duration: 700, easing: HINT_EASE })
    }, hintDelayMs)
    return () => clearTimeout(id)
  }, [hintFade, hintDelayMs])
  const hintFadeStyle = useAnimatedStyle(() => ({ opacity: hintFade.value }))

  const pushHook = dayData?.dailyHook ?? null

  const festivalChip =
    dayData &&
    (() => {
      const cultureId = resolveCultureTargetId(dayData.day)
      const apiLabel = dayData.day.festivalToday?.name ?? dayData.day.solarTermToday?.name
      if (!cultureId || !apiLabel) return null
      const chipLabel = dayData.day.festivalToday
        ? localizeCultureEntry(cultureId, locale, apiLabel)
        : localizeSolarTermName(apiLabel, locale)
      return (
        <CultureAccentChip
          label={chipLabel}
          onPress={() => router.push(`/festival/${cultureId}` as Href)}
          colors={colors}
          spacing={spacing}
        />
      )
    })()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <GestureDetector gesture={homeSwipe}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{t.todayTab}</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingBottom: spacing['3xl'] + 48,
              gap: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            <DualTzBanner />

            {dayData ? (
              <DayIdentityHeader
                payload={dayData}
                colors={colors}
                spacing={spacing}
                locale={locale}
              />
            ) : null}

            <WeekStrip
              selectedDay={selectedDay}
              todayIso={todayIso}
              onSelectDay={setSelectedDay}
              locale={locale}
              dayLabels={weekLabels}
            />

            <View
              style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}
              onLayout={(e) => {
                dayViewOffsetRef.current = e.nativeEvent.layout.y
              }}
            >
              {dayLoading && !dayData ? (
                <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
                  <MoonLoader />
                </View>
              ) : dayError ? (
                <View style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
                  <Text style={{ color: colors.secondary }}>
                    {t.loadFailed}: {dayError}
                  </Text>
                  <Button variant='secondary' onPress={loadDay}>
                    {t.retry}
                  </Button>
                </View>
              ) : dayData ? (
                <DayView
                  payload={dayData}
                  pushHook={pushHook}
                  festivalChip={festivalChip}
                  onPersonalSectionLayout={(y) => {
                    personalOffsetRef.current = y
                  }}
                />
              ) : null}
            </View>
          </ScrollView>

          {!dayData && !dayError ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <MoonLoader fullScreen />
            </View>
          ) : null}

          <Animated.View
            pointerEvents='none'
            style={[
              {
                position: 'absolute',
                bottom: spacing.xl,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: spacing.xl,
              },
              hintFadeStyle,
            ]}
          >
            <Text
              style={{
                color: colors.dim,
                fontSize: 10.5,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {t.swipeCalendarHint}
            </Text>
            <Text
              style={{
                color: colors.dim,
                fontSize: 10.5,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {t.swipeMeHint}
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </SafeAreaView>
  )
}

interface CultureAccentChipProps {
  label: string
  onPress: () => void
  colors: { accent: string; accentGhost: string }
  spacing: { md: number }
}

function CultureAccentChip({ label, onPress, colors, spacing }: CultureAccentChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: colors.accent,
        backgroundColor: colors.accentGhost,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      <ChevronRightIcon size={14} color={colors.accent} strokeWidth={1.6} />
    </Pressable>
  )
}

function DayIdentityHeader({
  payload,
  colors,
  spacing,
  locale,
}: {
  payload: AuspiceDayPayload
  colors: { text: string; dim: string }
  spacing: { xl: number; sm: number }
  locale: string
}) {
  const { day } = payload
  const ld = day.lunarDate
  const yg = day.yearGanZhi
  const gYear = payload.date.slice(0, 4)
  const dayGanzhiLabel = `${day.ganZhi}${locale.startsWith('zh') ? '日' : ''}`
  const lunarPart = dayIdentityLunarLabel(ld, locale as Locale)
  const sub = [
    lunarPart,
    yg && locale !== 'en' ? `${yg.stem}${yg.branch}年` : '',
    locale === 'en' ? gYear : `${gYear}年`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <View
      style={{
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '500', letterSpacing: 1 }}>
        {dayGanzhiLabel}
      </Text>
      {sub ? <Text style={{ color: colors.dim, fontSize: 13 }}>{sub}</Text> : null}
    </View>
  )
}
