/**
 * /makeif — the make-if 假如 sandbox (Phase 4).
 *
 * Its OWN screen (not inline on /timeline, which got too long). Solid git-graph
 * since the whole screen is make-if. Three modes:
 *   - no birth  → teaser graph + "set your birth" (also a birth-funnel nudge).
 *   - Free + birth → locked teaser + unlock → paywall.
 *   - Pro + birth → INTERACTIVE: tap any 大运 node on your real mainline, assume
 *     an event, and a "假如" branch is generated (LLM narrative, cached) and
 *     animates in. Past nodes are reflective ("假如当年"); present/future ones
 *     carry the compliance framing. A one-time disclaimer gates the first fork.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { favoredMove, getFourPillars, getTaoHua, getYiMa } from '@zhop/astro-core'
import { Button, useTheme } from '@zhop/core-ui'
import { BackArrowIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useFocusEffect, useRouter } from 'expo-router'
import { Share2, Trash2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { MakeIfGraph } from '@/components/MakeIfGraph'
import { SHARE_PALETTE, ShareableCard } from '@/components/ShareableCard'
import {
  deleteMakeifFork,
  fetchMakeIfNarratives,
  fetchTimeline,
  listMakeifForks,
  saveMakeifFork,
  type TimelinePayload,
} from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { getAuspiceDeviceId } from '@/lib/device'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import {
  buildInteractiveModel,
  buildUserBranch,
  deriveMakeIfSummary,
  type MakeIfBranch,
  makeIfCopyForLocale,
  makeIfInteractiveCopyForLocale,
  makeIfTeaser,
  relocalizeEventLabel,
} from '@/lib/makeIfBranches'
import { makeifShareChrome, makeifShareUrl, shareMakeifFork, shareTaglineFor } from '@/lib/share'

const ACK_KEY = 'auspice.makeif.disclaimer.v1'
const MAX_FORKS = 4

function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  return timeIndex * 2
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | {
      kind: 'data'
      payload: TimelinePayload
      birth: { birthDate: string; birthHour: number; gender: 'M' | 'F' }
    }

export default function MakeIfScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const isPro = hasEntitlement(useEntitlements(), 'auspice_pro')

  const [state, setState] = useState<ScreenState>({ kind: 'loading' })
  const [paywallOpen, setPaywallOpen] = useState(false)

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
        return fetchTimeline({ birthDate: info.solarDate, birthHour, gender, locale }).then(
          (payload) => {
            setState({
              kind: 'data',
              payload,
              birth: { birthDate: info.solarDate, birthHour, gender },
            })
          }
        )
      })
      .catch((e: unknown) => {
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
  }, [locale])

  useFocusEffect(useCallback(() => load(), [load]))

  const cw = width - spacing.xl * 2

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
          <BackArrowIcon size={22} color={colors.text} strokeWidth={1.6} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '300' }}>
          {makeIfInteractiveCopyForLocale(locale).screenTitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing['3xl'] * 2,
          gap: spacing.lg,
        }}
      >
        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : state.kind === 'error' ? (
          <Text style={{ color: colors.secondary }}>{state.message}</Text>
        ) : state.kind === 'no-birth' ? (
          <Teaser
            colors={colors}
            spacing={spacing}
            width={cw}
            locale={locale}
            ctaLabel={t.personalEmptyCta}
            onCta={() => router.push('/me')}
          />
        ) : isPro ? (
          <Sandbox
            colors={colors}
            spacing={spacing}
            width={cw}
            locale={locale}
            payload={state.payload}
            birth={state.birth}
          />
        ) : (
          <Teaser
            colors={colors}
            spacing={spacing}
            width={cw}
            locale={locale}
            ctaLabel={makeIfInteractiveCopyForLocale(locale).unlockCta}
            onCta={() => setPaywallOpen(true)}
          />
        )}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}

// ── Theme prop shapes ─────────────────────────────────────────────────────────

interface C {
  text: string
  secondary: string
  dim: string
  accent: string
  accentGhost: string
  separator: string
  bg: string
}
interface S {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '3xl': number
}

// ── Teaser (no-birth / Free) ──────────────────────────────────────────────────

function Teaser({
  colors,
  spacing,
  width,
  locale,
  ctaLabel,
  onCta,
}: {
  colors: C
  spacing: S
  width: number
  locale: string
  ctaLabel: string
  onCta: () => void
}) {
  const copy = makeIfCopyForLocale(locale)
  const ic = makeIfInteractiveCopyForLocale(locale)
  const model = useMemo(() => makeIfTeaser(copy), [copy])
  const [sel, setSel] = useState<string | null>(null)
  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}>{ic.unlockBody}</Text>
      <MakeIfGraph
        model={model}
        colors={colors}
        width={width}
        locked={false}
        dashed={false}
        selectedBranchId={sel}
        onSelectBranch={setSel}
        onLockedTap={() => {}}
        nowLabel={copy.nowLabel}
      />
      <Button variant='primary' onPress={onCta}>
        {ctaLabel}
      </Button>
      <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>{ic.footer}</Text>
    </View>
  )
}

// ── Sandbox (Pro + birth) ─────────────────────────────────────────────────────

function Sandbox({
  colors,
  spacing,
  width,
  locale,
  payload,
  birth,
}: {
  colors: C
  spacing: S
  width: number
  locale: string
  payload: TimelinePayload
  birth: { birthDate: string; birthHour: number; gender: 'M' | 'F' }
}) {
  const { t } = useStrings()
  const ic = makeIfInteractiveCopyForLocale(locale)
  const currentAge = useMemo(() => payload.liunian.find((r) => r.isCurrent)?.age ?? null, [payload])

  // Decision-timing verdict (B): what KIND of move the user's CURRENT 命局 window
  // favors — the chart's read on a real decision they're weighing now. Built on
  // the current 流年's signals (server reasons + 桃花/驿马 from 本命支) + favoredMove.
  const timing = useMemo(() => {
    const cur = payload.liunian.find((r) => r.isCurrent)
    const [y, m, d] = birth.birthDate.split('-').map(Number)
    if (!cur || !y || !m || !d) return null
    const hour = birth.birthHour < 0 ? 12 : birth.birthHour
    const bb = getFourPillars({ year: y, month: m, day: d, hour }).year.branch
    const fm = favoredMove({
      favorsElement: cur.reasons.includes('favorable_element_present'),
      harmsElement: cur.reasons.includes('unfavorable_element_present'),
      clashesBenming: cur.reasons.includes('personal_clash'),
      taohua: cur.pillar.branch === getTaoHua(bb),
      yima: cur.pillar.branch === getYiMa(bb),
    })
    return {
      label: t.makeifTiming.archetypes[fm.primary],
      reasons: fm.reasons.map((k) => t.yinzheng.signals[k]).join(' · '),
    }
  }, [payload.liunian, birth, t])
  const model = useMemo(
    () =>
      buildInteractiveModel(
        payload.dayun.map((d) => ({
          startAge: d.startAge,
          endAge: d.endAge,
          label: `${d.pillar.stem}${d.pillar.branch}`,
        })),
        currentAge
      ),
    [payload, currentAge]
  )

  const [branches, setBranches] = useState<MakeIfBranch[]>([])
  const [status, setStatus] = useState<Record<string, 'loading' | 'done' | 'error' | 'limited'>>({})
  // The single highlighted/active branch. Tapping a branch (graph or fork row)
  // selects it; the live graph dims the rest and the share features only it.
  const [sel, setSel] = useState<string | null>(null)
  const [forkAge, setForkAge] = useState<number | null>(null)
  const [pendingAge, setPendingAge] = useState<number | null>(null)
  const [acked, setAcked] = useState(false)
  const [customEvent, setCustomEvent] = useState('')
  // Image share: capture the whole 假如 graph (mainline + branches) to a PNG.
  // Pre-warm once there's a fork to share, re-capturing as forks are added, so the
  // Share tap hands off an already-rendered PNG instead of waiting on Skia.
  const {
    shotRef,
    capturing,
    share: shareImage,
  } = useImageShare({
    prewarm: branches.length > 0,
    // Re-warm when a fork is added OR the featured/selected branch changes, so the
    // share always reflects the branch currently highlighted.
    warmKey: `${branches.length}:${sel ?? ''}`,
  })

  useEffect(() => {
    AsyncStorage.getItem(ACK_KEY)
      .then((v) => setAcked(v === '1'))
      .catch(() => {})
  }, [])

  // Stable anonymous device id — scopes the user's persisted forks.
  const [deviceId, setDeviceId] = useState<string | null>(null)
  useEffect(() => {
    getAuspiceDeviceId()
      .then(setDeviceId)
      .catch(() => {})
  }, [])

  // Hydrate saved forks (D1) once the device id is ready, so a returning user sees
  // their branches + narratives instead of an empty sandbox. A fork whose stored
  // locale ≠ the current locale is queued for re-generation — a Pro user who switches
  // language gets their readings re-narrated in the new language (lazy: only on a
  // mismatch). `locale` is a dep so a switch re-loads + re-narrates; the other deps
  // are primitives so a new `birth` ref won't clobber forks created this session.
  const [pendingRegen, setPendingRegen] = useState<MakeIfBranch[]>([])
  useEffect(() => {
    if (!deviceId) return
    let cancelled = false
    listMakeifForks({
      deviceId,
      birthDate: birth.birthDate,
      birthHour: birth.birthHour,
      gender: birth.gender,
    })
      .then((r) => {
        if (cancelled || r.forks.length === 0) return
        const loaded = r.forks.slice(-MAX_FORKS).map((f) => ({
          branch: {
            ...buildUserBranch({
              id: f.id,
              // Re-localize a preset event whose label is frozen in the language it
              // was created in (a custom event stays as typed) — avoids a zh graph
              // showing an English "Marry" branch after a language switch.
              event: relocalizeEventLabel(f.event, locale),
              divergeAtAge: f.divergeAtAge,
              mergeAtAge: f.mergeAtAge,
              endAge: model.endAge,
              isPast: f.isPast,
            }),
            outcome: f.narrative,
            // Summary isn't persisted; derive a takeaway from the stored narrative
            // so hydrated forks still show a 概要 (a re-narrate will overwrite it).
            summary: deriveMakeIfSummary(f.narrative),
          },
          stale: f.locale !== locale,
        }))
        setBranches(loaded.map((x) => x.branch))
        setStatus(
          Object.fromEntries(
            loaded.map((x) => [x.branch.id, x.stale ? 'loading' : 'done'] as const)
          )
        )
        setPendingRegen(loaded.filter((x) => x.stale).map((x) => x.branch))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [deviceId, birth.birthDate, birth.birthHour, birth.gender, model.endAge, locale])

  const combined = useMemo(() => ({ ...model, branches }), [model, branches])

  // The branch the share + selection feature: the explicitly selected one, else
  // the most recent fork (what the user just created).
  const featured = useMemo(
    () => branches.find((b) => b.id === sel) ?? branches.at(-1) ?? null,
    [branches, sel]
  )

  // Fetch (or re-fetch) a fork's narrative, tracking per-fork status so the user
  // always gets feedback (loading / failed-retry / daily-limit), not silence.
  const runFork = useCallback(
    (fork: MakeIfBranch) => {
      setStatus((s) => ({ ...s, [fork.id]: 'loading' }))
      const realDayun = payload.dayun.find(
        (d) => fork.divergeAtAge >= d.startAge && fork.divergeAtAge <= d.endAge
      )
      const realPillar = realDayun
        ? `${realDayun.pillar.stem}${realDayun.pillar.branch}`
        : undefined
      fetchMakeIfNarratives({
        birthDate: birth.birthDate,
        birthHour: birth.birthHour,
        gender: birth.gender,
        locale,
        isPro: true,
        branches: [
          {
            id: fork.id,
            label: fork.label,
            divergeAtAge: fork.divergeAtAge,
            mergeAtAge: fork.mergeAtAge,
            isPast: fork.isPast ?? false,
            realPillar,
          },
        ],
      })
        .then((r) => {
          const narrative = r.narratives[fork.id]
          if (narrative) {
            const summary = r.summaries?.[fork.id] || deriveMakeIfSummary(narrative)
            setBranches((prev) =>
              prev.map((b) => (b.id === fork.id ? { ...b, outcome: narrative, summary } : b))
            )
            setStatus((s) => ({ ...s, [fork.id]: 'done' }))
            // Persist so the fork survives an app restart (D1, device-scoped).
            if (deviceId) {
              saveMakeifFork({
                deviceId,
                birthDate: birth.birthDate,
                birthHour: birth.birthHour,
                gender: birth.gender,
                id: fork.id,
                label: fork.label,
                event: fork.label,
                divergeAtAge: fork.divergeAtAge,
                mergeAtAge: fork.mergeAtAge,
                isPast: fork.isPast ?? false,
                realPillar,
                narrative,
                locale,
              }).catch(() => {})
            }
          } else {
            // No prose: 'template' = the daily LLM allowance is used up; else a
            // generation/parse failure.
            setStatus((s) => ({
              ...s,
              [fork.id]: r.source === 'template' || r.source === 'locked' ? 'limited' : 'error',
            }))
          }
        })
        .catch(() => setStatus((s) => ({ ...s, [fork.id]: 'error' })))
    },
    [birth, locale, payload, deviceId]
  )

  // Re-narrate forks whose stored language ≠ the current locale (queued by the
  // hydrate effect). Deferred to here so `runFork` is in scope; clears after firing.
  useEffect(() => {
    if (pendingRegen.length === 0) return
    for (const f of pendingRegen) runFork(f)
    setPendingRegen([])
  }, [pendingRegen, runFork])

  const onNodeTap = (age: number) => {
    if (!acked) {
      setPendingAge(age)
      return
    }
    setCustomEvent('')
    setForkAge(age)
  }

  const ack = async () => {
    await AsyncStorage.setItem(ACK_KEY, '1').catch(() => {})
    setAcked(true)
    if (pendingAge != null) {
      setForkAge(pendingAge)
      setPendingAge(null)
    }
  }

  const submit = (event: string) => {
    const e = event.trim()
    if (forkAge == null || !e) return
    const age = forkAge
    setForkAge(null)
    const isPast = currentAge != null && age < currentAge
    // Past "假如当年" reflections rejoin the line; present/future forks run on.
    const merge = isPast ? Math.min(model.endAge - 2, age + 14) : null
    const id = `user-${age}-${e}`
    const fork = buildUserBranch({
      id,
      event: e,
      divergeAtAge: age,
      mergeAtAge: merge,
      endAge: model.endAge,
      isPast,
    })
    setBranches((prev) => [...prev.filter((b) => b.id !== id), fork].slice(-MAX_FORKS))
    runFork(fork)
  }

  const deleteFork = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id))
    setStatus((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (deviceId) deleteMakeifFork(id, deviceId).catch(() => {})
  }

  const forkIsPast = forkAge != null && currentAge != null && forkAge < currentAge

  // Caption for the graph image = tagline + the most-recent fork's /s/makeif
  // landing (real content + DDL→App Store CTA). The image itself shows the whole
  // graph; the tap-through lands on one fork's reading.
  const lastFork = branches[branches.length - 1]
  const onShareGraph = () => {
    const url = lastFork?.outcome
      ? makeifShareUrl(
          {
            forkTitle: ic.forkTitle(lastFork.divergeAtAge, !!lastFork.isPast),
            label: lastFork.label,
            outcome: lastFork.outcome,
            summary: lastFork.summary,
          },
          locale
        )
      : 'https://hexastral.com/s/timeline' // graph-only fallback (no narrated fork yet)
    shareImage(`${shareTaglineFor(locale)}\n${url}`)
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ flex: 1, color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
          {ic.tapHint}
        </Text>
        {/* Share the whole 假如 graph as an image (on-device capture → instant). */}
        {branches.length > 0 ? (
          <Pressable
            onPress={onShareGraph}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={ic.share}
            style={{ padding: 4 }}
          >
            <Share2 size={20} color={colors.secondary} strokeWidth={1.6} />
          </Pressable>
        ) : null}
      </View>

      {/* Decision-timing verdict — what the user's CURRENT 命局 window favors, the
          chart's read on a real choice they're weighing now (B). */}
      {timing ? (
        <View
          style={{
            borderWidth: 0.5,
            borderColor: colors.separator,
            borderRadius: 12,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            gap: 4,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            {`${t.makeifTiming.frame} · ${timing.label}`}
          </Text>
          {timing.reasons ? (
            <Text style={{ color: colors.dim, fontSize: 12 }}>{timing.reasons}</Text>
          ) : null}
        </View>
      ) : null}

      <MakeIfGraph
        // Re-mount on each added fork so the new branch animates in.
        key={branches.length}
        model={combined}
        colors={colors}
        width={width}
        locked={false}
        dashed={false}
        animateIn={branches.length > 0}
        // Always keep ONE branch in focus (the latest fork until the user taps
        // another) so the graph reads as "this 假如, highlighted" — never a flat
        // legend of equally-weighted dashes.
        selectedBranchId={sel ?? featured?.id ?? null}
        onSelectBranch={(id) => setSel((cur) => (cur === id ? null : id))}
        onLockedTap={() => {}}
        onMainNodeTap={onNodeTap}
        nowLabel={makeIfCopyForLocale(locale).nowLabel}
      />

      {/* Off-screen capture target — the real graph on a fixed ivory palette. */}
      {capturing ? (
        <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents='none'>
          <ShareableCard
            ref={shotRef}
            width={width}
            locale={locale}
            eyebrow={makeifShareChrome(locale).eyebrow}
            footer={makeifShareChrome(locale).footer}
            footerUrl={makeifShareChrome(locale).url}
            title={ic.screenTitle}
            subtitle={`${payload.pillars.day.stem}${payload.pillars.day.branch}${locale.startsWith('zh') ? '日' : ''}`}
          >
            <MakeIfGraph
              model={combined}
              colors={SHARE_PALETTE}
              width={width - 48}
              locked={false}
              dashed={false}
              animateIn={false}
              // Feature ONE branch — the share is a single "假如" to show off, not
              // a legend of three. The graph highlights it; the rest dim.
              selectedBranchId={featured?.id ?? null}
              onSelectBranch={() => {}}
              onLockedTap={() => {}}
              nowLabel={makeIfCopyForLocale(locale).nowLabel}
            />
            {/* Bake the featured branch as a TITLED explanation under the graph —
                a coloured label header + its full 概要, so the highlighted 假如 is
                unmistakable and reads as one clear takeaway (not a thin caption). */}
            {featured && (featured.summary || featured.outcome) ? (
              <View style={{ marginTop: 6, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 4.5,
                      backgroundColor: featured.color,
                    }}
                  />
                  <Text style={{ color: SHARE_PALETTE.text, fontSize: 15, fontWeight: '700' }}>
                    {featured.label}
                  </Text>
                </View>
                {/* 影响 — what this 假如 changes. */}
                <Text style={{ color: SHARE_PALETTE.secondary, fontSize: 13.5, lineHeight: 21 }}>
                  {featured.summary || deriveMakeIfSummary(featured.outcome)}
                </Text>
                {/* 注意/时机 — only for a present/future 假如 (an actionable decision):
                    what the user's CURRENT 命局 window favors. Past "假如当年" is a
                    reflection, not a choice, so it carries no timing call. */}
                {!featured.isPast && timing ? (
                  <Text
                    style={{
                      color: SHARE_PALETTE.dim,
                      fontSize: 12,
                      lineHeight: 18,
                      marginTop: 2,
                    }}
                  >
                    {`${t.makeifTiming.frame} · ${timing.label}`}
                    {timing.reasons ? ` — ${timing.reasons}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ShareableCard>
        </View>
      ) : null}

      {/* Fork list — actions live behind a left-swipe (kindred Threads pattern)
          so the row is free for the narrative. The old cramped icon row had
          18px hit targets that the user struggled to land on. */}
      {branches.length > 0 ? (
        <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>{ic.swipeHint}</Text>
      ) : null}
      <View style={{ gap: spacing.md }}>
        {branches.map((b) => (
          <ForkRow
            key={b.id}
            branch={b}
            status={status[b.id]}
            ic={ic}
            colors={colors}
            spacing={spacing}
            locale={locale}
            onDelete={() => deleteFork(b.id)}
            onRetry={() => runFork(b)}
          />
        ))}
      </View>

      <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>{ic.footer}</Text>

      {/* Event sheet. */}
      <SatelliteBottomSheet
        visible={forkAge != null}
        onClose={() => setForkAge(null)}
        title={forkAge != null ? ic.forkTitle(forkAge, forkIsPast) : ic.screenTitle}
      >
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {ic.eventChips.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => submit(chip)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 999,
                  borderWidth: 0.5,
                  borderColor: colors.separator,
                  backgroundColor: colors.accentGhost,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 14 }}>{chip}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={customEvent}
            onChangeText={setCustomEvent}
            // Bound the event → bound the fork id (id = `user-${age}-${event}`),
            // which is the D1 PK + narrate-schema key.
            maxLength={24}
            placeholder={ic.eventPlaceholder}
            placeholderTextColor={colors.dim}
            style={{
              borderWidth: 0.5,
              borderColor: colors.separator,
              borderRadius: 10,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              color: colors.text,
              fontSize: 15,
            }}
          />
          <Button variant='primary' onPress={() => submit(customEvent)}>
            {ic.submit}
          </Button>
        </View>
      </SatelliteBottomSheet>

      {/* One-time compliance gate before the first fork. */}
      <SatelliteBottomSheet
        visible={pendingAge != null && !acked}
        onClose={() => setPendingAge(null)}
        title={ic.disclaimerTitle}
      >
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.md }}>
          <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 22 }}>
            {ic.disclaimerBody}
          </Text>
          <Button variant='primary' onPress={ack}>
            {ic.disclaimerAck}
          </Button>
        </View>
      </SatelliteBottomSheet>
    </View>
  )
}

// ── ForkRow (swipe-to-reveal Share + Delete) ──────────────────────────────────

type RowStatus = 'loading' | 'done' | 'error' | 'limited' | undefined

/**
 * One fork in the sandbox list. Wraps the row in a ReanimatedSwipeable; the
 * row body stays clean (just dot + title + status/narrative), and Share +
 * Delete live behind a left-swipe — same gesture pattern Kindred Threads use
 * for delete. Replaces the previous 18px inline icon row, which the user
 * struggled to land on.
 *
 * a11y caveat: VoiceOver users can't trigger the swipe actions directly;
 * the retry-on-error inline link still works. A future pass should add
 * `accessibilityActions` on the row so VO has a discoverable path.
 */
function ForkRow({
  branch: b,
  status: st,
  ic,
  colors,
  spacing,
  locale,
  onDelete,
  onRetry,
}: {
  branch: MakeIfBranch
  status: RowStatus
  ic: ReturnType<typeof makeIfInteractiveCopyForLocale>
  colors: C
  spacing: S
  locale: string
  onDelete: () => void
  onRetry: () => void
}) {
  const forkTitle = ic.forkTitle(b.divergeAtAge, !!b.isPast)
  const [expanded, setExpanded] = useState(false)

  const renderRightActions = (
    _progress: unknown,
    _translation: unknown,
    methods: { close: () => void }
  ) => (
    <View style={{ flexDirection: 'row' }}>
      {b.outcome ? (
        <Pressable
          onPress={() => {
            methods.close()
            shareMakeifFork(
              { forkTitle, label: b.label, outcome: b.outcome ?? '', summary: b.summary },
              locale
            )
          }}
          accessibilityRole='button'
          accessibilityLabel={ic.share}
          style={{
            width: 80,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Share2 size={20} color='#fff' strokeWidth={1.6} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{ic.share}</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          methods.close()
          onDelete()
        }}
        accessibilityRole='button'
        accessibilityLabel={ic.delete}
        style={{
          width: 80,
          backgroundColor: '#9B2226',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Trash2 size={20} color='#fff' strokeWidth={1.6} />
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{ic.delete}</Text>
      </Pressable>
    </View>
  )

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      {/* Opaque bg keeps the red Delete action hidden until swiped. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          backgroundColor: colors.bg,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: b.color,
            marginTop: 5,
            opacity: b.isPast ? 0.5 : 1,
          }}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {forkTitle} · {b.label}
          </Text>
          {st === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ActivityIndicator size='small' color={colors.accent} />
              <Text style={{ color: colors.dim, fontSize: 12 }}>{ic.generating}</Text>
            </View>
          ) : st === 'error' ? (
            <Pressable onPress={onRetry} accessibilityRole='button'>
              <Text style={{ color: colors.accent, fontSize: 13 }}>{ic.failedRetry}</Text>
            </Pressable>
          ) : st === 'limited' ? (
            <Text style={{ color: colors.dim, fontSize: 12 }}>{ic.limited}</Text>
          ) : b.outcome ? (
            // The 概要 is the visible takeaway; tap pops the full "假如你…" narrative
            // in a bubble (the row was a wall of prose that read poorly inline and
            // was illegible once shared).
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole='button'
              accessibilityLabel={expanded ? ic.collapse : ic.expand}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ flex: 1, color: colors.secondary, fontSize: 13, lineHeight: 20 }}
                  numberOfLines={expanded ? undefined : 2}
                >
                  {b.summary || deriveMakeIfSummary(b.outcome)}
                </Text>
                <Text style={{ color: colors.accent, fontSize: 11 }}>
                  {expanded ? ic.collapse : ic.expand}
                </Text>
              </View>
              {expanded ? (
                <View
                  style={{
                    marginTop: spacing.sm,
                    borderRadius: 12,
                    borderWidth: 0.5,
                    borderColor: colors.separator,
                    backgroundColor: colors.accentGhost,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, lineHeight: 21 }}>
                    {b.outcome}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      </View>
    </ReanimatedSwipeable>
  )
}
