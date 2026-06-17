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
 *   │      ·   ✦      ◉ (you)    ·   ✦     │   ← you + thread-stars only; collapses on scroll
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import BondReportScreen from '@/app/(bonds)/[id]'
import { HomeSplash } from '@/components/HomeSplash'
import { ElementGlyph, WUXING_COLOR } from '@/components/home/ElementGlyph'
import { RedThreadGlyph } from '@/components/home/RedThreadGlyph'
import { SkyField } from '@/components/home/SkyField'
import { SkyHero } from '@/components/home/SkyHero'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ReadingOverlay } from '@/components/reading/ReadingOverlay'
import { ThreadListItem } from '@/components/ThreadListItem'
import { bondQuality } from '@/lib/bondQuality'
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
  /** 0-thread empty state — the primary "bring someone into your sky" action. */
  emptyCta: string
  noBirthTitle: string
  noBirthCta: string
}

const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    cardKicker: 'Your reading',
    open: 'Open your reading →',
    threads: 'Threads',
    threadsHint: 'Your sky is yours alone — no one orbits you yet.',
    emptyCta: 'Invite someone →',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    cardKicker: '你的命书',
    open: '打开命书 →',
    threads: '牵绊',
    threadsHint: '此刻，夜空里只有你一个人。',
    emptyCta: '邀请对方 →',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    cardKicker: '你的命書',
    open: '打開命書 →',
    threads: '牽絆',
    threadsHint: '此刻，夜空裡只有你一個人。',
    emptyCta: '邀請對方 →',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    cardKicker: 'あなたの命書',
    open: '命書を開く →',
    threads: '絆',
    threadsHint: '今はまだ、夜空にいるのはあなただけ。',
    emptyCta: '相手を招待 →',
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
  // Collapsing sky: the hero recedes to a slim header as you scroll into your
  // threads, handing the list the screen (the metaphor stays — your star is still
  // the anchor, just quieted). HERO_MIN is the pinned header height; the collapse
  // tracks scroll 1:1 (scroll up by X → sky shrinks by X) until fully collapsed.
  const HERO_MIN = 92
  const collapseRange = Math.max(1, heroH - HERO_MIN)

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
  // Collapsing sky — coupled animations off scrollY. The list layout is STATIC
  // (overlap model below), so none of this reflows the list → no scroll⇄layout
  // jitter (the bug in the in-flow version):
  //  • the outer clip shrinks heroH → HERO_MIN, uncovering the list beneath it;
  //  • the inner scales (top-anchored) + lifts SkyHero so your star recedes to a
  //    small anchor in the slim header instead of being clipped away;
  //  • `collapse` (into SkyHero) fades the rings/spokes/threads so only the star is left.
  const skyCollapseStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, collapseRange], [heroH, HERO_MIN], Extrapolation.CLAMP),
  }))
  const skyHeroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, collapseRange], [0, -28], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [0, collapseRange], [1, 0.5], Extrapolation.CLAMP) },
    ],
  }))
  const collapseSv = useDerivedValue(() => Math.min(1, Math.max(0, scrollY.value / collapseRange)))

  // Threads — the bond list lives inline on the home. Refetched on focus so a
  // bond created/accepted elsewhere shows up on return; focus also gates the sky.
  const { bonds, refetch, deleteBond, recompute } = useBondList()
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
      // The product has a stance, grounded in their own chart (see lib/bondQuality):
      // a 相生 bond is a real loss to cut; a 相克 one is often the healthier cut. The
      // copy says so in plain, fact-first terms. Pure compute — no LLM, no latency on
      // a destructive confirm; the verdict is already in the reading. The button is
      // NOT styled destructive (no red) — 解缘 isn't always a tragedy; the words carry
      // the weight, and for a hard bond, letting go is the calm call, not an alarm.
      const body = t(locale, `bondList.deleteBody.${bondQuality(bond)}`)
      Alert.alert(t(locale, 'bondList.deleteTitle'), body, [
        { text: t(locale, 'bondList.cancel'), style: 'cancel' },
        {
          text: t(locale, 'bondList.delete'),
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

  // Recompute a stale bond's reading with the user's current birth (Pro). In-place
  // + irreversible (overwrites the existing reading), so confirm before firing;
  // non-Pro is routed to the paywall by the server's 403 → 'needs_pro'.
  const confirmRecompute = useCallback(
    (bond: BondData) => {
      Alert.alert(t(locale, 'bond.recomputeConfirmTitle'), t(locale, 'bond.recomputeConfirmBody'), [
        { text: t(locale, 'bondList.cancel'), style: 'cancel' },
        {
          text: t(locale, 'bond.recompute'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const outcome = await recompute(bond.id)
              if (outcome === 'needs_pro') router.push('/(commerce)/paywall')
              else if (outcome === 'error') Alert.alert(t(locale, 'bond.recomputeFailed'))
            })()
          },
        },
      ])
    },
    [recompute, router, locale]
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
  // Settings — reached by the top-right gear AND a left-swipe on the blank sky
  // (SkyHero.onSwipeLeft). It pushes in from the right; swipe-right inside Settings
  // pops back, so the two motions mirror.
  const openSettings = useCallback(() => router.push('/(settings)'), [router])

  // Same left-swipe → Settings over the list area's blank space. activeOffsetX
  // keeps taps/presses working; failOffsetY yields to vertical scroll; a row's own
  // swipe-to-解缘 (a deeper ReanimatedSwipeable) wins the gesture arena when the
  // touch lands on a row, so only the blank space triggers this.
  const listSwipeToSettings = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-16, 16])
        .onEnd((e) => {
          if (e.translationX < -55 || e.velocityX < -650) {
            runOnJS(openSettings)()
          }
        }),
    [openSettings]
  )

  // 划词 AI chat (K3): push the chat seeded with the chapter slug + (optionally)
  // the long-pressed paragraph as a quoted draft. Keep the reading overlay mounted
  // underneath (chat is a route pushed above it) so popping the chat returns to the
  // report — not the home, as it did when we closed the overlay first.
  const handleAskAI = useCallback(
    ({ slug, quote }: { slug: string; quote: string | null }) => {
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
        onPress={openSettings}
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

      {/* Threads header — title + New. Only once you HAVE threads; the 0-thread
          state shows the centered invite (ListEmptyComponent) instead, so this
          header would just be a label over nothing. */}
      {threads.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: kindredSpacing.screenH,
            marginBottom: kindredSpacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <RedThreadGlyph size={20} color={kindredDark.seal} />
            <Text style={[kindredType.heading, { color: kindredDark.text }]}>{copy.threads}</Text>
          </View>
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
      ) : null}
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
        {/* Overlap layout (matches the HTML prototype): the list FILLS the area and
            its layout never changes on scroll — content just starts below the sky via
            paddingTop, so collapsing the sky can't reflow it (that reflow was the
            jitter). The caption rides the sky's bottom edge as it collapses. */}
        <View style={{ flex: 1 }}>
          {/* list — swipe-left on its blank space → Settings (the gear's mirror) */}
          <GestureDetector gesture={listSwipeToSettings}>
            <Animated.FlatList
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={StyleSheet.absoluteFill}
              contentContainerStyle={{
                // Start flush under the full sky; the sky collapses 1:1 with scroll,
                // so the caption tracks its bottom edge down. flexGrow lets the
                // 0-thread invite center in the space below the sky.
                flexGrow: 1,
                paddingTop: heroH + 8,
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
                  onRecompute={item.basedOnStaleBirth ? () => confirmRecompute(item) : undefined}
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
                // 0-thread state: don't leave the bottom an empty void — center a
                // calm first-connection invite under your lone star (no illustration;
                // the sky above IS the illustration — you, alone, for now).
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <EmptyState
                    title={copy.threadsHint}
                    customAction={
                      <PrimaryButton
                        label={copy.emptyCta}
                        onPress={() => router.push('/(onboarding)/mode')}
                        block={false}
                      />
                    }
                  />
                </View>
              }
              ListFooterComponent={
                threads.length > 0 ? (
                  // Two quiet reference entries — symbols (the visual legend) + terms
                  // (the vocabulary). Plain text, no icons: the home is literary, and
                  // two glyphs here would just compete. Both root under Settings now.
                  <View
                    style={{
                      flexDirection: 'row',
                      alignSelf: 'center',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: kindredSpacing.xl,
                      paddingVertical: kindredSpacing.sm,
                    }}
                  >
                    <FooterRefLink
                      label={t(locale, 'settings.glossary.row')}
                      onPress={() => router.push('/(settings)/glossary')}
                    />
                    <Text style={{ color: kindredDark.textMuted, fontSize: 11 }}>·</Text>
                    <FooterRefLink
                      label={t(locale, 'settings.terms.row')}
                      onPress={() => router.push('/(settings)/terms')}
                    />
                  </View>
                ) : null
              }
              onRefresh={() => void refetch()}
              refreshing={false}
            />
          </GestureDetector>

          {/* sky overlay — absolute, collapsing height; box-none so SkyHero keeps its
              taps while the list scrolls beneath it. The inner view scales + lifts the
              star into the slim header; `collapse` fades the rings/spokes/threads. */}
          <Animated.View
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
              skyCollapseStyle,
            ]}
            pointerEvents='box-none'
          >
            <Animated.View
              style={[
                { width: '100%', height: heroH, transformOrigin: 'center top' },
                skyHeroStyle,
              ]}
              pointerEvents='box-none'
            >
              {skyReady ? (
                <SkyHero
                  width={width}
                  height={heroH}
                  threadCount={threads.length}
                  element={natal.dayMasterWuXing}
                  threadElements={threads.map((t) => t.counterpartElement)}
                  paused={skyPaused}
                  onTapSelf={openSelfReading}
                  onTapThread={openThreadReading}
                  onSwipeLeft={openSettings}
                  collapse={collapseSv}
                />
              ) : null}
            </Animated.View>
          </Animated.View>
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

/** A quiet small-caps reference link for the home footer (symbols / terms). */
function FooterRefLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole='button'>
      {({ pressed }) => (
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 11,
            letterSpacing: 1.5,
            color: kindredDark.textMuted,
            textTransform: 'uppercase',
            opacity: pressed ? 0.6 : 1,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}
