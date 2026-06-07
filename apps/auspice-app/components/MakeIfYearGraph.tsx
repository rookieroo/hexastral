/**
 * MakeIfYearGraph — the make-if 假如 git graph on a CONTINUOUS 流年 axis.
 *
 * Supersedes the 大运-age-row `MakeIfGraph` for the interactive Sandbox: the trunk
 * is the real 流年 line (one row per year) windowed around now + any active branch
 * span, 大运 shown as left 五行 colour-bands, and a "假如" branch peels at a year,
 * runs its lane (可跨大运), and merges back — git-graph style.
 *
 * Colour system (single source = @zhop/hexastral-tokens):
 *   · DATA (流年 node) → its 干支 五行 via `wuxingGraph` (金 = pewter, never gold).
 *   · STATE (今 / 选中) → the brand accent (terra) as a TREATMENT (glow + ring).
 *   · branch lane → its own identity hue (`branch.color`, already muted/brand-safe).
 *
 * Reuses the age-based `MakeIfBranch` model verbatim (divergeAtAge / mergeAtAge /
 * dots[].age) so the 对照表, persistence and share keep working unchanged — this
 * component only RENDERS that data on a year axis. Skia draws lines+nodes; labels
 * + tap targets are absolutely-positioned RN views in the same coordinate space.
 */

import { Canvas, Circle, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia'
import { verdictColors, wuxingGraph } from '@zhop/hexastral-tokens/palette'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSharedValue, withTiming } from 'react-native-reanimated'

import type { DayunRow } from '@/lib/api'
import type { MakeIfBranch } from '@/lib/makeIfBranches'

interface MIColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

const TOP = 18
const ROW = 28 // one 流年 row
const TRUNK_X = 44 // leaves room for the 大运 五行 band + label on the LEFT
const LANE = 32 // branch lane spacing — wide enough to tap a lane + spread the graph
const BAND_X = 4
const BAND_W = 8

const ELEMENT_TO_KEY: Record<string, keyof typeof wuxingGraph> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
}
const wxColor = (element: string): string => wuxingGraph[ELEMENT_TO_KEY[element] ?? 'earth']
const fitColor = (fit: string, fallback: string): string =>
  verdictColors[fit as keyof typeof verdictColors] ?? fallback

interface YearCell {
  year: number
  age: number
  gz: string
  element: string
  fit: string
  isNow: boolean
  dayunIndex: number
  y: number
}
interface BranchLayout {
  id: string
  color: string
  label: string
  laneX: number
  forkY: number
  path: ReturnType<typeof Skia.Path.Make>
  dots: { x: number; y: number }[]
  isPast: boolean
  mergeY: number | null
  endY: number
}
interface Band {
  index: number
  color: string
  label: string
  top: number
  bottom: number
}
interface Layout {
  height: number
  top: number
  bottom: number
  cells: YearCell[]
  bands: Band[]
  branches: BranchLayout[]
  forkAges: Set<number>
  mergeAges: Set<number>
}

function buildLayout(dayun: DayunRow[], branches: MakeIfBranch[], focusAge: number | null): Layout {
  // Flatten every 流年 (with its 大运 index), sorted by year.
  const flat: {
    year: number
    age: number
    gz: string
    element: string
    fit: string
    isNow: boolean
    di: number
  }[] = []
  dayun.forEach((d, di) => {
    for (const ly of d.liunian) {
      flat.push({
        year: ly.year,
        age: ly.age,
        gz: `${ly.pillar.stem}${ly.pillar.branch}`,
        element: ly.pillar.element,
        fit: String(ly.fit),
        isNow: ly.isCurrent,
        di,
      })
    }
  })
  flat.sort((a, b) => a.year - b.year)
  const firstAge = flat[0]?.age ?? 0
  const lastAge = flat[flat.length - 1]?.age ?? firstAge
  const nowAge = flat.find((f) => f.isNow)?.age ?? firstAge

  // Window = the 大运 containing focus + the NEXT 大运 (so a branch forked here can
  // show its arc), NOT the whole life. focusAge defaults to now → the CURRENT 大运
  // (the natural start); the 大运 strip moves it to an earlier decade when wanted.
  // This keeps the default short — you normally only care about now.
  const focus = focusAge ?? nowAge
  const fd = dayun.find((d) => focus >= d.startAge && focus <= d.endAge)
  const lo = Math.max(firstAge, fd ? fd.startAge : focus)
  const hi = Math.min(lastAge, fd ? fd.endAge + 10 : focus + 19)

  const win = flat.filter((f) => f.age >= lo && f.age <= hi)
  const cells: YearCell[] = win.map((f, i) => ({
    year: f.year,
    age: f.age,
    gz: f.gz,
    element: f.element,
    fit: f.fit,
    isNow: f.isNow,
    dayunIndex: f.di,
    y: TOP + i * ROW,
  }))
  const ageToY = new Map(cells.map((c) => [c.age, c.y] as const))
  const top = TOP
  const bottom = cells.length ? TOP + (cells.length - 1) * ROW : TOP
  const yForAge = (age: number): number => {
    const exact = ageToY.get(age)
    if (exact != null) return exact
    if (age <= lo) return top
    if (age >= hi) return bottom
    // interpolate between the nearest bracketing cells
    for (let i = 0; i < cells.length - 1; i++) {
      const a = cells[i]
      const b = cells[i + 1]
      if (a && b && age >= a.age && age <= b.age) {
        return a.y + ((age - a.age) / (b.age - a.age)) * (b.y - a.y)
      }
    }
    return top
  }

  // 大运 五行 bands over the windowed rows.
  const bands: Band[] = []
  cells.forEach((c) => {
    const last = bands[bands.length - 1]
    if (last && last.index === c.dayunIndex) {
      last.bottom = c.y
    } else {
      const d = dayun[c.dayunIndex]
      bands.push({
        index: c.dayunIndex,
        color: d ? wxColor(d.pillar.element) : '#A0845C',
        label: d ? `${d.pillar.stem}${d.pillar.branch}` : '',
        top: c.y,
        bottom: c.y,
      })
    }
  })

  // Branch lanes — only those intersecting the window.
  const forkAges = new Set<number>()
  const mergeAges = new Set<number>()
  const branchLayouts: BranchLayout[] = branches
    .filter((b) => b.divergeAtAge <= hi && (b.mergeAtAge ?? b.divergeAtAge) >= lo)
    .map((b, i) => {
      const laneX = TRUNK_X + (i + 1) * LANE
      const forkY = yForAge(b.divergeAtAge)
      forkAges.add(b.divergeAtAge)
      const path = Skia.Path.Make()
      const laneTop = forkY + ROW
      // Peel from the RIGHT of the fork node: leave horizontally, arrive vertically.
      path.moveTo(TRUNK_X, forkY)
      path.cubicTo(laneX, forkY, laneX, laneTop - ROW * 0.45, laneX, laneTop)
      let mergeY: number | null = null
      let endY: number
      if (b.mergeAtAge != null) {
        mergeY = yForAge(b.mergeAtAge)
        mergeAges.add(b.mergeAtAge)
        endY = mergeY
        const mApproach = Math.max(laneTop, mergeY - ROW)
        if (mApproach > laneTop) path.lineTo(laneX, mApproach)
        // Merge back into the RIGHT of the merge node: leave vertically, arrive horizontally.
        path.cubicTo(laneX, mergeY, (TRUNK_X + laneX) / 2, mergeY, TRUNK_X, mergeY)
      } else {
        endY = bottom
        path.lineTo(laneX, endY)
      }
      const hiAge = b.mergeAtAge ?? hi
      const dots = b.dots
        .filter((d) => d.age > b.divergeAtAge && d.age < hiAge && d.age >= lo && d.age <= hi)
        .map((d) => ({ x: laneX, y: yForAge(d.age) }))
      return {
        id: b.id,
        color: b.color,
        label: b.label,
        laneX,
        forkY,
        path,
        dots,
        isPast: !!b.isPast,
        mergeY,
        endY,
      }
    })

  return {
    height: bottom + TOP,
    top,
    bottom,
    cells,
    bands,
    branches: branchLayouts,
    forkAges,
    mergeAges,
  }
}

/** Node with a bg halo so the line shows a clean gap. dot | ring. */
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

export function MakeIfYearGraph({
  dayun,
  branches,
  colors,
  width,
  selectedBranchId,
  onSelectBranch,
  onMainNodeTap,
  nowLabel,
  lang,
  focusAge = null,
  animateIn = false,
  dashed = false,
}: {
  dayun: DayunRow[]
  branches: MakeIfBranch[]
  colors: MIColors
  width: number
  selectedBranchId: string | null
  onSelectBranch: (id: string) => void
  /** Tap a 流年 → fork a 假如 at that year's age. */
  onMainNodeTap?: (age: number) => void
  nowLabel: string
  /** UI locale — 干支 only in zh; other languages show year + age (干支 is opaque). */
  lang: string
  /** Age to centre the year-window on (大运 strip moves it). null → now. */
  focusAge?: number | null
  animateIn?: boolean
  dashed?: boolean
}) {
  const cjk = lang.startsWith('zh')
  const layout = useMemo(() => buildLayout(dayun, branches, focusAge), [dayun, branches, focusAge])
  // 流年 labels right-align to the screen edge — lanes on the left, labels flush
  // right, a gutter between — so the graph fills the width instead of cramming left.
  const labelX = TRUNK_X + (Math.max(1, layout.branches.length) + 1) * LANE + 10
  const trunkPath = useMemo(() => {
    const p = Skia.Path.Make()
    p.moveTo(TRUNK_X, layout.top)
    p.lineTo(TRUNK_X, layout.bottom)
    return p
  }, [layout])
  const progress = useSharedValue(animateIn ? 0 : 1)
  useEffect(() => {
    if (animateIn) progress.value = withTiming(1, { duration: 900 })
  }, [animateIn, progress])

  const anySelected = selectedBranchId != null

  return (
    <View style={{ width, height: layout.height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: layout.height }}>
        {/* 大运 五行 bands (left) */}
        {layout.bands.map((b) => (
          <Group key={`band-${b.index}`}>
            <Path
              path={(() => {
                const p = Skia.Path.Make()
                p.addRRect(
                  Skia.RRectXY(
                    Skia.XYWHRect(BAND_X, b.top - ROW / 2 + 2, BAND_W, b.bottom - b.top + ROW - 4),
                    3,
                    3
                  )
                )
                return p
              })()}
              color={b.color}
              opacity={0.5}
            />
          </Group>
        ))}

        {/* 命 main spine (neutral thread; 五行 lives in the nodes) */}
        <Path
          path={trunkPath}
          style='stroke'
          strokeWidth={2.4}
          strokeCap='round'
          color={colors.separator}
          end={progress}
        />

        {/* branches */}
        {layout.branches.map((b) => {
          const selected = selectedBranchId === b.id
          const stroke = b.isPast ? colors.dim : b.color
          return (
            <Group key={b.id} opacity={selected ? 1 : anySelected ? 0.5 : b.isPast ? 0.5 : 0.92}>
              <Path
                path={b.path}
                style='stroke'
                strokeWidth={selected ? 2.4 : 2}
                strokeCap='round'
                strokeJoin='round'
                color={stroke}
                end={progress}
              >
                {dashed || b.isPast ? <DashPathEffect intervals={[6, 5]} /> : null}
              </Path>
              <GNode x={TRUNK_X} y={b.forkY} r={5} color={stroke} bg={colors.bg} variant='ring' />
              {b.dots.map((d, di) => (
                <GNode key={di} x={d.x} y={d.y} r={3.2} color={stroke} bg={colors.bg} />
              ))}
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
                <GNode x={b.laneX} y={b.endY} r={3.6} color={stroke} bg={colors.bg} />
              )}
            </Group>
          )
        })}

        {/* 流年 nodes — data hue = 五行; now = terra treatment; fork = branch ring */}
        {layout.cells.map((c) => {
          if (c.isNow) {
            return (
              <Group key={`n-${c.year}`}>
                <Circle cx={TRUNK_X} cy={c.y} r={14} color={colors.accent} opacity={0.16} />
                <GNode x={TRUNK_X} y={c.y} r={6} color={colors.accent} bg={colors.bg} />
              </Group>
            )
          }
          if (layout.forkAges.has(c.age) || layout.mergeAges.has(c.age)) return null // drawn by branch
          return (
            <GNode
              key={`n-${c.year}`}
              x={TRUNK_X}
              y={c.y}
              r={4}
              color={wxColor(c.element)}
              bg={colors.bg}
            />
          )
        })}
      </Canvas>

      {/* 大运 labels (left, at each band top) */}
      {layout.bands.map((b) => (
        <Text
          key={`bl-${b.index}`}
          style={{
            position: 'absolute',
            left: BAND_X + BAND_W + 4,
            top: b.top - ROW / 2 + 2,
            color: colors.secondary,
            fontSize: 9,
            fontWeight: '600',
          }}
        >
          {`${b.label}运`}
        </Text>
      ))}

      {/* 流年 labels (gz + year) + verdict dot — to the RIGHT of the lane band */}
      {layout.cells.map((c) => (
        <View
          key={`yl-${c.year}`}
          style={{
            position: 'absolute',
            left: labelX,
            top: c.y - 9,
            right: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
          }}
        >
          <Text
            style={{
              color: c.isNow ? colors.text : colors.secondary,
              fontSize: 13,
              fontWeight: c.isNow ? '700' : '400',
            }}
          >
            {cjk ? c.gz : c.year}
          </Text>
          <Text style={{ color: c.isNow ? colors.accent : colors.dim, fontSize: 10 }}>
            {cjk ? c.year : `${c.age}${lang === 'ja' ? '歳' : ''}`}
          </Text>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: fitColor(c.fit, colors.dim),
            }}
          />
        </View>
      ))}

      {/* now label */}
      {(() => {
        const now = layout.cells.find((c) => c.isNow)
        return now ? (
          <Text
            style={{
              position: 'absolute',
              left: TRUNK_X + 12,
              top: now.y - 8,
              color: colors.accent,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1,
            }}
          >
            {nowLabel}
          </Text>
        ) : null
      })()}

      {/* per-年 tap target → fork at that year's age. Full-row, but the branch-lane
          Pressables below render LATER (higher z), so a tap on a lane selects that
          branch while a tap on the node/label forks. */}
      {onMainNodeTap
        ? layout.cells.map((c) => (
            <Pressable
              key={`t-${c.year}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {})
                onMainNodeTap(c.age)
              }}
              accessibilityRole='button'
              accessibilityLabel={`${c.gz} ${c.year}`}
              style={{
                position: 'absolute',
                left: 0,
                top: c.y - ROW / 2,
                right: 0,
                height: ROW,
              }}
            />
          ))
        : null}

      {/* Branch LANE tap → select the branch. The whole lane (the line itself) is
          tappable — not just a label — and on-graph event labels are dropped so
          they never collide with the 干支/year column (the branch's identity is
          its colour + the summary card below). */}
      {layout.branches.map((b) => {
        const top = Math.min(b.forkY, b.mergeY ?? b.endY)
        const bot = Math.max(b.forkY, b.mergeY ?? b.endY)
        return (
          <Pressable
            key={`lane-${b.id}`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {})
              onSelectBranch(b.id)
            }}
            accessibilityRole='button'
            accessibilityLabel={b.label}
            style={{
              position: 'absolute',
              left: b.laneX - 15,
              top: top - 8,
              width: 30,
              height: bot - top + 16,
            }}
          />
        )
      })}
    </View>
  )
}
