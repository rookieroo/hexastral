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
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { type Locale, resolveLocale, t } from '@/lib/i18n'

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
  const { nodes, pro, isLoading, error, refetch, explainNode } = useBondsTimeline()

  const grouped = useMemo(() => groupByYear(nodes), [nodes])

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
