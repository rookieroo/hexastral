/**
 * ReadingReport — paper-surface 合参命书 content.
 *
 * Pure content + logic: chart compute, chapter fetch (LLM-or-template), and
 * premium-chapter gating. Rendered by ReadingOverlay (in-place bloom over the
 * live home) — the ink mask + bloom + swipe-back live there, not here.
 */

import type { WuXing } from '@zhop/astro-core'
import { BackArrowIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import {
  emitCrossAppDiscoveryTap,
  emitFirstReadingCompletedOnce,
  emitFirstReadingStartedOnce,
  fetchPendingChapterUnlockInvites,
  fetchReportManifest,
  getPortfolioUserId,
  type PendingChapterUnlockInvite,
  type ReportManifest,
  usePushPrime,
} from '@zhop/satellite-runtime'
import {
  buildFlagshipDeepLink,
  defaultFlagshipUpsellLabels,
  flagshipAppStoreUrl,
  SatelliteFlagshipUpsellCard,
} from '@zhop/satellite-ui'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { setEntitlement, useEntitlement } from '@/lib/entitlement'
import {
  dayMasterLabel,
  elementLabel,
  type StringKey,
  shichenLabel,
  strengthLabel,
  useI18n,
} from '@/lib/i18n'
import { computeFateNatalChart } from '@/lib/natal'
import { analyzeDayunRelation, computeDayunChain, parseBirthInput } from '@/lib/reading'
import {
  type CachedChapter,
  computeChartHash,
  fetchChapter,
  getCachedChapter,
} from '@/lib/reading-cache'
import { markReadingViewed } from '@/lib/reading-mark'
import { useBirthDraft } from '@/lib/use-birth-draft'
import { computeZiweiChart } from '@/lib/ziwei'
import { EmailBindSheet } from './EmailBindSheet'
import { InviteUnlockSheet } from './InviteUnlockSheet'
import { SignInPromptSheet } from './SignInPromptSheet'

/* ── palette ── */
const P = {
  paper: '#EAE3D2',
  ink: '#2a241a',
  inkSoft: '#5b5142',
  bronze: '#9b7d3e',
  muted: '#857a66',
  cinnabar: '#9B2226',
  hair: 'rgba(42,36,26,0.14)',
  hairSoft: 'rgba(42,36,26,0.07)',
  ctaText: '#f4ecdc',
} as const

const LOCKED_CHAPTERS = [
  {
    sub: 'CAREER',
    labelKey: 'reading.lcCareerLabel',
    descKey: 'reading.lcCareerDesc',
    detailKey: 'reading.lcCareerDetail',
  },
  {
    sub: 'RELATIONSHIPS',
    labelKey: 'reading.lcRelLabel',
    descKey: 'reading.lcRelDesc',
    detailKey: 'reading.lcRelDetail',
  },
  {
    sub: 'HIDDEN TENSIONS',
    labelKey: 'reading.lcHiddenLabel',
    descKey: 'reading.lcHiddenDesc',
    detailKey: 'reading.lcHiddenDetail',
  },
  {
    sub: 'ACTION PLAN',
    labelKey: 'reading.lcActionLabel',
    descKey: 'reading.lcActionDesc',
    detailKey: 'reading.lcActionDetail',
  },
] as const satisfies ReadonlyArray<{
  sub: string
  labelKey: StringKey
  descKey: StringKey
  detailKey: StringKey
}>

/** Targets the chapter detail view — null = list view. */
export type ChapterRef =
  | { kind: 'free'; key: 'ch1' | 'ch4' }
  | { kind: 'locked'; idx: 0 | 1 | 2 | 3 }

export interface ReadingReportProps {
  /** Lifted to ReadingOverlay so swipe-back can pop detail before closing. */
  activeChapter: ChapterRef | null
  setActiveChapter: (next: ChapterRef | null) => void
}

export function ReadingReport({ activeChapter, setActiveChapter }: ReadingReportProps) {
  const state = useBirthDraft()
  const { entitlement, refresh: refreshEntitlement } = useEntitlement()
  const { t, locale } = useI18n()

  // Paper wants dark status-bar glyphs; revert to light when this unmounts (the
  // home is the only dark surface left after the overlay closes).
  useEffect(() => {
    setStatusBarStyle('dark')
    return () => setStatusBarStyle('light')
  }, [])

  /* ── chart ── */
  const chart = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeFateNatalChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const ziwei = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeZiweiChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch {
      return null
    }
  }, [state])

  const dayunInfo = useMemo(() => {
    if (!chart || state.status !== 'ready') return null
    try {
      const bd = parseBirthInput(state.draft.solarDate, state.draft.timeIndex ?? 0)
      const { steps, currentVisibleIndex } = computeDayunChain(bd, state.draft.gender)
      const active = steps[currentVisibleIndex] ?? steps[0]
      const relation = active ? analyzeDayunRelation(active, chart.dayMaster) : null
      return { active, relation }
    } catch {
      return null
    }
  }, [chart, state])

  /* ── unlock state from server manifest ── */
  // Drives the "X / Y chapters unlocked" affordance + decides which sheet to
  // open when the user taps Unlock. Tracked together with signed-in state +
  // pending invites; all three drive the unlock gate decision.
  const [manifest, setManifest] = useState<ReportManifest | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingChapterUnlockInvite[]>([])
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const refreshManifest = useCallback(async () => {
    const id = await getPortfolioUserId()
    setSignedIn(!!id)
    // Manifest + pending invites refresh together so the "X / Y" counter and
    // the "waiting on …" strip stay in sync after any sheet flow completes.
    const [fresh, invites] = await Promise.all([
      fetchReportManifest(),
      fetchPendingChapterUnlockInvites(),
    ])
    if (fresh) setManifest(fresh)
    setPendingInvites(invites)
  }, [])
  useEffect(() => {
    void refreshManifest()
  }, [refreshManifest])

  const [signInSheetOpen, setSignInSheetOpen] = useState(false)
  const [bindSheetOpen, setBindSheetOpen] = useState(false)
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false)
  // After sign-in or email-bind succeeds, advance to the next step the user
  // was originally trying to reach. Cleared once that step opens.
  const [pendingPostAuthStep, setPendingPostAuthStep] = useState<'bind' | 'invite' | null>(null)

  /* ── LLM cache + fetch ── */
  const [ch1, setCh1] = useState<CachedChapter | null>(null)
  const [ch4, setCh4] = useState<CachedChapter | null>(null)
  const [loading, setLoading] = useState(true)

  const chartHash = useMemo(() => {
    if (state.status !== 'ready') return ''
    return computeChartHash(state.draft.solarDate, state.draft.timeIndex ?? 0, state.draft.gender)
  }, [state])

  const draftSolarDate = state.status === 'ready' ? state.draft.solarDate : null
  const draftTimeIndex = state.status === 'ready' ? (state.draft.timeIndex ?? 0) : null
  const draftGender = state.status === 'ready' ? state.draft.gender : null

  useEffect(() => {
    if (!chartHash || draftSolarDate == null || draftGender == null) return
    let cancelled = false
    const birth = { solarDate: draftSolarDate, timeIndex: draftTimeIndex ?? 0, gender: draftGender }
    async function load() {
      // P0-8: emit first_reading_started exactly once per install. Fire-
      // and-forget — never blocks the reading load.
      void emitFirstReadingStartedOnce({ app: 'fate', readingKind: 'natal' })
      // Both ch1 + ch4 are inside the default unlock window (position 1 + 2 in
      // CHAPTER_UNLOCK_ORDER), so fetch both from the server. Cached hit short-
      // circuits the network call.
      const [cached1, cached4] = await Promise.all([
        getCachedChapter('ch1_personality', chartHash),
        getCachedChapter('ch4_timeline', chartHash),
      ])
      if (cancelled) return
      const ch1Promise: Promise<CachedChapter | null> = cached1
        ? Promise.resolve(cached1)
        : fetchChapter('ch1_personality', chartHash, birth)
      const ch4Promise: Promise<CachedChapter | null> = cached4
        ? Promise.resolve(cached4)
        : fetchChapter('ch4_timeline', chartHash, birth)
      const [fresh1, fresh4] = await Promise.all([ch1Promise, ch4Promise])
      if (cancelled) return
      setCh1(fresh1)
      setCh4(fresh4)
      setLoading(false)
      // P0-8: emit first_reading_completed once both chapters returned non-
      // null. We only consider it "completed" when content arrived (not when
      // the cache miss returned null and we await regen) — that matches
      // user intent of "I actually saw my reading."
      if (fresh1 && fresh4) {
        void emitFirstReadingCompletedOnce({ app: 'fate', readingKind: 'natal' })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [chartHash, draftSolarDate, draftTimeIndex, draftGender])

  // Mark viewed on mount — gates the Me-tab birth-edit lockout.
  useEffect(() => {
    if (state.status === 'ready') void markReadingViewed()
  }, [state.status])

  // P1-12 — Push permission prime. Apple guidance: ask AFTER value, not on
  // launch. Trigger once both chapters arrived and the loading spinner
  // cleared — that's the "user actually saw their reading" moment. The
  // hook self-gates via AsyncStorage so re-renders / re-mounts don't
  // re-prompt; matrix-wide reconcile is wired in _layout.
  usePushPrime({
    app: 'fate',
    shouldPrime: !loading && ch1 != null && ch4 != null,
  })

  const handleUnlock = useCallback(async () => {
    if (__DEV__) {
      // Dev shortcut: toggle local entitlement so the chapter detail view +
      // locked-card rendering can be QA'd without touching invites.
      await setEntitlement('paid')
      await refreshEntitlement()
      return
    }
    // Production gate is three-tiered:
    //   1. !signedIn → SignInPromptSheet (Apple/Google). On success, chain to
    //      the next step the user originally wanted.
    //   2. signedIn + !hasEmail → EmailBindSheet. On success, chain to invite.
    //   3. signedIn + hasEmail → InviteUnlockSheet directly.
    if (!manifest || signedIn === null) {
      await refreshManifest()
    }
    if (signedIn === false) {
      setPendingPostAuthStep('invite')
      setSignInSheetOpen(true)
      return
    }
    const hasEmail = manifest?.hasEmail ?? false
    if (!hasEmail) {
      setBindSheetOpen(true)
    } else {
      setInviteSheetOpen(true)
    }
  }, [manifest, refreshEntitlement, refreshManifest, signedIn])

  // After sign-in succeeds: refresh manifest (signedIn flips true, hasEmail
  // may already be true if the auth provider exposed an email), then advance
  // to the originally-intended step.
  const onSignedIn = useCallback(async () => {
    setSignInSheetOpen(false)
    await refreshManifest()
    if (pendingPostAuthStep === 'invite' || pendingPostAuthStep === 'bind') {
      // Re-check hasEmail after sign-in; some providers (Apple/Google) hand us
      // an email automatically, in which case we can skip straight to invite.
      const fresh = await fetchReportManifest()
      if (fresh?.hasEmail) {
        setInviteSheetOpen(true)
      } else {
        setBindSheetOpen(true)
      }
    }
    setPendingPostAuthStep(null)
  }, [pendingPostAuthStep, refreshManifest])

  // After email bind completes: refresh manifest (hasEmail flips + any pending
  // invites targeting this address just credited THIS user as the redeemer-of-
  // own-receipts), then open the invite sheet so the user keeps their forward
  // momentum.
  const onEmailBound = useCallback(
    async (result: { email: string; claimedChapterInvites: number }) => {
      setBindSheetOpen(false)
      await refreshManifest()
      if (result.claimedChapterInvites > 0) {
        Alert.alert(
          t('email.bindTitle'),
          t('email.bindSuccess', { n: result.claimedChapterInvites })
        )
      }
      setInviteSheetOpen(true)
    },
    [refreshManifest, t]
  )

  // Inviter sent — refetch manifest so the "pending" surface (future UI) can
  // show; the actual unlock fires when the target binds their email and the
  // server cron / next manifest fetch picks up the increment.
  const onInviteSent = useCallback(async () => {
    await refreshManifest()
  }, [refreshManifest])

  // Cache the last-seen activeChapter so the detail Animated.View can keep
  // showing correct content while its `exiting` animation plays.
  const lastActiveRef = useRef<ChapterRef | null>(null)
  if (activeChapter) lastActiveRef.current = activeChapter

  /* ── empty guard ── */
  if (state.status !== 'ready' || !chart) {
    return (
      <View style={S.paper}>
        <SafeAreaView edges={['top']}>
          <View style={S.header}>
            <Text style={S.headerTitle}>{t('reading.title')}</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  /* ── display ── */
  const ziweiMing = ziwei?.palaces.find((p) => p.name === '命宫')
  const ziweiLabel = ziweiMing?.majorStars.map((s) => s.name).join(' ') ?? ''
  const birthBadge = `${state.draft.solarDate} · ${
    state.draft.timeIndex != null
      ? shichenLabel(state.draft.timeIndex, locale)
      : t('birth.timeUnknown')
  }`

  const identityLine =
    `${dayMasterLabel(chart.dayMaster, chart.dayMasterWuXing as WuXing, locale)} · ${chart.geju.primary} · ${t('label.self', { s: strengthLabel(chart.geju.dayMasterStrength, locale) })}` +
    (ziweiLabel ? ` · ${t('label.soulPalaceInline', { stars: ziweiLabel })}` : '')

  /* ── chapter metadata: gathered once so the detail view + list both consume
     the same source of truth (label, sub, content, placeholder). */
  const ch1Meta = {
    label: t('reading.ch1Label'),
    sub: 'PERSONALITY',
    content: ch1?.content ?? null,
    loading: loading && !ch1,
    placeholder: t('reading.ch1Placeholder', {
      stem: chart.dayMaster,
      el: elementLabel(chart.dayMasterWuXing as WuXing, locale),
      geju: chart.geju.primary,
      soul: ziweiLabel ? t('reading.soulPalaceClause', { stars: ziweiLabel }) : '',
    }),
  }
  const ch4Meta = {
    label: t('reading.ch4Label'),
    sub: 'CURRENT PERIOD',
    content: ch4?.content ?? null,
    loading: loading && !ch4,
    placeholder: dayunInfo?.active
      ? t('reading.ch4Placeholder', {
          dayun: t('reading.dayunActive', {
            gz: `${dayunInfo.active.ganZhi.stem}${dayunInfo.active.ganZhi.branch}`,
            start: dayunInfo.active.startAge,
            end: dayunInfo.active.endAge,
          }),
          rel: dayunInfo.relation ? ` · ${dayunInfo.relation.label}` : '',
        })
      : t('reading.genAnalysis'),
  }

  /* ── detail view props (rendered as a slide-in overlay at the bottom of
     the return tree, NOT an early return — that way the list stays mounted
     behind and the entering/exiting animations feel like a page push). */
  const detailChapter = activeChapter ?? lastActiveRef.current
  let detailProps: React.ComponentProps<typeof ChapterDetail> | null = null
  if (detailChapter) {
    const back = () => setActiveChapter(null)
    if (detailChapter.kind === 'free') {
      const m = detailChapter.key === 'ch1' ? ch1Meta : ch4Meta
      detailProps = {
        label: m.label,
        sub: m.sub,
        content: m.content,
        loading: m.loading,
        placeholder: m.placeholder,
        locked: false,
        unlockLabel: t('reading.unlock'),
        backLabel: t('common.back'),
        onBack: back,
        onUnlock: handleUnlock,
        // Identity context grounds the detail in THIS chart so it doesn't
        // read like a generic article. Locked chapters skip this since their
        // body is a preview, not a personalised reading.
        identityLine,
        birthBadge,
      }
    } else {
      const lc = LOCKED_CHAPTERS[detailChapter.idx]
      if (lc) {
        detailProps = {
          label: t(lc.labelKey),
          sub: lc.sub,
          content: null,
          loading: false,
          // Drill-in copy is intentionally longer than the list-card teaser —
          // gives the locked chapter substance even before unlock.
          placeholder: t(lc.detailKey),
          locked: entitlement !== 'paid',
          unlockLabel: t('reading.unlock'),
          backLabel: t('common.back'),
          onBack: back,
          onUnlock: handleUnlock,
        }
      }
    }
  }

  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.header}>
          <Text style={S.headerTitle}>{t('reading.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          {/* identity header */}
          <Text style={S.identity}>{identityLine}</Text>
          <Text style={S.birth}>{birthBadge}</Text>
          {state.draft.timeIndex == null ? (
            <Text style={S.caveat}>{t('reading.timeUnknownEst')}</Text>
          ) : null}

          {/* ch1: personality — summary only; tap drills into ChapterDetail */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch1' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  label={ch1Meta.label}
                  sub={ch1Meta.sub}
                  summary={ch1Meta.content ?? ch1Meta.placeholder}
                  loading={ch1Meta.loading}
                  showAffordance
                />
              </View>
            )}
          </Pressable>

          {/* ch4: current period (大運 — luck pillar phase) */}
          <Pressable onPress={() => setActiveChapter({ kind: 'free', key: 'ch4' })}>
            {({ pressed }) => (
              <View style={pressed ? S.chapterPressed : undefined}>
                <Chapter
                  label={ch4Meta.label}
                  sub={ch4Meta.sub}
                  summary={ch4Meta.content ?? ch4Meta.placeholder}
                  loading={ch4Meta.loading}
                  showAffordance
                />
              </View>
            )}
          </Pressable>

          {/* ── pending invites strip ── */}
          {pendingInvites.length > 0 ? (
            <View style={S.pendingStrip}>
              <Text style={S.pendingHeader}>{t('invite.pendingHeader')}</Text>
              {pendingInvites.map((inv) => (
                <Text key={inv.id} style={S.pendingRow}>
                  {t('invite.pendingRow', {
                    email: inv.targetEmail,
                    expires: formatPendingExpiry(inv.expiresAt),
                  })}
                </Text>
              ))}
            </View>
          ) : null}

          {/* ── premium chapters ── */}
          <View style={S.lockedDivider}>
            <View style={S.dividerLine} />
            <Text style={S.dividerLabel}>
              {t('reading.moreChapters')}
              {manifest
                ? `  ·  ${manifest.unlockedChapterCount} / ${manifest.chapterUnlockCap}`
                : ''}
            </Text>
            <View style={S.dividerLine} />
          </View>

          {/*
           * Per-card accessibility:
           *   - Pro user (entitlement === 'paid') unlocks all.
           *   - Otherwise card index i unlocks when manifest.unlockedChapterCount
           *     reaches i + 3 (since positions 1+2 are ch1 + ch4 above).
           * Locked cards keep the dim teaser + chevron; accessible cards
           * render as full Chapter cards (showAffordance for drill-in).
           */}
          {LOCKED_CHAPTERS.map((ch, i) => {
            const idx = i as 0 | 1 | 2 | 3
            const requiredCount = i + 3
            const isAccessible =
              entitlement === 'paid' || (manifest?.unlockedChapterCount ?? 0) >= requiredCount
            return isAccessible ? (
              <Pressable key={ch.sub} onPress={() => setActiveChapter({ kind: 'locked', idx })}>
                {({ pressed }) => (
                  <View style={pressed ? S.chapterPressed : undefined}>
                    <Chapter
                      label={t(ch.labelKey)}
                      sub={ch.sub}
                      summary={t(ch.descKey)}
                      loading={false}
                      showAffordance
                    />
                  </View>
                )}
              </Pressable>
            ) : (
              <Pressable
                key={ch.sub}
                onPress={() => setActiveChapter({ kind: 'locked', idx })}
                style={({ pressed }) => [
                  S.lockedCard,
                  { opacity: (0.5 - i * 0.06) * (pressed ? 0.7 : 1) },
                ]}
              >
                <View style={S.lockedHead}>
                  <Text style={S.lockedLabel}>{t(ch.labelKey)}</Text>
                  <Text style={S.lockedSub}>{ch.sub}</Text>
                  <View style={S.lockedChevron}>
                    <ChevronRightIcon size={14} color={P.muted} strokeWidth={1.4} />
                  </View>
                </View>
                <Text style={S.lockedDesc} numberOfLines={2}>
                  {t(ch.descKey)}
                </Text>
                <Text style={S.lockedHint}>{t('invite.lockedCardHint')}</Text>
              </Pressable>
            )
          })}

          {/* CTA stays visible while ANY card is still locked. Hidden once the
              user has unlocked everything via Pro or 4 successful invites. */}
          {entitlement !== 'paid' &&
          (manifest?.unlockedChapterCount ?? 0) < (manifest?.chapterUnlockCap ?? 6) ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, pressed && { opacity: 0.85 }]}
              onPress={handleUnlock}
            >
              <Text style={S.unlockText}>{t('reading.unlock')}</Text>
            </Pressable>
          ) : null}

          {/* P1-16 — Ecosystem upsell to flagship subscription.
              fate is a Tier-3 funnel app; its core KPI is converting users
              to cycle/yuan subscription flagships. Place at the end of the
              reading (after engagement, not interrupting it). Default to
              cycle since the daily-almanac return engine is the highest-
              retention upsell for a single-chart reader. Tap fires
              `cross_app_discovery_tap` so the funnel conversion
              (fate-reading → cycle-install → cycle-subscription) is
              measurable end-to-end via the events from P0-8. */}
          <View style={S.upsellSlot}>
            <SatelliteFlagshipUpsellCard
              suggestedFlagship='auspice'
              labelsByFlagship={defaultFlagshipUpsellLabels(locale)}
              deepLink={buildFlagshipDeepLink({
                flagship: 'auspice',
                fromSlug: 'fate',
                signal: null,
              })}
              appStoreUrl={flagshipAppStoreUrl('auspice')}
              onUpgrade={(flagship) => {
                void emitCrossAppDiscoveryTap({
                  storagePrefix: 'pf_fate',
                  sourceApp: 'fate',
                  targetApp: flagship,
                  action: 'tap',
                  via: 'reading_report_end',
                })
              }}
            />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Detail overlay — slides in from right when a chapter is tapped,
          slides out on back. List stays mounted behind for a true page-push
          feel (no flash of empty paper between transitions). */}
      {activeChapter && detailProps ? (
        <Animated.View
          entering={SlideInRight.duration(280)}
          exiting={SlideOutRight.duration(240)}
          style={S.detailOverlay}
        >
          <ChapterDetail {...detailProps} />
        </Animated.View>
      ) : null}

      {/* Unlock flow sheets — mounted at root so they overlay the paper. */}
      <SignInPromptSheet
        visible={signInSheetOpen}
        onClose={() => {
          setSignInSheetOpen(false)
          setPendingPostAuthStep(null)
        }}
        onAuthed={onSignedIn}
      />
      <EmailBindSheet
        visible={bindSheetOpen}
        onClose={() => setBindSheetOpen(false)}
        onSuccess={onEmailBound}
      />
      <InviteUnlockSheet
        visible={inviteSheetOpen}
        onClose={() => setInviteSheetOpen(false)}
        onSent={(email) => {
          void onInviteSent()
          // Keep the sheet open in its 'sent' state so the user can confirm —
          // user dismisses manually via the catcher or the cancel button.
          void email
        }}
      />
    </View>
  )
}

/**
 * Pending-invite expiry → short "Jan 12" style. Keeps it locale-agnostic at
 * the data level; the surrounding i18n string carries the framing words.
 */
function formatPendingExpiry(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

/* ── Chapter (list-card) ───────────────────────────────────────────── */

/**
 * Compact preview row — label / sub / 1-2 line summary / chevron. Full LLM
 * content lives in `<ChapterDetail>` (二级页面). This keeps the list scannable
 * so user can browse the TOC without scrolling past long bodies.
 */
function Chapter({
  label,
  sub,
  summary,
  loading,
  showAffordance,
}: {
  label: string
  sub: string
  /** One-paragraph preview; truncated to 2 lines via numberOfLines. */
  summary: string | null
  loading: boolean
  /** When true, renders a chevron-right hinting the card opens a detail view. */
  showAffordance?: boolean
}) {
  return (
    <View style={S.chapter}>
      <View style={S.chapterHead}>
        <Text style={S.chapterLabel}>{label}</Text>
        <Text style={S.chapterSub}>{sub}</Text>
        {showAffordance ? (
          <View style={S.chapterChevron}>
            <ChevronRightIcon size={14} color={P.muted} strokeWidth={1.4} />
          </View>
        ) : null}
      </View>
      {loading && !summary ? (
        <View style={S.skeleton}>
          <View style={S.skelLine} />
          <View style={[S.skelLine, { width: '70%' }]} />
        </View>
      ) : summary ? (
        <Text style={S.chapterSummary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
    </View>
  )
}

/* ── ChapterDetail (single-chapter focused view) ───────────────────── */

function ChapterDetail({
  label,
  sub,
  content,
  loading,
  placeholder,
  locked,
  unlockLabel,
  backLabel,
  onBack,
  onUnlock,
  identityLine,
  birthBadge,
}: {
  label: string
  sub: string
  content: string | null
  loading: boolean
  placeholder?: string
  locked: boolean
  unlockLabel: string
  backLabel: string
  onBack: () => void
  onUnlock: () => void
  /** Optional chart fingerprint shown above the chapter title (free only). */
  identityLine?: string
  birthBadge?: string
}) {
  return (
    <View style={S.paper}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.detailHeader}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityLabel={backLabel}
            style={({ pressed }) => [S.backBtn, pressed && { opacity: 0.6 }]}
          >
            <BackArrowIcon size={20} color={P.inkSoft} strokeWidth={1.5} />
          </Pressable>
          <Text style={S.detailHeaderSub}>{sub}</Text>
          <View style={S.backBtn} />
        </View>
        <ScrollView contentContainerStyle={S.detailScroll} showsVerticalScrollIndicator={false}>
          {identityLine ? (
            <View style={S.detailIdentity}>
              <Text style={S.detailIdentityLine}>{identityLine}</Text>
              {birthBadge ? <Text style={S.detailBirth}>{birthBadge}</Text> : null}
            </View>
          ) : null}
          <Text style={S.detailLabel}>{label}</Text>
          {content ? (
            <Text style={S.detailBody}>{content}</Text>
          ) : loading ? (
            <View style={S.skeleton}>
              <View style={S.skelLine} />
              <View style={[S.skelLine, { width: '85%' }]} />
              <View style={[S.skelLine, { width: '70%' }]} />
              <View style={[S.skelLine, { width: '90%' }]} />
              <View style={[S.skelLine, { width: '60%' }]} />
            </View>
          ) : placeholder ? (
            <Text style={S.detailPlaceholder}>{placeholder}</Text>
          ) : null}

          {locked ? (
            <Pressable
              style={({ pressed }) => [S.unlockBtn, S.detailUnlock, pressed && { opacity: 0.85 }]}
              onPress={onUnlock}
            >
              <Text style={S.unlockText}>{unlockLabel}</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

/* ── styles ────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  paper: { flex: 1, backgroundColor: P.paper },
  safe: { flex: 1 },
  // P1-16 — Ecosystem upsell card breathing room. Sits after unlock CTA
  // but before final bottom padding; subtle spacing so it doesn't feel
  // tacked on but also doesn't compete with the reading content.
  upsellSlot: { marginTop: 28, marginBottom: 4 },
  // Detail page sits above the list with same paper bg + subtle top hairline
  // to hint "this is a new layer". Slide animation comes from reanimated.
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.hair,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { color: P.bronze, fontSize: 11, letterSpacing: 4, fontWeight: '300' },

  scroll: { paddingHorizontal: 24, paddingTop: 12 },

  // identity
  identity: { color: P.inkSoft, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  birth: { color: P.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  caveat: { color: P.muted, fontSize: 10, marginBottom: 4 },

  // chapter
  chapter: { paddingVertical: 24, borderTopWidth: 0.5, borderTopColor: P.hair },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  chapterLabel: { color: P.ink, fontFamily: 'Songti SC', fontSize: 22, letterSpacing: 1 },
  chapterSub: { color: P.bronze, fontSize: 9, letterSpacing: 2.5, fontWeight: '600' },
  chapterChevron: { marginLeft: 'auto', opacity: 0.55 },
  chapterPressed: { opacity: 0.7 },
  chapterBody: { color: P.ink, fontSize: 15, lineHeight: 30, letterSpacing: 0.3 },
  // List-view summary — short preview clamped to 2 lines. Body proper lives
  // in ChapterDetail (二级).
  chapterSummary: { color: P.inkSoft, fontSize: 13, lineHeight: 20, letterSpacing: 0.2 },
  skeleton: { gap: 12 },
  skelLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: P.hairSoft,
    width: '100%',
  },
  placeholder: { color: P.muted, fontSize: 14, lineHeight: 24, fontStyle: 'italic' },

  // pending invites strip
  pendingStrip: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: P.hairSoft,
    borderRadius: 10,
    gap: 4,
  },
  pendingHeader: {
    color: P.bronze,
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingRow: { color: P.muted, fontSize: 12, lineHeight: 18 },

  // locked divider
  lockedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 32,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: P.hair },
  dividerLabel: { color: P.muted, fontSize: 10, letterSpacing: 3, fontWeight: '500' },

  // locked chapters
  lockedCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: P.hairSoft,
    borderRadius: 10,
  },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lockedLabel: { color: P.ink, fontFamily: 'Songti SC', fontSize: 16, letterSpacing: 1 },
  lockedSub: { color: P.bronze, fontSize: 8, letterSpacing: 2, fontWeight: '600' },
  lockedChevron: { marginLeft: 'auto', opacity: 0.55 },
  lockedDesc: { color: P.muted, fontSize: 12, lineHeight: 18 },
  // Explicit "Invite a friend to unlock" microcopy under each locked teaser
  // so the unlock mechanism is discoverable without tapping first.
  lockedHint: {
    color: P.bronze,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
  },

  // unlock
  unlockBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: P.cinnabar,
    borderRadius: 22,
  },
  unlockText: { color: P.ctaText, fontSize: 13, fontWeight: '600', letterSpacing: 3 },

  // detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  detailHeaderSub: { color: P.bronze, fontSize: 10, letterSpacing: 3, fontWeight: '600' },
  detailScroll: { paddingHorizontal: 32, paddingTop: 12 },
  detailIdentity: { marginBottom: 20 },
  detailIdentityLine: {
    color: P.inkSoft,
    fontSize: 12,
    letterSpacing: 1,
    lineHeight: 18,
    marginBottom: 3,
  },
  detailBirth: { color: P.muted, fontSize: 11, letterSpacing: 1 },
  detailLabel: {
    color: P.ink,
    fontFamily: 'Songti SC',
    fontSize: 30,
    letterSpacing: 2,
    marginBottom: 28,
  },
  detailBody: { color: P.ink, fontSize: 17, lineHeight: 32, letterSpacing: 0.3 },
  detailPlaceholder: { color: P.inkSoft, fontSize: 16, lineHeight: 28, fontStyle: 'italic' },
  detailUnlock: { marginTop: 40 },
})
