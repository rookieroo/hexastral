/**
 * RelationshipGitGraph — a 合盘 Skia git-graph rail: 你 (gold spine) + TA (moonlight
 * lane) run down the loom, tied at each node. Yuun's aesthetic (bg-halo nodes that
 * punch the thread, an accent glow, S-curve peel/merge), built fresh on the shared
 * Skia version so Yuun's graphs are untouched (ADR-0026 §5).
 *
 * Generic over the rail items, so the SAME rail drives both 合盘 surfaces: the
 * relationship TIMELINE (turning points, coloured by significance, current year aglow)
 * and the WHAT-IF (forward decision windows, coloured by lean, the best window aglow).
 * The parent maps its domain rows → RailItem[] and owns selection (graph + selected card).
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { Pressable, Text, View } from 'react-native'

const X_YOU = 22 // 你 thread — the gold spine
const X_TA = 46 // TA thread — the moonlight lane
const MID = (X_YOU + X_TA) / 2 // the tie node sits between the threads
const PAD = 16
const STEP = 48 // vertical rhythm between nodes
const LABEL_X = 66 // node labels begin clear of the rail

const YOU = kindredDark.accent
const TA = '#9ab0cf'

export interface RailItem {
  key: string
  /** Node + tie colour — significance (timeline) or decision lean (what-if). */
  color: string
  radius: number
  /** Accent glow halo — the current year, or the best decision window. */
  glow?: boolean
  /** Past / inactive — dimmed. */
  dim?: boolean
  title: string
  sub: string
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
  items,
  selectedKey,
  onSelect,
  width,
}: {
  /** The rail's nodes, in display order (chronological). */
  items: RailItem[]
  selectedKey: string | null
  onSelect: (key: string) => void
  width: number
}) {
  if (items.length === 0) return null

  const rows = items.map((item, i) => ({ item, y: PAD + i * STEP }))
  const height = PAD * 2 + Math.max(0, items.length - 1) * STEP
  const firstY = rows[0]?.y ?? PAD
  const lastY = rows[rows.length - 1]?.y ?? height - PAD

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
        {rows.map(({ item, y }) => {
          const r = item.radius
          const selected = item.key === selectedKey
          // The tie — the moment the two threads are bound at this node.
          const tie = Skia.Path.Make()
          tie.moveTo(X_YOU, y)
          tie.lineTo(X_TA, y)
          return (
            <Group key={item.key}>
              <Path
                path={tie}
                style='stroke'
                strokeWidth={1.2}
                color={item.color}
                opacity={item.dim ? 0.25 : 0.4}
              />
              {/* bg halo punches the threads so the node sits on them with a clean gap */}
              <Circle cx={MID} cy={y} r={r + 3} color={kindredDark.bg} />
              {item.glow ? <Circle cx={MID} cy={y} r={r + 7} color={YOU} opacity={0.14} /> : null}
              <Circle cx={MID} cy={y} r={r} color={item.color} opacity={item.dim ? 0.55 : 1} />
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
      {rows.map(({ item, y }) => {
        const selected = item.key === selectedKey
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
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
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: kindredDark.textMuted, fontSize: 12, marginTop: 2 }}
            >
              {item.sub}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
