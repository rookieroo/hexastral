/**
 * /timeline — 人生时间线 (ADR-0020, 2026-06 git-graph redesign).
 *
 * The life is drawn as a git graph (see components/TimelineGraph): the natal
 * 命局 is the SOURCE, each 大运 is a 10-year branch off the through-line of self,
 * the 大运 you're living is the checked-out HEAD branch carrying the 流年 as
 * commits, and 流月 are the finest commits of the current year.
 *
 * Gating is ONE wall, ONE CTA (2026-06 feedback — the old page showed three
 * "unlock" rows). Free sees the SOURCE + the current branch + this year; Pro
 * lights up the whole life. The single unlock CTA sits at the very bottom.
 *
 * ADR-0018 minimalism: no chrome, no bordered "cards". The graph and the app's
 * own type ARE the page. Element colors come from the shared 五行 palette.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { LiuyueStrip, TimelineGraph } from '@/components/TimelineGraph'
import { fetchTimeline, type PersonalFit, type TimelinePayload } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'

function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  return timeIndex * 2
}

/** Default the detail panel to "now": the current 流年, else current 大运, else SOURCE. */
function defaultSelection(payload: TimelinePayload): string {
  const cur = payload.liunian.find((r) => r.isCurrent)
  if (cur) return `liunian-${cur.year}`
  if (payload.currentDayunIndex >= 0) {
    const d = payload.dayun[payload.currentDayunIndex]
    if (d) return `dayun-${d.index}`
  }
  return 'source'
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; payload: TimelinePayload }

export default function TimelineScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(() => {
    setState({ kind: 'loading' })
    getAuspiceBirthInfo()
      .then((info) => {
        if (!info?.gender) {
          setState({ kind: 'no-birth' })
          return
        }
        const birthHour = shichenToHour(info.timeIndex)
        const gender = info.gender === '男' ? 'M' : 'F'
        return fetchTimeline({
          birthDate: info.solarDate,
          birthHour,
          gender,
          locale,
        }).then((payload) => {
          setSelectedId(defaultSelection(payload))
          setState({ kind: 'data', payload })
        })
      })
      .catch((e: unknown) => {
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
  }, [locale])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const canvasWidth = screenWidth - spacing.xl * 2

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing['3xl'] * 2,
          gap: spacing.xl,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '300' }}>
          {t.timelineTitle}
        </Text>

        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : state.kind === 'no-birth' ? (
          <NoBirthCard
            onPress={() => router.push('/me')}
            colors={colors}
            spacing={spacing}
            cta={t.personalEmptyCta}
            body={t.personalEmptyBody}
          />
        ) : state.kind === 'error' ? (
          <Text style={{ color: colors.secondary }}>
            {t.loadFailed}: {state.message}
          </Text>
        ) : (
          <Body
            payload={state.payload}
            isPro={isPro}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onLockedTap={() => setPaywallOpen(true)}
            colors={colors}
            spacing={spacing}
            canvasWidth={canvasWidth}
            t={t}
          />
        )}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}

// ── Body ──────────────────────────────────────────────────────────────────

interface BodyColors {
  text: string
  secondary: string
  dim: string
  accent: string
  accentGhost: string
  separator: string
  bg: string
}
interface BodySpacing {
  sm: number
  md: number
  lg: number
  xl: number
  '3xl': number
}

const FIT_COLOR: Record<PersonalFit, string> = { 吉: '#34C759', 平: '#8E8E93', 凶: '#FF453A' }

function Body({
  payload,
  isPro,
  selectedId,
  onSelect,
  onLockedTap,
  colors,
  spacing,
  canvasWidth,
  t,
}: {
  payload: TimelinePayload
  isPro: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onLockedTap: () => void
  colors: BodyColors
  spacing: BodySpacing
  canvasWidth: number
  t: ReturnType<typeof useStrings>['t']
}) {
  // Resolve the selected node → a 对你而言 verdict + advice line (no card chrome).
  const detail = useMemo(() => {
    if (!selectedId) return null
    if (selectedId === 'source') {
      return {
        heading: `${payload.pillars.day.stem}${payload.pillars.day.branch} · ${t.baziDayMaster}`,
        fit: null as PersonalFit | null,
        body: t.personal.birthHint,
      }
    }
    if (selectedId.startsWith('dayun-')) {
      const idx = Number(selectedId.slice('dayun-'.length))
      const row = payload.dayun.find((d) => d.index === idx)
      if (!row) return null
      const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
      return {
        heading: `${row.pillar.stem}${row.pillar.branch} · ${row.startAge}–${row.endAge} · ${t.personal.fit[row.fit]}`,
        fit: row.fit,
        body: `${t.timelineAdvice[row.fit]}${clash}`,
      }
    }
    const year = Number(selectedId.slice('liunian-'.length))
    const row = payload.liunian.find((r) => r.year === year)
    if (!row) return null
    const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
    return {
      heading: `${row.year} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`,
      fit: row.fit,
      body: `${t.timelineAdvice[row.fit]}${clash}`,
    }
  }, [selectedId, payload, t])

  return (
    <View style={{ gap: spacing.xl }}>
      {!isPro ? (
        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
          {t.timelineFreePreviewNote}
        </Text>
      ) : null}

      {/* Selected-node reading — the "近期" guidance. A single fit-colored rule,
          no background card (2026-06 design feedback). */}
      {detail ? (
        <View
          style={{
            borderLeftWidth: 2.5,
            borderLeftColor: detail.fit ? FIT_COLOR[detail.fit] : colors.separator,
            paddingLeft: spacing.lg,
            gap: 5,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
            {detail.heading}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
            {detail.body}
          </Text>
        </View>
      ) : null}

      {/* The life as a git graph. */}
      <TimelineGraph
        payload={payload}
        isPro={isPro}
        selectedId={selectedId}
        onSelect={onSelect}
        onLockedTap={onLockedTap}
        colors={colors}
        width={canvasWidth}
      />

      {/* 流月 — the finest commits of the current year. */}
      {payload.liuyue.length > 0 ? (
        <LiuyueStrip
          liuyue={payload.liuyue}
          isPro={isPro}
          colors={colors}
          label={t.timelineLiuyue}
        />
      ) : null}

      {/* ONE unlock — the only paywall on the page. */}
      {!isPro ? (
        <Pressable
          onPress={onLockedTap}
          accessibilityRole='button'
          accessibilityLabel={t.timelineProLocked}
          style={({ pressed }) => ({
            marginTop: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>
            {t.timelineProLocked}
          </Text>
          <ChevronRightIcon size={16} color={colors.accent} strokeWidth={1.4} />
        </Pressable>
      ) : null}
    </View>
  )
}

function NoBirthCard({
  onPress,
  colors,
  spacing,
  cta,
  body,
}: {
  onPress: () => void
  colors: BodyColors
  spacing: BodySpacing
  cta: string
  body: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={cta}
      style={({ pressed }) => ({
        borderLeftWidth: 2.5,
        borderLeftColor: colors.accent,
        paddingLeft: spacing.lg,
        gap: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>{body}</Text>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
        {cta}
      </Text>
    </Pressable>
  )
}
