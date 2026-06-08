/**
 * TimelineGraph — the 人生时间线 rendered as a git graph (ADR-0020, 2026-06 redesign).
 *
 * Why a git graph: a life isn't a flat list of decades. The natal 八字 (命局) is
 * the single SOURCE — 本同源 — and each 大运 is a 10-year *branch* that diverges
 * from the through-line of self, runs its course, and merges back. The 大运 you
 * are living now is the *checked-out* branch (HEAD): it stays open and carries
 * the 流年 as commits, with "now" glowing at the tip. Past 大运 are merged;
 * future 大运 continue down the trunk, unlived.
 *
 * Rendering follows the repo Skia convention (see BondsStarfield / MoonPhaseLoader):
 * the Canvas draws only geometry (trunk, branch curves, commit dots); the 干支 /
 * 年龄 labels and tap targets are absolutely-positioned RN layers sharing the
 * same coordinate space. No bordered cards — lines, dots, and the app's own type.
 *
 * Free vs Pro is ONE wall: Free sees the SOURCE + the current 大运 branch + the
 * current 流年 (ghosts above/below mark the rest of the life); Pro lights up the
 * whole graph. The single unlock CTA lives at the very bottom of the page.
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import {
  analyzeBranchAgainstNatal,
  type EarthlyBranch,
  getShiShen,
  type HeavenlyStem,
  type IncomingBranchInteractionKind,
  type ShiShenCategory,
} from '@zhop/astro-core'
import { verdictColors } from '@zhop/hexastral-tokens/palette'
import * as Haptics from 'expo-haptics'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { DayunRow, LiunianRow, LiuyueRow, PersonalFit, TimelinePayload } from '@/lib/api'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

/** 对你而言 verdict → dot color, from the token single-source (`verdictColors`):
 *  吉 = jade, 平 = neutral grey, 凶 = alarm red. Shared across timeline / make-if. */
const FIT_COLOR: Record<PersonalFit, string> = verdictColors

/** The single most salient "why" tag a period earns (priority-ranked, one per node). */
type ChipKind =
  | 'clash'
  | 'jiesha'
  | 'unfavorable'
  | 'guiren'
  | 'favorable'
  | 'wenchang'
  | 'jiangxing'
  | 'taohua'
  | 'yima'
  | 'sanhe'
  | 'sanhui'
  | 'liuhe'
  | 'sanxing'
  | 'liuhai'
  | 'zixing'

/** Chip tint — caution warm-red, help gold/green, study blue, leadership purple,
 *  合 (positive interaction) cool-emerald/teal/cyan, 刑害 (negative interaction)
 *  deeper rust/amber than the plain 冲 to read as "more nuanced than 冲". */
const CHIP_COLOR: Record<ChipKind, string> = {
  clash: '#C2410C',
  jiesha: '#B91C1C',
  unfavorable: '#C2410C',
  guiren: '#15803D',
  favorable: '#B8860B',
  wenchang: '#1D4ED8',
  jiangxing: '#7C3AED',
  taohua: '#C45D8D',
  yima: '#2A8C7F',
  sanhe: '#047857',
  sanhui: '#0F766E',
  liuhe: '#0E7490',
  sanxing: '#92400E',
  liuhai: '#7C2D12',
  zixing: '#78350F',
}

/** The 本命-derived 神煞 branches a period can land on (the per-node "event flavor"). */
export interface ShenShaBranches {
  taohua?: string
  yima?: string
  /** 天乙贵人 — two branches. */
  guiren?: readonly string[]
  wenchang?: string
  jiangxing?: string
  jiesha?: string
}

/**
 * Pick the ONE most salient reason for a period — not a pile of tags. Priority
 * (rare strong-positive > caution > help > flavor):
 *   三合局 > 三会局 > 冲太岁 > 劫煞 > 忌神 > 三刑 > 六害 > 天乙贵人 > 六合 > 用神 >
 *   文昌 > 将星 > 桃花 > 驿马 > 自刑.
 * 三合局/三会局/六合 (positive) + 三刑/六害/自刑 (nuanced negative) and 冲 come from
 * `analyzeBranchAgainstNatal` — the period branch vs all 4 本命支 — so we now
 * surface the full 冲合刑害会 layer, not just 冲年支 (the old `personal_clash`).
 * 神煞 come from the period branch vs the natal anchors; 用神/忌神 from server.
 */
function chipFor(
  reasons: readonly string[],
  branch: string,
  ss?: ShenShaBranches,
  /** Precomputed period-branch ↔ natal interaction (合化冲刑害). */
  interaction?: IncomingBranchInteractionKind | null
): ChipKind | undefined {
  if (interaction === 'sanhe-ju') return 'sanhe'
  if (interaction === 'sanhui-ju') return 'sanhui'
  if (interaction === 'chong' || reasons.includes('personal_clash')) return 'clash'
  if (ss?.jiesha && branch === ss.jiesha) return 'jiesha'
  if (reasons.includes('unfavorable_element_present')) return 'unfavorable'
  if (interaction === 'sanxing') return 'sanxing'
  if (interaction === 'liuhai') return 'liuhai'
  if (ss?.guiren?.includes(branch)) return 'guiren'
  if (interaction === 'liuhe') return 'liuhe'
  if (reasons.includes('favorable_element_present')) return 'favorable'
  if (ss?.wenchang && branch === ss.wenchang) return 'wenchang'
  if (ss?.jiangxing && branch === ss.jiangxing) return 'jiangxing'
  if (ss?.taohua && branch === ss.taohua) return 'taohua'
  if (ss?.yima && branch === ss.yima) return 'yima'
  if (interaction === 'zixing') return 'zixing'
  return undefined
}

// ── Geometry ────────────────────────────────────────────────────────────────
const TRUNK_X = 26 // through-line of self (命) lane
const BRANCH_X = 52 // 大运 / 流年 branch lane (tight, git-graph spacing)
const PAD_TOP = 18
const STEP = 46 // vertical rhythm between stacked nodes
const NODE_R = 7
const HEAD_R = 10
const SOURCE_R = 9

/** 大运 lane colour BY 十神 domain — the branch hue carries MEANING (this is a 财
 *  decade / a 官杀 decade …), not a positional rainbow. It lines up with the
 *  domain label shown inline on the 大运. Picked to read on light + dark themes
 *  and stay clear of the gold accent trunk + the chip colours. */
// MUTED, warm-toned variants (not generic web green/blue/red) so the lanes sit
// inside the ivory + gold almanac palette instead of fighting it. Each still maps
// to its 十神 domain; tuned to read against the faint gold trunk + on dark theme.
export const DOMAIN_COLORS: Record<ShiShenCategory, string> = {
  比劫: '#4E7C6F', // muted jade — peers · competition · self-reliance
  食伤: '#7A5C86', // muted plum — output · expression · creativity
  财星: '#C0883E', // muted amber — wealth · acquisition
  官杀: '#B5503A', // muted terracotta — authority · pressure · discipline
  印绶: '#4C5C7A', // muted slate-indigo — support · study · protection
}

interface GColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

type NodeState = 'past' | 'current' | 'future'

interface GNode {
  id: string
  x: number
  y: number
  r: number
  kind: 'source' | 'dayun' | 'liunian' | 'mergeBack'
  state: NodeState
  /** Free users only see SOURCE + current 大运 branch + current 流年. */
  locked: boolean
  isHead: boolean
  element: '木' | '火' | '土' | '金' | '水'
  fit?: PersonalFit
  /** The single most salient "why" tag (the per-node reason; one only). */
  chip?: ChipKind
  /** The one forward-looking 爆点 node — enlarged + emphasized for the share. */
  isHero?: boolean
  /** 十神 decade-theme — the life domain this 大运 activates (大运 nodes only). */
  domain?: ShiShenCategory
  /** Per-branch git tint — paints lane strokes + 大运 head / merge-back rings. */
  branchColor?: string
  title: string
  sub: string
  /** Index back into the source rows for the detail panel. */
  ref:
    | { kind: 'source' }
    | { kind: 'dayun'; row: DayunRow }
    | { kind: 'liunian'; row: LiunianRow }
    | { kind: 'mergeBack'; row: DayunRow }
}

/** One drawable branch — peel curve + lane line + merge curve, all in ONE hue. */
interface GBranch {
  color: string
  path: ReturnType<typeof Skia.Path.Make>
  /** Free + non-current = ghost bump (dashed gray). */
  ghost: boolean
}

interface BuiltGraph {
  width: number
  height: number
  nodes: GNode[]
  trunkPath: ReturnType<typeof Skia.Path.Make>
  branches: GBranch[]
}

/**
 * A tight git-graph S-elbow between a trunk point and a branch node: leave the
 * start vertically and arrive vertically — the short corner GitLens / Tower draw,
 * matching the make-if graph + the screenshot-5 reference. Symmetric in x, so the
 * same curve serves both the peel (trunk → lane) and the merge (lane → trunk).
 */
function curve(
  p: ReturnType<typeof Skia.Path.Make>,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dy = y2 - y1
  p.moveTo(x1, y1)
  p.cubicTo(x1, y1 + dy * 0.5, x2, y2 - dy * 0.5, x2, y2)
}

function buildGraph(
  payload: TimelinePayload,
  isPro: boolean,
  width: number,
  shensha?: ShenShaBranches,
  /** Set of 大运 indices to render expanded (with all their 流年 commits). 大运
   *  NOT in this set collapse to just their head + merge node — past + far-future
   *  decades stay tidy by default; the user taps a head to expand. Empty/undefined
   *  falls back to "current decade only". */
  expandedDayunIndices?: ReadonlySet<number>
): BuiltGraph {
  const nodes: GNode[] = []
  const trunkPath = Skia.Path.Make()
  const branches: GBranch[] = []

  const cur = payload.currentDayunIndex
  const thisYear = new Date().getFullYear()
  const dayMaster = payload.pillars.day
  // 本命四柱地支 — anchor for the per-node 冲合刑害会 analysis (hour pillar may be
  // unknown; fall back to the day branch so we still have a 4-tuple). The cast is
  // safe: the server already validated branches against the 地支 alphabet.
  const natalBranches: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch, EarthlyBranch] = [
    payload.pillars.year.branch as EarthlyBranch,
    payload.pillars.month.branch as EarthlyBranch,
    payload.pillars.day.branch as EarthlyBranch,
    (payload.pillars.hour?.branch ?? payload.pillars.day.branch) as EarthlyBranch,
  ]
  const interactionFor = (branch: string): IncomingBranchInteractionKind | null =>
    analyzeBranchAgainstNatal(branch as EarthlyBranch, natalBranches)?.kind ?? null

  let y = PAD_TOP

  // ── SOURCE (命局 / 日主) ──
  const sourceY = y
  nodes.push({
    id: 'source',
    x: TRUNK_X,
    y: sourceY,
    r: SOURCE_R,
    kind: 'source',
    state: 'past',
    locked: false,
    isHead: false,
    element: dayMaster.element,
    title: `${dayMaster.stem}${dayMaster.branch}`,
    sub: '命',
    ref: { kind: 'source' },
  })
  y += STEP

  // ── 大运 branches — each a real git-graph branch: peel out of the trunk, run
  //    its 流年 as commits down the lane, then merge back. The current 大运 is the
  //    checked-out HEAD (open, "now" at the live year). Other unlocked 大运 show
  //    only NOTABLE 流年 (a few commits — the "一串节点" look without dumping 80
  //    years); the checked-out 大运 expands to its full decade. Free tier locks
  //    every 大运 but the current one to a ghost bump. ──
  // A 大运 is "expanded" when the user (or the default rule) wants its full
  // decade of 流年 commits rendered. Anything not in this set collapses to just
  // its head + merge ring — past/far-future stay tidy. Fall back to "current
  // only" if the parent didn't pass a set (legacy callers, share capture).
  const expandedSet: ReadonlySet<number> =
    expandedDayunIndices && expandedDayunIndices.size > 0 ? expandedDayunIndices : new Set([cur])
  let trunkBottom = sourceY

  payload.dayun.forEach((d, i) => {
    const state: NodeState = i < cur ? 'past' : i === cur ? 'current' : 'future'
    const locked = !isPro && state !== 'current'
    const dayunY = y
    const dayunChip = chipFor(d.reasons, d.pillar.branch, shensha, interactionFor(d.pillar.branch))
    // 十神 decade-theme — which life domain this 大运 activates vs the 日主.
    const dayunDomain = getShiShen(
      dayMaster.stem as HeavenlyStem,
      d.pillar.stem as HeavenlyStem
    ).category
    // Each 大运's lane is coloured by its 十神 domain — the hue says what KIND of
    // decade it is (财 / 官杀 / 印 …), matching the domain label shown inline.
    const branchColor = DOMAIN_COLORS[dayunDomain]
    const branchPath = Skia.Path.Make()

    if (locked) {
      // Ghosted (Free, non-current) — a single bump that peels out and rejoins.
      // Stays gray so the Pro contrast carries.
      curve(branchPath, TRUNK_X, dayunY - STEP / 2, BRANCH_X, dayunY)
      curve(branchPath, BRANCH_X, dayunY, TRUNK_X, dayunY + STEP / 2)
      branches.push({ color: branchColor, path: branchPath, ghost: true })
      nodes.push({
        id: `dayun-${d.index}`,
        x: BRANCH_X,
        y: dayunY,
        r: NODE_R,
        kind: 'dayun',
        state,
        locked: true,
        isHead: false,
        element: d.pillar.element,
        fit: d.fit,
        chip: dayunChip,
        domain: dayunDomain,
        branchColor,
        title: `${d.pillar.stem}${d.pillar.branch}`,
        sub: `${d.startAge}`,
        ref: { kind: 'dayun', row: d },
      })
      trunkBottom = Math.max(trunkBottom, dayunY + STEP / 2)
      y += STEP
      return
    }

    // Free's current branch runs up to "now" only — forward-looking years stay
    // the Pro moat. Beyond that: a 大运 in the expanded set renders its full
    // decade; everything else collapses to ZERO 流年 commits (just the head + a
    // merge ring), so past + far-future decades read as a tidy spine until the
    // user taps to drill in.
    const isExpanded = expandedSet.has(i)
    const years =
      state === 'current'
        ? isPro
          ? d.liunian
          : d.liunian.filter((ln) => ln.year <= thisYear)
        : isExpanded
          ? d.liunian
          : []

    // Peel the branch out of the trunk and place the 大运 head.
    curve(branchPath, TRUNK_X, dayunY - STEP / 2, BRANCH_X, dayunY)
    trunkBottom = Math.max(trunkBottom, dayunY)
    nodes.push({
      id: `dayun-${d.index}`,
      x: BRANCH_X,
      y: dayunY,
      r: state === 'current' ? NODE_R + 1 : NODE_R,
      kind: 'dayun',
      state,
      locked: false,
      isHead: false,
      element: d.pillar.element,
      fit: d.fit,
      chip: dayunChip,
      domain: dayunDomain,
      branchColor,
      title: `${d.pillar.stem}${d.pillar.branch}`,
      sub: `${d.startAge}`,
      ref: { kind: 'dayun', row: d },
    })
    y += STEP

    // 流年 commits down the branch lane.
    let prevY = dayunY
    years.forEach((ln) => {
      const ls: NodeState = ln.isCurrent ? 'current' : ln.year < thisYear ? 'past' : 'future'
      branchPath.moveTo(BRANCH_X, prevY)
      branchPath.lineTo(BRANCH_X, y)
      nodes.push({
        id: `liunian-${ln.year}`,
        x: BRANCH_X,
        y,
        r: ln.isCurrent ? HEAD_R : NODE_R,
        kind: 'liunian',
        state: ls,
        locked: false,
        isHead: ln.isCurrent,
        element: ln.pillar.element,
        fit: ln.fit,
        chip: chipFor(ln.reasons, ln.pillar.branch, shensha, interactionFor(ln.pillar.branch)),
        branchColor,
        title: `${ln.pillar.stem}${ln.pillar.branch}`,
        sub: `${ln.year}`,
        ref: { kind: 'liunian', row: ln },
      })
      prevY = y
      y += STEP
    })

    // Merge back into the trunk — unless this is the open HEAD (current) branch.
    // The merge-back point on the trunk becomes a hollow ring (git "Merge X" node).
    if (state !== 'current') {
      curve(branchPath, BRANCH_X, prevY, TRUNK_X, y)
      nodes.push({
        id: `merge-${d.index}`,
        x: TRUNK_X,
        y,
        r: NODE_R - 1,
        kind: 'mergeBack',
        state,
        locked: false,
        isHead: false,
        element: d.pillar.element,
        branchColor,
        title: `${d.pillar.stem}${d.pillar.branch}`,
        sub: `${d.endAge}`,
        ref: { kind: 'mergeBack', row: d },
      })
      trunkBottom = Math.max(trunkBottom, y)
      y += STEP / 2
    } else {
      trunkBottom = Math.max(trunkBottom, prevY)
    }

    branches.push({ color: branchColor, path: branchPath, ghost: false })
  })

  // Hero (the share 爆点): the nearest UPCOMING node carrying a high-signal chip
  // (a year to brace for / lean into), else fall back to "now". One only — a
  // single focal point reads better than uniform density. 三合/三会 + 三刑/六害
  // qualify alongside the original clash/不利/用神.
  const HERO_CHIPS = new Set<ChipKind>([
    'sanhe',
    'sanhui',
    'clash',
    'unfavorable',
    'favorable',
    'sanxing',
    'liuhai',
  ])
  const hero =
    nodes.find(
      (n) =>
        !n.locked &&
        n.kind !== 'source' &&
        n.state === 'future' &&
        n.chip !== undefined &&
        HERO_CHIPS.has(n.chip)
    ) ?? nodes.find((n) => n.isHead)
  if (hero) {
    hero.isHero = true
    hero.r += 2
  }

  // Trunk line: one continuous through-line of self from SOURCE down to the
  // lowest point any branch touches it (last peel / last merge).
  trunkPath.moveTo(TRUNK_X, sourceY)
  trunkPath.lineTo(TRUNK_X, Math.max(sourceY, trunkBottom))

  const maxNodeY = nodes.reduce((m, n) => Math.max(m, n.y), sourceY)

  return {
    width,
    height: Math.max(trunkBottom, maxNodeY) + STEP / 2 + SOURCE_R,
    nodes,
    trunkPath,
    branches,
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export function TimelineGraph({
  payload,
  isPro,
  selectedId,
  onSelect,
  onLockedTap,
  colors,
  width,
  detail,
  fitLabels,
  reasonLabels,
  shensha,
  domainLabels,
  expandedDayunIndices,
}: {
  payload: TimelinePayload
  isPro: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onLockedTap: () => void
  colors: GColors
  width: number
  /** The selected node's reading — popped up anchored to that node. */
  detail?: { heading: string; body: string; fit: PersonalFit | null } | null
  /** Localized 吉/平/凶 verdict words — shown inline per node for at-a-glance density. */
  fitLabels?: Record<PersonalFit, string>
  /** Localized one-word reason labels for the per-node chip (one shown, priority-ranked). */
  reasonLabels?: Record<ChipKind, string>
  /** 本命-derived 神煞 branches — a period landing on one earns that chip. */
  shensha?: ShenShaBranches
  /** Localized 十神 → life-domain labels — the 大运 branch theme. */
  domainLabels?: Record<ShiShenCategory, string>
  /** Indices of 大运 to render with all their 流年 (tap a head to toggle). */
  expandedDayunIndices?: ReadonlySet<number>
}) {
  const graph = useMemo(
    () => buildGraph(payload, isPro, width, shensha, expandedDayunIndices),
    [payload, isPro, width, shensha, expandedDayunIndices]
  )
  const selectedNode = graph.nodes.find((n) => n.id === selectedId)

  return (
    <View style={{ width, height: graph.height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: graph.height }}>
        {/* Trunk — the continuous through-line of self (命). A real git GUI's
            "main" line is a single bold colour, not a dim hairline: gives the
            graph a spine to peel off of. Uses `colors.text` for weight + the
            slightly thicker 2.2 stroke matches branch stroke without dominating. */}
        <Path
          path={graph.trunkPath}
          style='stroke'
          strokeWidth={2.4}
          strokeCap='round'
          // The 命 through-line follows the theme accent (a warm spine), not a
          // near-black hairline — the 大运 lanes peel off it.
          color={colors.accent}
          opacity={0.6}
        />
        {/* Per-branch paths — ONE hue per 大运 end-to-end (peel + lane + merge),
            the Tower/Fork "git graph" identity. Ghost branches (Free, non-current)
            stay gray + dim. Stroke bumped to 2.2 for parity with the trunk. */}
        {graph.branches.map((br, i) => (
          <Path
            // Index key OK — branches array is rebuilt each render, never reordered.
            key={`br-${i}`}
            path={br.path}
            style='stroke'
            strokeWidth={2.2}
            strokeCap='round'
            strokeJoin='round'
            color={br.ghost ? colors.dim : br.color}
            opacity={br.ghost ? 0.32 : 1}
          />
        ))}

        {/* Nodes. */}
        {graph.nodes.map((n) => {
          const elementColor = ELEMENT_COLORS[n.element]
          const lane = n.branchColor ?? elementColor
          if (n.locked) {
            return (
              <Group key={n.id}>
                {/* bg halo punches the line → the node sits on it with a clean gap */}
                <Circle cx={n.x} cy={n.y} r={n.r + 3} color={colors.bg} />
                <Circle cx={n.x} cy={n.y} r={n.r} color={colors.dim} opacity={0.3} />
              </Group>
            )
          }
          const selected = selectedId === n.id
          // Branch nodes (大运 head + 流年, out in the lane) render SOLID; only a
          // trunk node that absorbs a branch (mergeBack) is a ring + centre dot.
          // The user's "分支上的节点都是实心的 / 主干上有分支的节点是圆环+小圆点".
          const hollow = n.kind === 'mergeBack'
          return (
            <Group key={n.id}>
              {/* bg halo punches the line → the node sits on it with a clean gap
                  (the GitLens/Sourcetree look). */}
              <Circle cx={n.x} cy={n.y} r={n.r + 3} color={colors.bg} />
              {n.isHead ? (
                <Circle cx={n.x} cy={n.y} r={n.r + 7} color={colors.accent} opacity={0.12} />
              ) : null}
              {n.isHero && !n.isHead && n.chip ? (
                <Circle cx={n.x} cy={n.y} r={n.r + 6} color={CHIP_COLOR[n.chip]} opacity={0.14} />
              ) : null}
              {hollow ? (
                <Group>
                  {/* Hollow ring with an inner solid dot — the Tower/Fork "Merge X"
                      commit look. The OUTER stroke is the branch's hue (says "this
                      ring belongs to this branch"); the INNER dot is the trunk hue
                      on mergeBack (the trunk absorbs the merge) and the branch hue
                      on a dayun head (the branch's anchor commit). Gives the ring
                      proper 质感 instead of a thin empty outline. */}
                  <Circle cx={n.x} cy={n.y} r={n.r} color={colors.bg} />
                  <Circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    style='stroke'
                    strokeWidth={selected ? 2.6 : 2.2}
                    color={selected ? colors.accent : lane}
                    opacity={n.state === 'past' ? 0.65 : 1}
                  />
                  <Circle
                    cx={n.x}
                    cy={n.y}
                    r={Math.max(1.5, n.r - 4)}
                    color={n.kind === 'mergeBack' ? colors.text : lane}
                    opacity={n.state === 'past' ? 0.65 : 0.92}
                  />
                </Group>
              ) : (
                <Group>
                  {/* Solid 流年 / source — element-coloured fill, branch-coloured
                      outline ring (subtly carries the lane identity). */}
                  <Circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    color={n.state === 'future' ? colors.bg : elementColor}
                    opacity={n.state === 'future' ? 1 : n.state === 'past' ? 0.55 : 1}
                  />
                  <Circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    style='stroke'
                    strokeWidth={selected ? 2 : 1.2}
                    color={selected ? colors.accent : lane}
                    opacity={n.state === 'past' ? 0.6 : 1}
                  />
                </Group>
              )}
            </Group>
          )
        })}
      </Canvas>

      {/* Label + tap overlay — shares the Canvas coordinate space. mergeBack rings
          are structural-only (no verdict / chip — same info lives on the 大运 head)
          so we skip a label for them but still allow a tap to focus the period. */}
      {graph.nodes.map((n) => {
        const labelLeft = n.x + n.r + 10
        const structural = n.kind === 'mergeBack'
        return (
          <Pressable
            key={`hit-${n.id}`}
            onPress={() => {
              if (n.locked) {
                onLockedTap()
                return
              }
              Haptics.selectionAsync().catch(() => {})
              // Merge-back rings route taps to their 大运 (same period, different
              // git-graph anchor — the detail bubble lives on the 大运 head).
              if (n.kind === 'mergeBack' && n.ref.kind === 'mergeBack') {
                onSelect(`dayun-${n.ref.row.index}`)
                return
              }
              onSelect(n.id)
            }}
            accessibilityRole='button'
            accessibilityLabel={n.locked ? undefined : `${n.title} ${n.sub}`}
            style={{
              position: 'absolute',
              left: 0,
              top: n.y - STEP / 2,
              width,
              height: STEP,
              justifyContent: 'center',
            }}
          >
            {n.locked || structural ? null : (
              <View
                style={{
                  position: 'absolute',
                  left: labelLeft,
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: n.state === 'past' ? colors.secondary : colors.text,
                    fontSize: n.kind === 'source' ? 17 : n.isHead ? 19 : 16,
                    fontWeight: n.isHead ? '600' : '400',
                    letterSpacing: 1,
                  }}
                >
                  {n.title}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 12 }}>
                  {n.kind === 'source' ? n.sub : n.kind === 'dayun' ? `${n.sub}+` : n.sub}
                </Text>
                {/* 大运 branch theme — the 十神 life domain this decade activates
                    (git: a branch has a name). 流年 commits stay verdict + chip. */}
                {n.kind === 'dayun' && n.domain && domainLabels ? (
                  <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: '500' }}>
                    {domainLabels[n.domain]}
                  </Text>
                ) : null}
                {/* Verdict: the 吉/平/凶 word in its colour (denser than a bare dot,
                    color-blind safe). Falls back to a dot when no label map is passed. */}
                {n.fit ? (
                  fitLabels ? (
                    <Text style={{ color: FIT_COLOR[n.fit], fontSize: 11, fontWeight: '500' }}>
                      {fitLabels[n.fit]}
                    </Text>
                  ) : (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: FIT_COLOR[n.fit],
                      }}
                    />
                  )
                ) : null}
                {/* The per-node "why": ONE priority-ranked reason chip. The hero
                    wears it as a filled pill (the share 爆点); others as plain text. */}
                {n.chip && reasonLabels ? (
                  <Text
                    style={{
                      color: n.isHero ? colors.bg : CHIP_COLOR[n.chip],
                      backgroundColor: n.isHero ? CHIP_COLOR[n.chip] : 'transparent',
                      fontSize: n.isHero ? 11 : 10,
                      fontWeight: n.isHero ? '700' : '600',
                      overflow: 'hidden',
                      borderRadius: 4,
                      paddingHorizontal: n.isHero ? 5 : 0,
                      paddingVertical: n.isHero ? 1 : 0,
                    }}
                  >
                    {reasonLabels[n.chip]}
                  </Text>
                ) : null}
                {n.isHead ? (
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 10,
                      letterSpacing: 2,
                      fontWeight: '600',
                    }}
                  >
                    HEAD
                  </Text>
                ) : null}
              </View>
            )}
          </Pressable>
        )
      })}

      {/* Selected-node reading — a speech-bubble popover whose caret points up at
          the tapped node, so it stays in view on a long graph (pointer-through). */}
      {detail && selectedNode ? (
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            top: selectedNode.y + selectedNode.r + 10,
            left: 8,
            right: 8,
          }}
        >
          <ReadingBubble
            heading={detail.heading}
            body={detail.body}
            fit={detail.fit}
            colors={colors}
            caretLeft={Math.max(2, selectedNode.x - 14)}
          />
        </View>
      ) : null}
    </View>
  )
}

/** Speech-bubble reading popover with an optional up-caret (graph nodes + 流月). */
export function ReadingBubble({
  heading,
  body,
  fit,
  colors,
  caretLeft,
}: {
  heading: string
  body: string
  fit: PersonalFit | null
  colors: GColors
  /** x of the up-caret (omit to hide it). */
  caretLeft?: number
}) {
  return (
    <View>
      {caretLeft != null ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            left: caretLeft,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: colors.bg,
            zIndex: 1,
          }}
        />
      ) : null}
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: colors.separator,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 4,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {fit ? (
            <View
              style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: FIT_COLOR[fit] }}
            />
          ) : null}
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
            {heading}
          </Text>
        </View>
        <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>{body}</Text>
      </View>
    </View>
  )
}

// ── 流月 strip — the finest commits (current year), a horizontal branch ──────

export function LiuyueStrip({
  liuyue,
  colors,
  label,
  selectedId,
  onSelect,
}: {
  liuyue: LiuyueRow[]
  colors: GColors
  label: string
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  // 流月 are the current year's finest commits — show all 12 by default (the Pro
  // moat is the 80-year 前瞻, not this year's months), so a thin 流年 view still
  // has granularity to explore.
  const visible = liuyue
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {visible.map((m) => {
          const elementColor = ELEMENT_COLORS[m.pillar.element]
          const id = `liuyue-${m.year}-${m.month}`
          const selected = selectedId === id
          const highlight = m.isCurrent || selected
          return (
            <Pressable
              key={`${m.year}-${m.month}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {})
                onSelect?.(id)
              }}
              accessibilityRole='button'
              accessibilityLabel={`${m.month} ${m.pillar.stem}${m.pillar.branch}`}
              style={{ alignItems: 'center', gap: 5, width: 52 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {highlight ? (
                  <View
                    style={{
                      position: 'absolute',
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.accent,
                      opacity: m.isCurrent ? 0.12 : 0.2,
                      left: -3,
                      top: -3,
                    }}
                  />
                ) : null}
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: highlight ? 2 : 1.2,
                    borderColor: selected ? colors.accent : elementColor,
                    backgroundColor: m.isCurrent ? elementColor : 'transparent',
                  }}
                />
              </View>
              <Text
                style={{
                  color: highlight ? colors.text : colors.dim,
                  fontSize: 13,
                  fontWeight: highlight ? '600' : '400',
                }}
              >
                {m.pillar.stem}
                {m.pillar.branch}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 10 }}>{m.month}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
