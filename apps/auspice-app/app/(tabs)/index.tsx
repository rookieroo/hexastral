/**
 * Home — Calendar + embedded day detail (Sprint 3 chunk 7 IA pivot).
 *
 * Per user feedback 2026-06-02: Calendar is the dominant element on cycle's
 * home. Tap any day in the strip to switch the 黄历 detail below; selection
 * defaults to today. There's no longer a separate `/day/[date]` route — that
 * shape duplicated content; deep-link callers (e.g. /event picks) navigate
 * back to home with `?day=YYYY-MM-DD` as a query param.
 *
 * The top-right ⋯ button is gone — swipe-left + the bottom hint is the only
 * way to Me. Screen readers reach Me via the accessibilityLabel'd
 * `BackArrowIcon` in the bottom hint's Animated.View, which now sets
 * `pointerEvents='box-none'` so the inner Pressable catches taps.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { BackArrowIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Cake, CalendarCheck, ScrollText } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CalendarStrip } from '@/components/CalendarStrip'
import { CultureSnippetCard } from '@/components/CultureSnippetCard'
import { CultureTopicsGrid } from '@/components/culture/CultureTopicsGrid'
import { DayView } from '@/components/DayView'
import { DualTzBanner } from '@/components/DualTzBanner'
import { LiuyearBanner } from '@/components/LiuyearBanner'
import { MoonLoader } from '@/components/MoonLoader'
import {
  type AuspiceDayPayload,
  fetchAuspiceBootstrap,
  fetchAuspiceDay,
  primeFromBootstrap,
} from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { localizeCultureEntry, localizeSolarTermName } from '@/lib/culture'
import { cultureSnippetForHome, resolveCultureTargetId } from '@/lib/culture-preview'
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

export default function HomeScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const params = useLocalSearchParams<{ day?: string }>()

  const todayIso = useMemo(() => todayIsoString(), [])
  const initialDay = useMemo(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    return typeof candidate === 'string' && DATE_RE.test(candidate) ? candidate : todayIso
  }, [params.day, todayIso])

  const [selectedDay, setSelectedDay] = useState(initialDay)

  // Re-sync when /event (or any other route) deep-links into home with a
  // new ?day param — `useLocalSearchParams` returns the live value.
  useEffect(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    if (typeof candidate === 'string' && DATE_RE.test(candidate)) {
      setSelectedDay(candidate)
    }
  }, [params.day])

  /* ── Day detail fetch — refires whenever selectedDay changes ── */
  const [dayData, setDayData] = useState<AuspiceDayPayload | null>(null)
  const [dayLoading, setDayLoading] = useState(true)
  const [dayError, setDayError] = useState<string | null>(null)
  // First load of the session uses /bootstrap (focused day + its month in ONE
  // request) and seeds the month into the GET cache, so the CalendarStrip's own
  // month fetch hits cache instead of a second round-trip. Later day-navigations
  // use the plain day read (the month is already cached).
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
  // Refetch on focus AND on selectedDay change. Focus covers the
  // edit-birth-in-Me → return-to-home flow so the personalization overlay
  // updates without the user pulling-to-refresh.
  useFocusEffect(
    useCallback(() => {
      loadDay()
    }, [loadDay])
  )

  // Mirror the loaded day into the App Group for the native widget (no-op until
  // the WidgetKit target + native module are linked — see lib/widget-bridge.ts).
  useEffect(() => {
    if (dayData) void syncTodayWidget(dayData.date, dayData.day, dayData.personalization, t, locale)
  }, [dayData, t, locale])

  /* ── left-swipe → Me (ADR-0018 shared contract) ── */
  // Re-entrancy latch: the Pan gesture can deliver `onEnd` more than once on a
  // bouncy release (a second micro-pan still satisfies the commit threshold),
  // and `router.push` does not dedupe — without this guard a single swipe could
  // stack two `me` screens. Clear after the slide transition settles.
  const navLockRef = useRef(false)
  const goToMe = useCallback(() => {
    if (navLockRef.current) return
    navLockRef.current = true
    router.push('/me')
    setTimeout(() => {
      navLockRef.current = false
    }, 600)
  }, [router])
  const { activeOffsetX, failOffsetY, commitDx, maxDy, hintDelayMs } = SWIPE_TO_ME
  const swipeToMe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onEnd((e) => {
          if (e.translationX < commitDx && Math.abs(e.translationY) < maxDy) runOnJS(goToMe)()
        }),
    [goToMe, activeOffsetX, failOffsetY, commitDx, maxDy]
  )

  /* ── bottom swipe-discoverability hint ── */
  const hintFade = useSharedValue(0)
  const hintSlide = useSharedValue(0)
  useEffect(() => {
    const HINT_EASE = Easing.bezier(0.4, 0, 0.2, 1)
    const id = setTimeout(() => {
      hintFade.value = withTiming(0.55, { duration: 700, easing: HINT_EASE })
      // Looping beckon — a clear left-nudge so the swipe affordance reads.
      hintSlide.value = withRepeat(withTiming(-13, { duration: 820, easing: HINT_EASE }), -1, true)
    }, hintDelayMs)
    return () => clearTimeout(id)
  }, [hintFade, hintSlide, hintDelayMs])
  const hintFadeStyle = useAnimatedStyle(() => ({ opacity: hintFade.value }))
  const hintArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintSlide.value }],
  }))

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <GestureDetector gesture={swipeToMe}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: spacing['3xl'] + 48, // leave room for bottom swipe hint
              gap: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            <DualTzBanner />

            {/* 干支日 · 农历 · 年干支 — the single date row above the calendar (the
                大运·流年 + timeline/make-if entries moved BELOW the calendar, into
                the most-tappable zone just above 宜忌, per layout feedback). */}
            {dayData ? (
              <DayIdentityHeader
                payload={dayData}
                colors={colors}
                spacing={spacing}
                locale={locale}
              />
            ) : null}

            <CalendarStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            {/* Day detail — refreshes on selection change. Festival /
                solar-term chip uses the selected day's payload (not literal
                "today"), which is intentional: when a user taps Feb 17,
                the chip shows "春节" even if today isn't 春节. */}
            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
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
                <>
                  {(() => {
                    const cultureId = resolveCultureTargetId(dayData.day)
                    const apiLabel =
                      dayData.day.festivalToday?.name ?? dayData.day.solarTermToday?.name
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
                  })()}

                  <DayView payload={dayData} afterYiji={<LiuyearBanner />} />

                  {/* Actions — 你的命书 (free 概要) + 择日 + 记录亲友生日 (carries the
                      selected month-day, no year). */}
                  <View
                    style={{
                      borderRadius: 14,
                      backgroundColor: colors.card,
                      overflow: 'hidden',
                    }}
                  >
                    <NavRow
                      icon={ScrollText}
                      label={t.personal.readingTitle}
                      onPress={() => router.push('/reading' as Href)}
                      colors={colors}
                      spacing={spacing}
                      divider
                    />
                    <NavRow
                      icon={CalendarCheck}
                      label={t.eventSearch}
                      onPress={() => router.push('/event')}
                      colors={colors}
                      spacing={spacing}
                      divider
                    />
                    <NavRow
                      icon={Cake}
                      label={t.people.homeEntry}
                      onPress={() => router.push(`/people?md=${selectedDay.slice(5)}` as Href)}
                      colors={colors}
                      spacing={spacing}
                    />
                  </View>

                  {/* 今日文化 — directly above the (collapsed) 文化导览. */}
                  {(() => {
                    const onCultureDay = resolveCultureTargetId(dayData.day) !== null
                    const snippet = cultureSnippetForHome(dayData.day, locale)
                    if (!snippet) return null
                    const upcomingTagline = onCultureDay
                      ? undefined
                      : t.cultureUpcomingTerm.replace('{name}', snippet.title)
                    return (
                      <CultureSnippetCard snippet={snippet} upcomingTagline={upcomingTagline} />
                    )
                  })()}

                  <CultureTopicsGrid />
                </>
              ) : null}
            </View>
          </ScrollView>

          {/* Initial-load veil — ONE full-screen moon over the (otherwise empty)
              calendar + day-detail, so first paint shows a single loader instead of
              several inline ones. Lifts the moment day data lands; day-switches
              reload in place (dayData persists, so this won't re-veil). */}
          {!dayData && !dayError ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <MoonLoader fullScreen />
            </View>
          ) : null}

          {/* Bottom swipe-hint — primary visual affordance for swipe-to-Me. */}
          <Animated.View
            pointerEvents='none'
            style={[
              {
                position: 'absolute',
                bottom: spacing.xl,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
              },
              hintFadeStyle,
            ]}
          >
            <Animated.View style={hintArrowStyle}>
              <BackArrowIcon size={13} color={colors.dim} />
            </Animated.View>
            <Text
              style={{
                color: colors.dim,
                fontSize: 10.5,
                letterSpacing: 3,
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

interface NavRowProps {
  icon: React.ComponentType<{ size: number; color: string }>
  label: string
  onPress: () => void
  colors: { text: string; accent: string; dim: string; separator: string }
  spacing: { md: number; lg: number }
  divider?: boolean
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

/** 干支日 · 农历 · 年干支 — the selected day's identity, shown above the calendar. */
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
  // One identity row carrying BOTH year reckonings — 干支纪年 (丙午年) + 阳历纪年
  // (2026) — so the calendar header below stays the single month-nav line.
  const sub = [
    ld ? (locale === 'en' ? `Lunar ${ld.month}/${ld.day}` : `${ld.monthName}${ld.dayName}`) : '',
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

function NavRow({ icon: Icon, label, onPress, colors, spacing, divider }: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: colors.separator,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon size={18} color={colors.accent} />
      <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{label}</Text>
      <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
    </Pressable>
  )
}
