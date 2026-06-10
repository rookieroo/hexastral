/**
 * Home — the solo 八字紫微 reading + the thread list, on a 宣纸 surface.
 *
 * 2026-06 device QA reshaped this:
 *   - Threads flattened onto the home; tapping a row → its report directly.
 *   - The home is 宣纸 (rice paper); the reading/合盘 reports are 水墨黑 and bloom
 *     IN from the tapped point, so the transition reads as ink spreading on paper
 *     (point 1 — origin is captured on press-in and handed to the bloom).
 *   - The chart card is the home's HERO — a paper "命书" object that lifts off
 *     the page (2026-06: "把命书卡做成主角").
 *   - timeline & make-if are per-合盘, so they moved OFF a global chip onto each
 *     row's left-swipe (+ the report 划词 bar) (point 2).
 *
 *   ◐ Yuel                                 ⚙   ← brand top-left · Settings top-right
 *   ┌─────────────────────────────────────┐
 *   │ ▣   YOUR READING                    │   ← the hero card: large 碑拓 seal,
 *   │ 土   Earth · 1994-06-22             │     kicker + day-master element + date,
 *   │ ─────────────────────────────────── │     a hairline, then the cinnabar CTA.
 *   │      Open your reading  →            │     (tap → ReadingOverlay 水墨 bloom)
 *   └─────────────────────────────────────┘
 *   Threads                              +
 *   林朝英 · Partner                  生 ›    ← tap → report; swipe ← → Timeline /
 *   王重阳 · Friend                   克 ›       Make-if / Delete
 */

import { EmptyState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPaper,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  AncientSeal,
  type BondData,
  type BondStatus,
  kindredFonts,
  useBondList,
  WUXING_GLYPH,
} from '@zhop/scenario-kindred'
import { useFocusEffect, useRouter } from 'expo-router'
import { Plus, Settings } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ReadingOverlay } from '@/components/reading/ReadingOverlay'
import { ThreadListItem } from '@/components/ThreadListItem'
import { resolveBondDisplayName } from '@/lib/bondName'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { useSelfBirth } from '@/lib/selfBirth'
import { computeFateNatalChart, type FateNatalChart } from '@/lib/solo/natal'
import { consumeSplashDecision } from '@/lib/splash-control'

/* ── Home copy (4 locales, local — keeps lib/i18n.ts untouched) ─────────── */

interface HomeCopy {
  /** Kicker over the hero card — "this is YOUR book of fate". */
  cardKicker: string
  open: string
  threads: string
  threadsHint: string
  noBirthTitle: string
  noBirthCta: string
}

/** Day-master element → an intuitive word per locale (named under the seal). */
const WUXING_LABEL: Record<string, Record<string, string>> = {
  木: { en: 'Wood', zh: '木', 'zh-Hant': '木', ja: '木' },
  火: { en: 'Fire', zh: '火', 'zh-Hant': '火', ja: '火' },
  土: { en: 'Earth', zh: '土', 'zh-Hant': '土', ja: '土' },
  金: { en: 'Metal', zh: '金', 'zh-Hant': '金', ja: '金' },
  水: { en: 'Water', zh: '水', 'zh-Hant': '水', ja: '水' },
}

const HOME_COPY: Record<Locale, HomeCopy> = {
  en: {
    cardKicker: 'Your reading',
    open: 'Open your reading →',
    threads: 'Threads',
    threadsHint: 'Readings for two — invite or add someone',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    cardKicker: '你的命书',
    open: '打开命书 →',
    threads: '牵绊',
    threadsHint: '两个人的合盘 — 邀请或录入对方',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    cardKicker: '你的命書',
    open: '打開命書 →',
    threads: '牽絆',
    threadsHint: '兩個人的合盤 — 邀請或錄入對方',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    cardKicker: 'あなたの命書',
    open: '命書を開く →',
    threads: '絆',
    threadsHint: 'ふたりの相性 — 招待または入力',
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
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const copy = HOME_COPY[locale]
  const birth = useSelfBirth()
  const [readingOpen, setReadingOpen] = useState(false)
  // Where the reading bloom starts — the point on the card the user pressed, so
  // the 水墨 spreads from the tap (set on press-in, read by ReadingOverlay).
  const [readingOrigin, setReadingOrigin] = useState<{ x: number; y: number } | null>(null)
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

  // Threads — the bond list lives inline on the home. Refetched on focus so a
  // bond created/accepted elsewhere shows up on return.
  const { bonds, refetch, deleteBond } = useBondList()
  useFocusEffect(
    useCallback(() => {
      void refetch()
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
            color: kindredPaper.ink,
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
        <Settings color={kindredPaper.muted} size={22} strokeWidth={1.5} />
      </Pressable>
    </View>
  )

  // ── Render branches ───────────────────────────────────────────────────────

  // Loading the persisted birth.
  if (birth === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
          </View>
        </SafeAreaView>
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    )
  }

  // Never onboarded with birth info (e.g. pre-K1 installs) → self form. Kept on
  // the dark ground (a rare pre-onboarding edge; core-ui EmptyState is dark-themed).
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
      {/* Your own chart — the hero of the home (2026-06: "把命书卡做成主角"). A
          paper "命书" object that lifts off the 宣纸: a large 碑拓 seal anchors
          your day-master element, a quiet kicker names it as YOURS, and the
          cinnabar CTA opens the reading. Press-in records the tap point so the
          ink blooms from exactly where the finger lands. */}
      <Pressable
        onPressIn={(e) => setReadingOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        onPress={() => setReadingOpen(true)}
        accessibilityRole='button'
        accessibilityLabel={copy.cardKicker}
        style={({ pressed }) => ({
          marginHorizontal: kindredSpacing.screenH,
          marginBottom: kindredSpacing.xl,
          paddingVertical: kindredSpacing.lg,
          paddingHorizontal: kindredSpacing.lg,
          gap: kindredSpacing.lg,
          borderRadius: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: kindredPaper.hair,
          backgroundColor: kindredPaper.bg,
          // Soft lift off the 宣纸 so the card reads as a held object, not a row.
          shadowColor: '#3c2415',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        {/* Identity — large essence seal + day-master element + birthdate. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.md }}>
          <AncientSeal
            glyph={WUXING_GLYPH[natal.dayMasterWuXing] ?? '木'}
            size={60}
            tile={kindredDark.bg}
            ink={kindredPaper.bg}
            inset={0.82}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[kindredType.seal, { color: kindredPaper.bronze, letterSpacing: 3 }]}>
              {copy.cardKicker}
            </Text>
            <Text style={[kindredType.heading, { color: kindredPaper.ink }]}>
              {WUXING_LABEL[natal.dayMasterWuXing]?.[locale] ?? natal.dayMasterWuXing} ·{' '}
              {birth.solarDate}
            </Text>
          </View>
        </View>

        {/* Hairline rule + cinnabar CTA. */}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: kindredPaper.hair }} />
        <Text
          style={[
            kindredType.body,
            { color: kindredPaper.cinnabar, fontWeight: '600', letterSpacing: 0.3 },
          ]}
        >
          {copy.open}
        </Text>
      </Pressable>

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
        <Text style={[kindredType.heading, { color: kindredPaper.ink }]}>{copy.threads}</Text>
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
            borderColor: kindredPaper.cinnabar,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Plus color={kindredPaper.cinnabar} size={16} strokeWidth={1.9} />
          <Text style={[kindredType.caption, { color: kindredPaper.cinnabar, fontWeight: '600' }]}>
            {t(locale, 'bondList.add')}
          </Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {topBar}
        <FlatList
          contentContainerStyle={{
            paddingTop: kindredSpacing.md,
            paddingBottom: kindredSpacing.xxl,
          }}
          ListHeaderComponent={listHeader}
          data={threads}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <ThreadListItem
              bond={item}
              locale={locale}
              onPress={(origin) =>
                router.push({
                  pathname: '/(bonds)/[id]',
                  params: {
                    id: item.id,
                    ...(origin
                      ? { ox: String(Math.round(origin.x)), oy: String(Math.round(origin.y)) }
                      : {}),
                  },
                })
              }
              onDelete={() => confirmDelete(item)}
              onTimeline={() =>
                router.push({
                  pathname: '/(timeline)',
                  params: { bondId: item.id, bondName: resolveBondDisplayName(item).displayName },
                })
              }
              onMakeif={() =>
                router.push({
                  pathname: '/(bonds)/makeif',
                  params: { id: item.id, title: resolveBondDisplayName(item).displayName },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: kindredPaper.hair,
                marginLeft: kindredSpacing.screenH,
              }}
            />
          )}
          ListEmptyComponent={
            <Text
              style={[
                kindredType.caption,
                { color: kindredPaper.inkSoft, paddingHorizontal: kindredSpacing.screenH },
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
                    color: kindredPaper.muted,
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
      </SafeAreaView>

      {/* Full reading — ink-bloom overlay (kept mounted for open/close animation).
          `origin` is the tapped point on the hero card, so the 水墨 spreads from
          the finger. */}
      <ReadingOverlay
        visible={readingOpen}
        onClose={() => setReadingOpen(false)}
        onAskAI={handleAskAI}
        origin={readingOrigin}
      />
      {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
    </View>
  )
}
