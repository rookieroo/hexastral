/**
 * Home — Today-first IA.
 *
 * Classical (通书/墨棕): L/R day slide + vertical scroll; once-per-day auto slide; 通例·传帖.
 * Modern: Calendar fixed above; only the day sheet L/R flips + scrolls.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AlmanacPage } from '@/components/AlmanacPage'
import { AlmanacTearStub } from '@/components/AlmanacTearStub'
import { CalendarExpandPanel } from '@/components/CalendarExpandPanel'
import { moonPhaseForIsoDate } from '@/components/DailyCard'
import { DayPageTurn } from '@/components/DayPageTurn'
import { DayView } from '@/components/DayView'
import { DualTzBanner } from '@/components/DualTzBanner'
import { PhaseLogo } from '@/components/PhaseLogo'
import { almanacPalette, weekdayFromIso } from '@/lib/almanac-palette'
import { getTornCivilDay, setTornCivilDay } from '@/lib/almanac-theme'
import { useAlmanacTheme } from '@/lib/almanac-theme-context'
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
import { useDevMoonPhase } from '@/lib/dev-moon-phase'
import { useStrings } from '@/lib/i18n-context'
import { useVoiceMode } from '@/lib/voice-mode-context'

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

function dayNumFromIso(iso: string): number {
  const parts = iso.split('-').map(Number)
  return parts[2] ?? 1
}

function clampDayToMin(iso: string, minIso: string): string {
  return iso < minIso ? minIso : iso
}

export default function HomeScreen() {
  const { colors, spacing, mode } = useTheme()
  const { phase: devMoonPhase } = useDevMoonPhase()
  const { t, locale } = useStrings()
  const { classical } = useVoiceMode()
  const { theme } = useAlmanacTheme()
  const classicalActive = classical
  const router = useRouter()
  const params = useLocalSearchParams<{ day?: string; focus?: string }>()

  const [todayIso, setTodayIso] = useState(() => todayIsoString())
  const todayMoonPhase = useMemo(() => moonPhaseForIsoDate(todayIso), [todayIso])
  const headerP = useMemo(
    () => almanacPalette(mode === 'dark', theme, weekdayFromIso(todayIso), locale),
    [mode, theme, todayIso, locale]
  )
  const yesterdayIso = useMemo(() => addDaysIso(todayIso, -1), [todayIso])
  const stubP = useMemo(
    () => almanacPalette(mode === 'dark', theme, weekdayFromIso(yesterdayIso), locale),
    [mode, theme, yesterdayIso, locale]
  )

  const initialDay = useMemo(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    const raw = typeof candidate === 'string' && DATE_RE.test(candidate) ? candidate : todayIso
    return classical ? clampDayToMin(raw, todayIso) : raw
  }, [params.day, todayIso, classical])

  const focusPersonal = useMemo(() => {
    const f = Array.isArray(params.focus) ? params.focus[0] : params.focus
    return f === 'personal'
  }, [params.focus])

  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [weekLabels, setWeekLabels] = useState<Record<string, string>>({})
  const scrollRef = useRef<Animated.ScrollView>(null)
  const dayViewOffsetRef = useRef(0)
  const personalOffsetRef = useRef(0)
  const scrollY = useSharedValue(0)
  const onHomeScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y
    },
  })

  // After day-turn, snap scroll to top without animation (modern long page only).
  useEffect(() => {
    if (classicalActive) return
    scrollY.value = 0
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [selectedDay, scrollY, classicalActive])

  const [tearPlay, setTearPlay] = useState(false)
  const [stubGanZhi, setStubGanZhi] = useState<string | undefined>()
  const [shareRequestId, setShareRequestId] = useState(0)

  useEffect(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    if (typeof candidate === 'string' && DATE_RE.test(candidate)) {
      setSelectedDay(classicalActive ? clampDayToMin(candidate, todayIso) : candidate)
    }
  }, [params.day, classicalActive, todayIso])

  // Classical: never stay on a past civil day (midnight / overnight).
  useEffect(() => {
    if (!classicalActive) return
    setSelectedDay((prev) => clampDayToMin(prev, todayIso))
  }, [classicalActive, todayIso])

  const [dayData, setDayData] = useState<AuspiceDayPayload | null>(null)
  const [dayLoading, setDayLoading] = useState(true)
  const [dayError, setDayError] = useState<string | null>(null)
  const [adjNext, setAdjNext] = useState<AuspiceDayPayload | null>(null)
  const [adjPrev, setAdjPrev] = useState<AuspiceDayPayload | null>(null)
  const adjNextRef = useRef<AuspiceDayPayload | null>(null)
  const adjPrevRef = useRef<AuspiceDayPayload | null>(null)
  adjNextRef.current = adjNext
  adjPrevRef.current = adjPrev
  const primedRef = useRef(false)
  const dayDataRef = useRef<AuspiceDayPayload | null>(null)
  dayDataRef.current = dayData

  const loadDay = useCallback(
    (day: string = selectedDay) => {
      setDayError(null)
      const already = dayDataRef.current?.date === day
      if (!already) setDayLoading(true)
      getAuspiceBirthDate()
        .then((birthDate) => {
          if (!primedRef.current) {
            primedRef.current = true
            return fetchAuspiceBootstrap(day, locale, birthDate).then((b) => {
              primeFromBootstrap(b, day, locale, birthDate)
              return b as AuspiceDayPayload
            })
          }
          return fetchAuspiceDay(day, birthDate)
        })
        .then((d) => {
          setDayData(d)
          setDayLoading(false)
        })
        .catch((e: unknown) => {
          setDayError(e instanceof Error ? e.message : String(e))
          setDayLoading(false)
        })
    },
    [selectedDay, locale]
  )

  const onTearFinished = useCallback(() => {
    void setTornCivilDay(todayIso)
    setTearPlay(false)
  }, [todayIso])

  // Once-per-civil-day top tear — classical home focus only; does not force day after tear.
  useFocusEffect(
    useCallback(() => {
      const iso = todayIsoString()
      setTodayIso(iso)
      if (!classicalActive || theme !== 'classic') {
        setTearPlay(false)
        return
      }
      setSelectedDay((prev) => clampDayToMin(prev, iso))
      let cancelled = false
      void (async () => {
        const torn = await getTornCivilDay()
        if (cancelled) return
        if (torn === iso) {
          setTearPlay(false)
          return
        }
        // Tear reveals today — land on today under the leaf.
        setSelectedDay(iso)
        setStubGanZhi(undefined)
        setTearPlay(true)
        try {
          const birth = await getAuspiceBirthDate()
          const yData = await fetchAuspiceDay(addDaysIso(iso, -1), birth)
          if (!cancelled) setStubGanZhi(yData.day.ganZhi)
        } catch (err) {
          console.warn('[home] yesterday stub fetch failed', err)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [classicalActive, theme])
  )

  useFocusEffect(
    useCallback(() => {
      loadDay(selectedDay)
    }, [selectedDay, loadDay])
  )

  // Prefetch ±1 so L/R flip can swap payload without a loading blank.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const birth = await getAuspiceBirthDate()
        const nextIso = addDaysIso(selectedDay, 1)
        const prevIso = addDaysIso(selectedDay, -1)
        const allowPrev = !classicalActive || selectedDay > todayIso
        const [n, p] = await Promise.all([
          fetchAuspiceDay(nextIso, birth).catch(() => null),
          allowPrev ? fetchAuspiceDay(prevIso, birth).catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return
        setAdjNext(n)
        setAdjPrev(p)
      } catch (err) {
        console.warn('[home] adjacent day prefetch failed', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classicalActive, selectedDay, todayIso])

  useEffect(() => {
    if (focusPersonal && dayData && !dayLoading) {
      const y = dayViewOffsetRef.current + personalOffsetRef.current
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true })
      })
    }
  }, [focusPersonal, dayData, dayLoading])

  useEffect(() => {
    if (classicalActive) return
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
  }, [selectedDay, locale, classicalActive])

  const navLockRef = useRef(false)
  const goToMe = useCallback(() => {
    if (navLockRef.current) return
    navLockRef.current = true
    router.push('/me' as Href)
    setTimeout(() => {
      navLockRef.current = false
    }, 700)
  }, [router])

  const shiftDay = useCallback(
    (delta: -1 | 1) => {
      setSelectedDay((prev) => {
        const next = addDaysIso(prev, delta)
        if (classicalActive && next < todayIso) return prev
        if (next === prev) return prev
        const cached = delta > 0 ? adjNextRef.current : adjPrevRef.current
        if (cached?.date === next) {
          setDayData(cached)
          setDayLoading(false)
        }
        // Rotate ±1 window this frame so current/next keys never collide.
        if (delta > 0) {
          setAdjPrev(dayDataRef.current)
          setAdjNext(null)
        } else {
          setAdjNext(dayDataRef.current)
          setAdjPrev(null)
        }
        return next
      })
    },
    [classicalActive, todayIso]
  )

  const goToToday = useCallback(() => {
    setSelectedDay(todayIso)
  }, [todayIso])

  const onSelectDay = useCallback(
    (iso: string) => {
      setSelectedDay(classicalActive ? clampDayToMin(iso, todayIso) : iso)
    },
    [classicalActive, todayIso]
  )

  const isViewingToday = selectedDay === todayIso
  const canSwipePrev = !classicalActive || selectedDay > todayIso

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

  const daySheet = (
    <View
      style={{
        flex: classicalActive ? 1 : undefined,
        minHeight: classicalActive ? 0 : undefined,
        paddingHorizontal: classicalActive ? 0 : spacing.xl,
        gap: classicalActive ? 0 : spacing.lg,
        paddingBottom: classicalActive ? 0 : spacing['3xl'],
      }}
      onLayout={(e) => {
        dayViewOffsetRef.current = e.nativeEvent.layout.y
      }}
    >
      {dayError ? (
        <View style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
          <Text style={{ color: colors.secondary }}>
            {t.loadFailed}: {dayError}
          </Text>
          <Button variant='secondary' onPress={() => loadDay()}>
            {t.retry}
          </Button>
        </View>
      ) : dayData ? (
        classicalActive ? (
          <AlmanacPage
            payload={dayData}
            locale={locale}
            fromPush={focusPersonal}
            onPersonalSectionLayout={(y) => {
              personalOffsetRef.current = y
            }}
            onSelectDay={onSelectDay}
            todayIso={todayIso}
            shareRequestId={shareRequestId}
          />
        ) : (
          <DayView
            payload={dayData}
            pushHook={pushHook}
            festivalChip={festivalChip}
            fromPush={focusPersonal}
            onPersonalSectionLayout={(y) => {
              personalOffsetRef.current = y
            }}
          />
        )
      ) : null}
    </View>
  )

  const paperHome = classicalActive && theme === 'classic'

  const dayTurn = (
    <DayPageTurn
      key={`${classicalActive ? 'classical' : 'modern'}-${theme}`}
      dayKey={selectedDay}
      prevDayKey={adjPrev?.date}
      nextDayKey={adjNext?.date}
      onSwipeDay={shiftDay}
      canSwipePrev={canSwipePrev}
      autoPlay={paperHome ? tearPlay : false}
      underNext={
        adjNext ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: classicalActive ? 0 : spacing.xl,
              paddingBottom: classicalActive ? 0 : spacing['3xl'],
            }}
            pointerEvents='none'
            collapsable={false}
          >
            {classicalActive ? (
              <AlmanacPage payload={adjNext} locale={locale} capture />
            ) : (
              <DayView payload={adjNext} pushHook={null} festivalChip={null} />
            )}
          </View>
        ) : undefined
      }
      underPrev={
        adjPrev ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: classicalActive ? 0 : spacing.xl,
              paddingBottom: classicalActive ? 0 : spacing['3xl'],
            }}
            pointerEvents='none'
            collapsable={false}
          >
            {classicalActive ? (
              <AlmanacPage payload={adjPrev} locale={locale} capture />
            ) : (
              <DayView payload={adjPrev} pushHook={null} festivalChip={null} />
            )}
          </View>
        ) : undefined
      }
      autoTopLeaf={
        paperHome ? (
          <AlmanacTearStub dayNum={dayNumFromIso(yesterdayIso)} ganZhi={stubGanZhi} P={stubP} />
        ) : undefined
      }
      onAutoFinished={paperHome ? onTearFinished : undefined}
      accessibilityLabel={t.swipeDayHint}
      daySwipeHint={t.swipeDayHint}
    >
      {classicalActive ? (
        dayError ? (
          <View
            style={{ gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.xl }}
          >
            <Text style={{ color: colors.secondary }}>
              {t.loadFailed}: {dayError}
            </Text>
            <Button variant='secondary' onPress={() => loadDay()}>
              {t.retry}
            </Button>
          </View>
        ) : dayData ? (
          paperHome ? (
            <View style={{ flex: 1 }} collapsable={false}>
              <AlmanacPage
                payload={dayData}
                locale={locale}
                fromPush={focusPersonal}
                onPersonalSectionLayout={(y) => {
                  personalOffsetRef.current = y
                }}
                onSelectDay={onSelectDay}
                todayIso={todayIso}
                shareRequestId={shareRequestId}
              />
            </View>
          ) : (
            <Animated.ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing['3xl'] }}
              showsVerticalScrollIndicator={false}
            >
              <AlmanacPage
                payload={dayData}
                locale={locale}
                fromPush={focusPersonal}
                onPersonalSectionLayout={(y) => {
                  personalOffsetRef.current = y
                }}
                onSelectDay={onSelectDay}
                todayIso={todayIso}
                shareRequestId={shareRequestId}
              />
            </Animated.ScrollView>
          )
        ) : (
          <View style={{ flex: 1 }} />
        )
      ) : (
        <Animated.ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={onHomeScroll}
          scrollEventThrottle={16}
        >
          {daySheet}
        </Animated.ScrollView>
      )}
    </DayPageTurn>
  )

  const headerLink = (label: string, onPress: () => void, opts?: { strong?: boolean }) => (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      <Text
        style={{
          color: opts?.strong ? headerP.ink : headerP.dim,
          fontSize: 10,
          letterSpacing: 3,
          textDecorationLine: 'underline',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        flex: 1,
        backgroundColor: classicalActive ? headerP.bg : colors.bg,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {classicalActive ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
              <PhaseLogo phase={devMoonPhase ?? todayMoonPhase} size={30} />
              <View>
                <Text style={{ color: headerP.ink, fontSize: 17, fontWeight: '700' }}>Yuun</Text>
                <Text style={{ color: headerP.dim, fontSize: 10, letterSpacing: 3 }}>
                  {locale === 'en' ? 'ALMANAC' : locale === 'ja' ? '黄暦' : '黄历'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
              {isViewingToday ? (
                <Text style={{ color: headerP.dim, fontSize: 10, letterSpacing: 3 }}>
                  {t.today}
                </Text>
              ) : (
                headerLink(t.today, goToToday, { strong: true })
              )}
              <Text style={{ color: headerP.dim, fontSize: 10, letterSpacing: 3 }}>{' · '}</Text>
              {headerLink(t.settingsAlmanacEntry, goToMe)}
              <Text style={{ color: headerP.dim, fontSize: 10, letterSpacing: 3 }}>{' · '}</Text>
              {headerLink(t.almanacPassOn, () => setShareRequestId((n) => n + 1))}
            </View>
          </>
        ) : (
          <>
            <View accessibilityLabel='Yuun'>
              <PhaseLogo phase={devMoonPhase ?? todayMoonPhase} size={HOME_LOGO_SIZE} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isViewingToday ? null : (
                <Pressable
                  onPress={goToToday}
                  hitSlop={10}
                  accessibilityRole='button'
                  accessibilityLabel={t.goToday}
                  style={({ pressed }) => ({
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    minHeight: 44,
                    justifyContent: 'center',
                    opacity: pressed ? 0.55 : 1,
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
                    {t.today}
                  </Text>
                </Pressable>
              )}
              {!isViewingToday ? <Text style={{ color: colors.dim, fontSize: 13 }}>·</Text> : null}
              <Pressable
                onPress={goToMe}
                hitSlop={10}
                accessibilityRole='button'
                accessibilityLabel={t.settingsAlmanacEntry}
                style={({ pressed }) => ({
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  minHeight: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.secondary,
                    fontSize: 13,
                    fontWeight: '500',
                    letterSpacing: 1,
                  }}
                >
                  {t.settingsAlmanacEntry}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {classicalActive ? null : (
        <>
          <View style={{ paddingHorizontal: spacing.xl }}>
            <DualTzBanner />
          </View>
          <CalendarExpandPanel
            selectedDay={selectedDay}
            todayIso={todayIso}
            onSelectDay={setSelectedDay}
            locale={locale}
            dayLabels={weekLabels}
            expandLabel={t.openMonth}
            collapseLabel={t.exploreCollapse}
          />
        </>
      )}

      {dayTurn}
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
