/**
 * /relationship/[id] — 合盘 (synastry) timeline for one 亲友 (synastry-in-auspice §4.1).
 *
 * Both charts are device-local (self + the 亲友 the user entered), so the whole
 * relationship timeline computes ON-DEVICE via astro-core — no server, no privacy
 * projection (unlike Kindred's bonds-timeline). Free shows this year's shared
 * node(s) + the 合缘 score; the full 前瞻 + node reminders unlock with auspice_pro
 * (the one-time 合盘 consumable lands in S3).
 */

import { calculateHeHun, getFourPillars } from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { type AuspiceBirthInfo, getAuspiceBirthInfo } from '@/lib/birth'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { openKindredCompose } from '@/lib/kindred-handoff'
import { type AuspicePerson, getPeople } from '@/lib/people'
import { getSynastryUnlockPrice, purchaseSynastryUnlock } from '@/lib/synastry-iap'
import { buildSynastryForwardMonths, resolveSolarInput } from '@/lib/synastry-timeline'
import { isRelationshipUnlocked, markRelationshipUnlocked } from '@/lib/synastry-unlock'

const SIG_COLOR = { major: '#9A6A3A', notable: '#B8860B', routine: '#8E8E93' } as const

/** The cross-app depth upsell: this screen is the TASTE (next-6-months timing);
 *  the full lifetime 合盘 reading lives in Yuel (ADR-0024 positioning — Yuel owns
 *  deep compatibility). Local copy, keeps lib/i18n.ts untouched. */
const YUEL_ENTRY: Record<Locale, string> = {
  'zh-Hans': '在 Yuel 看完整合盘 →',
  'zh-Hant': '在 Yuel 看完整合盤 →',
  ja: 'Yuel で詳しい相性を見る →',
  en: 'See the full reading in Yuel →',
}

function pillarsOf(b: {
  solarDate: string
  timeIndex?: number | null
  calendar?: 'solar' | 'lunar'
}) {
  const input = resolveSolarInput(b)
  return input ? getFourPillars(input) : null
}

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'data'; self: AuspiceBirthInfo; person: AuspicePerson }

export default function RelationshipTimelineScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const isPro = hasEntitlement(useEntitlements(), 'auspice_pro')
  const [state, setState] = useState<State>({ kind: 'loading' })
  // One-time buyout of THIS relationship's view (separate from the subscription).
  const [unlocked, setUnlocked] = useState(false)
  const [price, setPrice] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  // Full VIEW access = subscription OR this relationship bought. (Push stays
  // subscription-only — never unlocked by the one-time buy.)
  const fullAccess = isPro || unlocked

  useFocusEffect(
    useCallback(() => {
      let alive = true
      void Promise.all([getAuspiceBirthInfo(), getPeople()]).then(([self, people]) => {
        if (!alive) return
        const person = people.find((p) => p.id === id)
        if (!self?.gender || !person) setState({ kind: 'missing' })
        else setState({ kind: 'data', self, person })
      })
      void isRelationshipUnlocked(id).then((u) => {
        if (alive) setUnlocked(u)
      })
      void getSynastryUnlockPrice().then((p) => {
        if (alive) setPrice(p)
      })
      return () => {
        alive = false
      }
    }, [id])
  )

  const buyUnlock = async () => {
    if (purchasing) return
    setPurchasing(true)
    try {
      const r = await purchaseSynastryUnlock()
      if (r === 'success') {
        await markRelationshipUnlocked(id)
        setUnlocked(true)
      } else if (r === 'failed' || r === 'unavailable') {
        Alert.alert(t.synastryTl.purchaseFailed)
      }
    } finally {
      setPurchasing(false)
    }
  }

  const model = useMemo(() => {
    if (state.kind !== 'data') return null
    const { self, person } = state
    const selfP = pillarsOf(self)
    const otherP = pillarsOf(person)
    const score = selfP && otherP ? safeHeHun(selfP, otherP) : null
    // Light forward glance — next 6 months only (流月). The lifetime axis is
    // Kindred's; Auspice keeps the synastry a taste so the two don't overlap.
    const nodes = buildSynastryForwardMonths(self, person, { months: 6 })
    return { score, nodes }
  }, [state])

  // Engine returns the window already in chronological order, forward from now.
  // Free sees just this month as a taste; full access sees all 6.
  const visibleNodes = useMemo(() => {
    if (!model) return []
    return fullAccess ? model.nodes : model.nodes.slice(0, 1)
  }, [model, fullAccess])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
          <Text style={{ color: colors.secondary, fontSize: 22 }}>←</Text>
        </Pressable>
      </View>

      {state.kind === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : state.kind === 'missing' ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
        >
          <Text style={{ color: colors.secondary, textAlign: 'center', lineHeight: 22 }}>
            {t.synastryTl.needBirth}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.xl,
            gap: spacing.lg,
            paddingBottom: spacing['3xl'],
          }}
        >
          {/* Header — name + 合缘 score. */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 3 }}>
              {t.synastryTl.title}
            </Text>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '300' }}>
              {state.person.name}
            </Text>
            {model?.score ? (
              <Text style={{ color: colors.secondary, fontSize: 14 }}>
                {t.synastryTl.score} {model.score.score} · {model.score.gradeLabel}
              </Text>
            ) : null}
            <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
              {t.synastryTl.subtitle}
            </Text>
          </View>

          {visibleNodes.length === 0 ? (
            <Text style={{ color: colors.dim, fontSize: 13 }}>{t.synastryTl.empty}</Text>
          ) : (
            <View style={{ gap: spacing.md }}>
              {visibleNodes.map((n) => {
                const marker =
                  n.type === '大运'
                    ? n.daYunOf === 'A'
                      ? t.synastryTl.yourDayun
                      : t.synastryTl.theirDayun
                    : n.clashA || n.clashB
                      ? t.synastryTl.clash
                      : n.harmonyA || n.harmonyB
                        ? t.synastryTl.harmony
                        : null
                return (
                  <View
                    key={`${n.type}-${n.year}-${n.month ?? ''}-${n.daYunOf ?? ''}`}
                    style={{ flexDirection: 'row', gap: spacing.md }}
                  >
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 4.5,
                        marginTop: 5,
                        backgroundColor: SIG_COLOR[n.significance],
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 16, letterSpacing: 1 }}>
                          {n.ganZhi.label}
                        </Text>
                        <Text style={{ color: colors.dim, fontSize: 12 }}>
                          {n.month ? `${n.year}.${n.month}` : n.year}
                        </Text>
                        {marker ? (
                          <Text
                            style={{
                              color: SIG_COLOR[n.significance],
                              fontSize: 11,
                              fontWeight: '600',
                            }}
                          >
                            {marker}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                        {n.summary}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Unlock wall — view buyout (one-time) OR subscribe (adds reminders).
              Hidden once the user has full view access. */}
          {!fullAccess ? (
            <View
              style={{
                gap: spacing.md,
                borderTopWidth: 0.5,
                borderTopColor: colors.separator,
                paddingTop: spacing.lg,
              }}
            >
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
                {t.synastryTl.freeNote}
              </Text>
              {/* One-time: buy out THIS relationship's full view (no reminders). */}
              <Pressable
                onPress={() => void buyUnlock()}
                disabled={purchasing}
                accessibilityRole='button'
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  opacity: pressed || purchasing ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.bg, fontSize: 15, fontWeight: '700' }}>
                  {purchasing
                    ? t.synastryTl.unlocking
                    : price
                      ? t.synastryTl.unlockOneTime.replace('{price}', price)
                      : t.synastryTl.unlockOneTimeNoPrice}
                </Text>
              </Pressable>
              {/* Subscribe: full view across ALL relationships + node reminders. */}
              <Pressable
                onPress={() => setPaywallOpen(true)}
                accessibilityRole='button'
                style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                  {t.synastryTl.unlockSubscribe}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Cross-app depth upsell — this screen is the TASTE (next-6-months
              timing); the full lifetime 合盘 lives in Yuel (ADR-0024). A quiet
              footer, shown regardless of unlock state. */}
          <Pressable
            onPress={() => void openKindredCompose({ self: state.self, person: state.person })}
            accessibilityRole='button'
            style={({ pressed }) => ({
              marginTop: spacing.sm,
              paddingVertical: spacing.md,
              borderTopWidth: 0.5,
              borderTopColor: colors.separator,
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
              {YUEL_ENTRY[locale]}
            </Text>
          </Pressable>
        </ScrollView>
      )}
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}

function safeHeHun(
  a: Parameters<typeof calculateHeHun>[0],
  b: Parameters<typeof calculateHeHun>[1]
): ReturnType<typeof calculateHeHun> | null {
  try {
    return calculateHeHun(a, b)
  } catch {
    return null
  }
}
