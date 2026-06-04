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
import { Button, useTheme } from '@zhop/core-ui'
import { BackArrowIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useFocusEffect, useRouter } from 'expo-router'
import { Share2, X } from 'lucide-react-native'
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
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { MakeIfGraph } from '@/components/MakeIfGraph'
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
import {
  buildInteractiveModel,
  buildUserBranch,
  type MakeIfBranch,
  makeIfCopyForLocale,
  makeIfInteractiveCopyForLocale,
  makeIfTeaser,
} from '@/lib/makeIfBranches'
import { shareReading } from '@/lib/share'

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
  const ic = makeIfInteractiveCopyForLocale(locale)
  const currentAge = useMemo(() => payload.liunian.find((r) => r.isCurrent)?.age ?? null, [payload])
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
  const [forkAge, setForkAge] = useState<number | null>(null)
  const [pendingAge, setPendingAge] = useState<number | null>(null)
  const [acked, setAcked] = useState(false)
  const [customEvent, setCustomEvent] = useState('')

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
              event: f.event,
              divergeAtAge: f.divergeAtAge,
              mergeAtAge: f.mergeAtAge,
              endAge: model.endAge,
              isPast: f.isPast,
            }),
            outcome: f.narrative,
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
            setBranches((prev) =>
              prev.map((b) => (b.id === fork.id ? { ...b, outcome: narrative } : b))
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

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>{ic.tapHint}</Text>

      <MakeIfGraph
        // Re-mount on each added fork so the new branch animates in.
        key={branches.length}
        model={combined}
        colors={colors}
        width={width}
        locked={false}
        dashed={false}
        animateIn={branches.length > 0}
        selectedBranchId={null}
        onSelectBranch={() => {}}
        onLockedTap={() => {}}
        onMainNodeTap={onNodeTap}
        nowLabel={makeIfCopyForLocale(locale).nowLabel}
      />

      {/* Fork list — title + regenerate/delete actions + status or narrative. */}
      <View style={{ gap: spacing.md }}>
        {branches.map((b) => {
          const st = status[b.id]
          return (
            <View key={b.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text
                    style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {ic.forkTitle(b.divergeAtAge, !!b.isPast)} · {b.label}
                  </Text>
                  {/* Reload dropped — with the locale-keyed cache a re-run just
                      re-serves the same narrative (retry lives in the error state). */}
                  {b.outcome ? (
                    <Pressable
                      onPress={() =>
                        shareReading(
                          `${ic.forkTitle(b.divergeAtAge, !!b.isPast)} · ${b.label}\n${b.outcome}`,
                          locale
                        )
                      }
                      hitSlop={12}
                      accessibilityRole='button'
                      style={{ padding: 4 }}
                    >
                      <Share2 size={18} color={colors.dim} strokeWidth={1.6} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => deleteFork(b.id)}
                    hitSlop={12}
                    accessibilityRole='button'
                    style={{ padding: 4 }}
                  >
                    <X size={18} color={colors.dim} strokeWidth={1.6} />
                  </Pressable>
                </View>
                {st === 'loading' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <ActivityIndicator size='small' color={colors.accent} />
                    <Text style={{ color: colors.dim, fontSize: 12 }}>{ic.generating}</Text>
                  </View>
                ) : st === 'error' ? (
                  <Pressable onPress={() => runFork(b)} accessibilityRole='button'>
                    <Text style={{ color: colors.accent, fontSize: 13 }}>{ic.failedRetry}</Text>
                  </Pressable>
                ) : st === 'limited' ? (
                  <Text style={{ color: colors.dim, fontSize: 12 }}>{ic.limited}</Text>
                ) : b.outcome ? (
                  <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
                    {b.outcome}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        })}
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
