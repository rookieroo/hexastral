/**
 * Reverse 择日 — pick an event, get the top-3 ranked days with reasoning.
 *
 * Scoring (2026-06 flip): the 4 "specialized" events (嫁娶 / 入宅 / 开市 / 出行)
 * apply 建除十二神 officer boosts. That activity-tuned scoring is now FREE for
 * everyone — the server routes are anonymous + deterministic, so there's no
 * reason to wall the better answer. What Pro buys is REACH: Free always searches
 * the next 30 days (top 3); Pro picks any window up to ~3 months. That's the one
 * wall on this screen, and the paywall says exactly that.
 *
 * Intent routes the cross-app funnel: wedding → Kindred; everything else → Fēng
 * (ADR-0019 peer-promote — the user stated an intent; this is contextual).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { FlagshipUpsellInsert } from '@/components/FlagshipUpsellInsert'
import {
  type AuspiceEvent,
  type AuspiceSearchPayload,
  CYCLE_EVENTS,
  fetchAuspiceSpecialized,
  type SpecializedCycleEvent,
  searchAuspiceDays,
} from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import { scheduleRetroCheck } from '@/lib/push'

/** Free window + server cap (mirror auspice.ts MAX_SEARCH_SPAN_DAYS). */
const FREE_WINDOW_DAYS = 30
const MAX_SPAN_DAYS = 92

function fmt(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

/** Events the 4 specialized routes handle. Must mirror server (Sprint 2 #7). */
const SPECIALIZED_EVENT_SET: ReadonlySet<AuspiceEvent> = new Set<AuspiceEvent>([
  'wedding',
  'move-in',
  'business',
  'travel',
])
function isSpecialized(e: AuspiceEvent): e is SpecializedCycleEvent {
  return SPECIALIZED_EVENT_SET.has(e)
}

/** Optional deep-link params from /timeline ("查看吉日"). Pro-only fields, since
 *  Free is pinned to the next-30-days window regardless. */
const EVENT_SET = new Set<string>(CYCLE_EVENTS)
function parseEvent(raw: string | string[] | undefined): AuspiceEvent | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  return s && EVENT_SET.has(s) ? (s as AuspiceEvent) : null
}
function parseIsoDate(raw: string | string[] | undefined): Date | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function EventScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const params = useLocalSearchParams<{ event?: string; from?: string; to?: string }>()

  const [event, setEvent] = useState<AuspiceEvent>(() => parseEvent(params.event) ?? 'wedding')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AuspiceSearchPayload | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Pro date-range (Pro-only). Free is pinned to the next 30 days.
  const [fromDate, setFromDate] = useState(() => parseIsoDate(params.from) ?? new Date())
  const [toDate, setToDate] = useState(
    () => parseIsoDate(params.to) ?? addDays(new Date(), FREE_WINDOW_DAYS)
  )

  // Late-arriving params (e.g., deep-link tap after the screen mounted) overwrite
  // state once — without clobbering the user's subsequent manual edits.
  useEffect(() => {
    const e = parseEvent(params.event)
    if (e) setEvent(e)
    const f = parseIsoDate(params.from)
    if (f) setFromDate(f)
    const tDate = parseIsoDate(params.to)
    if (tDate) setToDate(tDate)
    // Intentionally run once on params — subsequent edits live in user state.
  }, [params.event, params.from, params.to])

  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const specialized = isSpecialized(event)

  const run = () => {
    // Free → fixed next-30-days; Pro → the chosen window, clamped to the server cap.
    let from: Date
    let to: Date
    if (isPro) {
      from = fromDate
      to = toDate < from ? new Date(from) : toDate
      const max = addDays(from, MAX_SPAN_DAYS - 1)
      if (to > max) to = max
    } else {
      from = new Date()
      to = addDays(from, FREE_WINDOW_DAYS)
    }
    setLoading(true)
    setError(null)
    setResult(null)
    const fromIso = fmt(from)
    const toIso = fmt(to)
    // Specialized scoring is free now — only the window is gated.
    const promise = specialized
      ? fetchAuspiceSpecialized(event as SpecializedCycleEvent, fromIso, toIso)
      : searchAuspiceDays(event, fromIso, toIso)
    promise
      .then((r) => setResult(r))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  const flagship: 'yuan' | 'feng' = event === 'wedding' ? 'yuan' : 'feng'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018). The event-picker chips are the page identity. */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        <View>
          <Text
            style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}
          >
            {t.pickEvent}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CYCLE_EVENTS.map((e) => {
              const selected = e === event
              return (
                <Pressable
                  key={e}
                  onPress={() => setEvent(e)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    borderRadius: 999,
                    backgroundColor: selected ? colors.accent : colors.card,
                    borderWidth: 0.5,
                    borderColor: selected ? colors.accent : colors.separator,
                  }}
                >
                  <Text style={{ color: selected ? '#fff' : colors.text, fontSize: 14 }}>
                    {t.events[e]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Specialized-scoring indicator — shown for the 4 specialized events.
            It's on for everyone now (free included), so no Pro wall lives here. */}
        {specialized ? (
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: colors.accent,
              backgroundColor: colors.accentGhost,
            }}
          >
            <Text
              style={{ color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}
            >
              {t.specializedActive}
            </Text>
          </View>
        ) : null}

        {/* Date range — the one Pro wall on this screen. */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
            {t.eventRangeSection}
          </Text>
          {isPro ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <DateTimePicker
                value={fromDate}
                mode='date'
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                accentColor={colors.accent}
                onChange={(_e, d) => {
                  if (d) setFromDate(d)
                }}
              />
              <Text style={{ color: colors.dim, fontSize: 16 }}>→</Text>
              <DateTimePicker
                value={toDate}
                mode='date'
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                accentColor={colors.accent}
                minimumDate={fromDate}
                maximumDate={addDays(fromDate, MAX_SPAN_DAYS - 1)}
                onChange={(_e, d) => {
                  if (d) setToDate(d)
                }}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setPaywallOpen(true)}
              accessibilityRole='button'
              accessibilityLabel={t.eventRangeUpsell}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>{t.eventRangeFreeNote}</Text>
              <Text
                style={{ color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}
              >
                {t.eventRangeUpsell}
              </Text>
            </Pressable>
          )}
        </View>

        <Button variant='primary' fullWidth onPress={run}>
          {t.search}
        </Button>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.secondary, marginTop: spacing.sm }}>{t.searching}</Text>
          </View>
        ) : error ? (
          <Text style={{ color: colors.secondary }}>
            {t.loadFailed}: {error}
          </Text>
        ) : result ? (
          <View style={{ gap: spacing.md }}>
            {result.top.length === 0 ? (
              <Text style={{ color: colors.secondary }}>{t.noResults}</Text>
            ) : (
              result.top.map((r) => (
                <Pressable
                  key={r.date}
                  onPress={() => {
                    scheduleRetroCheck({ date: r.date, eventLabel: t.events[event], locale }).catch(
                      () => {}
                    )
                    router.push({ pathname: '/', params: { day: r.date } })
                  }}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    borderWidth: 0.5,
                    borderColor: r.recommended ? colors.accent : colors.separator,
                    padding: spacing.lg,
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
                      {r.date}
                    </Text>
                    {r.recommended ? (
                      <Text style={{ color: colors.accent, fontSize: 12 }}>{t.recommended}</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.secondary, fontSize: 13 }}>{r.reasoning}</Text>
                </Pressable>
              ))
            )}
            <FlagshipUpsellInsert flagship={flagship} />
          </View>
        ) : null}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}
