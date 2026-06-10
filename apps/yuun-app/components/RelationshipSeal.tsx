/**
 * RelationshipSeal — the relationship verdict as an oracle-bone (甲骨文) two-figure
 * posture, the visual language Kindred uses. The state reads off WHICH WAY the two
 * 人 face — one legible gradient, three unambiguous states:
 *
 *   合 (六合 · 生)  → 二人相向, facing each other      (相迎·相生·最亲)
 *   平 (比和 · 平)  → 二人相从, side by side, same way  (并列·对等)
 *   冲 (六冲 · 克)  → 二人相背 (北), back to back        (相违·相克)
 *
 * All three are the SAME two figures (PL faces left, PR faces right), just turned:
 * facing-in = 合, same-direction = 平, facing-out = 冲. Earlier this used two
 * "together" glyphs (合 + 比) for two different states, which muddled 合 vs 平.
 *
 * Forms are vendored here (public-domain ancient figures, the same outlines Kindred
 * uses) and rendered with the Skia auspice already ships — no cross-app dependency,
 * no brand coupling. Stroke is scaled by the Skia group transform, so strokeWidth is
 * in glyph units.
 */

import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'

import type { RelVerdict } from '@/lib/relationship'

// 人 in profile — one sweeping stroke (head·back·leg) + one arm. PL faces left,
// PR faces right (its mirror). The arm reaches in the facing direction.
const PL = ['M60,15 C63,40 59,64 50,87 C45,101 41,112 39,124', 'M57,41 C49,54 43,66 40,86']
const PR = ['M40,15 C37,40 41,64 50,87 C55,101 59,112 61,124', 'M43,41 C51,54 57,66 60,86']

interface Glyph {
  box: [number, number]
  twin: { paths: string[]; dx: number }[]
}

// 合 — relate inward (PR on the left faces right, PL on the right faces left → toward).
const FACING: Glyph = {
  box: [160, 130],
  twin: [
    { paths: PR, dx: 16 },
    { paths: PL, dx: 58 },
  ],
}
// 平 — both face the same way (相从 / parallel).
const PARALLEL: Glyph = {
  box: [160, 130],
  twin: [
    { paths: PR, dx: 16 },
    { paths: PR, dx: 58 },
  ],
}
// 冲 — relate outward (PL faces left, PR faces right → backs to the centre, 相背 = 北).
const BACK_TO_BACK: Glyph = {
  box: [160, 130],
  twin: [
    { paths: PL, dx: 16 },
    { paths: PR, dx: 58 },
  ],
}

const VERDICT_GLYPH: Record<RelVerdict, Glyph> = { 合: FACING, 平: PARALLEL, 冲: BACK_TO_BACK }

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
  const g = VERDICT_GLYPH[verdict]
  const [bw, bh] = g.box
  const inset = 0.66
  const scale = Math.min((size * inset) / bw, (size * inset) / bh)
  const tx = (size - bw * scale) / 2
  const ty = (size - bh * scale) / 2

  const paths = useMemo(() => {
    const segs: { d: string; dx: number }[] = []
    for (const part of g.twin) for (const d of part.paths) segs.push({ d, dx: part.dx })
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
