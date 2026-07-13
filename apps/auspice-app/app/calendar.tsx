/**
 * Calendar — secondary full-month view (Today-first IA).
 *
 * Entered from Today via **swipe right** (slides in from the left). **Swipe left**
 * (or tap Today) returns to Today — mirror gesture, no back-chevron header.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { BackArrowIcon } from '@zhop/hexastral-icons/action'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
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
import { MoonLoader } from '@/components/MoonLoader'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { localizeYijiVerb } from '@/lib/yiji-vocab'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function todayIsoString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function CalendarScreen() {
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
  const [preview, setPreview] = useState<AuspiceDayPayload | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const candidate = Array.isArray(params.day) ? params.day[0] : params.day
    if (typeof candidate === 'string' && DATE_RE.test(candidate)) {
      setSelectedDay(candidate)
    }
  }, [params.day])

  const loadPreview = useCallback(() => {
    setLoading(true)
    getAuspiceBirthDate()
      .then((birthDate) => fetchAuspiceDay(selectedDay, birthDate))
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false))
  }, [selectedDay])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const navLockRef = useRef(false)
  const goToToday = useCallback(() => {
    if (navLockRef.current) return
    navLockRef.current = true
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
    setTimeout(() => {
      navLockRef.current = false
    }, 600)
  }, [router])

  const openInToday = () => {
    router.replace({ pathname: '/(tabs)', params: { day: selectedDay } })
  }

  const { activeOffsetX, failOffsetY, commitDx, maxDy, hintDelayMs } = SWIPE_TO_ME
  const calendarSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onEnd((e) => {
          if (Math.abs(e.translationY) >= maxDy) return
          if (e.translationX < commitDx) runOnJS(goToToday)()
        }),
    [goToToday, activeOffsetX, failOffsetY, commitDx, maxDy]
  )

  const hintFade = useSharedValue(0)
  const hintSlideLeft = useSharedValue(0)
  useEffect(() => {
    const HINT_EASE = Easing.bezier(0.4, 0, 0.2, 1)
    const id = setTimeout(() => {
      hintFade.value = withTiming(0.55, { duration: 700, easing: HINT_EASE })
      hintSlideLeft.value = withRepeat(withTiming(-13, { duration: 820, easing: HINT_EASE }), -1, true)
    }, hintDelayMs)
    return () => clearTimeout(id)
  }, [hintFade, hintSlideLeft, hintDelayMs])
  const hintFadeStyle = useAnimatedStyle(() => ({ opacity: hintFade.value }))
  const hintArrowLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintSlideLeft.value }],
  }))

  const sep = locale === 'en' ? ', ' : '、'
  const yiPreview =
    preview?.day.goodFor
      .slice(0, 2)
      .map((v) => localizeYijiVerb(v, locale))
      .join(sep) ?? ''
  const jiPreview =
    preview?.day.avoid
      .slice(0, 2)
      .map((v) => localizeYijiVerb(v, locale))
      .join(sep) ?? ''

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <GestureDetector gesture={calendarSwipe}>
        <View style={{ flex: 1 }}>
          {/* Title-only header — return via swipe-left or Today pill (matches Today home). */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
              {t.openMonth}
            </Text>
            <Pressable
              onPress={goToToday}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel={t.todayTab}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: colors.accent,
                backgroundColor: colors.accentGhost,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
                {t.todayTab}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing['3xl'] + 48, gap: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            <CalendarStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
              {loading && !preview ? (
                <MoonLoader />
              ) : preview ? (
                <View
                  style={{
                    borderRadius: 14,
                    backgroundColor: colors.card,
                    padding: spacing.lg,
                    gap: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                    {preview.day.ganZhi}
                    {locale.startsWith('zh') || locale === 'ja' ? '日' : ''} · {selectedDay}
                  </Text>
                  <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20 }}>
                    {t.suitable} {yiPreview || '—'} · {t.avoid} {jiPreview || '—'}
                  </Text>
                  <Button variant='primary' onPress={openInToday}>
                    {t.openInToday}
                  </Button>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <Animated.View
            pointerEvents='none'
            style={[
              {
                position: 'absolute',
                bottom: spacing.xl,
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingHorizontal: spacing.xl,
                gap: 6,
              },
              hintFadeStyle,
            ]}
          >
            <Animated.View style={hintArrowLeftStyle}>
              <BackArrowIcon size={13} color={colors.dim} />
            </Animated.View>
            <Text
              style={{
                color: colors.dim,
                fontSize: 10.5,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {t.todayTab}
            </Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </SafeAreaView>
  )
}
