/**
 * RelationshipSeal — the relationship verdict as an oracle-bone (甲骨文) two-figure
 * posture, the visual language Kindred uses. Three states evaluate the bond:
 *
 *   合 (六合 harmony)  → 合 — two halves joined (亼 lid over 口 vessel)
 *   冲 (六冲 clash)    → 北 — 二人相背, two figures back to back
 *   平 (neutral)       → 比 — 二人相从, two figures side by side
 *
 * The glyph forms are vendored here (original public-domain ancient forms, the
 * same hand-authored outlines Kindred uses) and rendered with the Skia auspice
 * already ships — no cross-app dependency, no brand coupling. Stroke is scaled by
 * the Skia group transform, so strokeWidth is in glyph units.
 */

import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'

import type { RelVerdict } from '@/lib/relationship'

// 人 in profile — one sweeping stroke (head·back·leg) + one arm. PL faces left,
// PR faces right (its mirror).
const PL = ['M60,15 C63,40 59,64 50,87 C45,101 41,112 39,124', 'M57,41 C49,54 43,66 40,86']
const PR = ['M40,15 C37,40 41,64 50,87 C55,101 59,112 61,124', 'M43,41 C51,54 57,66 60,86']

interface Glyph {
  box: [number, number]
  strokes?: string[]
  twin?: { paths: string[]; dx: number }[]
}

const GLYPHS: Record<'合' | '北' | '比', Glyph> = {
  // 亼 (lid) + 口 (vessel) — joined.
  合: { box: [100, 130], strokes: ['M28,58 L50,25 L72,58', 'M38,70 L62,70 L62,98 L38,98 Z'] },
  // PL faces left, PR faces right → backs to the centre (相背).
  北: {
    box: [160, 130],
    twin: [
      { paths: PL, dx: 16 },
      { paths: PR, dx: 58 },
    ],
  },
  // Both face the same way → one beside the other (相从).
  比: {
    box: [160, 130],
    twin: [
      { paths: PR, dx: 16 },
      { paths: PR, dx: 58 },
    ],
  },
}

const VERDICT_GLYPH: Record<RelVerdict, '合' | '北' | '比'> = { 合: '合', 冲: '北', 平: '比' }

export function RelationshipSeal({
  verdict,
  size,
  color,
  strokeWidth = 9,
}: {
  verdict: RelVerdict
  size: number
  color: string
  strokeWidth?: number
}) {
  const g = GLYPHS[VERDICT_GLYPH[verdict]]
  const [bw, bh] = g.box
  const inset = 0.66
  const scale = Math.min((size * inset) / bw, (size * inset) / bh)
  const tx = (size - bw * scale) / 2
  const ty = (size - bh * scale) / 2

  const paths = useMemo(() => {
    const segs: { d: string; dx: number }[] = []
    if (g.strokes) for (const d of g.strokes) segs.push({ d, dx: 0 })
    if (g.twin) for (const part of g.twin) for (const d of part.paths) segs.push({ d, dx: part.dx })
    return segs
      .map((s) => {
        const p = Skia.Path.MakeFromSVGString(s.d)
        if (p && s.dx) p.offset(s.dx, 0)
        return p
      })
      .filter((p): p is NonNullable<typeof p> => p != null)
  }, [g])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ translateX: tx }, { translateY: ty }, { scale }]}>
        {paths.map((p, i) => (
          <Path
            key={i}
            path={p}
            style='stroke'
            strokeWidth={strokeWidth}
            color={color}
            strokeCap='round'
            strokeJoin='round'
          />
        ))}
      </Group>
    </Canvas>
  )
}
