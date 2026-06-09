/**
 * Home — the solo 八字紫微 reading + the thread list, in one screen.
 *
 * 2026-06 device QA reshaped this (was: a centered moon+seal hero with a
 * "Threads →" link into a SEPARATE list screen, which read as too deep):
 *
 *   ◐ Kindred                              ⚙   ← brand top-left · Settings top-right
 *   ┌─────────────────────────────────────┐
 *   │ 土   Earth · 1994-06-22              │   ← your own chart, one compact card
 *   │      Open your reading  →            │     (tap → solo ReadingOverlay)
 *   └─────────────────────────────────────┘
 *   Threads                  ◷ Timeline   +
 *   ───────────────────────────────────────
 *   林朝英 · Partner                  生 ›    ← full list inline; tap a row → its
 *   王重阳 · Friend                   克 ›       report DIRECTLY (no middle screen)
 *
 * Timeline (the ego-centric multi-bond axis) is a header chip; make-if is
 * per-bond and lives inside each report. The old floating ··· + swipe-to-settings
 * are replaced by the visible top-right gear (clearer + no clash with row swipe).
 */

import { EmptyState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
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
import { GitCommitVertical, Plus, Settings } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
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
    open: 'Open your reading →',
    threads: 'Threads',
    threadsHint: 'Readings for two — invite or add someone',
    noBirthTitle: 'Begin with your own chart',
    noBirthCta: 'Enter your birth info →',
  },
  zh: {
    open: '打开命书 →',
    threads: '牵绊',
    threadsHint: '两个人的合盘 — 邀请或录入对方',
    noBirthTitle: '从你自己的命盘开始',
    noBirthCta: '填写生辰 →',
  },
  'zh-Hant': {
    open: '打開命書 →',
    threads: '牽絆',
    threadsHint: '兩個人的合盤 — 邀請或錄入對方',
    noBirthTitle: '從你自己的命盤開始',
    noBirthCta: '填寫生辰 →',
  },
  ja: {
    open: '命書を開く →',
    threads: '絆',
    threadsHint: 'ふたりの相性 — 招待または入力',
    noBirthTitle: 'あなた自身の命盤から',
    noBirthCta: '生年月日を入力 →',
  },
}

// Pending threads need attention; actives are destinations; declined/expired are
// tail noise. Sort accordingly (matches the old Threads screen).
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
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

  // Threads — the bond list now lives inline on the home (2026-06: "Threads 列表
  // 直接放首页"). Refetched on focus so a bond created/accepted elsewhere shows up.
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

  // Fixed top bar — brand left, Settings right (replaces the floating ···).
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
          Kindred
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
      {/* Your own chart — one compact, tappable card (opens the solo reading). */}
      <Pressable
        onPress={() => setReadingOpen(true)}
        accessibilityRole='button'
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: kindredSpacing.md,
          marginHorizontal: kindredSpacing.screenH,
          marginBottom: kindredSpacing.xl,
          padding: kindredSpacing.lg,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: kindredDark.border,
          backgroundColor: kindredDark.card,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <AncientSeal
          glyph={WUXING_GLYPH[natal.dayMasterWuXing] ?? '木'}
          size={46}
          tile={kindredDark.seal}
          ink={kindredDark.text}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
            {WUXING_LABEL[natal.dayMasterWuXing]?.[locale] ?? natal.dayMasterWuXing} ·{' '}
            {birth.solarDate}
          </Text>
          <Text style={[kindredType.body, { color: kindredDark.accent }]}>{copy.open}</Text>
        </View>
      </Pressable>

      {/* Threads header — title + Timeline (multi-bond axis) + New chips. */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
          <Chip
            icon={
              <GitCommitVertical color={kindredDark.textSecondary} size={16} strokeWidth={1.7} />
            }
            label={t(locale, 'timeline.title')}
            onPress={() => router.push('/(timeline)')}
          />
          <Chip
            icon={<Plus color={kindredDark.accent} size={16} strokeWidth={1.9} />}
            label={t(locale, 'bondList.add')}
            onPress={() => router.push('/(onboarding)/mode')}
            accent
          />
        </View>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
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
              onPress={() => router.push(`/(bonds)/${item.id}`)}
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
      </SafeAreaView>

      {/* Full reading — ink-bloom overlay (kept mounted for open/close animation) */}
      <ReadingOverlay
        visible={readingOpen}
        onClose={() => setReadingOpen(false)}
        onAskAI={handleAskAI}
      />
      {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
    </View>
  )
}

/** A compact header chip — icon + label rounded-rect. */
function Chip({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  accent?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: accent ? kindredDark.accent : kindredDark.border,
        backgroundColor: kindredDark.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon}
      <Text
        style={[
          kindredType.caption,
          { color: accent ? kindredDark.accent : kindredDark.textSecondary, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
