/**
 * 命 Fate Tab — editorial layout (Ink Brutalism).
 *
 * Visual hierarchy:
 *   - Page-level masthead: ganzhi date + moon phase, hairline-divided
 *   - WelcomePrimer: transient one-time hint
 *   - DailySignalCard: boxless hero on page bg (no section card — editorial)
 *   - FateActionDeck inside FateHomeInsetCard: shortcuts cluster
 *   - FateRecentStrip: same inset card when chips exist; “See all” → History
 *
 * Free vs Pro:
 *   - Same lazy LLM card for both (see hexastral-api GET /api/signal/today).
 *   - Pro adds: in-app "Why" reasoning row, longer history, push, refresh.
 *
 * Push deep link: route param ?signal=<id> flashes the signal card on mount.
 */

import { useQueryClient } from '@tanstack/react-query'
import { dayGanZhi, yearGanZhi, yearZodiac } from '@zhop/astro-core/ganzhi'
import { getCalendarYMDInTimeZone, getNearestJieQiForGregorianDate } from '@zhop/astro-core/jieqi'
import { type Locale as AstroLocale, labelize } from '@zhop/astro-i18n'
import { getLunarPhase, getLunarPhaseName } from '@zhop/hexastral-tokens/lunar'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { DailySignalCard } from '@/components/fate/DailySignalCard'
import { DiscoverSatellitesSection } from '@/components/fate/DiscoverSatellitesSection'
import { FateHomeHero } from '@/components/fate/FateHomeHero'
import { FateHomeInsetCard } from '@/components/fate/FateHomeInsetCard'
import { FateRecentStrip } from '@/components/fate/FateRecentStrip'
import { FateActionDeck } from '@/components/fate/QuickActions'
import { ReportDigestStrip } from '@/components/fate/ReportDigestStrip'
import {
  markWelcomePrimerSeen,
  shouldShowWelcomePrimer,
  WelcomePrimer,
} from '@/components/fate/WelcomePrimer'
import { GuardBlockModal } from '@/components/modal/GuardBlockModal'
import { getIsPro, useAuth } from '@/lib/auth'
import { useSignalQuery } from '@/lib/hooks/useSignalQuery'
import { useUserQuery } from '@/lib/hooks/useUserQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { useAuthGate } from '@/lib/ux/useAuthGate'
import { type QuotaStatus, useFreeQuotaQuery, useQuota, useQuotaQuery } from '@/lib/ux/useQuota'
import type { TranslationKeys } from '@/locales/zh'

const FATE_HERO_SECTION_LABEL: TranslationKeys = 'history_daily_signal_title'

export default function HomeScreen() {
  const ios = useIosPalette()
  const queryClient = useQueryClient()

  const { t, locale } = useI18n()
  const router = useRouter()
  const { userId } = useAuth()
  const { showPaywallModal, guard, dismissGuard } = useQuota()
  const { authGateElement } = useAuthGate()

  const userQuery = useUserQuery(userId)
  const user = userQuery.data ?? null
  const quotaQuery = useQuotaQuery(userId)
  /** Pro / active subscription — must not use `quotaQuery.isSuccess` (that only means HTTP 200). */
  const isPro = getIsPro(user as { subscriptionStatus?: string | null } | null)

  const signalQuery = useSignalQuery(userId)
  const freeQuotaQuery = useFreeQuotaQuery(userId)

  const proQuota: QuotaStatus | null = isPro ? (quotaQuery.data ?? null) : null

  // ── Push deep link: ?signal=<id> ───────────────────────────────────────
  const params = useLocalSearchParams<{ signal?: string }>()
  const signalCardOpacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!params.signal) return
    Animated.sequence([
      Animated.timing(signalCardOpacity, { toValue: 0.3, duration: 180, useNativeDriver: true }),
      Animated.timing(signalCardOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start()
  }, [params.signal, signalCardOpacity])

  // ── Today snapshot (deterministic, no network) ────────────────────────
  const todayPhase = useMemo(() => getLunarPhase(Date.now()), [])

  /** 东八区公历日键 — 节气与常见万年历对齐；随焦点/每分钟刷新以免跨日陈旧 */
  const shanghaiDayKey = useCallback((d: Date) => {
    const { year, month, day } = getCalendarYMDInTimeZone(d, 'Asia/Shanghai')
    return `${year}-${month}-${day}`
  }, [])
  const [fateHeaderDayKey, setFateHeaderDayKey] = useState(() => shanghaiDayKey(new Date()))
  useFocusEffect(
    useCallback(() => {
      setFateHeaderDayKey((prev) => {
        const next = shanghaiDayKey(new Date())
        return prev === next ? prev : next
      })
    }, [shanghaiDayKey])
  )
  useEffect(() => {
    const id = setInterval(() => {
      setFateHeaderDayKey((prev) => {
        const next = shanghaiDayKey(new Date())
        return prev === next ? prev : next
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [shanghaiDayKey])

  const todayHeader = useMemo(() => {
    const now = new Date()
    const day = dayGanZhi(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const year = yearGanZhi(now.getFullYear())
    const zodiac = yearZodiac(now.getFullYear())
    const segs = fateHeaderDayKey.split('-')
    const jy = Number.parseInt(segs[0] ?? '0', 10)
    const jm = Number.parseInt(segs[1] ?? '1', 10)
    const jd = Number.parseInt(segs[2] ?? '1', 10)
    const { prev } = getNearestJieQiForGregorianDate(jy, jm, jd)
    const astroLocale = locale as AstroLocale
    const phaseName = getLunarPhaseName(todayPhase)
    const phaseLabel = t(`moon_phase_${phaseName.replace('-', '_')}` as Parameters<typeof t>[0])
    return {
      dayLabel: `${labelize('stem', day.stem, astroLocale)}${labelize('branch', day.branch, astroLocale)}`,
      yearLabel: `${labelize('stem', year.stem, astroLocale)}${labelize('branch', year.branch, astroLocale)}`,
      zodiac: labelize('shichenAnimal', zodiac, astroLocale) || zodiac,
      jieqi: prev.name,
      phaseLabel,
    }
  }, [locale, todayPhase, fateHeaderDayKey, t])

  const [refreshing, setRefreshing] = useState(false)
  const [showPrimer, setShowPrimer] = useState(() => shouldShowWelcomePrimer())
  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      signalQuery.refetch(),
      userQuery.refetch(),
      freeQuotaQuery.refetch(),
      isPro ? quotaQuery.refetch() : Promise.resolve(),
      userId
        ? queryClient.invalidateQueries({ queryKey: ['yiching-history', userId] })
        : Promise.resolve(),
      userId
        ? queryClient.invalidateQueries({ queryKey: ['signal-history', 7, userId] })
        : Promise.resolve(),
    ])
    setRefreshing(false)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: ios.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ios.text} />
        }
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'stretch',
          paddingBottom: 64,
        }}
      >
        {/* ── Masthead: date + moon ────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: ios.secondary,
              fontSize: 11,
              fontWeight: '300',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {todayHeader.dayLabel} · {todayHeader.jieqi}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HexastralPlanetLogo size={16} phase={todayPhase} />
            <Text
              style={{
                color: ios.secondary,
                fontSize: 11,
                fontWeight: '300',
                letterSpacing: 1.2,
              }}
            >
              {todayHeader.phaseLabel}
            </Text>
          </View>
        </View>

        {/* Full-bleed hairline: separates masthead from body */}
        <View style={{ height: 0.5, backgroundColor: ios.separator }} />

        {/* ── Hero: SVG visual + today's golden line (Phase C.2) ─── */}
        <FateHomeHero
          dayKey={fateHeaderDayKey}
          dayLabel={todayHeader.dayLabel}
          jieqi={todayHeader.jieqi}
          lunarPhase={todayPhase}
          goldenLine={
            signalQuery.data?.content.goldenLine ??
            (signalQuery.isLoading ? t('fate_today_golden_line_pending') : null)
          }
          goldenLineLabel={t('fate_today_golden_line')}
          isLoading={signalQuery.isLoading}
          ios={ios}
        />

        {/* Hairline divider: hero ↑ / dense card ↓ */}
        <View style={{ height: 0.5, backgroundColor: ios.separator, marginHorizontal: 24 }} />

        {/* ── Daily Signal (existing dense card, below the fold) ──── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 6 }}>
          <Text
            style={{
              color: ios.secondary,
              fontSize: 11,
              fontWeight: '300',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            {t(FATE_HERO_SECTION_LABEL)}
          </Text>
        </View>
        <Animated.View style={{ opacity: signalCardOpacity }}>
          <DailySignalCard
            signal={signalQuery.data}
            isLoading={signalQuery.isLoading}
            isError={signalQuery.isError}
            hasChart={!!user?.dayMasterStem}
            isPro={isPro}
            onSetupChart={() => router.push('/(tabs)/you' as never)}
            onRetry={() => signalQuery.refetch()}
            onUpgrade={showPaywallModal}
          />
        </Animated.View>

        {showPrimer ? (
          <WelcomePrimer
            name={user?.name ?? null}
            onDismiss={() => {
              markWelcomePrimerSeen()
              setShowPrimer(false)
            }}
          />
        ) : null}

        {/* ── Ask CTA: inset card (hero above stays borderless) ─ */}
        <FateHomeInsetCard marginTop={32}>
          <FateActionDeck
            isPro={isPro}
            onAsk={() => router.push('/(tabs)/report?from=fate' as never)}
            proQuota={proQuota}
          />
        </FateHomeInsetCard>

        <ReportDigestStrip />

        <DiscoverSatellitesSection />

        <FateRecentStrip userId={userId} />

        {/* <FateHomeQuietFoot /> */}
      </ScrollView>

      {guard ? (
        <GuardBlockModal visible={!!guard} guardKey={guard.guardKey} onDismiss={dismissGuard} />
      ) : null}
      {authGateElement}
    </SafeAreaView>
  )
}
