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
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { type AuspiceBirthInfo, getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { type AuspicePerson, getPeople } from '@/lib/people'
import { buildSynastryTimeline, resolveSolarInput } from '@/lib/synastry-timeline'

const SIG_COLOR = { major: '#9A6A3A', notable: '#B8860B', routine: '#8E8E93' } as const

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
  const { t } = useStrings()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const isPro = hasEntitlement(useEntitlements(), 'auspice_pro')
  const [state, setState] = useState<State>({ kind: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let alive = true
      void Promise.all([getAuspiceBirthInfo(), getPeople()]).then(([self, people]) => {
        if (!alive) return
        const person = people.find((p) => p.id === id)
        if (!self?.gender || !person) setState({ kind: 'missing' })
        else setState({ kind: 'data', self, person })
      })
      return () => {
        alive = false
      }
    }, [id])
  )

  const model = useMemo(() => {
    if (state.kind !== 'data') return null
    const { self, person } = state
    const selfP = pillarsOf(self)
    const otherP = pillarsOf(person)
    const score = selfP && otherP ? safeHeHun(selfP, otherP) : null
    const { nodes } = buildSynastryTimeline(self, person)
    return { score, nodes }
  }, [state])

  const thisYear = new Date().getFullYear()
  const visibleNodes = useMemo(() => {
    if (!model) return []
    const sorted = [...model.nodes].sort((a, b) => a.year - b.year)
    return isPro ? sorted : sorted.filter((n) => n.year === thisYear)
  }, [model, isPro, thisYear])

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
                    key={`${n.type}-${n.year}-${n.daYunOf ?? ''}`}
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
                        <Text style={{ color: colors.dim, fontSize: 12 }}>{n.year}</Text>
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

          {!isPro ? (
            <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
              {t.synastryTl.freeNote}
            </Text>
          ) : null}
        </ScrollView>
      )}
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
