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

const TRUNK_X = 24
const PAD = 18
const TARGET_HEIGHT = 300

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
  ageStep: number
  startAge: number
  yForAge: (age: number) => number
  mainTop: number
  mainBottom: number
  nowY: number | null
  mainNodes: { age: number; label: string; isPast: boolean; y: number }[]
  branches: BranchLayout[]
}

function buildLayout(model: MakeIfModel, width: number): Layout {
  const span = Math.max(1, model.endAge - model.startAge)
  const ageStep = Math.max(3.6, Math.min(7, TARGET_HEIGHT / span))
  const height = span * ageStep + PAD * 2
  const yForAge = (age: number) => PAD + (age - model.startAge) * ageStep
  // Lanes narrow as the user adds forks, so they stay on-screen.
  const laneCount = Math.max(3, model.branches.length + 1)
  const laneW = Math.max(34, Math.min(60, (width - TRUNK_X - 90) / laneCount))

  const branches: BranchLayout[] = model.branches.map((br, i) => {
    const laneX = TRUNK_X + (i + 1) * laneW
    const path = Skia.Path.Make()
    const forkY = yForAge(br.divergeAtAge)
    const drop = ageStep * 3
    // diverge out of the trunk (smooth S-curve)
    path.moveTo(TRUNK_X, forkY)
    path.cubicTo(TRUNK_X, forkY + drop / 2, laneX, forkY + drop / 2, laneX, forkY + drop)
    let mergeY: number | null = null
    let endY: number
    if (br.mergeAtAge != null) {
      mergeY = yForAge(br.mergeAtAge)
      endY = mergeY
      const mergeStart = mergeY - drop
      if (mergeStart > forkY + drop) path.lineTo(laneX, mergeStart)
      // merge back into the trunk
      path.cubicTo(laneX, mergeStart + drop / 2, TRUNK_X, mergeStart + drop / 2, TRUNK_X, mergeY)
    } else {
      endY = yForAge(model.endAge)
      path.lineTo(laneX, endY)
    }
    const lo = br.divergeAtAge
    const hi = br.mergeAtAge ?? model.endAge
    const dots = br.dots
      .filter((d) => d.age > lo && d.age < hi)
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

  const mainNodes = (model.mainNodes ?? []).map((n) => ({ ...n, y: yForAge(n.age) }))

  return {
    height,
    ageStep,
    startAge: model.startAge,
    yForAge,
    mainTop: yForAge(model.startAge),
    mainBottom: yForAge(model.endAge),
    nowY: model.currentAge != null ? yForAge(model.currentAge) : null,
    mainNodes,
    branches,
  }
}

/**
 * A graph node that reads as sitting ON a line with a clean gap: a bg-coloured
 * halo punches the line first, then the node (filled circle, or a hollow ring for
 * merges) draws on top.
 */
function GNode({
  x,
  y,
  r,
  color,
  bg,
  fill = true,
}: {
  x: number
  y: number
  r: number
  color: string
  bg: string
  fill?: boolean
}) {
  return (
    <Group>
      <Circle cx={x} cy={y} r={r + 2.5} color={bg} />
      {fill ? (
        <Circle cx={x} cy={y} r={r} color={color} />
      ) : (
        <Group>
          <Circle cx={x} cy={y} r={r} color={bg} />
          <Circle cx={x} cy={y} r={r} color={color} style='stroke' strokeWidth={2} />
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
          strokeWidth={1.8}
          strokeCap='round'
          color={colors.separator}
          end={progress}
        />

        {/* Mainline nodes — real 大运 boundaries (the spine), drawn UNDER the branch
            fork markers so a fork shows its branch colour. */}
        {layout.mainNodes.map((n) => (
          <GNode
            key={`mn-${n.age}`}
            x={TRUNK_X}
            y={n.y}
            r={3}
            color={n.isPast ? colors.dim : colors.text}
            bg={colors.bg}
          />
        ))}

        {/* Branches — hypothetical "假如" lives. ONE colour per branch end-to-end;
            filled fork node, filled period dots, hollow ring on merge-back. */}
        {layout.branches.map((b) => {
          const selected = selectedBranchId === b.id
          // Past "假如当年" branches read dimmer + dashed (已发生、不可改).
          const stroke = locked ? colors.dim : b.isPast ? colors.dim : b.color
          return (
            <Group key={b.id} opacity={locked ? 0.28 : b.isPast ? 0.5 : selected ? 1 : 0.92}>
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
                  {/* fork — where the branch leaves the trunk (filled) */}
                  <GNode x={TRUNK_X} y={b.forkY} r={4.5} color={stroke} bg={colors.bg} />
                  {/* period nodes along the lane (filled, branch colour) */}
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
                  {/* terminus — merge-back = hollow ring on the trunk; run-to-end =
                      a filled cap in the lane. */}
                  {b.mergeY != null ? (
                    <GNode
                      x={TRUNK_X}
                      y={b.mergeY}
                      r={4.5}
                      color={stroke}
                      bg={colors.bg}
                      fill={false}
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
            <Circle cx={TRUNK_X} cy={layout.nowY} r={11} color={colors.accent} opacity={0.14} />
            <GNode x={TRUNK_X} y={layout.nowY} r={5} color={colors.accent} bg={colors.bg} />
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
                top: n.y - 13,
                width: TRUNK_X + 64,
                height: 26,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  marginLeft: TRUNK_X + 10,
                  color: n.isPast ? colors.dim : colors.secondary,
                  fontSize: 11,
                }}
                numberOfLines={1}
              >
                {n.label} · {n.age}
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
              top: b.forkY + layout.ageStep * 3 - 9,
              maxWidth: width - b.laneX - 12,
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
