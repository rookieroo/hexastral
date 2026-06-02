/**
 * /timeline — Pro Life-Timeline page (Sprint 4.5 / ADR-0020).
 *
 * Renders the user's deterministic 八字-derived timeline:
 *   - 大运 horizontal scroll (8 chips, 10-year cycles)
 *   - 流年 vertical list (±5 years from current)
 *   - 流月 grid (12 months for the current year)
 *
 * Gating:
 *   - No birth info → "Set birth info" placeholder pointing to /me
 *   - Free + birth set → first 3 大运 + paywall overlay
 *   - Pro + birth set → full timeline
 *
 * ADR-0018 minimalism: no back button, no h1 chrome; the content
 * sections ARE the page identity. Element colors come from the same
 * 五行 palette used by the 12 时辰 wheel (ELEMENT_COLORS).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import {
  type DayunRow,
  fetchTimeline,
  type LiunianRow,
  type LiuyueRow,
  type TimelinePayload,
} from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

const FREE_DAYUN_LIMIT = 3

function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  return timeIndex * 2
}

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'no-birth' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; payload: TimelinePayload }

export default function TimelineScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing['3xl'] * 2,
          gap: spacing.xl,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '300' }}>
          {t.timelineTitle}
        </Text>

        {state.kind === 'loading' ? (
          <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : state.kind === 'no-birth' ? (
          <NoBirthCard
            onPress={() => router.push('/me')}
            colors={colors}
            spacing={spacing}
            cta={t.personalEmptyCta}
            body={t.personalEmptyBody}
          />
        ) : state.kind === 'error' ? (
          <Text style={{ color: colors.secondary }}>
            {t.loadFailed}: {state.message}
          </Text>
        ) : (
          <TimelineBody
            payload={state.payload}
            isPro={isPro}
            onLockedTap={() => setPaywallOpen(true)}
            colors={colors}
            spacing={spacing}
            t={t}
          />
        )}
      </ScrollView>
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </SafeAreaView>
  )
}

// ── Body composition ──────────────────────────────────────────────────────

interface BodyColors {
  text: string
  secondary: string
  dim: string
  accent: string
  accentGhost: string
  separator: string
  card: string
  bg: string
}

interface BodySpacing {
  sm: number
  md: number
  lg: number
  xl: number
  '3xl': number
}

interface BodyStrings {
  timelineDayun: string
  timelineLiunian: string
  timelineLiuyue: string
  timelineCurrentBadge: string
  timelineAgeFrom: string
  timelineProLocked: string
}

function TimelineBody({
  payload,
  isPro,
  onLockedTap,
  colors,
  spacing,
  t,
}: {
  payload: TimelinePayload
  isPro: boolean
  onLockedTap: () => void
  colors: BodyColors
  spacing: BodySpacing
  t: BodyStrings
}) {
  const visibleDayun = isPro ? payload.dayun : payload.dayun.slice(0, FREE_DAYUN_LIMIT)

  return (
    <View style={{ gap: spacing.xl }}>
      {/* 大运 horizontal ladder */}
      <Section title={t.timelineDayun} colors={colors} spacing={spacing}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}
        >
          {visibleDayun.map((row) => (
            <DayunChip
              key={row.index}
              row={row}
              colors={colors}
              spacing={spacing}
              currentLabel={t.timelineCurrentBadge}
              ageLabel={t.timelineAgeFrom}
            />
          ))}
        </ScrollView>
        {!isPro && payload.dayun.length > FREE_DAYUN_LIMIT ? (
          <LockedRow
            label={t.timelineProLocked}
            colors={colors}
            spacing={spacing}
            onPress={onLockedTap}
          />
        ) : null}
      </Section>

      {/* 流年 vertical list */}
      <Section title={t.timelineLiunian} colors={colors} spacing={spacing}>
        <View
          style={{
            borderRadius: 14,
            backgroundColor: colors.card,
            overflow: 'hidden',
          }}
        >
          {payload.liunian.map((row, i) => (
            <LiunianRowView
              key={row.year}
              row={row}
              colors={colors}
              spacing={spacing}
              currentLabel={t.timelineCurrentBadge}
              divider={i < payload.liunian.length - 1}
            />
          ))}
        </View>
      </Section>

      {/* 流月 grid (4 cols × 3 rows fits 12 cleanly) */}
      <Section title={t.timelineLiuyue} colors={colors} spacing={spacing}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {payload.thisYearLiuyue.map((row) => (
            <LiuyueCell key={row.month} row={row} colors={colors} spacing={spacing} />
          ))}
        </View>
      </Section>
    </View>
  )
}

function Section({
  title,
  colors,
  spacing,
  children,
}: {
  title: string
  colors: BodyColors
  spacing: BodySpacing
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{title}</Text>
      {children}
    </View>
  )
}

function DayunChip({
  row,
  colors,
  spacing,
  currentLabel,
  ageLabel,
}: {
  row: DayunRow
  colors: BodyColors
  spacing: BodySpacing
  currentLabel: string
  ageLabel: string
}) {
  const elementColor = ELEMENT_COLORS[row.pillar.element]
  return (
    <View
      style={{
        minWidth: 96,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: row.isCurrent ? 1.5 : 0.5,
        borderColor: row.isCurrent ? colors.accent : colors.separator,
        backgroundColor: colors.card,
        gap: 4,
        alignItems: 'flex-start',
      }}
    >
      <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 2 }}>#{row.index}</Text>
      <Text style={{ color: elementColor, fontSize: 22, fontWeight: '500' }}>
        {row.pillar.stem}
        {row.pillar.branch}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 11 }}>
        {ageLabel.replace('{age}', String(row.startAge))}
      </Text>
      {row.isCurrent ? (
        <View
          style={{
            marginTop: 2,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: colors.accent,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, letterSpacing: 1, fontWeight: '600' }}>
            {currentLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function LiunianRowView({
  row,
  colors,
  spacing,
  currentLabel,
  divider,
}: {
  row: LiunianRow
  colors: BodyColors
  spacing: BodySpacing
  currentLabel: string
  divider: boolean
}) {
  const elementColor = ELEMENT_COLORS[row.pillar.element]
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: colors.separator,
        backgroundColor: row.isCurrent ? colors.accentGhost : 'transparent',
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          width: 56,
          color: colors.text,
          fontSize: 14,
          fontWeight: row.isCurrent ? '600' : '400',
        }}
      >
        {row.year}
      </Text>
      <Text
        style={{
          flex: 1,
          color: elementColor,
          fontSize: 16,
          fontWeight: '500',
        }}
      >
        {row.pillar.stem}
        {row.pillar.branch}
      </Text>
      <Text style={{ color: colors.dim, fontSize: 12 }}>{row.age}</Text>
      {row.isCurrent ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: colors.accent,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, letterSpacing: 1, fontWeight: '600' }}>
            {currentLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function LiuyueCell({
  row,
  colors,
  spacing,
}: {
  row: LiuyueRow
  colors: BodyColors
  spacing: BodySpacing
}) {
  const elementColor = ELEMENT_COLORS[row.pillar.element]
  return (
    <View
      style={{
        width: '25%',
        padding: 4,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderRadius: 10,
          borderWidth: row.isCurrent ? 1.5 : 0.5,
          borderColor: row.isCurrent ? colors.accent : colors.separator,
          backgroundColor: colors.card,
          gap: 2,
        }}
      >
        <Text style={{ color: colors.dim, fontSize: 10 }}>{row.month}</Text>
        <Text style={{ color: elementColor, fontSize: 14, fontWeight: '500' }}>
          {row.pillar.stem}
          {row.pillar.branch}
        </Text>
      </View>
    </View>
  )
}

function LockedRow({
  label,
  colors,
  spacing,
  onPress,
}: {
  label: string
  colors: BodyColors
  spacing: BodySpacing
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.accent,
        backgroundColor: colors.accentGhost,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>
        {label}
      </Text>
      <ChevronRightIcon size={16} color={colors.accent} strokeWidth={1.4} />
    </Pressable>
  )
}

function NoBirthCard({
  onPress,
  colors,
  spacing,
  cta,
  body,
}: {
  onPress: () => void
  colors: BodyColors
  spacing: BodySpacing
  cta: string
  body: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={cta}
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
      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>{body}</Text>
      <Text
        style={{
          color: colors.accent,
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 1,
        }}
      >
        {cta}
      </Text>
    </Pressable>
  )
}
