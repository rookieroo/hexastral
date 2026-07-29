/**
 * Home — Today-first IA: week strip (tap to expand month) + Good/Avoid + For you.
 *
 * Calendar: tap the chevron under the strip to expand/collapse (horizontal swipe
 * on the strip is reserved for scrolling days / paging months — don't fight it).
 * Rest of home: swipe left → Settings; swipe right is intentionally inert (no 负一屏).
 * Header Settings sits outside the pan detector so taps always register.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { ChevronRightIcon, SettingsIcon } from '@zhop/hexastral-icons/action'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector, Pressable } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CalendarExpandPanel } from '@/components/CalendarExpandPanel'
import { DayView } from '@/components/DayView'
import { DualTzBanner } from '@/components/DualTzBanner'
import { moonPhaseForIsoDate } from '@/components/DailyCard'
import { PhaseLogo } from '@/components/PhaseLogo'
import {
  type AuspiceDayPayload,
  fetchAuspiceBootstrap,
  fetchAuspiceDay,
  fetchAuspiceMonth,
  primeFromBootstrap,
} from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { lunarCellLabel } from '@/lib/calendar-display'
import { localizeCultureEntry, localizeSolarTermName } from '@/lib/culture'
import { resolveCultureTargetId } from '@/lib/culture-preview'
import { useStrings } from '@/lib/i18n-context'
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { syncTodayWidget } from '@/lib/widget-bridge'

const HOME_LOGO_SIZE = 28

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
  const { colors, spacing, mode } = useTheme()
  const { phase: devMoonPhase } = useDevMoonPhase()
  const { t, locale } = useStrings()
  const router = useRouter()
  const params = useLocalSearchParams<{ day?: string; focus?: string }>()

  const [todayIso, setTodayIso] = useState(() => todayIsoString())
  const todayMoonPhase = useMemo(() => moonPhaseForIsoDate(todayIso), [todayIso])

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
      // Refresh civil "today" on focus so midnight / overnight stays accurate.
      setTodayIso(todayIsoString())
      loadDay()
    }, [loadDay])
  )

  // Widgets always sync a window from civil today — not the calendar selection.
  useEffect(() => {
    let cancelled = false
    void getAuspiceBirthDate()
      .then(async (birthDate) => {
        const today = todayIsoString()
        const payload = await fetchAuspiceDay(today, birthDate)
        if (cancelled) return
        await syncTodayWidget(
          today,
          payload.day,
          payload.personalization,
          t,
          locale,
          Boolean(payload.personalization)
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [todayIso, t, locale])

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
  const goToMe = useCallback(() => {
    // Pan onEnd can race a Pressable touch-up on the same finger (esp. For you
    // empty-state card) — lock so Settings only mounts once per gesture.
    if (navLockRef.current) return
    navLockRef.current = true
    router.push('/me' as Href)
    setTimeout(() => {
      navLockRef.current = false
    }, 700)
  }, [router])

  // Left-swipe → Settings. Wider activeOffsetX so ordinary taps aren't stolen by the pan
  // (RN Pressable + eager Pan is why Share / chevron needed multiple taps).
  const { failOffsetY, commitDx, maxDy } = SWIPE_TO_ME
  const homeSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-48, 48])
        .failOffsetY(failOffsetY)
        .maxPointers(1)
        .onEnd((e) => {
          if (Math.abs(e.translationY) >= maxDy) return
          if (e.translationX < commitDx) runOnJS(goToMe)()
        }),
    [failOffsetY, commitDx, maxDy, goToMe]
  )

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
      {/* Header outside the pan detector — RNGH Pan otherwise eats the Settings tap. */}
      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View accessibilityLabel='Yuun'>
          <PhaseLogo
            phase={devMoonPhase ?? todayMoonPhase}
            size={HOME_LOGO_SIZE}
          />
        </View>
        <Pressable
          onPress={goToMe}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel={t.settings}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <SettingsIcon size={22} color={colors.text} strokeWidth={1.5} />
        </Pressable>
      </View>

      <GestureDetector gesture={homeSwipe}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingBottom: spacing['3xl'],
              gap: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            <DualTzBanner />

            <CalendarExpandPanel
              selectedDay={selectedDay}
              todayIso={todayIso}
              onSelectDay={setSelectedDay}
              locale={locale}
              dayLabels={weekLabels}
              expandLabel={t.openMonth}
              collapseLabel={t.exploreCollapse}
            />

            <View
              style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}
              onLayout={(e) => {
                dayViewOffsetRef.current = e.nativeEvent.layout.y
              }}
            >
              {dayError ? (
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
