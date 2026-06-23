/**
 * Relationship Make-If (Workstream B) — forward decision support for one bond.
 *
 * "假如我们在某个窗口推进这段关系，哪个时机最合？" Runs POST /api/bonds/:id/makeif:
 * the server ranks the pair's forward 流月 windows by 用神 alignment + 冲/合 and
 * returns a deterministic verdict. Forward-only framing — never past rumination
 * about a real person (the risky use the Auspice S5 cut flagged).
 *
 * Pro/subscription gated server-side; this screen renders the upsell when the
 * response comes back `pro: false`. Verdict / reasons are localized client-side
 * from the structured flags (the engine emits zh) so the English surface is clean.
 */

import { ErrorState } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type DecisionLean,
  elementName,
  formatLean,
  formatLongtermVerdict,
  formatVerdict,
  formatWindowMonth,
  formatWindowReasons,
  formatYearLabel,
  formatYearReasons,
  type RelMakeIfResponse,
  type RelMakeIfWindow,
  type RelMakeIfYear,
  useBondMakeIf,
} from '@zhop/scenario-kindred'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '@/components/PrimaryButton'
import { type RailItem, RelationshipGitGraph } from '@/components/timeline/RelationshipGitGraph'
import { YuelMark } from '@/components/YuelMark'
import { type Locale, resolveLocale, t } from '@/lib/i18n'

/**
 * Relationship-move chips (the auspice make-if parallel, honestly adapted). The
 * pair-timing ranking is genuinely SHARED across moves — the best month to advance
 * is the best month whether you propose or cohabit (it's your 用神 + 合/冲, which
 * don't change with the move). So a chip doesn't fabricate a different ranking; it
 * re-WEIGHTS the same windows by what that move leans on (合 vs 用神, from the real
 * per-window flags) and frames the read for that step. No engine change.
 */
type RelMove = 'commit' | 'cohabit' | 'distance' | 'child'
const REL_MOVES: readonly RelMove[] = ['commit', 'cohabit', 'distance', 'child']
/** Each move leans on its real 神煞 (now surfaced by the engine): 求婚/同居 → 桃花·合,
 *  异地 → 驿马·用神, 要孩子 → 食伤·合. The base score (用神 + 合/冲) stays shared. */
const MOVE_WEIGHTS: Record<
  RelMove,
  { harmony: number; yongshen: number; taohua: number; yima: number; shishang: number }
> = {
  commit: { harmony: 2, yongshen: 1, taohua: 3, yima: 0, shishang: 0 }, // 求婚 — 桃花 + 合
  cohabit: { harmony: 2, yongshen: 1, taohua: 2, yima: 0, shishang: 0 }, // 同居 — 合 + 桃花 + 稳
  distance: { harmony: 0, yongshen: 1, taohua: 0, yima: 3, shishang: 0 }, // 异地 — 驿马 + 用神
  child: { harmony: 1, yongshen: 1, taohua: 0, yima: 0, shishang: 3 }, // 要孩子 — 食伤 + 合
}
function moveBonus(
  w: Pick<
    RelMakeIfWindow,
    'isYongshen' | 'feedsYongshen' | 'harmony' | 'taohua' | 'yima' | 'shishang'
  >,
  move: RelMove
): number {
  const wt = MOVE_WEIGHTS[move]
  const ys = w.isYongshen ? 1 : w.feedsYongshen ? 0.5 : 0
  return (
    (w.harmony ? wt.harmony : 0) +
    ys * wt.yongshen +
    (w.taohua ? wt.taohua : 0) +
    (w.yima ? wt.yima : 0) +
    (w.shishang ? wt.shishang : 0)
  )
}

function leanColor(lean: DecisionLean): string {
  switch (lean) {
    case 'favorable':
      return kindredDark.accent
    case 'caution':
      return kindredDark.seal
    default:
      return kindredDark.textMuted
  }
}

export default function MakeIfScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const { id, quote } = useLocalSearchParams<{ id: string; title?: string; quote?: string }>()
  const { data, isLoading, error, run } = useBondMakeIf()

  useEffect(() => {
    if (id) void run(id)
  }, [id, run])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole='button'>
          <Text style={[kindredType.heading, { color: kindredDark.textMuted }]}>←</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
          <Text
            style={[
              kindredType.caption,
              { color: kindredDark.textMuted, marginTop: kindredSpacing.lg },
            ]}
          >
            {t(locale, 'makeif.loading')}
          </Text>
        </View>
      ) : error ? (
        <ErrorState
          variant='fullscreen'
          illustration={<YuelMark vertical size={72} color={kindredDark.seal} />}
          title={t(locale, 'makeif.error')}
          message={error.message}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => id && void run(id)} block={false} />
          }
        />
      ) : data ? (
        <Body
          data={data}
          locale={locale}
          quote={quote}
          onUpsell={() => router.push('/(commerce)/paywall')}
        />
      ) : null}
    </SafeAreaView>
  )
}

function Body({
  data,
  locale,
  quote,
  onUpsell,
}: {
  data: RelMakeIfResponse
  locale: Locale
  quote?: string
  onUpsell: () => void
}) {
  const trimmedQuote = quote ? (quote.length > 120 ? `${quote.slice(0, 120)}…` : quote) : null
  // Optional relationship-move lens — re-weights the shared pair-timing by what
  // the chosen step leans on. null = the general "advance" view (server order).
  const [move, setMove] = useState<RelMove | null>(null)
  const ranked = useMemo(() => {
    const windows = data.windows ?? []
    if (!move) return windows
    return [...windows].sort(
      (a, b) => b.score + moveBonus(b, move) - (a.score + moveBonus(a, move))
    )
  }, [data.windows, move])
  const bestKey = move ? ranked[0]?.key : data.bestKey
  // The decade-ahead tier — same move re-weighting, year granularity.
  const longterm = data.longterm
  const rankedYears = useMemo(() => {
    const years = longterm?.years ?? []
    if (!move) return years
    return [...years].sort((a, b) => b.score + moveBonus(b, move) - (a.score + moveBonus(a, move)))
  }, [longterm, move])
  const bestYearKey = move ? rankedYears[0]?.key : longterm?.bestYearKey

  // The monthly windows as a git-graph: chronological 你+TA rail, each window coloured
  // by its decision lean, the best window (for the selected move) aglow. Tapping a node
  // shows its window card. (Time axis on the rail; the move chip moves the glow.)
  const { width: winW } = useWindowDimensions()
  const [selectedWindowKey, setSelectedWindowKey] = useState<string | null>(null)
  const windowItems = useMemo<RailItem[]>(
    () =>
      [...(data.windows ?? [])]
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map((w) => ({
          key: w.key,
          color: leanColor(w.lean),
          radius: w.lean === 'favorable' ? 7 : w.lean === 'caution' ? 6 : 5,
          glow: w.key === bestKey,
          title: `${formatWindowMonth(w, locale)} · ${w.ganZhi}`,
          sub: w.key === bestKey ? t(locale, 'makeif.best') : formatLean(w.lean, locale),
        })),
    [data.windows, bestKey, locale]
  )
  const shownWindowKey = selectedWindowKey ?? bestKey ?? null
  const shownWindow = (data.windows ?? []).find((w) => w.key === shownWindowKey) ?? null

  return (
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
          {t(locale, 'makeif.title')}
        </Text>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}>
          {t(locale, 'makeif.subtitle')}
        </Text>
      </View>

      {/* 划词 → make-if: the report sentence that launched this read, shown as
          context (a cinnabar-edged quote) so the timing read is anchored to it. */}
      {trimmedQuote ? (
        <View
          style={{
            flexDirection: 'row',
            gap: kindredSpacing.sm,
            marginBottom: kindredSpacing.lg,
            paddingHorizontal: kindredSpacing.md,
          }}
        >
          <View style={{ width: 2, alignSelf: 'stretch', backgroundColor: kindredDark.accent }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
              {t(locale, 'makeif.fromQuote')}
            </Text>
            <Text
              style={[kindredType.caption, { color: kindredDark.textSecondary, lineHeight: 19 }]}
            >
              {trimmedQuote}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Content shows for free + Pro now (free = the near-term monthly taste); the
          10-year tier below is the Pro depth — free gets an upsell card in its place. */}
      {
        <>
          {/* 用神 — the bridging element */}
          {data.yongshen ? (
            <View
              style={{
                borderWidth: 0.5,
                borderColor: kindredDark.border,
                borderRadius: kindredRadius.md,
                padding: kindredSpacing.lg,
                backgroundColor: kindredDark.card,
                marginBottom: kindredSpacing.md,
                gap: 4,
              }}
            >
              <Text style={[kindredType.caption, { color: kindredDark.textSecondary }]}>
                {t(locale, 'makeif.yongshen.label')}
              </Text>
              <Text style={[kindredType.heading, { color: kindredDark.accent }]}>
                {elementName(data.yongshen, locale)}
              </Text>
            </View>
          ) : null}

          {/* The read — synthesis verdict */}
          <Text
            style={[
              kindredType.body,
              { color: kindredDark.text, lineHeight: 23, marginBottom: kindredSpacing.lg },
            ]}
          >
            {formatVerdict(data, locale)}
          </Text>

          {/* Relationship-move lens — pick the step you're weighing; the windows
              re-order to what it leans on (合 / 用神), with a one-line framing. */}
          <Text
            style={[
              kindredType.seal,
              { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
            ]}
          >
            {t(locale, 'makeif.movePrompt')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: kindredSpacing.sm }}>
            {REL_MOVES.map((m) => {
              const on = m === move
              return (
                <Pressable
                  key={m}
                  onPress={() => setMove(on ? null : m)}
                  accessibilityRole='button'
                  accessibilityState={{ selected: on }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 13,
                    borderRadius: 999,
                    borderWidth: 0.5,
                    borderColor: on ? kindredDark.accent : kindredDark.border,
                    backgroundColor: on ? `${kindredDark.accent}22` : 'transparent',
                  }}
                >
                  <Text
                    style={[
                      kindredType.caption,
                      { color: on ? kindredDark.accent : kindredDark.textSecondary },
                    ]}
                  >
                    {t(locale, `makeif.move.${m}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {move ? (
            <Text
              style={[
                kindredType.caption,
                {
                  color: kindredDark.textMuted,
                  lineHeight: 19,
                  marginTop: kindredSpacing.sm,
                },
              ]}
            >
              {t(locale, `makeif.guide.${move}`)}
            </Text>
          ) : null}

          {/* Month by month */}
          <Text
            style={[
              kindredType.seal,
              {
                color: kindredDark.textSecondary,
                marginTop: kindredSpacing.lg,
                marginBottom: kindredSpacing.sm,
              },
            ]}
          >
            {t(locale, 'makeif.windows.label')}
          </Text>
          <RelationshipGitGraph
            items={windowItems}
            selectedKey={shownWindowKey}
            onSelect={setSelectedWindowKey}
            width={winW - kindredSpacing.screenH * 2}
          />
          {shownWindow ? (
            <View style={{ marginTop: kindredSpacing.sm }}>
              <WindowCard
                w={shownWindow}
                yongshen={data.yongshen ?? ''}
                isBest={shownWindow.key === bestKey}
                locale={locale}
              />
            </View>
          ) : null}

          {/* The decade ahead — the 10-year tier: which YEAR best fits a big step. */}
          {longterm && rankedYears.length > 0 ? (
            <>
              <Text
                style={[
                  kindredType.seal,
                  {
                    color: kindredDark.textSecondary,
                    marginTop: kindredSpacing.xl,
                    marginBottom: kindredSpacing.sm,
                  },
                ]}
              >
                {t(locale, 'makeif.years.label')}
              </Text>
              <Text
                style={[
                  kindredType.caption,
                  { color: kindredDark.textMuted, lineHeight: 19, marginBottom: kindredSpacing.sm },
                ]}
              >
                {formatLongtermVerdict(data, locale)}
              </Text>
              <View style={{ gap: kindredSpacing.sm }}>
                {rankedYears.map((y) => (
                  <YearRow
                    key={y.key}
                    y={y}
                    yongshen={data.yongshen ?? ''}
                    isBest={y.key === bestYearKey}
                    locale={locale}
                  />
                ))}
              </View>
            </>
          ) : !data.pro ? (
            <View
              style={{
                marginTop: kindredSpacing.xl,
                borderWidth: 0.5,
                borderColor: kindredDark.accent,
                borderRadius: kindredRadius.md,
                padding: kindredSpacing.lg,
                gap: kindredSpacing.sm,
              }}
            >
              <Text style={[kindredType.heading, { color: kindredDark.text }]}>
                {t(locale, 'makeif.upsell.title')}
              </Text>
              <Text style={[kindredType.caption, { color: kindredDark.textMuted, lineHeight: 18 }]}>
                {t(locale, 'makeif.upsell.body')}
              </Text>
              <PrimaryButton label={t(locale, 'makeif.upsell.cta')} onPress={onUpsell} />
            </View>
          ) : null}
        </>
      }
    </ScrollView>
  )
}

function WindowCard({
  w,
  yongshen,
  isBest,
  locale,
}: {
  w: RelMakeIfWindow
  yongshen: string
  isBest: boolean
  locale: Locale
}) {
  const reasons = formatWindowReasons(w, yongshen, locale)
  return (
    <View
      style={{
        borderWidth: isBest ? 1 : 0.5,
        borderColor: isBest ? kindredDark.accent : kindredDark.border,
        borderRadius: kindredRadius.md,
        padding: kindredSpacing.lg,
        backgroundColor: kindredDark.card,
        gap: kindredSpacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leanColor(w.lean) }}
        />
        <Text style={[kindredType.body, { color: kindredDark.text }]}>
          {formatWindowMonth(w, locale)} · {w.ganZhi}
        </Text>
        <View style={{ flex: 1 }} />
        {isBest ? (
          <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
            {t(locale, 'makeif.best')}
          </Text>
        ) : (
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {formatLean(w.lean, locale)}
          </Text>
        )}
      </View>
      {reasons.length > 0 ? (
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary, lineHeight: 19 }]}>
          {reasons.join(locale === 'en' ? ' · ' : '；')}
        </Text>
      ) : null}
    </View>
  )
}

function YearRow({
  y,
  yongshen,
  isBest,
  locale,
}: {
  y: RelMakeIfYear
  yongshen: string
  isBest: boolean
  locale: Locale
}) {
  const reasons = formatYearReasons(y, yongshen, locale)
  return (
    <View
      style={{
        borderWidth: isBest ? 1 : 0.5,
        borderColor: isBest ? kindredDark.accent : kindredDark.border,
        borderRadius: kindredRadius.md,
        padding: kindredSpacing.lg,
        backgroundColor: kindredDark.card,
        gap: kindredSpacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: leanColor(y.lean) }}
        />
        <Text style={[kindredType.body, { color: kindredDark.text }]}>
          {formatYearLabel(y, locale)} · {y.ganZhi}
        </Text>
        <View style={{ flex: 1 }} />
        {isBest ? (
          <Text style={[kindredType.caption, { color: kindredDark.accent }]}>
            {t(locale, 'makeif.best')}
          </Text>
        ) : (
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {formatLean(y.lean, locale)}
          </Text>
        )}
      </View>
      {reasons.length > 0 ? (
        <Text style={[kindredType.caption, { color: kindredDark.textSecondary, lineHeight: 19 }]}>
          {reasons.join(locale === 'en' ? ' · ' : '；')}
        </Text>
      ) : null}
    </View>
  )
}
