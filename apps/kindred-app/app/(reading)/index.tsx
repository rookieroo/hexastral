/**
 * Home — your living night sky: YOU as the central star, your threads
 * (relationships) drifting in orbit, on the dark ink ground the whole app shares.
 *
 * The persistent form of the intro's two-stars-gravity (you woke in the same
 * night; the ones who stayed orbit you). The SkyHero is the hero; tapping it
 * opens your reading — the one cream 宣纸 document blooms IN from the tap, so the
 * precious paper reads against the night like an unrolled scroll. Threads are a
 * scannable list below, each row a small star echoing the sky.
 *
 *   ◐ Yuel                                 ⚙   ← brand top-left · Settings top-right
 *   ┌─ live night sky ────────────────────┐
 *   │      ·   ✦      ◉ (you)    ·   ✦     │   ← faint star field + gravity orbits
 *   └─────────────────────────────────────┘
 *        YOUR READING · Earth · 1994-06-22       ← caption names your star
 *   Threads                              +
 *   ✦ 林朝英 · Partner                  生 ›    ← tap → report; swipe ← → 解缘
 *   ✦ 王重阳 · Friend                   克 ›       (Timeline / What-if live in the report)
 */

import { EmptyState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type BondData,
  type BondStatus,
  kindredFonts,
  prefetchBondReport,
  useBondList,
  useKindredClient,
} from '@zhop/scenario-kindred'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import BondReportScreen from '@/app/(bonds)/[id]'
import { HomeSplash } from '@/components/HomeSplash'
import { ElementGlyph, WUXING_COLOR } from '@/components/home/ElementGlyph'
import { SkyField } from '@/components/home/SkyField'
import { SkyHero } from '@/components/home/SkyHero'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ReadingOverlay } from '@/components/reading/ReadingOverlay'
import { ThreadListItem } from '@/components/ThreadListItem'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import { consumeSplashDecision } from '@/lib/splash-control'

/* ── Home copy (4 locales, local — keeps lib/i18n.ts untouched) ─────────── */

interface HomeCopy {
  /** Kicker over the caption — "this is YOUR book of fate". */
  cardKicker: string
  open: string
  threads: string
  threadsHint: string
  noBirthTitle: string
  noBirthCta: string
}

const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    cardKicker: 'Your reading',
    open: 'Open your reading →',
    threads: 'Threads',
    threadsHint: 'No one orbits you yet — invite or add someone',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    cardKicker: '你的命书',
    open: '打开命书 →',
    threads: '牵绊',
    threadsHint: '还没有人绕着你 — 邀请或录入对方',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    cardKicker: '你的命書',
    open: '打開命書 →',
    threads: '牽絆',
    threadsHint: '還沒有人繞著你 — 邀請或錄入對方',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    cardKicker: 'あなたの命書',
    open: '命書を開く →',
    threads: '絆',
    threadsHint: 'まだ誰もあなたの周りに — 招待または入力',
    noBirthTitle: 'あなた自身の命盤から',
    noBirthCta: '生年月日を入力 →',
  },
}

// Pending threads need attention; actives are destinations; declined/expired are
// tail noise. Sort accordingly.
const STATUS_ORDER: Record<BondStatus, number> = {
  pending_invite: 0,
  active: 1,
  declined: 2,
  expired: 3,
  removed: 4,
}

export default function ReadingHomeScreen() {
  const router = useRouter()
  const { width, height } = useWindowDimensions()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const copy = HOME_COPY[locale]
  const birth = useSelfBirth()
  const [readingOpen, setReadingOpen] = useState(false)
  // Where the reading bloom starts — the point the user pressed, so the 水墨
  // spreads from the tap (set on press-in, read by ReadingOverlay).
  const [readingOrigin, setReadingOrigin] = useState<{ x: number; y: number } | null>(null)
  // The 合盘 report opens as an in-place OVERLAY on the home (not a pushed route),
  // so it shares the solo reading's transition: the cream report blooms from the
  // tapped row over the live night, no jump. (The [id] route stays for deep links
  // / the accept flow.)
  const [openBond, setOpenBond] = useState<{
    id: string
    origin: { x: number; y: number } | null
  } | null>(null)
  // Stable so the report overlay's swipe-back gesture doesn't re-create each render.
  const closeBond = useCallback(() => setOpenBond(null), [])
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

  // A faint, calm ambient star field behind the whole screen (dimmed by the
  // container opacity); the meaningful stars (you + threads) live in SkyHero.
  const skyBright = useSharedValue(0.55)
  const heroH = Math.min(width * 0.84, 320)

  // Animate the night sky ONLY while the home is visible + foreground (2026-06
  // "手机发烫"): both layers are Skia/GPU now (SkyField is one twinkle shader,
  // SkyHero the orbit) — pausing stops the shader's time clock + the orbit, so the
  // GPU draws a static frame for ~0 cost when the screen is blurred / backgrounded.
  const [focused, setFocused] = useState(true)
  const [appActive, setAppActive] = useState(true)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'))
    return () => sub.remove()
  }, [])
  // Also freeze the sky while a report overlay COVERS the home — no point
  // animating a night nobody can see behind the paper. But the report enters via
  // a 水墨 bloom with a TRANSPARENT surround, so the live sky is visible AROUND the
  // growing shape during the open (and the reverse bloom on close). Pausing at the
  // tap froze that visible sky mid-bloom ("点进报告星象就停了"). So we delay the
  // pause until the paper has fully covered (~bloom duration), and lift it the
  // instant a report starts closing — the sky drifts through both transitions, and
  // only the fully-occluded steady state is frozen for heat.
  const reportOpen = readingOpen || openBond != null
  const [coveredBySheet, setCoveredBySheet] = useState(false)
  useEffect(() => {
    if (!reportOpen) {
      setCoveredBySheet(false)
      return
    }
    const id = setTimeout(() => setCoveredBySheet(true), 700)
    return () => clearTimeout(id)
  }, [reportOpen])
  const skyPaused = !focused || !appActive || coveredBySheet
  // Don't even MOUNT the sky canvases while the cold-launch splash plays. Pausing
  // them wasn't enough ("Logo 转场还是卡"): a Skia surface pays its init cost at
  // MOUNT regardless of `paused`, so two extra surfaces spinning up under the
  // splash (which is itself animating a third Skia moon center→top-left) hitched
  // the logo landing. Deferring the mount to after the hand-off keeps the splash
  // window light; the sky then fades in (SkyHero's own `appear`).
  const skyReady = !showSplash

  // Scroll-receding: the star map is FIXED above the list; as you scroll, the
  // "you" card shrinks + fades toward it (越来越小 朝向星空) and rows dissolve into
  // the sky through a top gradient. One shared scrollY drives it.
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })
  const youCardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 130], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [0, 130], [1, 0.8], Extrapolation.CLAMP) }],
  }))

  // Threads — the bond list lives inline on the home. Refetched on focus so a
  // bond created/accepted elsewhere shows up on return; focus also gates the sky.
  const { bonds, refetch, deleteBond } = useBondList()
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      void refetch()
      return () => setFocused(false)
    }, [refetch])
  )
  const threads = useMemo(
    () =>
      [...bonds].sort((a, b) => {
        const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (byStatus !== 0) return byStatus
        return b.createdAt.localeCompare(a.createdAt)
      }),
    [bonds]
  )

  // Warm the report cache for the active threads on screen, so tapping a row
  // opens instantly (the 水墨 bloom plays over a ready report instead of the
  // 1-2s "tap → blank → bloom" wait). Best-effort + cache-guarded, so this only
  // hits the network once per bond per session; pending/declined have no report.
  const { client } = useKindredClient()
  useEffect(() => {
    for (const b of bonds) {
      if (b.status === 'active') prefetchBondReport(client, b.id)
    }
  }, [bonds, client])

  const confirmDelete = useCallback(
    (bond: BondData) => {
      Alert.alert(t(locale, 'bondList.deleteTitle'), t(locale, 'bondList.deleteBody'), [
        { text: t(locale, 'bondList.cancel'), style: 'cancel' },
        {
          text: t(locale, 'bondList.delete'),
          style: 'destructive',
          onPress: () => {
            void deleteBond(bond.id).catch((err) => {
              if (__DEV__) console.warn('[Kindred home] delete failed', err)
            })
          },
        },
      ])
    },
    [deleteBond, locale]
  )

  // Star-map taps: your central star (or empty sky) → your reading; a thread's
  // star → that bond. SkyHero hands back the orbit-slot index + page coords.
  const openSelfReading = useCallback((x: number, y: number) => {
    setReadingOrigin({ x, y })
    setReadingOpen(true)
  }, [])
  const openThreadReading = useCallback(
    (index: number, x: number, y: number) => {
      const b = threads[index]
      if (b) setOpenBond({ id: b.id, origin: { x, y } })
    },
    [threads]
  )

  // 划词 AI chat (K3): close the overlay, then push the chat seeded with the
  // chapter slug + (optionally) the long-pressed paragraph as a quoted draft.
  const handleAskAI = useCallback(
    ({ slug, quote }: { slug: string; quote: string | null }) => {
      setReadingOpen(false)
      router.push({
        pathname: '/(reading)/chat',
        params: { slug, ...(quote ? { quote } : {}) },
      })
    },
    [router]
  )

  // Identity block — chart computes client-side from the persisted birth.
  const natal = useMemo<FateNatalChart | null>(() => {
    if (!birth) return null
    try {
      return computeFateNatalChart({
        solarDate: birth.solarDate,
        timeIndex: birth.timeIndex ?? 0,
        clockMinutes: birth.clockMinutes,
        calibrate: birth.calibrate,
        longitude: birth.lng,
        timezoneId: birth.timezone,
        city: birth.city,
        gender: birth.gender,
      })
    } catch {
      return null
    }
  }, [birth])

  // Fixed top bar — brand left, Settings right.
  const topBar = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: kindredSpacing.screenH,
        paddingTop: kindredSpacing.sm,
        paddingBottom: kindredSpacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <KindredMoon size={30} />
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 13,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: kindredDark.text,
          }}
        >
          Yuel
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(settings)')}
        hitSlop={12}
        accessibilityRole='button'
        accessibilityLabel={t(locale, 'settings.title')}
      >
        <Settings color={kindredDark.textMuted} size={22} strokeWidth={1.5} />
      </Pressable>
    </View>
  )

  // ── Render branches ───────────────────────────────────────────────────────

  // Loading the persisted birth.
  if (birth === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
          </View>
        </SafeAreaView>
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    )
  }

  // Never onboarded with birth info (e.g. pre-K1 installs) → self form.
  if (birth === null || natal === null) {
    return (
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <SafeAreaView
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: kindredSpacing.screenH }}
        >
          <EmptyState
            illustration={<KindredMoon size={96} />}
            title={copy.noBirthTitle}
            customAction={
              <PrimaryButton
                label={copy.noBirthCta}
                onPress={() => router.push('/(onboarding)/self')}
                block={false}
              />
            }
          />
        </SafeAreaView>
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    )
  }

  const listHeader = (
    <View style={{ paddingBottom: kindredSpacing.sm }}>
      {/* YOU — a QUIET caption sitting just under the central star (not a block):
          a small element glyph (echoes your star's colour) + "Open your reading".
          Deliberately small — the personal reading is the anchor, but the 合盘 list
          below is the focus, so this recedes. Tap = tap your star. It shrinks + fades
          toward the sky as you scroll (youCardStyle). */}
      <Animated.View style={[{ transformOrigin: 'center top' }, youCardStyle]}>
        <Pressable
          onPressIn={(e) => setReadingOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
          onPress={() => setReadingOpen(true)}
          accessibilityRole='button'
          accessibilityLabel={copy.cardKicker}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.sm,
            marginTop: 0,
            marginBottom: kindredSpacing.lg,
            paddingVertical: kindredSpacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ElementGlyph
            element={natal.dayMasterWuXing}
            color={WUXING_COLOR[natal.dayMasterWuXing] ?? kindredDark.accent}
            size={16}
          />
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.accent, fontWeight: '500', letterSpacing: 0.3 },
            ]}
          >
            {copy.open}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Threads header — title + New. (Timeline/make-if are per-bond → row swipe.) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kindredSpacing.screenH,
          marginBottom: kindredSpacing.sm,
        }}
      >
        <Text style={[kindredType.heading, { color: kindredDark.text }]}>{copy.threads}</Text>
        <Pressable
          onPress={() => router.push('/(onboarding)/mode')}
          accessibilityRole='button'
          accessibilityLabel={t(locale, 'bondList.add')}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: kindredDark.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Plus color={kindredDark.accent} size={16} strokeWidth={1.9} />
          <Text style={[kindredType.caption, { color: kindredDark.accent, fontWeight: '600' }]}>
            {t(locale, 'bondList.add')}
          </Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      {/* Ambient night — a faint full-frame star field behind everything. Mounted
          only after the splash hands off (skyReady), so its Skia surface doesn't
          spin up under the logo transition. */}
      {skyReady ? (
        <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} pointerEvents='none'>
          <SkyField width={width} height={height} brightSv={skyBright} paused={skyPaused} />
        </View>
      ) : null}

      <SafeAreaView style={{ flex: 1 }}>
        {topBar}
        {/* FIXED star map — pinned; pull-down / list scroll never moves it. Tap
            your star → your reading; a thread's star → that bond. */}
        <View style={{ width: '100%', height: heroH }}>
          {skyReady ? (
            <SkyHero
              width={width}
              height={heroH}
              threadCount={threads.length}
              element={natal.dayMasterWuXing}
              paused={skyPaused}
              onTapSelf={openSelfReading}
              onTapThread={openThreadReading}
            />
          ) : null}
        </View>
        {/* The list scrolls BELOW the fixed sky; a top gradient dissolves rows
            into the night as they rise toward it. */}
        <View style={{ flex: 1 }}>
          <Animated.FlatList
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ backgroundColor: 'transparent' }}
            contentContainerStyle={{
              // Clear the top fade (height 28) so the "you" card isn't dimmed at rest.
              paddingTop: 40,
              paddingBottom: kindredSpacing.xxl,
            }}
            ListHeaderComponent={listHeader}
            data={threads}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => (
              <ThreadListItem
                bond={item}
                locale={locale}
                onPress={(origin) => setOpenBond({ id: item.id, origin: origin ?? null })}
                onDelete={() => confirmDelete(item)}
              />
            )}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: kindredDark.border,
                  marginLeft: kindredSpacing.screenH,
                }}
              />
            )}
            ListEmptyComponent={
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.textSecondary, paddingHorizontal: kindredSpacing.screenH },
                ]}
              >
                {copy.threadsHint}
              </Text>
            }
            ListFooterComponent={
              threads.length > 0 ? (
                <Pressable
                  onPress={() => router.push('/(settings)/glossary')}
                  hitSlop={8}
                  style={{
                    alignSelf: 'center',
                    marginTop: kindredSpacing.xl,
                    paddingVertical: kindredSpacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: kindredFonts.mono,
                      fontSize: 11,
                      letterSpacing: 1.5,
                      color: kindredDark.textMuted,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(locale, 'primer.more')}
                  </Text>
                </Pressable>
              ) : null
            }
            onRefresh={() => void refetch()}
            refreshing={false}
          />
          <LinearGradient
            colors={[kindredDark.bg, 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}
            pointerEvents='none'
          />
        </View>
      </SafeAreaView>

      {/* Full reading — ink-bloom overlay (kept mounted for open/close animation).
          `origin` is the tapped point, so the 水墨 spreads from the finger. */}
      <ReadingOverlay
        visible={readingOpen}
        onClose={() => setReadingOpen(false)}
        onAskAI={handleAskAI}
        origin={readingOrigin}
      />
      {/* 合盘 report — the SAME in-place ink bloom as the solo reading, over the
          live home (rendered here, not pushed as a route, so there's no jump). */}
      {openBond ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
          <BondReportScreen id={openBond.id} origin={openBond.origin} onClose={closeBond} />
        </View>
      ) : null}
      {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
    </View>
  )
}
