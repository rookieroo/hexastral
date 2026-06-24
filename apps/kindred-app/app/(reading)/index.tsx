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
import { kindredDark, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type BondData,
  type BondStatus,
  isCjkLocale,
  kindredFonts,
  prefetchBondReport,
  useBondList,
  useKindredClient,
} from '@zhop/scenario-kindred'
import { useFocusEffect, useRouter } from 'expo-router'
import { Moon, Settings2, Spline } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { SkyField } from '@/components/home/SkyField'
import { SkyHero } from '@/components/home/SkyHero'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ThreadListItem } from '@/components/ThreadListItem'
import { YuelMark } from '@/components/YuelMark'
import { bondQuality } from '@/lib/bondQuality'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { consumePendingOpenBond } from '@/lib/pending-open'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import { consumeSplashDecision } from '@/lib/splash-control'

/* ── Home copy (4 locales, local — keeps lib/i18n.ts untouched) ─────────── */

interface HomeCopy {
  /** Kicker over the caption — "this is YOUR book of fate". */
  cardKicker: string
  open: string
  /** Short doorway to the 本月 screen (the lightweight 本月运势 card), beside `open`. */
  month: string
  threads: string
  threadsHint: string
  /** 0-thread empty state — the primary "bring someone into your sky" action. */
  emptyCta: string
  /** 0-thread sub-line under the lone-sky title — what a thread is, gently. */
  emptySub: string
  noBirthTitle: string
  noBirthCta: string
}

const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    cardKicker: 'Your reading',
    open: 'Open your reading →',
    month: 'This month',
    threads: 'Threads',
    threadsHint: 'Your sky is yours alone — no one orbits you yet.',
    emptyCta: 'Invite someone →',
    emptySub: 'Invite someone close, and their star takes a place in your orbit.',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    cardKicker: '你的命书',
    open: '打开命书 →',
    month: '本月',
    threads: '牵绊',
    threadsHint: '此刻，夜空里只有你一个人。',
    emptyCta: '邀请对方 →',
    emptySub: '邀请一个在意的人，TA 的星会在你的夜空里亮起。',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    cardKicker: '你的命書',
    open: '打開命書 →',
    month: '本月',
    threads: '牽絆',
    threadsHint: '此刻，夜空裡只有你一個人。',
    emptyCta: '邀請對方 →',
    emptySub: '邀請一個在意的人，TA 的星會在你的夜空裡亮起。',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    cardKicker: 'あなたの命書',
    open: '命書を開く →',
    month: '今月',
    threads: '絆',
    threadsHint: '今はまだ、夜空にいるのはあなただけ。',
    emptyCta: '相手を招待 →',
    emptySub: '大切な人を招くと、その星があなたの夜空にともる。',
    noBirthTitle: 'あなた自身の命盤から',
    noBirthCta: '生年月日を入力 →',
  },
}

// Bond ids seen so far THIS app session — module-scoped so it survives the home
// remounting (the create flow `replace`s back to a fresh home instance). null =
// never loaded: the first resolve seeds it WITHOUT firing births, so a cold launch
// with existing threads stays calm; only an id that appears afterwards (you just
// made a bond) reads as newly born. Capped to the sky's slot count.
let seenBondIds: Set<string> | null = null
const SKY_SLOTS = 6

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
  // The 合盘 report opens as an in-place OVERLAY on the home (not a pushed route),
  // so it shares the solo reading's transition: the cream report blooms from the
  // tapped row over the live night, no jump. (The [id] route stays for deep links
  // / the accept flow.)
  // Seed from a pending hand-off SYNCHRONOUSLY (mirrors `showSplash` below). A flow
  // that finished on another screen (the invite accept) drops a bond id in pending-
  // open and resets to the home; consuming it here in the initializer — not only in
  // useFocusEffect — mounts the report overlay on the FIRST frame, so the home never
  // paints "naked" before the report appears (2026-06: "月相 loader 结束先回到了首页，
  // 然后才进入生成的报告页"). useFocusEffect still consumes as a fallback for a re-focus
  // that didn't remount the home.
  const [openBond, setOpenBond] = useState<{
    id: string
    origin: { x: number; y: number } | null
  } | null>(() => {
    const pending = consumePendingOpenBond()
    return pending ? { id: pending, origin: null } : null
  })
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
  const reportOpen = openBond != null
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
  const { bonds, isLoading: bondsLoading, isRefreshing, refetch, deleteBond, recompute } =
    useBondList()
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      // Silent revalidation: the cached list shows instantly; no loader/spinner
      // on return. A manual pull-to-refresh is the only visible refresh.
      void refetch({ silent: true })
      // Fallback only — the useState initializer above is the primary, flash-free
      // path (it catches the pending bond before the first paint when the reset
      // remounted the home). This covers the rare re-focus that did NOT remount.
      const pendingOpen = consumePendingOpenBond()
      if (pendingOpen) setOpenBond({ id: pendingOpen, origin: null })
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

  // First-thread (and any new-thread) BIRTH — diff the visible thread ids against
  // what we've seen this session; a freshly-appeared id is a bond YOU just made, so
  // its orbit slot flares with a gravity line in the sky (SkyHero). Module-scoped
  // `seenBondIds` survives the home remounting after the create flow returns; the
  // first resolve only seeds (no flare on launch). The nonce is the trigger edge.
  const [bornNonce, setBornNonce] = useState(0)
  const bornSlotsRef = useRef<number[]>([])
  useEffect(() => {
    // Wait for the FIRST real resolve before baselining — `bonds` starts [] while
    // the cold-launch fetch is in flight, and seeding off that empty list would
    // then flag every existing thread as "born" when the data lands.
    if (bondsLoading) return
    const ids = threads.map((thr) => thr.id)
    if (seenBondIds === null) {
      seenBondIds = new Set(ids)
      return
    }
    const born: number[] = []
    ids.forEach((id, i) => {
      if (i < SKY_SLOTS && !seenBondIds?.has(id)) born.push(i)
    })
    seenBondIds = new Set(ids)
    if (born.length > 0) {
      bornSlotsRef.current = born
      setBornNonce((nonce) => nonce + 1)
    }
  }, [threads, bondsLoading])

  // Warm the report cache for the active threads on screen, so tapping a row
  // opens instantly (the 水墨 bloom plays over a ready report instead of the
  // 1-2s "tap → blank → bloom" wait). Best-effort + cache-guarded, so this only
  // hits the network once per bond per session; pending/declined have no report.
  const { client } = useKindredClient()
  useEffect(() => {
    for (const b of bonds) {
      if (b.status === 'active') prefetchBondReport(client, b.id, resolveLocale())
    }
  }, [bonds, client])

  const confirmDelete = useCallback(
    (bond: BondData) => {
      // A pending invite has no reading yet — letting it go WITHDRAWS the invitation
      // (and frees its quota slot), so it gets cancel-an-invite copy, not the 解缘
      // "removes your synastry" wording a generated bond gets.
      const pending = bond.status === 'pending_invite'
      // For a generated bond the product has a stance, grounded in their own chart
      // (see lib/bondQuality): a 相生 bond is a real loss to cut; a 相克 one is often
      // the healthier cut. Pure compute — no LLM, no latency on the confirm. The
      // button is NOT styled destructive — 解缘 isn't always a tragedy.
      const title = t(locale, pending ? 'bondList.cancelInviteTitle' : 'bondList.deleteTitle')
      const body = pending
        ? t(locale, 'bondList.cancelInviteBody')
        : t(locale, `bondList.deleteBody.${bondQuality(bond)}`)
      Alert.alert(title, body, [
        { text: t(locale, 'bondList.cancel'), style: 'cancel' },
        {
          text: t(locale, pending ? 'bondList.cancelInvite' : 'bondList.delete'),
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

  // Star-map taps: your central star (or empty sky) → your personal 命书, straight
  // into the full six-chapter report ((reading)/full). The concise 概要 interstitial
  // was dropped (2026-06 feedback: an unnecessary stop on the way in). A thread's
  // star → that bond.
  // Tapping your central star opens the 命书; pass the tap point so the report's
  // 墨晕 entrance spreads from the star. The visible "打开命书" link calls this with
  // no point → the bloom falls back to mid-page.
  const openSelfReading = useCallback(
    (x?: number, y?: number) => {
      router.push({
        pathname: '/(reading)/full',
        params:
          typeof x === 'number' && typeof y === 'number'
            ? { ox: String(Math.round(x)), oy: String(Math.round(y)) }
            : {},
      })
    },
    [router]
  )
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
  // 本月 — the lightweight 本月运势 card; ADR-0026 moved the interactive 流年/假如 to 运.
  const openMonth = useCallback(() => router.push('/(reading)/month'), [router])

  // New thread — never gated. Inviting is the viral action and is uncapped, and a
  // solo bond is always free to CREATE; the free-vs-teaser decision is made by the
  // server per bond (chaptersUnlocked) and surfaced as the in-report unlock wall.
  // So we no longer pre-empt a paywall here — the flow always opens.
  const startNewThread = useCallback(() => {
    router.push('/(onboarding)/mode')
  }, [router])

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <YuelMark vertical size={26} color={kindredDark.seal} />
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
        <Settings2 color={kindredDark.textMuted} size={20} strokeWidth={1.5} />
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
            illustration={<YuelMark vertical size={96} color={kindredDark.seal} />}
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
      {/* Personal reading entry. Tapping your central star opens it too
          (SkyHero.onTapSelf), but that gesture isn't discoverable — this is the visible
          doorway the home was missing (2026-06 feedback). Centered under your star,
          quiet gold so it reads as YOUR entry without shouting over the sky. The 本月
          doorway (the lightweight 本月运势 card) sits on the same row. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: kindredSpacing.md,
          marginBottom: kindredSpacing.lg,
        }}
      >
        <Pressable
          onPress={() => openSelfReading()}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={copy.cardKicker}
          style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
        >
          <Text
            style={{
              fontFamily: kindredFonts.mono,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: kindredDark.accent,
            }}
          >
            {copy.open}
          </Text>
        </Pressable>
        <View
          style={{ width: StyleSheet.hairlineWidth, height: 11, backgroundColor: kindredDark.border }}
        />
        <Pressable
          onPress={openMonth}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={copy.month}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          {/* A small moon glyph — 本月 reads as its own kind of doorway (the lunar
              month), not a second "open". */}
          <Moon size={12} color={kindredDark.textMuted} strokeWidth={1.6} />
          <Text
            style={{
              fontFamily: kindredFonts.mono,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: kindredDark.textMuted,
            }}
          >
            {copy.month}
          </Text>
        </Pressable>
      </View>

      {/* The threads-section header (title + inline "add") is gone: New Thread now
          lives in the bottom-center floating FAB, and the rows stand on their own
          under "Open your reading" + the sky. A quiet neutral hairline separates the
          doorway from the threads (the earlier cinnabar 红线 串联 was dropped — 2026-06). */}
      {threads.length > 0 ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: kindredDark.border,
            marginHorizontal: kindredSpacing.screenH,
          }}
        />
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
              showsVerticalScrollIndicator={false}
              style={StyleSheet.absoluteFill}
              contentContainerStyle={{
                // Start flush under the full sky; the sky collapses 1:1 with scroll,
                // so the caption tracks its bottom edge down. flexGrow lets the
                // 0-thread invite center in the space below the sky.
                flexGrow: 1,
                paddingTop: heroH + 8,
                // Extra bottom room so the last row clears the floating New-Thread FAB.
                paddingBottom: kindredSpacing.xxl + 60,
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
                bondsLoading ? (
                  // Still fetching — `bonds` starts [] so without this the "你一个人 /
                  // no one orbits you yet" invite flashes before a returning user's
                  // threads arrive (2026-06 feedback: rendering the empty list before
                  // the query resolves). Quiet moon loader (same idiom as the
                  // birth-load branch), never the empty copy.
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <AutoMoonPhaseLoader size={56} skin={SKIN_CINNABAR} />
                  </View>
                ) : (
                  // 0-thread state: the New-Thread mark + one quiet line, nothing
                  // more — the lone star above is the picture.
                  <FirstThreadInvite
                    cjk={isCjkLocale(locale)}
                    line={copy.emptySub}
                    onPress={startNewThread}
                  />
                )
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
              refreshing={isRefreshing}
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
                  bornSlots={bornSlotsRef.current}
                  bornNonce={bornNonce}
                />
              ) : null}
            </Animated.View>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* New thread — bottom-center floating FAB. lucide `spline` (two nodes + a
          curve = 牵一段新缘 / connect two charts) in the cinnabar seal, the one
          persistent action. The wrapper is box-none so the list scrolls around it;
          the report overlay (zIndex 100) covers it when a reading opens. */}
      {threads.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            bottom: 36,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 50,
          }}
          pointerEvents='box-none'
        >
          <Pressable
            onPress={startNewThread}
            accessibilityRole='button'
            accessibilityLabel={t(locale, 'bondList.add')}
            style={({ pressed }) => ({
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: kindredDark.seal,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: kindredDark.seal,
              shadowOpacity: 0.5,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            })}
          >
            <Spline color={kindredDark.text} size={24} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

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

/**
 * 0-thread invite — deliberately minimal: the New-Thread mark (the cinnabar seal
 * the FAB uses) over one quiet line. The lone star overhead is the picture; this
 * is just the single doorway to bringing someone in.
 */
function FirstThreadInvite({
  cjk,
  line,
  onPress,
}: {
  cjk: boolean
  line: string
  onPress: () => void
}) {
  const bodyFont = cjk ? kindredFonts.cjk : kindredFonts.serif
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: kindredSpacing.screenH,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={line}
        hitSlop={12}
        style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.65 : 1 })}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: kindredDark.seal,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: kindredSpacing.lg,
            shadowColor: kindredDark.seal,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Spline color={kindredDark.text} size={24} strokeWidth={2} />
        </View>
        <Text
          style={{
            fontFamily: bodyFont,
            fontSize: 15,
            lineHeight: 23,
            color: kindredDark.textSecondary,
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          {line}
        </Text>
      </Pressable>
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
