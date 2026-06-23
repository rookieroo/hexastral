/**
 * Relationship Timeline (ADR-0014, BT.5) — Kindred's subscription moat.
 *
 * One ego-centric axis weaving the user × all their bonds: the significant
 * turning points ahead (流年 冲/合, either side's 大运 transition), merged and
 * privacy-projected server-side (no counterpart birth ever crosses the wire).
 *
 * Gate (2026-06): a subscription wall, symmetric with what-if. Free = no nodes
 * (the server early-returns the upsell) → this screen shows the paywall + a
 * locked preview. Pro (kindred_pro / universe_pro) = the full +15y path, 12-month
 * 流月, and the push timetable. The server is authoritative on the gate.
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '@/components/PrimaryButton'
import { RelationshipGitGraph } from '@/components/timeline/RelationshipGitGraph'
import { YuelMark } from '@/components/YuelMark'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import {
  ensureTimelinePushPermission,
  syncLiuyueDigest,
  syncTimelinePush,
} from '@/lib/timeline-push'

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
  // Per-bond entry (row left-swipe / report 划词): scope the ego axis to ONE bond
  // (2026-06: "timeline & make-if 以合盘为单位"). No param → the full ego axis.
  const { bondId, bondName } = useLocalSearchParams<{ bondId?: string; bondName?: string }>()
  const {
    nodes: allNodes,
    liuyue,
    notifications,
    pro,
    isLoading,
    error,
    refetch,
    far,
    loadFurther,
    explainNode,
  } = useBondsTimeline()

  const nodes = useMemo(
    () => (bondId ? allNodes.filter((n) => n.bonds.some((b) => b.bondId === bondId)) : allNodes),
    [allNodes, bondId]
  )
  const grouped = useMemo(() => groupByYear(nodes), [nodes])

  // Thread labels for the per-bond weave (你 + TA). TA falls back to a neutral
  // pronoun when the bond name didn't ride the route params.
  const youLabel = locale.startsWith('zh') ? '你' : locale === 'ja' ? 'あなた' : 'You'
  const taFallback = locale.startsWith('zh') ? 'TA' : locale === 'ja' ? '相手' : 'Them'

  // Per-bond git-graph: the graph + the selected node's card (Yuun's graph+detail
  // pattern). Defaults to the first turning point until the reader taps another.
  const { width: winW } = useWindowDimensions()
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null)
  const selectedNode = nodes.find((n) => n.key === selectedNodeKey) ?? nodes[0] ?? null

  // Lay the (Pro-only, server-computed) reminder timetable onto the device as
  // local notifications — prompts for permission on the first Pro timeline view,
  // then reschedules the rolling window on every visit (idempotent by node id).
  // Free users get an empty timetable → nothing scheduled + stale items cleared.
  // Two Pro local-push sets: the lifetime-axis key nodes (server timetable) + the
  // monthly 流月 relationship digest (the recurring touch between rarer nodes,
  // derived client-side from the liuyue window). Separate id prefixes → no clash.
  useEffect(() => {
    if (!pro || (notifications.length === 0 && liuyue.length === 0)) return
    void (async () => {
      await ensureTimelinePushPermission()
      await syncTimelinePush(notifications, locale)
      await syncLiuyueDigest(liuyue, locale)
    })()
  }, [pro, notifications, liuyue, locale])

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
          illustration={<YuelMark vertical size={72} color={kindredDark.seal} />}
          title={t(locale, 'timeline.error.title')}
          message={error.message}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => void refetch()} block={false} />
          }
        />
      </SafeAreaView>
    )
  }

  // Free tier (Phase 3): a near-term taste — the next ~3 months of 流月 the server
  // sends for free — then the upsell. The 10-year axis + full 12-month 流月 + push
  // stay the Pro moat. Never an endless loader (server returns the light slice; the
  // hook has a 20s timeout).
  if (!pro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <Header onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: kindredSpacing.screenH,
            paddingTop: kindredSpacing.xl,
            paddingBottom: kindredSpacing.xxl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignItems: 'center',
              gap: kindredSpacing.sm,
              marginBottom: kindredSpacing.xl,
            }}
          >
            <YuelMark vertical size={64} color={kindredDark.seal} />
            <Text style={[kindredType.title, { color: kindredDark.text }]}>
              {bondName || t(locale, 'timeline.title')}
            </Text>
          </View>
          {liuyue.length > 0 ? (
            <LiuYueStrip
              liuyue={liuyue}
              pro={false}
              locale={locale}
              onUpsell={() => router.push('/(commerce)/paywall')}
            />
          ) : null}
          <UpsellBanner locale={locale} onPress={() => router.push('/(commerce)/paywall')} />
          <LockedPreview locale={locale} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (nodes.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <Header onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            illustration={<YuelMark vertical size={96} color={kindredDark.seal} />}
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
      <Header onBack={() => router.back()} />
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
          <YuelMark vertical size={48} color={kindredDark.seal} />
          <Text style={[kindredType.title, { color: kindredDark.text }]}>
            {bondName || t(locale, 'timeline.title')}
          </Text>
          {/* The "across every bond" subtitle only fits the full ego axis. */}
          {!bondId ? (
            <Text
              style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}
            >
              {t(locale, 'timeline.subtitle')}
            </Text>
          ) : null}
        </View>

        {/* Past the `!pro` wall above this is the Pro view (server returns nodes
            only for Pro). Near-term 流月 strip is the ego (all-bonds) view — hide
            it in per-bond mode. */}
        {!bondId && liuyue.length > 0 ? (
          <LiuYueStrip
            liuyue={liuyue}
            pro={pro}
            locale={locale}
            onUpsell={() => router.push('/(commerce)/paywall')}
          />
        ) : null}

        {/* Per-bond axis (opened from the 合盘 report) → a Skia git-graph: 你 + TA run
            as two threads, tied at each turning point, with the selected node's card
            below (Yuun's graph + detail pattern). The all-bonds ego axis (你 × many)
            keeps the single year-grouped spine. */}
        {bondId ? (
          <>
            <ThreadLegend youLabel={youLabel} taLabel={bondName || taFallback} />
            <RelationshipGitGraph
              nodes={nodes}
              selectedKey={selectedNode?.key ?? null}
              onSelect={setSelectedNodeKey}
              width={winW - kindredSpacing.screenH * 2}
              yearLabel={(node) => `${node.year} · ${node.ganZhi}`}
            />
            {selectedNode ? (
              <View style={{ marginTop: kindredSpacing.md }}>
                <NodeCard node={selectedNode} locale={locale} explainNode={explainNode} />
              </View>
            ) : null}
          </>
        ) : (
          grouped.map(({ year, nodes: yearNodes }) => (
            <View key={year}>
              <SpineRow ring dotColor={kindredDark.accent} dotSize={11}>
                <Text
                  style={[
                    kindredType.seal,
                    { color: kindredDark.textSecondary, paddingTop: 1, marginBottom: 2 },
                  ]}
                >
                  {year}
                </Text>
              </SpineRow>
              {yearNodes.map((node) => (
                <SpineRow key={node.key} dotColor={significanceColor(node.significance)}>
                  <NodeCard node={node} locale={locale} explainNode={explainNode} />
                </SpineRow>
              ))}
            </View>
          ))
        )}

        {/* Hidden door: the default axis is 10y (what matters near-term); a quiet
            tap loads the beyond-10y view for those who want the long arc. */}
        {pro && !far && nodes.length > 0 ? (
          <Pressable
            onPress={loadFurther}
            hitSlop={8}
            accessibilityRole='button'
            style={{ alignItems: 'center', paddingTop: kindredSpacing.md }}
          >
            <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
              {t(locale, 'timeline.seeFurther')}
            </Text>
          </Pressable>
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

function Header({ onBack }: { onBack: () => void }) {
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

/** The locked feature list shown under the wall — what Pro unlocks, as calm
 *  dashed ghost rows so the value is legible without showing real nodes. */
function LockedPreview({ locale }: { locale: Locale }) {
  const items = [
    t(locale, 'timeline.locked.years'),
    t(locale, 'timeline.locked.liuyue'),
    t(locale, 'timeline.locked.push'),
  ]
  return (
    <View style={{ marginTop: kindredSpacing.xl, gap: kindredSpacing.sm }}>
      <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>
        {t(locale, 'timeline.locked.title')}
      </Text>
      {items.map((label) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: kindredSpacing.sm,
            borderWidth: 0.5,
            borderColor: kindredDark.border,
            borderStyle: 'dashed',
            borderRadius: kindredRadius.md,
            paddingVertical: kindredSpacing.md,
            paddingHorizontal: kindredSpacing.lg,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              borderWidth: 1.5,
              borderColor: kindredDark.textMuted,
            }}
          />
          <Text style={[kindredType.caption, { color: kindredDark.textSecondary, flex: 1 }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

/**
 * One merged node card. Tapping "深入解读" lazily fetches the deep explanation
 * (bondId-keyed; first touched bond) and reveals it inline.
 */
/**
 * One row of the timeline git-graph: a fixed rail cell (the continuous spine +
 * this row's node) and the content to its right. `ring` marks a year node (open
 * ring on the line); a solid dot marks a turning-point. The line is absolute +
 * full-height so stacked rows read as one unbroken spine.
 */
function SpineRow({
  dotColor,
  dotSize = 8,
  ring = false,
  children,
}: {
  dotColor: string
  dotSize?: number
  ring?: boolean
  children: ReactNode
}) {
  const RAIL_W = 26
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: RAIL_W, alignItems: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 1.5,
            left: RAIL_W / 2 - 0.75,
            backgroundColor: kindredDark.border,
          }}
        />
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginTop: 5,
            backgroundColor: ring ? kindredDark.bg : dotColor,
            borderWidth: ring ? 2 : 0,
            borderColor: dotColor,
          }}
        />
      </View>
      <View style={{ flex: 1, paddingBottom: kindredSpacing.sm }}>{children}</View>
    </View>
  )
}

// The two threads of a PER-BOND timeline — 你 (gold) + TA (cool silver): the
// ThreadLegend swatches. The rail itself is now RelationshipGitGraph (a Skia graph),
// so the old plain-RN ThreadRow weave was retired.
const YOU_THREAD = kindredDark.accent
const TA_THREAD = '#9ab0cf'

/** Small legend that names the two threads (per-bond mode only). */
function ThreadLegend({ youLabel, taLabel }: { youLabel: string; taLabel: string }) {
  const swatch = (color: string) => (
    <View style={{ width: 14, height: 1.5, borderRadius: 1, backgroundColor: color }} />
  )
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: kindredSpacing.sm,
        marginBottom: kindredSpacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {swatch(YOU_THREAD)}
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>{youLabel}</Text>
      </View>
      <Text style={{ color: kindredDark.textMuted, fontSize: 12 }}>·</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {swatch(TA_THREAD)}
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>{taLabel}</Text>
      </View>
    </View>
  )
}

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
      {/* Significance dot now lives on the spine; the card leads with the kind. */}
      <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
        {formatNodeKind(node.kind, locale)} · {node.ganZhi}
      </Text>

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
