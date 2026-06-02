/**
 * Reverse 择日 — pick an event, get the top-3 ranked days in the next 30 days
 * with reasoning. Two scoring modes:
 *
 *   - Generic (`GET /api/cycle/search`) — verb-match against the day's 宜/忌
 *     plus 28-mansion + 五行 nudge. Free for all 10 events.
 *   - Specialized (`GET /api/cycle/{wedding,move-in,business,travel}`,
 *     Sprint 2 chunk 7) — Pro only; adds 建除十二神 officer boosts and tags
 *     reasoning with "相宜 / 相避" suffixes.
 *
 * When the user picks one of the 4 specialized events, the screen calls
 * `fetchCycleSpecialized` if they're Pro and falls back to generic + a
 * paywall hint otherwise. Intent routes the cross-app funnel: wedding →
 * Yuán; everything else → Fēng. Cross-promo is allowed here per ADR-0019
 * peer-promote (the user has stated an intent; this is contextual, not a
 * home-screen ad slot).
 */

import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CyclePaywallSheet } from '@/components/CyclePaywallSheet'
import { FlagshipUpsellInsert } from '@/components/FlagshipUpsellInsert'
import {
  CYCLE_EVENTS,
  type CycleEvent,
  type CycleSearchPayload,
  fetchCycleSpecialized,
  type SpecializedCycleEvent,
  searchCycleDays,
} from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import { scheduleRetroCheck } from '@/lib/push'

function fmt(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Events the 4 specialized Pro routes handle. Must mirror server (Sprint 2 #7). */
const SPECIALIZED_EVENT_SET: ReadonlySet<CycleEvent> = new Set<CycleEvent>([
  'wedding',
  'move-in',
  'business',
  'travel',
])
function isSpecialized(e: CycleEvent): e is SpecializedCycleEvent {
  return SPECIALIZED_EVENT_SET.has(e)
}

export default function EventScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()

  const [event, setEvent] = useState<CycleEvent>('wedding')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CycleSearchPayload | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Pro split — `cycle_pro` covers `universe_pro` purchases via the local
  // mirror in `snapshotFromCustomerInfo`, so this single check covers both.
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'cycle_pro')
  const specialized = isSpecialized(event)
  const useSpecializedScoring = specialized && isPro

  const run = () => {
    const today = new Date()
    const to = new Date(today)
    to.setDate(to.getDate() + 30)
    setLoading(true)
    setError(null)
    setResult(null)
    // Pro + a specialized event → activity-tuned scoring; otherwise generic.
    const fromIso = fmt(today)
    const toIso = fmt(to)
    const promise = useSpecializedScoring
      ? fetchCycleSpecialized(event as SpecializedCycleEvent, fromIso, toIso)
      : searchCycleDays(event, fromIso, toIso)
    promise
      .then((r) => setResult(r))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  const flagship: 'yuan' | 'feng' = event === 'wedding' ? 'yuan' : 'feng'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* No back button + no h1 title — minimalist drill-in (2026-06 chrome
          cleanup). iOS edge-swipe-back + Android system-back handle nav.
          The event-picker chips below ARE the page identity. */}
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

        {/* Specialized-scoring indicator (Pro) or Pro upsell pill (Free) —
            only rendered for the 4 specialized events. Stays out of the way
            when the user picks a generic event like 签约/动土/出葬. */}
        {specialized ? (
          isPro ? (
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
          ) : (
            <Pressable
              onPress={() => setPaywallOpen(true)}
              hitSlop={6}
              accessibilityRole='button'
              accessibilityLabel={t.specializedUpsell}
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
                {t.specializedUpsell}
              </Text>
            </Pressable>
          )
        ) : null}

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
                    // Picked a 择日 day → nudge 7 days later to ask how it went (C.5.2).
                    scheduleRetroCheck({ date: r.date, eventLabel: t.events[event], locale }).catch(
                      () => {}
                    )
                    // /day/[date] route was consolidated into home (Sprint 3
                    // chunk 7 IA pivot). Deep-link to home with ?day param;
                    // home reads it via useLocalSearchParams and selects the
                    // day in the calendar grid below the strip.
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
      <CyclePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}
