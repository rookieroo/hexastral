/**
 * Home — the solo 八字紫微 reading (ADR-0021 K1, solo-first).
 *
 * This replaces the bond list as Kindred's home: user A lands here right
 * after entering their own birth info and always finds their own reading —
 * no partner required. Threads (合盘, the bond list) hang off this screen as
 * the second layer.
 *
 * Layout (sparse home, ADR-0018):
 *   ··· (Settings)              + (new thread → partner flow)
 *                 V15Moon
 *           day-master glyph (hero)
 *        birth date · day-master element
 *          打开命书 / Open your reading →   ← ReadingOverlay (ink bloom)
 *   ───────────────────────────────────
 *   牵绊 Threads                         → /(bonds)
 *
 * Chrome mirrors the previous bonds home: swipe-left → Settings
 * (ADR-0018 rule 2, ··· is the a11y fallback) + V15Moon HomeSplash on cold
 * launch (suppressed right after onboarding).
 */

import { EmptyState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { AncientSeal, type BondData, useBondList, WUXING_GLYPH } from '@zhop/scenario-kindred'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { EssenceTag } from '@/components/EssenceTag'
import { HomeSplash } from '@/components/HomeSplash'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ReadingOverlay } from '@/components/reading/ReadingOverlay'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import { consumeSplashDecision } from '@/lib/splash-control'

/* ── Home copy (4 locales, local — keeps lib/i18n.ts untouched) ─────────── */

interface HomeCopy {
  open: string
  threads: string
  threadsHint: string
  /** Suffix after the pending-invite count, e.g. "2 waiting for reply". */
  threadsPending: string
  noBirthTitle: string
  noBirthCta: string
}

/** Day-master element → an intuitive word per locale. The home hero is now the
 *  element's ancient pictograph seal (AncientSeal), NOT the obscure 天干 char (乙);
 *  EN reads "Wood"/"Fire" while zh/ja keep the familiar character below it. */
const WUXING_LABEL: Record<string, Record<string, string>> = {
  木: { en: 'Wood', zh: '木', 'zh-Hant': '木', ja: '木' },
  火: { en: 'Fire', zh: '火', 'zh-Hant': '火', ja: '火' },
  土: { en: 'Earth', zh: '土', 'zh-Hant': '土', ja: '土' },
  金: { en: 'Metal', zh: '金', 'zh-Hant': '金', ja: '金' },
  水: { en: 'Water', zh: '水', 'zh-Hant': '水', ja: '水' },
}

const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    open: 'Open your reading →',
    threads: 'Threads',
    threadsHint: 'Readings for two — invite or add someone',
    threadsPending: 'waiting for reply',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    open: '打开命书 →',
    threads: '牵绊',
    threadsHint: '两个人的合盘 — 邀请或录入对方',
    threadsPending: '段等待回应',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    open: '打開命書 →',
    threads: '牽絆',
    threadsHint: '兩個人的合盤 — 邀請或錄入對方',
    threadsPending: '段等待回應',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    open: '命書を開く →',
    threads: '絆',
    threadsHint: 'ふたりの相性 — 招待または入力',
    threadsPending: '件 返事待ち',
    noBirthTitle: 'あなた自身の命盤から',
    noBirthCta: '生年月日を入力 →',
  },
}

export default function ReadingHomeScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const copy = HOME_COPY[locale]
  const birth = useSelfBirth()
  const [readingOpen, setReadingOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())
  const insets = useSafeAreaInsets()

  // Threads (K2) — bond list summary for the second section of the home.
  // Refetched on focus so a bond created/accepted elsewhere shows up on return.
  const { bonds, refetch } = useBondList()
  useFocusEffect(
    useCallback(() => {
      void refetch()
    }, [refetch])
  )
  const activeBonds = useMemo(() => bonds.filter((b) => b.status === 'active'), [bonds])
  const pendingCount = useMemo(
    () => bonds.filter((b) => b.status === 'pending_invite').length,
    [bonds]
  )
  // The two most recent threads, shown inline on the home.
  const recentBonds = useMemo(() => activeBonds.slice(0, 2), [activeBonds])

  // Swipe-left → Settings (ADR-0018 rule 2). The ··· header is the a11y fallback.
  const goToSettings = useCallback(() => router.push('/(settings)'), [router])
  const { activeOffsetX, failOffsetY, commitDx, maxDy } = SWIPE_TO_ME
  const swipeToMe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activeOffsetX)
        .failOffsetY(failOffsetY)
        .onEnd((e) => {
          if (e.translationX < commitDx && Math.abs(e.translationY) < maxDy) {
            runOnJS(goToSettings)()
          }
        }),
    [goToSettings, activeOffsetX, failOffsetY, commitDx, maxDy]
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
        gender: birth.gender,
      })
    } catch {
      return null
    }
  }, [birth])

  const content = (() => {
    // Loading the persisted birth
    if (birth === undefined) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
        </View>
      )
    }

    // Never onboarded with birth info (e.g. pre-K1 installs) → self form
    if (birth === null || natal === null) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: kindredSpacing.screenH,
          }}
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
        </View>
      )
    }

    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
          paddingBottom: kindredSpacing.xxl,
        }}
      >
        {/* DEV shortcuts moved to Settings → "DEV tools" (decluttered the home top). */}

        {/* Header chrome — just the new-thread "+". Settings moved to the
            bottom-floating ··· (relocated from the top-left) + the swipe-left
            gesture (ADR-0018). */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBottom: kindredSpacing.md,
          }}
        >
          <Pressable onPress={() => router.push('/(onboarding)/mode')} hitSlop={8}>
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>+</Text>
          </Pressable>
        </View>

        {/* Brand anchor — same cinnabar moon that HomeSplash flies into */}
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <KindredMoon size={56} />
        </View>

        {/* Identity — the day-master's ELEMENT as a hand-authored ancient
            pictograph (甲骨/金文) stamped as a 朱砂 seal (AncientSeal), replacing
            the obscure 天干 character (乙). The designed 意象 reads across
            cultures; the element word below names it. */}
        <View style={{ alignItems: 'center', gap: kindredSpacing.sm }}>
          <AncientSeal
            glyph={WUXING_GLYPH[natal.dayMasterWuXing] ?? '木'}
            size={92}
            tile={kindredDark.seal}
            ink={kindredDark.text}
          />
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
            {WUXING_LABEL[natal.dayMasterWuXing]?.[locale] ?? natal.dayMasterWuXing} ·{' '}
            {birth.solarDate}
          </Text>
          <View style={{ marginTop: kindredSpacing.lg }}>
            <PrimaryButton label={copy.open} onPress={() => setReadingOpen(true)} block={false} />
          </View>
        </View>

        {/* Threads — the second layer (合盘), real bond data inline (K2) */}
        <View
          style={{
            marginTop: kindredSpacing.xxl,
            borderTopWidth: 1,
            borderTopColor: kindredDark.separator,
            paddingTop: kindredSpacing.lg,
          }}
        >
          <Pressable
            onPress={() => router.push('/(bonds)')}
            accessibilityRole='button'
            style={{ gap: kindredSpacing.xs }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[kindredType.heading, { color: kindredDark.text }]}>{copy.threads}</Text>
              <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
                {bonds.length > 0 ? `${bonds.length} ` : ''}→
              </Text>
            </View>
            {bonds.length === 0 ? (
              <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
                {copy.threadsHint}
              </Text>
            ) : (
              <View style={{ gap: kindredSpacing.sm, marginTop: kindredSpacing.xs }}>
                {recentBonds.map((b) => (
                  <ThreadRow key={b.id} bond={b} />
                ))}
                {pendingCount > 0 && (
                  <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
                    {pendingCount} {copy.threadsPending}
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    )
  })()

  return (
    <GestureDetector gesture={swipeToMe}>
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>{content}</SafeAreaView>
        {/* Floating "more" — relocated from the top-left. The discoverable a11y
            fallback for the swipe-left → Settings gesture (ADR-0018). */}
        <View
          pointerEvents='box-none'
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 16,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={goToSettings}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={t(locale, 'settings.title')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: kindredDark.card,
              borderWidth: 0.5,
              borderColor: kindredDark.border,
              opacity: 0.85,
            }}
          >
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>···</Text>
          </Pressable>
        </View>
        {/* Full reading — ink-bloom overlay (kept mounted for open/close animation) */}
        <ReadingOverlay
          visible={readingOpen}
          onClose={() => setReadingOpen(false)}
          onAskAI={handleAskAI}
        />
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    </GestureDetector>
  )
}

/** One inline thread on the home — name · relationship, essence on the right. */
function ThreadRow({ bond }: { bond: BondData }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={[kindredType.body, { color: kindredDark.text }]} numberOfLines={1}>
        {bond.targetName}
        <Text style={{ color: kindredDark.textMuted }}> · {bond.relationshipLabel}</Text>
      </Text>
      <EssenceTag aElement={bond.aElement} bElement={bond.bElement} />
    </View>
  )
}
