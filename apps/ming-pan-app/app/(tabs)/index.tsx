/**
 * 命书 home — minimal entry with magic-move splash.
 *
 * Strictly follows the FLIP spike architecture:
 *   - Splash: paper bg, V15Moon centred, wordmark.
 *   - Home: dark bg, V15Moon near top, daily-rating line, pills, CTA.
 *   - ONE absolute moon moved by useMagicMove; both layers always rendered.
 *
 * First screen is intentionally sparse. Full reading lives at /reading,
 * opened via the "展开命书" CTA. Profile / share / birth editing live in Me
 * (reached by swiping left).
 */

import type { WuXing } from '@zhop/astro-core'
import { calculateDailyFortune, dayGanZhi } from '@zhop/astro-core'
import { AutoMoonPhaseLoader, useMagicMove, V15Moon } from '@zhop/core-ui/motion'
import { BackArrowIcon } from '@zhop/hexastral-icons/action'
import { recordTodayOpen, type StreakState } from '@zhop/satellite-runtime'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { Redirect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ReadingOverlay } from '@/components/ReadingOverlay'
import { dayMasterLabel, elementLabel, useI18n } from '@/lib/i18n'
import { computeFateNatalChart } from '@/lib/natal'
import { computeDayunChain, computeWuxingCount, parseBirthInput } from '@/lib/reading'
import { consumeSplashDecision } from '@/lib/splash-control'
import { useBirthDraft } from '@/lib/use-birth-draft'
import { computeZiweiChart } from '@/lib/ziwei'

/* ── palette (FLIP spike values) ─────────────────────────────────── */
const P = {
  bgDark: '#0C0B0A',
  bgPaper: '#EAE3D2',
  gold: '#C2A878',
  cream: '#E9E2D2',
  dim: '#5A5446',
  muted: '#8A8170',
  cinnabar: '#9B2226',
  bronze: '#9b8c66',
  pillBorder: 'rgba(233,226,210,0.2)',
  ctaText: '#f4ecdc',
} as const

const MOON = 150
const DUR = 580
const EASE = Easing.bezier(0.4, 0, 0.2, 1)
const EASE_OUT = Easing.out(Easing.cubic)
const SPLASH_HOLD = 1500

export default function ReadingHomeScreen() {
  const router = useRouter()
  const state = useBirthDraft()
  const { t, locale } = useI18n()
  // Splash plays once per JS session; onboarding submit suppresses the next one.
  const [skip] = useState(() => consumeSplashDecision())
  // In-place reading overlay (replaces router.push('/reading') — no navigation, no flash).
  const [readingOpen, setReadingOpen] = useState(false)

  /* ── magic-move ── */
  const containerRef = useAnimatedRef<View>()
  const splashSlot = useAnimatedRef<View>()
  const heroSlot = useAnimatedRef<View>()
  const magic = useMagicMove({ phoneRef: containerRef, duration: DUR, easing: EASE })

  /* ── animation shared values ── */
  const [stage, setStage] = useState<'splash' | 'home'>(skip ? 'home' : 'splash')
  const splashBg = useSharedValue(skip ? 0 : 1)
  const splashTxt = useSharedValue(skip ? 0 : 1)
  const homeOp = useSharedValue(skip ? 1 : 0)
  const homeY = useSharedValue(skip ? 0 : 10)

  // Swipe-to-Me discoverability hint — fades in after a 3s dwell on home.
  const hintFade = useSharedValue(0)
  const hintSlide = useSharedValue(0)

  /* ── chart computation ── */
  const chart = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeFateNatalChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const ziwei = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeZiweiChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const derived = useMemo(() => {
    if (!chart || state.status !== 'ready') return null
    try {
      const bd = parseBirthInput(state.draft.solarDate, state.draft.timeIndex ?? 0)
      const wx = computeWuxingCount(chart.pillars)
      const { steps, currentVisibleIndex } = computeDayunChain(bd, state.draft.gender)
      const active = steps[currentVisibleIndex] ?? steps[0]
      return { wx, active }
    } catch {
      return null
    }
  }, [chart, state])

  /* ── daily rating snapshot (P1-11) ──
   * Zero-LLM compute from astro-core/daily.ts — a deterministic star rating
   * + dominant 干支 interaction (合/冲/刑/害). Not predictive; a reference
   * pattern derived from classical 子平 interaction tables. Re-runs once per local day
   * because `new Date()` is stable within a session and `useMemo` keeps
   * the result. On day rollover the component re-mounts naturally with
   * AppState foreground (via the splash flow) and recomputes. */
  const daily = useMemo(() => {
    if (!chart) return null
    try {
      const now = new Date()
      const today = dayGanZhi(now.getFullYear(), now.getMonth() + 1, now.getDate())
      return calculateDailyFortune(chart.pillars, today, chart.geju.favorableElement)
    } catch {
      return null
    }
  }, [chart])

  /* ── streak (P1-18) ──
   * recordTodayOpen is idempotent per local day; safe to call on every
   * mount. The returned state drives a small pill in the hero pills row. */
  const [streak, setStreak] = useState<StreakState | null>(null)
  useEffect(() => {
    let cancelled = false
    void recordTodayOpen({ app: 'fate' })
      .then((s) => {
        if (!cancelled) setStreak(s)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  /* ── splash -> home transition ── */
  useEffect(() => {
    if (skip) {
      // Subsequent visit: snap moon to hero position immediately
      const t = setTimeout(() => magic.snapTo(heroSlot), 60)
      return () => clearTimeout(t)
    }

    // First visit: snap to splash, hold, then magic-move to home
    const snap = setTimeout(() => magic.snapTo(splashSlot), 60)
    const trans = setTimeout(() => {
      magic.moveTo(heroSlot)
      splashBg.value = withTiming(0, { duration: DUR, easing: EASE })
      splashTxt.value = withTiming(0, {
        duration: Math.round(DUR * 0.6),
        easing: EASE,
      })
      homeOp.value = withTiming(1, {
        duration: Math.round(DUR * 0.7),
        easing: EASE_OUT,
      })
      homeY.value = withTiming(0, {
        duration: Math.round(DUR * 0.7),
        easing: EASE_OUT,
      })
      setTimeout(() => setStage('home'), DUR)
    }, SPLASH_HOLD)

    return () => {
      clearTimeout(snap)
      clearTimeout(trans)
    }
  }, [skip, magic, splashSlot, heroSlot, splashBg, splashTxt, homeOp, homeY])

  /* ── swipe hint — reveal after the user dwells on home for 3s ── */
  useEffect(() => {
    if (stage !== 'home') return
    const id = setTimeout(() => {
      hintFade.value = withTiming(0.7, { duration: 700, easing: EASE_OUT })
      hintSlide.value = withRepeat(withTiming(-7, { duration: 1100, easing: EASE }), -1, true)
    }, SWIPE_TO_ME.hintDelayMs)
    return () => clearTimeout(id)
  }, [stage, hintFade, hintSlide])

  /* ── left-swipe → Me (replaces the old bottom tab bar; ADR-0018 shared contract) ── */
  const goToMe = useCallback(() => router.push('/me'), [router])
  const { activeOffsetX, failOffsetY, commitDx, maxDy } = SWIPE_TO_ME
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

  /* ── animated styles ── */
  const sBg = useAnimatedStyle(() => ({ opacity: splashBg.value }))
  const sTx = useAnimatedStyle(() => ({ opacity: splashTxt.value }))
  const hAn = useAnimatedStyle(() => ({
    opacity: homeOp.value,
    transform: [{ translateY: homeY.value }],
  }))
  const hintFadeStyle = useAnimatedStyle(() => ({ opacity: hintFade.value }))
  const hintArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintSlide.value }],
  }))

  /* ── loading / onboarding gates ── */
  if (state.status === 'loading') {
    return (
      <View style={[S.root, S.center]}>
        <AutoMoonPhaseLoader size={88} />
      </View>
    )
  }
  if (state.status === 'empty' || !chart) {
    return <Redirect href='/birth?mode=onboarding' />
  }

  /* ── display data ── */
  const ziweiMing = ziwei?.palaces.find((p) => p.name === '命宫')
  const ziweiStars = ziweiMing?.majorStars.map((s) => s.name).join(' ') ?? ''

  const topLabel = derived?.active
    ? t('home.luck', {
        gz: `${derived.active.ganZhi.stem}${derived.active.ganZhi.branch}`,
        start: derived.active.startAge,
        end: derived.active.endAge,
      })
    : t('home.born', { gz: `${chart.pillars.year.stem}${chart.pillars.year.branch}` })

  const heroLine = t('home.favorAvoid', {
    fav: elementLabel(chart.geju.favorableElement, locale),
    unfav: elementLabel(chart.geju.unfavorableElement, locale),
  })

  const subLine =
    `${dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale)} · ${chart.geju.primary}` +
    (ziweiStars ? ` · ${ziweiStars}` : '')

  const wxPills = derived
    ? (['木', '火', '土', '金', '水'] as const)
        .filter((k) => derived.wx[k] > 0)
        .sort((a, b) => derived.wx[b] - derived.wx[a])
        .slice(0, 3)
        .map((k) => `${k}${derived.wx[k]}`)
    : []

  return (
    <View ref={containerRef} collapsable={false} style={S.root}>
      {/* dark home bg — always visible behind splash */}
      <View style={[S.fill, S.homeBg]} />

      {/* splash overlay — paper bg, fades out */}
      <Animated.View style={[S.fill, S.splashBg, sBg]} pointerEvents='none' />

      {/* splash centred content — fades out */}
      <Animated.View style={[S.fill, S.splashCenter, sTx]} pointerEvents='none'>
        <View ref={splashSlot} collapsable={false} style={S.moonSlot} />
        <Text style={S.wm}>
          HEXASTRAL <Text style={S.wmCn}>{'命'}</Text>
        </Text>
        <Text style={S.wms}>LIFELONG BIRTH CHART</Text>
      </Animated.View>

      {/* home content — fades + rises in; swipe left to reach Me */}
      <GestureDetector gesture={swipeToMe}>
        <Animated.View style={[S.fill, hAn]} pointerEvents={stage === 'home' ? 'auto' : 'none'}>
          <SafeAreaView style={S.homeSafe} edges={['top']}>
            {/* Accessible alternative to the left-swipe → Me gesture.
                VoiceOver / Switch Control / Voice Control users can't trigger
                Gesture.Pan(); this Pressable gives them an explicit path to
                sign-in / privacy / delete-account (P0-3, audit). */}
            <Pressable
              style={S.meBtn}
              onPress={goToMe}
              accessibilityRole='button'
              accessibilityLabel={t('me.account')}
              hitSlop={12}
            >
              <Text style={S.meBtnDots}>{'⋯'}</Text>
            </Pressable>
            {/* Top-anchored so the moon slot's Y stays put across the splash
                transition (magic-move measures once). */}
            <View style={S.heroArea}>
              <Text style={S.topLabel}>{topLabel}</Text>
              <View ref={heroSlot} collapsable={false} style={S.moonSlot} />
              <Text style={S.hero}>{heroLine}</Text>
              <Text style={S.sub}>{subLine}</Text>
              {/* P1-11 daily rating snapshot — deterministic star rating + dominant
                  干支 interaction (合/冲/刑/害). Pure data, no predictive copy. */}
              {daily ? (
                <Text style={S.daily}>
                  {'★'.repeat(daily.starRating) + '☆'.repeat(5 - daily.starRating)}
                  {'  '}
                  {daily.dominantInteraction}
                </Text>
              ) : null}
              <View style={S.pills}>
                {/* P1-18 streak pill — only shown when ≥2 days; a 1-day
                    streak isn't yet a habit signal. */}
                {streak && streak.currentStreak >= 2 ? (
                  <Text style={[S.pill, S.streakPill]}>{`${streak.currentStreak}d`}</Text>
                ) : null}
                {wxPills.map((p) => (
                  <Text key={p} style={S.pill}>
                    {p}
                  </Text>
                ))}
              </View>
            </View>

            <View style={S.spacer} />

            {/* bottom CTA — birth editing lives in Me (it can void the reading),
                so home keeps a single action. */}
            <View style={S.bottom}>
              <Pressable
                style={({ pressed }) => [S.cta, pressed && { opacity: 0.85 }]}
                onPress={() => setReadingOpen(true)}
              >
                <Text style={S.ctaLabel}>{t('home.openReading')}</Text>
              </Pressable>
              <Animated.View style={[S.swipeHint, hintFadeStyle]} pointerEvents='none'>
                <Animated.View style={hintArrowStyle}>
                  <BackArrowIcon size={13} color={P.muted} />
                </Animated.View>
                <Text style={S.swipeHintText}>{t('home.swipeMe')}</Text>
              </Animated.View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>

      {/* THE ONE MOON — absolute, moved by magic-move */}
      <Animated.View style={[S.moonAbs, magic.moonStyle]} pointerEvents='none'>
        <V15Moon size={MOON} />
      </Animated.View>

      {/* In-place reading overlay — blooms the paper report over the live home
          (no navigation, no transition flash). Right-swipe to dismiss. */}
      <ReadingOverlay visible={readingOpen} onClose={() => setReadingOpen(false)} />
    </View>
  )
}

/* ── styles ────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bgDark },
  center: { alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },

  // backgrounds
  homeBg: { backgroundColor: P.bgDark },
  splashBg: { backgroundColor: P.bgPaper, zIndex: 2 },

  // splash
  splashCenter: {
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonSlot: { width: MOON, height: MOON },
  wm: {
    color: '#2a241a',
    fontFamily: 'Songti SC',
    fontSize: 20,
    letterSpacing: 6,
    marginTop: 24,
  },
  wmCn: { color: P.cinnabar, fontSize: 20 },
  wms: { color: P.bronze, fontSize: 9, letterSpacing: 5, marginTop: 7 },

  // home
  homeSafe: { flex: 1 },
  // Top-right accessible button to Me. 44pt tap target per HIG.
  // Subtle dots glyph stays out of the hero's visual hierarchy.
  meBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  meBtnDots: {
    color: P.muted,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    lineHeight: 22,
  },
  heroArea: { alignItems: 'center', paddingTop: 56 },
  spacer: { flex: 1 },
  topLabel: {
    color: P.gold,
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  hero: {
    color: P.cream,
    fontSize: 23,
    letterSpacing: 2,
    marginTop: 8,
  },
  sub: {
    color: P.dim,
    fontSize: 10.5,
    letterSpacing: 2,
    marginTop: 6,
  },
  // P1-11 — daily rating snapshot line. Subtle gold to match topLabel
  // (both are "today's contextual frame"); intentionally smaller than
  // hero so it doesn't displace the chart's structural truths.
  daily: {
    color: P.gold,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 10,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    justifyContent: 'center',
  },
  pill: {
    color: P.muted,
    fontSize: 10.5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.pillBorder,
    overflow: 'hidden',
  },
  // P1-18 — streak pill. Cinnabar-tinted to mark it as a behavioral
  // signal vs. the element pills (which are chart data).
  streakPill: {
    color: P.cinnabar,
    borderColor: 'rgba(155,34,38,0.32)',
  },

  // bottom
  bottom: { alignItems: 'center', paddingBottom: 60, gap: 18 },
  cta: {
    height: 48,
    borderRadius: 13,
    backgroundColor: P.cinnabar,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  ctaLabel: { color: P.ctaText, fontSize: 13, letterSpacing: 3 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swipeHintText: { color: P.muted, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' },

  // moon (always absolute)
  moonAbs: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MOON,
    height: MOON,
    zIndex: 10,
  },
})
