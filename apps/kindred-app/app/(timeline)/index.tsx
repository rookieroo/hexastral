/**
 * Relationship Timeline (ADR-0014, BT.5) — Kindred's subscription moat.
 *
 * One ego-centric axis weaving the user × all their bonds: the significant
 * turning points ahead (流年 冲/合, either side's 大运 transition), merged and
 * privacy-projected server-side (no counterpart birth ever crosses the wire).
 *
 * Free = current year + all (≤3) bonds, no look-ahead. Pro (kindred_pro /
 * universe_pro) = full +15y path. The server is authoritative on the gate; this
 * screen renders what it returns and surfaces the upsell when `pro` is false.
 *
 * Tapping a node deep-explains it via POST /api/bonds/timeline/explain
 * (bondId-keyed; the counterpart's chart stays server-side, D2).
 *
 * NOTE: proactive LOCAL push for these nodes (the `notifications` timetable) is
 * the device/EAS batch step — the pure schedule builder ships ready + tested in
 * @zhop/scenario-kindred (buildTimelineNotificationPlan); wiring it needs
 * expo-notifications, added in the native build. See docs/bonds-timeline-plan.md.
 */

import { EmptyState, ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type BondsTimelineNode,
  type BondsTimelineSignificance,
  formatNodeKind,
  formatNodeSummary,
  type UseBondsTimelineResult,
  useBondsTimeline,
} from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { ensureTimelinePushPermission, syncTimelinePush } from '@/lib/timeline-push'

/** Significance → accent tint for the node's leading dot. */
function significanceColor(sig: BondsTimelineSignificance): string {
  switch (sig) {
    case 'major':
      return kindredDark.accent
    case 'notable':
      return kindredDark.seal
    default:
      return kindredDark.textMuted
  }
}

/** Group nodes by calendar year, years ascending; node order within a year kept. */
function groupByYear(
  nodes: BondsTimelineNode[]
): Array<{ year: number; nodes: BondsTimelineNode[] }> {
  const byYear = new Map<number, BondsTimelineNode[]>()
  for (const n of nodes) {
    const bucket = byYear.get(n.year)
    if (bucket) bucket.push(n)
    else byYear.set(n.year, [n])
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, ns]) => ({ year, nodes: ns }))
}

export default function TimelineScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { nodes, liuyue, notifications, pro, isLoading, error, refetch, explainNode } =
    useBondsTimeline()

  const grouped = useMemo(() => groupByYear(nodes), [nodes])

  // Lay the (Pro-only, server-computed) reminder timetable onto the device as
  // local notifications — prompts for permission on the first Pro timeline view,
  // then reschedules the rolling window on every visit (idempotent by node id).
  // Free users get an empty timetable → nothing scheduled + stale items cleared.
  useEffect(() => {
    if (!pro || notifications.length === 0) return
    void (async () => {
      await ensureTimelinePushPermission()
      await syncTimelinePush(notifications, locale)
    })()
  }, [pro, notifications, locale])

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <ErrorState
          variant='fullscreen'
          illustration={<KindredMoon size={72} />}
          title={t(locale, 'timeline.error.title')}
          message={error.message}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => void refetch()} block={false} />
          }
        />
      </SafeAreaView>
    )
  }

  if (nodes.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <Header locale={locale} onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            illustration={<KindredMoon size={96} />}
            title={t(locale, 'timeline.empty.title')}
            subtitle={t(locale, 'timeline.empty.body')}
            customAction={
              <PrimaryButton
                label={t(locale, 'timeline.empty.cta')}
                onPress={() => router.push('/(onboarding)/mode')}
                block={false}
              />
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <Header locale={locale} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingBottom: kindredSpacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ alignItems: 'center', gap: kindredSpacing.sm, marginBottom: kindredSpacing.lg }}
        >
          <KindredMoon size={48} />
          <Text style={[kindredType.title, { color: kindredDark.text }]}>
            {t(locale, 'timeline.title')}
          </Text>
          <Text
            style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}
          >
            {t(locale, 'timeline.subtitle')}
          </Text>
        </View>

        {!pro ? (
          <UpsellBanner locale={locale} onPress={() => router.push('/(commerce)/paywall')} />
        ) : null}

        {liuyue.length > 0 ? (
          <LiuYueStrip
            liuyue={liuyue}
            pro={pro}
            locale={locale}
            onUpsell={() => router.push('/(commerce)/paywall')}
          />
        ) : null}

        {grouped.map(({ year, nodes: yearNodes }) => (
          <View key={year} style={{ marginBottom: kindredSpacing.lg }}>
            <Text
              style={[
                kindredType.seal,
                { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
              ]}
            >
              {year}
            </Text>
            <View style={{ gap: kindredSpacing.sm }}>
              {yearNodes.map((node) => (
                <NodeCard key={node.key} node={node} locale={locale} explainNode={explainNode} />
              ))}
            </View>
          </View>
        ))}

        {!pro ? (
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.textMuted, textAlign: 'center', marginTop: kindredSpacing.sm },
            ]}
          >
            {t(locale, 'timeline.freeNote')}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const EN_SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function monthLabel(node: BondsTimelineNode, locale: Locale): string {
  const m = node.month ?? 1
  return locale === 'en' ? (EN_SHORT_MONTHS[m - 1] ?? `M${m}`) : `${m}月`
}

/**
 * 流月 living layer — the near-term rolling months across all bonds. A horizontal
 * strip of month chips (significance dot + 干支); tapping one reveals its calm /
 * notable read below. Free shows the current month + a locked rail prompting Pro
 * for the full 12-month window (mirrors the year axis free/Pro split).
 */
function LiuYueStrip({
  liuyue,
  pro,
  locale,
  onUpsell,
}: {
  liuyue: BondsTimelineNode[]
  pro: boolean
  locale: Locale
  onUpsell: () => void
}) {
  const [selectedKey, setSelectedKey] = useState<string>(liuyue[0]?.key ?? '')
  const selected = liuyue.find((n) => n.key === selectedKey) ?? liuyue[0]
  const names = selected?.bonds.map((b) => b.name).filter((n) => n.length > 0) ?? []

  return (
    <View style={{ marginBottom: kindredSpacing.lg }}>
      <Text
        style={[
          kindredType.seal,
          { color: kindredDark.textSecondary, marginBottom: kindredSpacing.xs },
        ]}
      >
        {t(locale, 'timeline.liuyue.title')}
      </Text>
      <Text
        style={[
          kindredType.caption,
          { color: kindredDark.textMuted, marginBottom: kindredSpacing.sm, lineHeight: 18 },
        ]}
      >
        {t(locale, 'timeline.liuyue.subtitle')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: kindredSpacing.sm, paddingRight: kindredSpacing.sm }}
      >
        {liuyue.map((node) => (
          <MonthChip
            key={node.key}
            node={node}
            locale={locale}
            selected={node.key === selectedKey}
            onPress={() => setSelectedKey(node.key)}
          />
        ))}
        {!pro ? (
          <Pressable
            onPress={onUpsell}
            accessibilityRole='button'
            style={({ pressed }) => ({
              minWidth: 64,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: kindredSpacing.sm,
              paddingHorizontal: kindredSpacing.md,
              borderRadius: kindredRadius.sm,
              borderWidth: 0.5,
              borderColor: kindredDark.accent,
              borderStyle: 'dashed',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>+12</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {selected ? (
        <View
          style={{
            marginTop: kindredSpacing.sm,
            borderWidth: 0.5,
            borderColor: kindredDark.border,
            borderRadius: kindredRadius.md,
            padding: kindredSpacing.lg,
            backgroundColor: kindredDark.card,
            gap: kindredSpacing.xs,
          }}
        >
          <Text style={[kindredType.body, { color: kindredDark.text, lineHeight: 22 }]}>
            {formatNodeSummary(selected, locale)}
          </Text>
          {names.length > 0 ? (
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'timeline.affects')}: {names.join(locale === 'en' ? ', ' : '、')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!pro ? (
        <Text
          style={[
            kindredType.caption,
            { color: kindredDark.textMuted, marginTop: kindredSpacing.xs },
          ]}
        >
          {t(locale, 'timeline.liuyue.locked')}
        </Text>
      ) : null}
    </View>
  )
}

function MonthChip({
  node,
  locale,
  selected,
  onPress,
}: {
  node: BondsTimelineNode
  locale: Locale
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      style={({ pressed }) => ({
        minWidth: 64,
        alignItems: 'center',
        gap: 4,
        paddingVertical: kindredSpacing.sm,
        paddingHorizontal: kindredSpacing.md,
        borderRadius: kindredRadius.sm,
        borderWidth: selected ? 1 : 0.5,
        borderColor: selected ? kindredDark.accent : kindredDark.border,
        backgroundColor: selected ? kindredDark.card : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
        {monthLabel(node, locale)}
      </Text>
      <Text style={[kindredType.caption, { color: kindredDark.text, fontSize: 13 }]}>
        {node.ganZhi}
      </Text>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: significanceColor(node.significance),
        }}
      />
    </Pressable>
  )
}

function Header({ locale, onBack }: { locale: Locale; onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: kindredSpacing.screenH,
        paddingTop: kindredSpacing.xl,
      }}
    >
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole='button'>
        <Text style={[kindredType.heading, { color: kindredDark.textMuted }]}>←</Text>
      </Pressable>
    </View>
  )
}

function UpsellBanner({ locale, onPress }: { locale: Locale; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={t(locale, 'timeline.upsell.cta')}
      style={({ pressed }) => ({
        borderWidth: 0.5,
        borderColor: kindredDark.accent,
        borderRadius: kindredRadius.md,
        padding: kindredSpacing.lg,
        marginBottom: kindredSpacing.lg,
        gap: kindredSpacing.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={[kindredType.heading, { color: kindredDark.text }]}>
        {t(locale, 'timeline.upsell.title')}
      </Text>
      <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
        {t(locale, 'timeline.upsell.body')}
      </Text>
      <Text
        style={[kindredType.caption, { color: kindredDark.accent, marginTop: kindredSpacing.xs }]}
      >
        {t(locale, 'timeline.upsell.cta')}
      </Text>
    </Pressable>
  )
}

/**
 * One merged node card. Tapping "深入解读" lazily fetches the deep explanation
 * (bondId-keyed; first touched bond) and reveals it inline.
 */
function NodeCard({
  node,
  locale,
  explainNode,
}: {
  node: BondsTimelineNode
  locale: Locale
  explainNode: UseBondsTimelineResult['explainNode']
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const names = node.bonds.map((b) => b.name).filter((n) => n.length > 0)
  const primaryBond = node.bonds[0]

  const onExplain = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (tried || !primaryBond) return
    setLoading(true)
    const res = await explainNode({
      bondId: primaryBond.bondId,
      year: node.year,
      nodeType: node.kind,
      daYunOf: node.daYunOf,
      locale,
    })
    setExplanation(res?.explanation ?? null)
    setTried(true)
    setLoading(false)
  }

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: kindredDark.border,
        borderRadius: kindredRadius.md,
        padding: kindredSpacing.lg,
        backgroundColor: kindredDark.card,
        gap: kindredSpacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: significanceColor(node.significance),
          }}
        />
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
          {formatNodeKind(node.kind, locale)} · {node.ganZhi}
        </Text>
      </View>

      <Text style={[kindredType.body, { color: kindredDark.text, lineHeight: 22 }]}>
        {formatNodeSummary(node, locale)}
      </Text>

      {names.length > 0 ? (
        <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
          {t(locale, 'timeline.affects')}: {names.join(locale === 'en' ? ', ' : '、')}
        </Text>
      ) : null}

      <Pressable onPress={() => void onExplain()} hitSlop={8} accessibilityRole='button'>
        <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
          {t(locale, 'timeline.explain.cta')}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={{ marginTop: kindredSpacing.xs }}>
          {loading ? (
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'timeline.explain.loading')}
            </Text>
          ) : (
            <Text
              style={[kindredType.caption, { color: kindredDark.textSecondary, lineHeight: 20 }]}
            >
              {explanation ?? t(locale, 'timeline.explain.empty')}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  )
}
