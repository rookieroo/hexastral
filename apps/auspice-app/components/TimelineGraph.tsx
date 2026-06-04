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
import * as Haptics from 'expo-haptics'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { DayunRow, LiunianRow, LiuyueRow, PersonalFit, TimelinePayload } from '@/lib/api'
import { ELEMENT_COLORS } from '@/lib/shichen-content'

/** 对你而言 verdict → dot color (吉 green / 平 grey / 凶 red). Matches the daily 黄历. */
const FIT_COLOR: Record<PersonalFit, string> = { 吉: '#34C759', 平: '#8E8E93', 凶: '#FF453A' }

/** Free preview = current position + the next N 流月; Pro unlocks the full life. */
const FREE_LIUYUE_MONTHS = 6

// ── Geometry ────────────────────────────────────────────────────────────────
const TRUNK_X = 26 // through-line of self (命) lane
const BRANCH_X = 70 // 大运 / 流年 branch lane
const PAD_TOP = 18
const STEP = 46 // vertical rhythm between stacked nodes
const NODE_R = 7
const HEAD_R = 10
const SOURCE_R = 9

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
  kind: 'source' | 'dayun' | 'liunian'
  state: NodeState
  /** Free users only see SOURCE + current 大运 branch + current 流年. */
  locked: boolean
  isHead: boolean
  element: '木' | '火' | '土' | '金' | '水'
  fit?: PersonalFit
  title: string
  sub: string
  /** Index back into the source rows for the detail panel. */
  ref: { kind: 'source' } | { kind: 'dayun'; row: DayunRow } | { kind: 'liunian'; row: LiunianRow }
}

interface BuiltGraph {
  width: number
  height: number
  nodes: GNode[]
  /** Pre-built Skia paths, split by visual weight so we can batch-render. */
  trunkPath: ReturnType<typeof Skia.Path.Make>
  solidEdges: ReturnType<typeof Skia.Path.Make>
  ghostEdges: ReturnType<typeof Skia.Path.Make>
}

/** Smooth S-curve from a trunk point out to a branch node (or back). */
function curve(
  p: ReturnType<typeof Skia.Path.Make>,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const midY = (y1 + y2) / 2
  p.moveTo(x1, y1)
  p.cubicTo(x1, midY, x2, midY, x2, y2)
}

function buildGraph(payload: TimelinePayload, isPro: boolean, width: number): BuiltGraph {
  const nodes: GNode[] = []
  const trunkPath = Skia.Path.Make()
  const solidEdges = Skia.Path.Make()
  const ghostEdges = Skia.Path.Make()

  const cur = payload.currentDayunIndex
  const thisYear = new Date().getFullYear()
  const dayMaster = payload.pillars.day

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

  // ── 大运 branches ──
  const visibleLiunian = isPro ? payload.liunian : payload.liunian.filter((r) => r.isCurrent)

  payload.dayun.forEach((d, i) => {
    const state: NodeState = i < cur ? 'past' : i === cur ? 'current' : 'future'
    const locked = !isPro && state !== 'current'
    const nodeY = y
    const edges = locked ? ghostEdges : solidEdges

    if (state === 'current') {
      // Open (checked-out) branch — diverge from the trunk just above, place the
      // 大运 head, then run the 流年 down the branch lane. It does NOT merge: HEAD.
      curve(edges, TRUNK_X, nodeY - STEP / 2, BRANCH_X, nodeY)
      nodes.push({
        id: `dayun-${d.index}`,
        x: BRANCH_X,
        y: nodeY,
        r: NODE_R + 1,
        kind: 'dayun',
        state,
        locked: false,
        isHead: false,
        element: d.pillar.element,
        fit: d.fit,
        title: `${d.pillar.stem}${d.pillar.branch}`,
        sub: `${d.startAge}`,
        ref: { kind: 'dayun', row: d },
      })
      y += STEP

      // 流年 commits along the branch lane.
      let prevY = nodeY
      visibleLiunian.forEach((r) => {
        const ls: NodeState = r.isCurrent ? 'current' : r.year < thisYear ? 'past' : 'future'
        solidEdges.moveTo(BRANCH_X, prevY)
        solidEdges.lineTo(BRANCH_X, y)
        nodes.push({
          id: `liunian-${r.year}`,
          x: BRANCH_X,
          y,
          r: r.isCurrent ? HEAD_R : NODE_R,
          kind: 'liunian',
          state: ls,
          locked: false,
          isHead: r.isCurrent,
          element: r.pillar.element,
          fit: r.fit,
          title: `${r.pillar.stem}${r.pillar.branch}`,
          sub: `${r.year}`,
          ref: { kind: 'liunian', row: r },
        })
        prevY = y
        y += STEP
      })
    } else {
      // Merged (past) or unlived (future) — a bump that peels out and rejoins.
      curve(edges, TRUNK_X, nodeY - STEP / 2, BRANCH_X, nodeY)
      curve(edges, BRANCH_X, nodeY, TRUNK_X, nodeY + STEP / 2)
      nodes.push({
        id: `dayun-${d.index}`,
        x: BRANCH_X,
        y: nodeY,
        r: NODE_R,
        kind: 'dayun',
        state,
        locked,
        isHead: false,
        element: d.pillar.element,
        fit: d.fit,
        title: `${d.pillar.stem}${d.pillar.branch}`,
        sub: `${d.startAge}`,
        ref: { kind: 'dayun', row: d },
      })
      y += STEP
    }
  })

  // Trunk line: one continuous through-line of self from SOURCE to the last node.
  const lastNodeY = y - STEP
  trunkPath.moveTo(TRUNK_X, sourceY)
  trunkPath.lineTo(TRUNK_X, Math.max(sourceY, lastNodeY))

  return {
    width,
    height: y - STEP + PAD_TOP + SOURCE_R,
    nodes,
    trunkPath,
    solidEdges,
    ghostEdges,
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
}) {
  const graph = useMemo(() => buildGraph(payload, isPro, width), [payload, isPro, width])
  const selectedNode = graph.nodes.find((n) => n.id === selectedId)

  return (
    <View style={{ width, height: graph.height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: graph.height }}>
        {/* Trunk — the continuous through-line of self. */}
        <Path path={graph.trunkPath} style='stroke' strokeWidth={1.5} color={colors.separator} />
        {/* Ghost edges (locked / future, Free tier). */}
        <Group opacity={0.35}>
          <Path path={graph.ghostEdges} style='stroke' strokeWidth={1.3} color={colors.dim} />
        </Group>
        {/* Solid branch + commit edges. */}
        <Path path={graph.solidEdges} style='stroke' strokeWidth={1.6} color={colors.separator} />

        {/* Nodes. */}
        {graph.nodes.map((n) => {
          const elementColor = ELEMENT_COLORS[n.element]
          if (n.locked) {
            return <Circle key={n.id} cx={n.x} cy={n.y} r={n.r} color={colors.dim} opacity={0.3} />
          }
          const selected = selectedId === n.id
          return (
            <Group key={n.id}>
              {n.isHead ? (
                <Circle cx={n.x} cy={n.y} r={n.r + 7} color={colors.accent} opacity={0.12} />
              ) : null}
              {/* Fill: current/source carry their element color; others read as hollow. */}
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
                color={selected ? colors.accent : elementColor}
                opacity={n.state === 'past' ? 0.6 : 1}
              />
            </Group>
          )
        })}
      </Canvas>

      {/* Label + tap overlay — shares the Canvas coordinate space. */}
      {graph.nodes.map((n) => {
        const labelLeft = n.x + n.r + 10
        return (
          <Pressable
            key={`hit-${n.id}`}
            onPress={() => {
              if (n.locked) {
                onLockedTap()
                return
              }
              Haptics.selectionAsync().catch(() => {})
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
            {n.locked ? null : (
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
                {n.fit ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: FIT_COLOR[n.fit],
                    }}
                  />
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
  isPro,
  colors,
  label,
  selectedId,
  onSelect,
}: {
  liuyue: LiuyueRow[]
  isPro: boolean
  colors: GColors
  label: string
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  const visible = isPro ? liuyue : liuyue.slice(0, FREE_LIUYUE_MONTHS)
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
