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
import { AutoMoonPhaseLoader, V15Moon } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import { SWIPE_TO_ME } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSplash } from '@/components/HomeSplash'
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
  noBirthTitle: string
  noBirthCta: string
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

export default function ReadingHomeScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const copy = HOME_COPY[locale]
  const birth = useSelfBirth()
  const [readingOpen, setReadingOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(() => !consumeSplashDecision())

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
            illustration={<V15Moon size={96} />}
            title={copy.noBirthTitle}
            customAction={
              <Pressable onPress={() => router.push('/(onboarding)/self')} hitSlop={12}>
                <Text style={kindredPresets.ctaText}>{copy.noBirthCta}</Text>
              </Pressable>
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
        {/* Header chrome — Settings (left) + new thread (right), tucked into the corners */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: kindredSpacing.md,
          }}
        >
          <Pressable
            onPress={goToSettings}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t(locale, 'settings.title')}
          >
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>···</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(onboarding)/mode')} hitSlop={8}>
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>+</Text>
          </Pressable>
        </View>

        {/* Brand anchor — same V15Moon that HomeSplash flies into */}
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <V15Moon size={56} />
        </View>

        {/* Identity — single day-master glyph, the ADR-0018 "one CJK glyph" hero */}
        <View style={{ alignItems: 'center', gap: kindredSpacing.sm }}>
          <Text style={[kindredType.hero, { color: kindredDark.text }]}>{natal.dayMaster}</Text>
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
            {birth.solarDate} · {natal.dayMasterWuXing}
          </Text>
          <Pressable
            onPress={() => setReadingOpen(true)}
            hitSlop={12}
            accessibilityRole='button'
            style={{ marginTop: kindredSpacing.lg }}
          >
            <Text style={kindredPresets.ctaText}>{copy.open}</Text>
          </Pressable>
        </View>

        {/* Threads — the second layer (合盘) */}
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
              <Text style={[kindredType.caption, { color: kindredDark.accent }]}>→</Text>
            </View>
            <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
              {copy.threadsHint}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    )
  })()

  return (
    <GestureDetector gesture={swipeToMe}>
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>{content}</SafeAreaView>
        {/* Full reading — ink-bloom overlay (kept mounted for open/close animation) */}
        <ReadingOverlay visible={readingOpen} onClose={() => setReadingOpen(false)} />
        {showSplash && <HomeSplash onDone={() => setShowSplash(false)} />}
      </View>
    </GestureDetector>
  )
}
