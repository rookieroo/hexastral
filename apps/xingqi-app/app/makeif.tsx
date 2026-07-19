/**
 * /makeif — Xingqi What-if sandbox (Yuun-parity).
 * HTTP: /api/physiognomy/cycle/makeif* only.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MakeIfDiffPanel } from '@/components/timeline/MakeIfDiffPanel'
import { MakeIfYearGraph } from '@/components/timeline/MakeIfYearGraph'
import {
  deleteMakeifFork,
  fetchCycleTimeline,
  fetchMakeIfNarratives,
  listMakeifForks,
  saveMakeifFork,
  type TimelinePayload,
} from '@/lib/cycle-api'
import { resolveLocale } from '@/lib/i18n'
import {
  buildInteractiveModel,
  buildUserBranch,
  deriveMakeIfSummary,
  makeIfInteractiveCopyForLocale,
  type MakeIfBranch,
  relocalizeEventLabel,
} from '@/lib/makeIfBranches'
import { loadXingqiBirth } from '@/lib/xingqi-birth'

const MAX_FORKS = 4

export default function XingqiMakeIfScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const locale = resolveLocale()
  const copy = makeIfInteractiveCopyForLocale(locale)
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') ||
    hasEntitlement(entitlements, 'universe_pro')

  const [payload, setPayload] = useState<TimelinePayload | null>(null)
  const [branches, setBranches] = useState<MakeIfBranch[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [forkAge, setForkAge] = useState<number | null>(null)
  const [customEvent, setCustomEvent] = useState('')
  const [busy, setBusy] = useState(false)

  const birthRef = useMemo(() => ({ current: null as Awaited<ReturnType<typeof loadXingqiBirth>> }), [])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const birth = await loadXingqiBirth()
          birthRef.current = birth
          if (!birth) {
            if (!cancelled) setError('birth')
            return
          }
          if (!isPro) {
            if (!cancelled) setError('pro_required')
            return
          }
          const data = await fetchCycleTimeline({
            birthDate: birth.date,
            birthHour: birth.hour,
            gender: birth.gender,
            locale,
          })
          if (cancelled) return
          setPayload(data)
          const saved = await listMakeifForks({
            birthDate: birth.date,
            birthHour: birth.hour,
            gender: birth.gender,
          })
          if (cancelled) return
          const endAge = data.dayun[data.dayun.length - 1]?.endAge ?? 80
          const hydrated: MakeIfBranch[] = saved.map((f) => {
            const b = buildUserBranch({
              id: f.id,
              event: relocalizeEventLabel(f.label, locale),
              divergeAtAge: f.divergeAtAge,
              mergeAtAge: f.mergeAtAge,
              endAge,
              isPast: f.isPast,
            })
            return {
              ...b,
              label: relocalizeEventLabel(f.label, locale),
              outcome: f.narrative,
              summary: deriveMakeIfSummary(f.narrative),
            }
          })
          setBranches(hydrated)
          setSelectedId(hydrated[0]?.id ?? null)
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'load_failed')
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }, [birthRef, isPro, locale])
  )

  const currentAge = useMemo(() => {
    if (!payload) return null
    const [y] = payload.birth.date.split('-').map(Number)
    return y ? new Date().getFullYear() - y : null
  }, [payload])

  const model = useMemo(() => {
    if (!payload) return null
    return buildInteractiveModel(
      payload.dayun.map((d) => ({
        startAge: d.startAge,
        endAge: d.endAge,
        label: `${d.pillar.stem}${d.pillar.branch}`,
      })),
      currentAge
    )
  }, [currentAge, payload])

  const selected = branches.find((b) => b.id === selectedId) ?? null

  const createFork = async (event: string) => {
    const birth = birthRef.current
    if (!birth || !payload || forkAge == null || !event.trim()) return
    if (branches.length >= MAX_FORKS) return
    setBusy(true)
    try {
      const endAge = payload.dayun[payload.dayun.length - 1]?.endAge ?? 80
      const isPast = currentAge != null && forkAge < currentAge
      const mergeAtAge = Math.min(endAge, forkAge + (isPast ? 14 : 20))
      const id = `user-${forkAge}-${hash(event)}`
      const branch = buildUserBranch({
        id,
        event: event.trim(),
        divergeAtAge: forkAge,
        mergeAtAge,
        endAge,
        isPast,
      })
      const narr = await fetchMakeIfNarratives({
        birthDate: birth.date,
        birthHour: birth.hour,
        gender: birth.gender,
        locale,
        branches: [
          {
            id: branch.id,
            label: event.trim().slice(0, 40),
            divergeAtAge: branch.divergeAtAge,
            mergeAtAge: branch.mergeAtAge,
            isPast: branch.isPast,
          },
        ],
      })
      const narrative = narr.narratives[id] ?? ''
      const summary = narr.summaries?.[id] ?? deriveMakeIfSummary(narrative)
      const full: MakeIfBranch = {
        ...branch,
        label: event.trim().slice(0, 40),
        outcome: narrative || branch.outcome,
        summary,
      }
      await saveMakeifFork({
        birthDate: birth.date,
        birthHour: birth.hour,
        gender: birth.gender,
        id: full.id,
        label: full.label,
        event: full.label,
        divergeAtAge: full.divergeAtAge,
        mergeAtAge: full.mergeAtAge,
        isPast: Boolean(full.isPast),
        narrative: full.outcome,
        locale,
      })
      setBranches((prev) => [...prev, full].slice(0, MAX_FORKS))
      setSelectedId(full.id)
      setSheetOpen(false)
      setCustomEvent('')
      setForkAge(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fork_failed')
    } finally {
      setBusy(false)
    }
  }

  const removeFork = async (id: string) => {
    try {
      await deleteMakeifFork(id)
      setBranches((prev) => prev.filter((b) => b.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch {
      // best-effort
    }
  }

  const graphColors = {
    text: colors.text,
    secondary: colors.secondary,
    dim: colors.dim,
    accent: colors.accent,
    separator: colors.separator,
    bg: colors.bg,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 40,
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: colors.accent }}>
            {locale.startsWith('zh') ? '返回' : locale === 'ja' ? '戻る' : 'Back'}
          </Text>
        </Pressable>
        <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 28 }}>
          {copy.screenTitle}
        </Text>
        <Text style={{ color: colors.secondary, lineHeight: 22 }}>{copy.tapHint}</Text>

        {loading ? (
          <Text style={{ color: colors.dim }}>{locale.startsWith('zh') ? '加载中…' : 'Loading…'}</Text>
        ) : error === 'pro_required' ? (
          <>
            <Text style={{ color: colors.secondary }}>{copy.unlockBody}</Text>
            <Button variant='primary' onPress={() => router.push('/(commerce)/paywall' as never)}>
              {copy.unlockCta}
            </Button>
          </>
        ) : error === 'birth' ? (
          <Button variant='secondary' onPress={() => router.push('/birth' as never)}>
            {locale.startsWith('zh') ? '编辑出生信息' : 'Edit birth'}
          </Button>
        ) : payload && model ? (
          <>
            <MakeIfYearGraph
              dayun={payload.dayun}
              branches={branches}
              colors={graphColors}
              width={Math.min(width - spacing.xl * 2, 360)}
              selectedBranchId={selectedId}
              onSelectBranch={setSelectedId}
              onMainNodeTap={(age) => {
                setForkAge(age)
                setSheetOpen(true)
              }}
              nowLabel={locale.startsWith('zh') ? '今' : locale === 'ja' ? '今' : 'Now'}
              lang={locale}
              focusAge={currentAge}
            />

            {selected ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                  {selected.label}
                </Text>
                <Text style={{ color: colors.secondary, lineHeight: 20 }}>
                  {selected.summary || selected.outcome}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable
                    onPress={() => {
                      void Share.share({
                        message: `${selected.label}\n${selected.summary || selected.outcome}\n— Xingqi What-If`,
                      })
                    }}
                  >
                    <Text style={{ color: colors.accent }}>{copy.share}</Text>
                  </Pressable>
                  <Pressable onPress={() => void removeFork(selected.id)}>
                    <Text style={{ color: colors.accent }}>{copy.delete}</Text>
                  </Pressable>
                </View>
                {birthRef.current ? (
                  <MakeIfDiffPanel
                    branch={selected}
                    payload={payload}
                    birth={birthRef.current}
                    locale={locale}
                    colors={graphColors}
                    spacing={{ sm: spacing.sm, md: spacing.md }}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={{ color: colors.dim }}>{copy.tapHint}</Text>
            )}
          </>
        ) : error ? (
          <Text style={{ color: colors.secondary }}>{error}</Text>
        ) : null}
      </ScrollView>

      <SatelliteBottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
            {forkAge != null ? copy.forkTitle(forkAge, currentAge != null && forkAge < currentAge) : copy.screenTitle}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {copy.eventChips.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => void createFork(chip)}
                disabled={busy}
                style={{
                  borderWidth: 0.5,
                  borderColor: colors.separator,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: colors.text }}>{chip}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={customEvent}
            onChangeText={setCustomEvent}
            placeholder={copy.eventPlaceholder}
            placeholderTextColor={colors.dim}
            style={{
              borderWidth: 0.5,
              borderColor: colors.separator,
              color: colors.text,
              padding: 12,
            }}
          />
          <Button
            variant='primary'
            disabled={busy || !customEvent.trim()}
            onPress={() => void createFork(customEvent)}
          >
            {busy ? copy.generating : copy.submit}
          </Button>
        </View>
      </SatelliteBottomSheet>
    </View>
  )
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
