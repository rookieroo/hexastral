/**
 * 四柱八字 personalized page — Glossary chunk 3 (ADR-0020).
 *
 * When birth + gender are set: fetch the timeline payload (the SAME server
 * cache the LiuyearBanner + /timeline page already hit, so this is nearly
 * free) and render the user's actual 四柱 — year, month, day, hour — as
 * stacked vertical pillars. The day pillar is ringed in accent and labeled
 * 日主 (Day Master); each stem is colored by its 五行, each branch by its
 * own 五行 (derived client-side via the ganzhi-content branch table).
 *
 * Below the pillars: a 5-bar 五行 distribution mini-chart counting both
 * stem-elements and branch-elements across all known pillars. Heights are
 * normalized to the max count so the proportion is glanceable even with
 * partial data (hour unknown → 6 elements total instead of 8).
 *
 * When no birth info OR no gender: show the same Sprint 3.5-style "set
 * birth" placeholder pointing to /me. (Gender is required because the
 * server timeline endpoint computes 大运 in the same response, and 大运
 * needs gender.)
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { fetchTimeline, type PillarUnit, type TimelinePayload } from '@/lib/api'
import { getCycleBirthInfo } from '@/lib/birth'
import { TWELVE_BRANCHES, type Wuxing } from '@/lib/ganzhi-content'
import { useStrings } from '@/lib/i18n-context'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

const ELEMENTS: ReadonlyArray<Wuxing> = ['木', '火', '土', '金', '水']

function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  return timeIndex * 2
}

/** Lookup the 五行 a 地支 belongs to (e.g. '寅' → '木'). */
function branchElement(branch: string): Wuxing | null {
  const entry = TWELVE_BRANCHES.find((b) => b.char === branch)
  return entry?.element ?? null
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; payload: TimelinePayload }

export function BaziPillars() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const [state, setState] = useState<ScreenState>({ kind: 'loading' })

  const load = useCallback(() => {
    setState({ kind: 'loading' })
    getCycleBirthInfo()
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
        }).then((payload) => setState({ kind: 'data', payload }))
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

  if (state.kind === 'loading') {
    return (
      <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (state.kind === 'no-birth') {
    return (
      <Pressable
        onPress={() => router.push('/me')}
        accessibilityRole='button'
        accessibilityLabel={t.personalEmptyCta}
        style={({ pressed }) => ({
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: colors.separator,
          backgroundColor: colors.card,
          padding: spacing.lg,
          gap: spacing.sm,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
          {t.personalEmptyBody}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: colors.accent,
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: 1,
            }}
          >
            {t.personalEmptyCta}
          </Text>
          <ChevronRightIcon size={16} color={colors.accent} strokeWidth={1.4} />
        </View>
      </Pressable>
    )
  }

  if (state.kind === 'error') {
    return (
      <Text style={{ color: colors.secondary }}>
        {t.loadFailed}: {state.message}
      </Text>
    )
  }

  const { pillars } = state.payload

  // 五行 distribution — count both stem-elements and branch-elements across
  // all KNOWN pillars (hour pillar is skipped when null).
  const elementCounts: Record<Wuxing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const knownPillars: PillarUnit[] = [
    pillars.year,
    pillars.month,
    pillars.day,
    ...(pillars.hour ? [pillars.hour] : []),
  ]
  for (const p of knownPillars) {
    elementCounts[p.element] += 1
    const branchEl = branchElement(p.branch)
    if (branchEl) elementCounts[branchEl] += 1
  }
  const maxCount = Math.max(1, ...Object.values(elementCounts))

  return (
    <View style={{ gap: spacing.xl }}>
      {/* 4 pillars row */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <PillarColumn
          label={t.baziPillarYear}
          pillar={pillars.year}
          colors={colors}
          spacing={spacing}
        />
        <PillarColumn
          label={t.baziPillarMonth}
          pillar={pillars.month}
          colors={colors}
          spacing={spacing}
        />
        <PillarColumn
          label={t.baziPillarDay}
          pillar={pillars.day}
          isDayMaster
          dayMasterLabel={t.baziDayMaster}
          colors={colors}
          spacing={spacing}
        />
        <PillarColumn
          label={t.baziPillarHour}
          pillar={pillars.hour}
          unknownLabel={t.baziHourUnknown}
          colors={colors}
          spacing={spacing}
        />
      </View>

      {/* 五行 distribution */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.baziElementBalance}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.lg,
            borderRadius: 14,
            backgroundColor: colors.card,
            borderWidth: 0.5,
            borderColor: colors.separator,
          }}
        >
          {ELEMENTS.map((e) => {
            const count = elementCounts[e]
            const heightPct = (count / maxCount) * 100
            return (
              <View key={e} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ height: 64, width: '100%', justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: '80%',
                      alignSelf: 'center',
                      height: `${Math.max(heightPct, 4)}%`,
                      backgroundColor: count > 0 ? ELEMENT_COLORS[e] : colors.separator,
                      opacity: count > 0 ? 1 : 0.3,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                </View>
                <Text style={{ color: ELEMENT_COLORS[e], fontSize: 14, fontWeight: '500' }}>
                  {e}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 11 }}>{count}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

interface ColumnColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  card: string
}

interface ColumnSpacing {
  sm: number
  md: number
}

function PillarColumn({
  label,
  pillar,
  isDayMaster,
  dayMasterLabel,
  unknownLabel,
  colors,
  spacing,
}: {
  label: string
  pillar: PillarUnit | null
  isDayMaster?: boolean
  dayMasterLabel?: string
  unknownLabel?: string
  colors: ColumnColors
  spacing: ColumnSpacing
}) {
  const stemColor = pillar ? ELEMENT_COLORS[pillar.element] : colors.dim
  const branchEl = pillar ? branchElement(pillar.branch) : null
  const branchColor = branchEl ? ELEMENT_COLORS[branchEl] : colors.dim

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
      <Text style={{ color: colors.secondary, fontSize: 10, letterSpacing: 2 }}>{label}</Text>
      <View
        style={{
          width: '100%',
          borderRadius: 10,
          borderWidth: isDayMaster ? 1.5 : 0.5,
          borderColor: isDayMaster ? colors.accent : colors.separator,
          backgroundColor: colors.card,
          paddingVertical: spacing.md,
          alignItems: 'center',
          gap: 2,
        }}
      >
        {pillar ? (
          <>
            <Text style={{ color: stemColor, fontSize: 26, fontWeight: '500' }}>{pillar.stem}</Text>
            <Text style={{ color: branchColor, fontSize: 26, fontWeight: '500' }}>
              {pillar.branch}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: colors.dim, fontSize: 26 }}>—</Text>
            <Text style={{ color: colors.dim, fontSize: 9, textAlign: 'center' }}>
              {unknownLabel ?? ''}
            </Text>
          </>
        )}
      </View>
      {isDayMaster ? (
        <Text style={{ color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: '600' }}>
          {dayMasterLabel}
        </Text>
      ) : null}
    </View>
  )
}
