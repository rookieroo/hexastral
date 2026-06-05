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
import { Share } from 'lucide-react-native'
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
import { SHARE_PALETTE, ShareableCard } from '@/components/ShareableCard'
import { LiuyueStrip, ReadingBubble, TimelineGraph } from '@/components/TimelineGraph'
import { fetchTimeline, type PersonalFit, type TimelinePayload } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import { shareTaglineFor, timelineShareChrome, timelineShareUrl } from '@/lib/share'

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

/**
 * Build the share snapshot — scoped to the CURRENT 大运 + this year's 流年 (we
 * share "by 大运 unit", not the whole 80-year line). Returns null when there's no
 * current 大运 in coverage, so the caller can hide the Share entry.
 */
function buildTimelineSnapshot(
  payload: TimelinePayload,
  t: ReturnType<typeof useStrings>['t']
): Parameters<typeof timelineShareUrl>[0] | null {
  const dayun =
    payload.currentDayunIndex >= 0 ? payload.dayun[payload.currentDayunIndex] : undefined
  if (!dayun) return null
  const liunian = payload.liunian.find((r) => r.isCurrent)
  const source = payload.pillars.day
  return {
    source: `${source.stem}${source.branch}`,
    dayun: `${dayun.pillar.stem}${dayun.pillar.branch}`,
    dayunAges: `${dayun.startAge}–${dayun.endAge}`,
    year: liunian?.year ?? new Date().getFullYear(),
    yearPillar: liunian ? `${liunian.pillar.stem}${liunian.pillar.branch}` : '—',
    fit: dayun.fit,
    advice: t.timelineAdvice[dayun.fit],
  }
}

interface BirthCtx {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; payload: TimelinePayload; birth: BirthCtx }

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
  // Image share: capture the real graph (not a server reconstruction) to a PNG.
  // Pre-warm once data lands — the Skia graph is the slow part of the capture, so
  // baking it ahead of the tap makes Share feel instant.
  const {
    shotRef,
    capturing,
    share: shareImage,
  } = useImageShare({
    prewarm: state.kind === 'data',
    warmKey: state.kind === 'data' ? 'ready' : 'pending',
  })

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
          setState({
            kind: 'data',
            payload,
            birth: { birthDate: info.solarDate, birthHour, gender },
          })
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '300' }}>
            {t.timelineTitle}
          </Text>
          {/* Share the REAL graph as an image (captured on-device → instant, no
              Worker round-trip). Available to all tiers — the captured graph is
              what the user already sees, so it leaks no Pro content. The /s/
              landing URL rides along as the caption (funnel + SEO). */}
          {state.kind === 'data'
            ? (() => {
                const snap = buildTimelineSnapshot(state.payload, t)
                if (!snap) return null
                return (
                  <Pressable
                    onPress={() =>
                      shareImage(`${shareTaglineFor(locale)}\n${timelineShareUrl(snap, locale)}`)
                    }
                    hitSlop={12}
                    accessibilityRole='button'
                    accessibilityLabel='Share'
                    style={{ padding: 4 }}
                  >
                    <Share size={20} color={colors.secondary} strokeWidth={1.6} />
                  </Pressable>
                )
              })()
            : null}
        </View>

        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : state.kind === 'no-birth' ? (
          <NoBirthCard
            colors={colors}
            spacing={spacing}
            body={t.personalEmptyBody}
            cta={t.personalEmptyCta}
            onPress={() => router.push('/me')}
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

      {/* Off-screen capture target — mounted only while capturing, then unmounted.
          Renders the real TimelineGraph on a fixed ivory palette so the PNG is
          brand-consistent regardless of the user's theme. */}
      {capturing && state.kind === 'data'
        ? (() => {
            const snap = buildTimelineSnapshot(state.payload, t)
            const chrome = timelineShareChrome(locale)
            return (
              <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents='none'>
                <ShareableCard
                  ref={shotRef}
                  width={screenWidth}
                  locale={locale}
                  eyebrow={chrome.eyebrow}
                  footer={chrome.footer}
                  footerUrl={chrome.url}
                  title={t.timelineTitle}
                  subtitle={
                    snap
                      ? `${snap.source}${locale.startsWith('zh') ? '日' : ''} · ${snap.dayun} ${snap.dayunAges}`
                      : undefined
                  }
                >
                  <TimelineGraph
                    payload={state.payload}
                    isPro={isPro}
                    selectedId={null}
                    onSelect={() => {}}
                    onLockedTap={() => {}}
                    colors={SHARE_PALETTE}
                    width={screenWidth - 48}
                    detail={null}
                  />
                  {/* The live graph pops a reading bubble on tap; the capture has no
                      selection, so bake the CURRENT 大运 reading in directly — a
                      forwarded image is otherwise just dots with no takeaway. */}
                  {snap ? (
                    <ReadingBubble
                      heading={`${snap.dayun} · ${snap.dayunAges} · ${t.personal.fit[snap.fit]}`}
                      body={snap.advice}
                      fit={snap.fit}
                      colors={SHARE_PALETTE}
                    />
                  ) : null}
                </ShareableCard>
              </View>
            )
          })()
        : null}
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
    if (selectedId.startsWith('liuyue-')) {
      const [, y, m] = selectedId.split('-')
      const row = payload.liuyue.find((r) => r.year === Number(y) && r.month === Number(m))
      if (!row) return null
      const clash = row.reasons.includes('personal_clash') ? ` ${t.timelineClashNote}` : ''
      return {
        heading: `${row.year}.${row.month} · ${row.pillar.stem}${row.pillar.branch} · ${t.personal.fit[row.fit]}`,
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

      {/* The life as a git graph — the selected-node reading now pops up anchored
          TO the tapped node (long graphs scrolled the old top panel out of view). */}
      <TimelineGraph
        payload={payload}
        isPro={isPro}
        selectedId={selectedId}
        onSelect={onSelect}
        onLockedTap={onLockedTap}
        colors={colors}
        width={canvasWidth}
        detail={selectedId?.startsWith('liuyue-') ? null : detail}
      />

      {/* 流月 — the finest commits; each is tappable for its own reading. */}
      {payload.liuyue.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <LiuyueStrip
            liuyue={payload.liuyue}
            isPro={isPro}
            colors={colors}
            label={t.timelineLiuyue}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          {selectedId?.startsWith('liuyue-') && detail ? (
            <ReadingBubble
              heading={detail.heading}
              body={detail.body}
              fit={detail.fit}
              colors={colors}
            />
          ) : null}
          {/* Only this year's 流月 is shown by design — full data isn't dumped;
              key-moment reminders are opt-in push (DAU lever). */}
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>
            {t.timelineLiuyueNote}
          </Text>
        </View>
      ) : null}

      {/* make-if 假如 now lives on its own /makeif screen (entered from the Today
          banner) — keeps this page short. */}

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

/** No-birth prompt — a single fit-colored rule that routes to the birth form. */
function NoBirthCard({
  colors,
  spacing,
  body,
  cta,
  onPress,
}: {
  colors: BodyColors
  spacing: BodySpacing
  body: string
  cta: string
  onPress: () => void
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
