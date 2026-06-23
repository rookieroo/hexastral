/**
 * RelationshipGitGraph — the 合盘 relationship timeline as a Skia git-graph.
 *
 * Yuel's answer to Yuun's solo life-graph (ADR-0026 §5): two threads — 你 (gold spine)
 * and TA (moonlight lane) — run down the loom and are TIED at each turning point (a
 * relationship node). Same git aesthetic as auspice's TimelineGraph (bg-halo nodes that
 * punch the thread, an accent glow on the current year, S-curve peel/merge where the
 * threads meet) but the STRUCTURE is the bond, not a single life. Built fresh on the
 * shared Skia version rather than genericizing Yuun's engine, so Yuun's graphs are
 * untouched.
 *
 * Renders the graph rail (Skia) + a tappable label per node (RN overlay sharing the
 * canvas coordinate space). Selection is owned by the parent (graph + selected NodeCard).
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import type { BondsTimelineNode, BondsTimelineSignificance } from '@zhop/scenario-kindred'
import { Pressable, Text, View } from 'react-native'

const X_YOU = 22 // 你 thread — the gold spine
const X_TA = 46 // TA thread — the moonlight lane
const MID = (X_YOU + X_TA) / 2 // the tie node sits between the threads
const PAD = 16
const STEP = 48 // vertical rhythm between turning points
const LABEL_X = 66 // node labels begin clear of the rail
const YOU = kindredDark.accent
const TA = '#9ab0cf'

function nodeRadius(sig: BondsTimelineSignificance): number {
  return sig === 'major' ? 7 : sig === 'notable' ? 5.5 : 4.5
}

function sigColor(sig: BondsTimelineSignificance): string {
  return sig === 'major'
    ? kindredDark.accent
    : sig === 'notable'
      ? kindredDark.seal
      : kindredDark.textMuted
}

/** A tight git-graph S-elbow: leave vertically, arrive vertically (Yuun's `curve`). */
function elbow(
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

export function RelationshipGitGraph({
  nodes,
  selectedKey,
  onSelect,
  width,
  yearLabel,
}: {
  /** The bond's turning points, chronological. */
  nodes: BondsTimelineNode[]
  selectedKey: string | null
  onSelect: (key: string) => void
  width: number
  /** Localised "{year} · {ganZhi}" line for a node. */
  yearLabel: (node: BondsTimelineNode) => string
}) {
  if (nodes.length === 0) return null

  const rows = nodes.map((node, i) => ({ node, y: PAD + i * STEP }))
  const height = PAD * 2 + Math.max(0, nodes.length - 1) * STEP
  const firstY = rows[0]?.y ?? PAD
  const lastY = rows[rows.length - 1]?.y ?? height - PAD
  const currentYear = new Date().getFullYear()

  // 你 spine — a continuous through-line.
  const youPath = Skia.Path.Make()
  youPath.moveTo(X_YOU, 4)
  youPath.lineTo(X_YOU, height - 4)

  // TA lane — peels from 你 at the top, runs parallel, merges back at the bottom.
  const taPath = Skia.Path.Make()
  elbow(taPath, X_YOU, 4, X_TA, firstY)
  taPath.lineTo(X_TA, lastY)
  elbow(taPath, X_TA, lastY, X_YOU, height - 4)

  return (
    <View style={{ width, height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Path
          path={youPath}
          style='stroke'
          strokeWidth={2.2}
          strokeCap='round'
          color={YOU}
          opacity={0.6}
        />
        <Path
          path={taPath}
          style='stroke'
          strokeWidth={2}
          strokeCap='round'
          strokeJoin='round'
          color={TA}
          opacity={0.5}
        />
        {rows.map(({ node, y }) => {
          const r = nodeRadius(node.significance)
          const c = sigColor(node.significance)
          const isCurrent = node.year === currentYear
          const selected = node.key === selectedKey
          const past = node.year < currentYear
          // The tie — the moment the two threads are bound at a turning point.
          const tie = Skia.Path.Make()
          tie.moveTo(X_YOU, y)
          tie.lineTo(X_TA, y)
          return (
            <Group key={node.key}>
              <Path
                path={tie}
                style='stroke'
                strokeWidth={1.2}
                color={c}
                opacity={past ? 0.25 : 0.4}
              />
              {/* bg halo punches the threads so the node sits on them with a clean gap */}
              <Circle cx={MID} cy={y} r={r + 3} color={kindredDark.bg} />
              {isCurrent ? <Circle cx={MID} cy={y} r={r + 7} color={YOU} opacity={0.14} /> : null}
              <Circle cx={MID} cy={y} r={r} color={c} opacity={past ? 0.55 : 1} />
              {selected ? (
                <Circle
                  cx={MID}
                  cy={y}
                  r={r + 2.5}
                  style='stroke'
                  strokeWidth={2}
                  color={kindredDark.accent}
                />
              ) : null}
            </Group>
          )
        })}
      </Canvas>

      {/* Labels + tap targets — share the canvas coordinate space. */}
      {rows.map(({ node, y }) => {
        const selected = node.key === selectedKey
        return (
          <Pressable
            key={node.key}
            onPress={() => onSelect(node.key)}
            accessibilityRole='button'
            style={{
              position: 'absolute',
              left: 0,
              top: y - STEP / 2,
              width,
              height: STEP,
              justifyContent: 'center',
              paddingLeft: LABEL_X,
              paddingRight: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? kindredDark.text : kindredDark.textSecondary,
                fontSize: 14,
                letterSpacing: 0.3,
              }}
            >
              {yearLabel(node)}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: kindredDark.textMuted, fontSize: 12, marginTop: 2 }}
            >
              {node.summary}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
