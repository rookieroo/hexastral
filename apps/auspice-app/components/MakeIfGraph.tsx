/**
 * MakeIfGraph — the "假如" alternate-life git graph (make-if, ADR-0020 follow-up).
 *
 * A single mainline (the through-line of fate) with up to 3 colored branches
 * that DIVERGE at a fork age and either MERGE back to the mainline at a later
 * age or run on to the end — visually answering "你的人生本可以是另一个样子".
 *
 * Git-graph aesthetic (2026-06 polish): smooth bezier junctions, ONE colour per
 * branch end-to-end, and a node vocabulary — filled circle = the fork (where you
 * branched), small filled dot = a period along the branch, hollow ring = a
 * merge-back to the mainline. Every node punches a bg-coloured halo so it reads
 * as sitting ON the line with a clean gap, the way GitLens / Sourcetree draw it.
 *
 * Skia-geometry + RN-overlay split as TimelineGraph: the Canvas draws lines +
 * nodes; labels + tap targets are absolutely positioned in the same coordinate
 * space. Two modes: unlocked (colours + labels) / locked (ghosted, taps → paywall).
 */

import { Canvas, Circle, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSharedValue, withTiming } from 'react-native-reanimated'

import type { MakeIfModel } from '@/lib/makeIfBranches'

const TRUNK_X = 34 // leaves room for an age tick on the LEFT of the trunk
const PAD = 20
const ROW = 28 // one age-row (row-based layout — no time-proportional clustering)
const LANE = 22 // tight lane spacing — adjacent branches sit close, git-graph style

interface MIColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

interface BranchLayout {
  id: string
  color: string
  label: string
  laneX: number
  /** y of the fork point on the mainline. */
  forkY: number
  path: ReturnType<typeof Skia.Path.Make>
  /** Period nodes strictly between the fork and the terminus (endpoints drawn separately). */
  dots: { x: number; y: number }[]
  isPast: boolean
  /** y of the merge-back node on the trunk (null → runs to the end in its lane). */
  mergeY: number | null
  /** y of the branch terminus (= mergeY when it merges, else the end-age in-lane). */
  endY: number
}

interface Layout {
  height: number
  mainTop: number
  mainBottom: number
  nowY: number | null
  mainNodes: { age: number; label: string; isPast: boolean; y: number; isFork: boolean }[]
  branches: BranchLayout[]
}

/** A tight git-graph S-elbow between two lanes: leave the start vertically and
 *  arrive vertically, spanning the lane gap over ~`dy`. The short corner a real
 *  git GUI draws (Tower / GitLens) — NOT a big sweeping arc. */
function sElbow(
  p: ReturnType<typeof Skia.Path.Make>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  move: boolean
) {
  const dy = y2 - y1
  if (move) p.moveTo(x1, y1)
  p.cubicTo(x1, y1 + dy * 0.5, x2, y2 - dy * 0.5, x2, y2)
}

function buildLayout(model: MakeIfModel, _width: number): Layout {
  // ROW-BASED: every distinct age (大运 boundaries + each branch's fork / merge /
  // dots + the span ends) becomes an evenly-spaced row. Ages that bunch up in time
  // no longer pile their fork/merge rings on top of each other near "now" — the
  // git-graph "one commit per row" rhythm the old time-proportional layout lacked
  // (the cluster the user flagged).
  const ageSet = new Set<number>()
  ageSet.add(model.startAge)
  ageSet.add(model.endAge)
  if (model.currentAge != null) ageSet.add(model.currentAge)
  for (const n of model.mainNodes ?? []) ageSet.add(n.age)
  for (const br of model.branches) {
    ageSet.add(br.divergeAtAge)
    if (br.mergeAtAge != null) ageSet.add(br.mergeAtAge)
    for (const d of br.dots) ageSet.add(d.age)
  }
  const ages = [...ageSet].sort((a, b) => a - b)
  const rowOf = new Map(ages.map((a, i) => [a, i] as const))
  const lastRow = ages.length - 1
  const first = ages[0] ?? model.startAge
  const last = ages[lastRow] ?? model.endAge
  const yForAge = (age: number): number => {
    const exact = rowOf.get(age)
    if (exact != null) return PAD + exact * ROW
    if (age <= first) return PAD
    if (age >= last) return PAD + lastRow * ROW
    for (let i = 0; i < lastRow; i++) {
      const a = ages[i]
      const b = ages[i + 1]
      if (a != null && b != null && age >= a && age <= b) {
        return PAD + (i + (age - a) / (b - a)) * ROW
      }
    }
    return PAD
  }

  const branches: BranchLayout[] = model.branches.map((br, i) => {
    const laneX = TRUNK_X + (i + 1) * LANE
    const forkY = yForAge(br.divergeAtAge)
    const path = Skia.Path.Make()
    // peel: trunk → lane, a one-row S corner.
    const laneTop = forkY + ROW
    sElbow(path, TRUNK_X, forkY, laneX, laneTop, true)
    let mergeY: number | null = null
    let endY: number
    if (br.mergeAtAge != null) {
      mergeY = yForAge(br.mergeAtAge)
      endY = mergeY
      const mApproach = Math.max(laneTop, mergeY - ROW)
      if (mApproach > laneTop) path.lineTo(laneX, mApproach)
      // merge: lane → trunk, mirror S corner.
      sElbow(path, laneX, mApproach, TRUNK_X, mergeY, false)
    } else {
      endY = yForAge(model.endAge)
      path.lineTo(laneX, endY)
    }
    const hi = br.mergeAtAge ?? model.endAge
    const dots = br.dots
      .filter((d) => d.age > br.divergeAtAge && d.age < hi)
      .map((d) => ({ x: laneX, y: yForAge(d.age) }))
    return {
      id: br.id,
      color: br.color,
      label: br.label,
      laneX,
      forkY,
      path,
      dots,
      isPast: !!br.isPast,
      mergeY,
      endY,
    }
  })

  // Mark which main-line nodes spawn a branch — those render as ring+dot; plain
  // 大运 boundaries stay small solid dots.
  const forkYs = new Set(branches.map((b) => Math.round(b.forkY)))
  const mainNodes = (model.mainNodes ?? []).map((n) => {
    const y = yForAge(n.age)
    return { ...n, y, isFork: forkYs.has(Math.round(y)) }
  })

  const mainBottom = PAD + lastRow * ROW
  return {
    height: mainBottom + PAD,
    mainTop: PAD,
    mainBottom,
    nowY: model.currentAge != null ? yForAge(model.currentAge) : null,
    mainNodes,
    branches,
  }
}

/**
 * A graph node that reads as sitting ON a line with a clean gap: a bg-coloured
 * halo punches the line first, then the node draws on top. Two shapes:
 *   - 'dot'  — a solid filled circle (a period along a branch lane).
 *   - 'ring' — a hollow ring with a small centre dot (a trunk node that spawns
 *              or absorbs a branch — the git "branch / merge" commit). This is
 *              the user's "主干上有分支的节点是有小圆点的圆环".
 */
function GNode({
  x,
  y,
  r,
  color,
  bg,
  variant = 'dot',
}: {
  x: number
  y: number
  r: number
  color: string
  bg: string
  variant?: 'dot' | 'ring'
}) {
  return (
    <Group>
      <Circle cx={x} cy={y} r={r + 2.5} color={bg} />
      {variant === 'dot' ? (
        <Circle cx={x} cy={y} r={r} color={color} />
      ) : (
        <Group>
          <Circle cx={x} cy={y} r={r} color={bg} />
          <Circle cx={x} cy={y} r={r} color={color} style='stroke' strokeWidth={2} />
          <Circle cx={x} cy={y} r={Math.max(1.4, r - 3.4)} color={color} />
        </Group>
      )}
    </Group>
  )
}

export function MakeIfGraph({
  model,
  colors,
  width,
  locked,
  selectedBranchId,
  onSelectBranch,
  onLockedTap,
  nowLabel,
  animateIn = false,
  dashed = true,
  onMainNodeTap,
}: {
  model: MakeIfModel
  colors: MIColors
  width: number
  locked: boolean
  selectedBranchId: string | null
  onSelectBranch: (id: string) => void
  onLockedTap: () => void
  nowLabel: string
  /** Draw the branches in (the explainer sheet / a new fork). Static otherwise. */
  animateIn?: boolean
  /** Dashed = hypothetical (teaser, where real + make-if coexist). The dedicated
   *  make-if screen passes false (solid) since the whole screen is make-if. */
  dashed?: boolean
  /** Interactive sandbox — tap a mainline node to fork a "假如" off it. */
  onMainNodeTap?: (age: number) => void
}) {
  const layout = useMemo(() => buildLayout(model, width), [model, width])
  const mainPath = useMemo(() => {
    const p = Skia.Path.Make()
    p.moveTo(TRUNK_X, layout.mainTop)
    p.lineTo(TRUNK_X, layout.mainBottom)
    return p
  }, [layout])
  // Path-trim progress (Skia `end` 0→1) drives the "branches drawing in" reveal.
  const progress = useSharedValue(animateIn ? 0 : 1)
  useEffect(() => {
    if (animateIn) progress.value = withTiming(1, { duration: 1100 })
  }, [animateIn, progress])

  return (
    <View style={{ width, height: layout.height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: layout.height }}>
        {/* Mainline — the through-line of fate (solid = your REAL line). */}
        <Path
          path={mainPath}
          style='stroke'
          strokeWidth={2.4}
          strokeCap='round'
          // The real life-line follows the theme accent (not a grey hairline) — a
          // warm spine the what-if lanes peel off of.
          color={colors.accent}
          opacity={0.55}
          end={progress}
        />

        {/* Mainline nodes — real 大运 boundaries (the spine), drawn UNDER the branch
            fork markers so a fork shows its branch colour. */}
        {layout.mainNodes.map((n) =>
          // Fork points are drawn by their branch (ring in the branch hue); a
          // plain boundary is a small solid dot in the accent (theme) colour.
          n.isFork ? null : (
            <GNode
              key={`mn-${n.age}`}
              x={TRUNK_X}
              y={n.y}
              r={3}
              color={n.isPast ? colors.dim : colors.accent}
              bg={colors.bg}
            />
          )
        )}

        {/* Branches — hypothetical "假如" lives. ONE colour per branch end-to-end;
            filled fork node, filled period dots, hollow ring on merge-back. */}
        {layout.branches.map((b) => {
          const selected = selectedBranchId === b.id
          // When one branch is active, the others clearly recede so the highlight
          // reads (a single "假如" in focus); with no selection all sit at 0.92.
          const anySelected = selectedBranchId != null
          // Past "假如当年" branches read dimmer + dashed (已发生、不可改).
          const stroke = locked ? colors.dim : b.isPast ? colors.dim : b.color
          return (
            <Group
              key={b.id}
              opacity={locked ? 0.28 : selected ? 1 : anySelected ? 0.55 : b.isPast ? 0.5 : 0.92}
            >
              <Path
                path={b.path}
                style='stroke'
                strokeWidth={selected ? 2.6 : 2}
                strokeCap='round'
                strokeJoin='round'
                color={stroke}
                end={progress}
              >
                {dashed || b.isPast ? <DashPathEffect intervals={[7, 6]} /> : null}
              </Path>
              {!locked ? (
                <Group>
                  {/* fork — trunk node where the branch leaves: ring + centre dot */}
                  <GNode
                    x={TRUNK_X}
                    y={b.forkY}
                    r={5}
                    color={stroke}
                    bg={colors.bg}
                    variant='ring'
                  />
                  {/* period nodes along the lane (solid, branch colour) */}
                  {b.dots.map((d, di) => (
                    <GNode
                      // Positional dots — index key is stable for this fixed list.
                      key={di}
                      x={d.x}
                      y={d.y}
                      r={3.5}
                      color={stroke}
                      bg={colors.bg}
                    />
                  ))}
                  {/* terminus — merge-back = ring on the trunk; run-to-end = solid cap */}
                  {b.mergeY != null ? (
                    <GNode
                      x={TRUNK_X}
                      y={b.mergeY}
                      r={5}
                      color={stroke}
                      bg={colors.bg}
                      variant='ring'
                    />
                  ) : (
                    <GNode x={b.laneX} y={b.endY} r={4} color={stroke} bg={colors.bg} />
                  )}
                </Group>
              ) : null}
            </Group>
          )
        })}

        {/* "now" head on the mainline (onboarded) — drawn last so it sits on top. */}
        {layout.nowY != null ? (
          <Group>
            {/* "now" = the single brightest focal point: enlarged + a double glow. */}
            <Circle cx={TRUNK_X} cy={layout.nowY} r={15} color={colors.accent} opacity={0.16} />
            <Circle cx={TRUNK_X} cy={layout.nowY} r={10} color={colors.accent} opacity={0.12} />
            <GNode x={TRUNK_X} y={layout.nowY} r={6.5} color={colors.accent} bg={colors.bg} />
          </Group>
        ) : null}
      </Canvas>

      {/* now label */}
      {layout.nowY != null ? (
        <Text
          style={{
            position: 'absolute',
            left: TRUNK_X + 12,
            top: layout.nowY - 8,
            color: colors.accent,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1,
          }}
        >
          {nowLabel}
        </Text>
      ) : null}

      {/* Mainline node tap targets — open the "假如在这里…" fork sheet for that age. */}
      {onMainNodeTap
        ? layout.mainNodes.map((n) => (
            <Pressable
              key={`mt-${n.age}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {})
                onMainNodeTap(n.age)
              }}
              accessibilityRole='button'
              accessibilityLabel={`${n.label} ${n.age}`}
              style={{
                position: 'absolute',
                left: 0,
                top: n.y - 14,
                width: TRUNK_X + 26,
                height: 28,
                justifyContent: 'center',
              }}
            >
              {/* Age tick on the LEFT of the trunk — branch labels live on the
                  RIGHT, so the two never collide (the old graph stacked 干支·age
                  labels on the right, on top of the branch labels). */}
              <Text
                style={{
                  position: 'absolute',
                  left: 0,
                  width: TRUNK_X - 8,
                  textAlign: 'right',
                  color: n.isPast ? colors.dim : colors.secondary,
                  fontSize: 11,
                }}
                numberOfLines={1}
              >
                {n.age}
              </Text>
            </Pressable>
          ))
        : null}

      {/* Locked → one tap-through to the paywall, over the whole graph. */}
      {locked ? (
        <Pressable
          onPress={onLockedTap}
          accessibilityRole='button'
          style={{ position: 'absolute', left: 0, top: 0, width, height: layout.height }}
        />
      ) : (
        /* Unlocked → a tappable label chip near each fork. */
        layout.branches.map((b) => (
          <Pressable
            key={`lbl-${b.id}`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {})
              onSelectBranch(b.id)
            }}
            accessibilityRole='button'
            accessibilityLabel={b.label}
            style={{
              position: 'absolute',
              left: b.laneX + 8,
              top: b.forkY + ROW - 9,
              maxWidth: width - b.laneX - 12,
              // Recede when another branch is the active one, matching the path dim.
              opacity: selectedBranchId != null && selectedBranchId !== b.id ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                color: selectedBranchId === b.id ? colors.text : colors.secondary,
                fontSize: 13,
                fontWeight: selectedBranchId === b.id ? '700' : '500',
                letterSpacing: 0.5,
              }}
              numberOfLines={1}
            >
              {b.label}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  )
}
