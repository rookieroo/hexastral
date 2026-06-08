/**
 * InkCenterpiece — the chapter centerpiece, react-native-skia, ANIMATED.
 *
 * Element-agnostic by design: two particle masses (her = ink, his = pale) and
 * the STATE of their interaction IS the relationship — read at a glance:
 *   merge    生  — flow into each other, diffuse into one (drift together)
 *   oppose   克  — repel, crowd a tense seam, never cross (vibrate + sparks)
 *   resonate 比和 — distinct yet entwined, the 太極 swirl (slow rotation)
 *
 * Particles are generated once (JS, deterministic) and drawn as Skia `Points`
 * (a few GPU draw calls) on a grey ground; a skia clock drives a per-state
 * transform so it breathes. Each chapter maps to the state matching its facet
 * of the bond's arc.
 */

import { Canvas, Fill, Group, Points, type SkPoint, useClock } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { useDerivedValue } from 'react-native-reanimated'

const VW = 560
const VH = 320
const CX = 280
const CY = 158

type State = 'merge' | 'oppose' | 'resonate'

const CHAPTER_STATE: Record<string, State> = {
  first_impression: 'resonate',
  communication: 'merge',
  conflict: 'oppose',
  complement: 'merge',
  monthly_outlook: 'oppose',
  long_term_advice: 'resonate',
}

// ── deterministic rng + noise ────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gaussFrom(rnd: () => number) {
  return (mu: number, sd: number) =>
    mu + sd * Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd())
}
function makeNoise(seed: number, cells = 18) {
  const r = mulberry32(seed)
  const g = Array.from({ length: cells + 1 }, () => Array.from({ length: cells + 1 }, () => r()))
  return (x: number, y: number) => {
    const gx = Math.max(0, Math.min(cells - 1e-6, (x / 760) * cells))
    const gy = Math.max(0, Math.min(cells - 1e-6, (y / 760) * cells))
    const ix = Math.floor(gx)
    const iy = Math.floor(gy)
    const fx = gx - ix
    const fy = gy - iy
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const row = g[iy] ?? []
    const row2 = g[iy + 1] ?? []
    const a = row[ix] ?? 0
    const b = row[ix + 1] ?? 0
    const c = row2[ix] ?? 0
    const d = row2[ix + 1] ?? 0
    const top = a + (b - a) * sx
    return top + (c + (d - c) * sx - top) * sy
  }
}

type Masses = { a: SkPoint[]; b: SkPoint[]; accent: SkPoint[] }

// ── three states (two masses; A = ink, B = pale; accent = cinnabar) ──────────
function generate(state: State, s: number): Masses {
  const a: SkPoint[] = []
  const b: SkPoint[] = []
  const accent: SkPoint[] = []
  const push = (arr: SkPoint[], x: number, y: number) => arr.push({ x: x * s, y: y * s })

  if (state === 'merge') {
    const rnd = mulberry32(3)
    const nz = makeNoise(11)
    const g = gaussFrom(rnd)
    for (const [arr, cx, off] of [
      [a, 210, 0],
      [b, 350, 99],
    ] as const) {
      for (let i = 0; i < 5200; i++) {
        const x = cx + g(0, 118)
        const y = CY + g(0, 84)
        const f =
          Math.exp(-(((x - cx) / 130) ** 2) - ((y - CY) / 96) ** 2) * (0.5 + 0.7 * nz(x + off, y))
        if (rnd() > f) continue
        push(arr, x, y)
      }
    }
    for (let i = 0; i < 1500; i++) {
      const x = CX + g(0, 52)
      const y = CY + g(0, 40)
      push(rnd() < 0.5 ? a : b, x, y)
    }
  } else if (state === 'oppose') {
    const rnd = mulberry32(19)
    const nz = makeNoise(9)
    const g = gaussFrom(rnd)
    const seamX = CX
    const gap = 22
    for (const [arr, cx, sign] of [
      [a, 150, 1],
      [b, 410, -1],
    ] as const) {
      for (let i = 0; i < 6000; i++) {
        const x = cx + g(0, 70)
        const y = CY + g(0, 100)
        if (sign * (x - (seamX - sign * gap)) > 0) continue
        const comp = Math.exp(-((Math.abs(x - (seamX - sign * gap)) / 40) ** 2))
        const f =
          Math.exp(-(((x - cx) / 80) ** 2) - ((y - CY) / 108) ** 2) * (0.45 + 0.55 * nz(x, y)) +
          0.5 * comp
        if (rnd() > Math.min(0.95, f)) continue
        push(arr, x, y)
      }
    }
    for (let i = 0; i < 240; i++) push(accent, seamX + g(0, 4), CY + g(0, 96))
  } else {
    // resonate — the 太極 swirl
    const rnd = mulberry32(7)
    const ns = makeNoise(33, 22)
    const R = 132
    const isDark = (x: number, y: number) => {
      const dt = Math.hypot(x, y + R / 2)
      const db = Math.hypot(x, y - R / 2)
      if (dt <= R / 2) return false
      if (db <= R / 2) return true
      return x > 0
    }
    for (let i = 0; i < 13000; i++) {
      const ang = rnd() * 2 * Math.PI
      const rr = R * 1.16 * rnd() ** 0.62
      let x = rr * Math.cos(ang)
      let y = rr * Math.sin(ang)
      const tw = (rr / R) * 9 * (ns(CX + x, CY + y) - 0.5)
      x += -Math.sin(ang) * tw
      y += Math.cos(ang) * tw
      const fade = rr < R * 0.82 ? 1 : Math.max(0, 1 - (rr - R * 0.82) / (R * 0.36))
      if (fade <= 0 || rr > R * 1.18) continue
      const d = isDark(x, y)
      if (rnd() > (d ? 0.72 : 0.62) * fade) continue
      push(d ? a : b, CX + x, CY + y)
    }
    for (const [ex, ey, arr] of [
      [CX, CY - R / 2, b],
      [CX, CY + R / 2, a],
    ] as const) {
      for (let i = 0; i < 90; i++) {
        const ang = rnd() * 2 * Math.PI
        const r = Math.abs(gaussFrom(rnd)(0, 6))
        push(arr, ex + r * Math.cos(ang), ey + r * Math.sin(ang))
      }
    }
  }
  return { a, b, accent }
}

export interface InkCenterpieceProps {
  /** Chapter kind → maps to a relationship state. */
  kind: string
  /** Rendered width; height follows the 560×320 aspect. */
  width: number
}

export function InkCenterpiece({ kind, width }: InkCenterpieceProps) {
  const height = (width * VH) / VW
  const s = width / VW
  const state = CHAPTER_STATE[kind] ?? 'oppose'
  const { a, b, accent } = useMemo(() => generate(state, s), [state, s])

  const clock = useClock()
  const cx = CX * s
  const cy = CY * s

  // per-state animated transforms (all defined unconditionally; used per state)
  const spin = useDerivedValue(() => [{ rotate: clock.value * 0.00012 }], [clock])
  const pullA = useDerivedValue(
    () => [{ translateX: Math.sin(clock.value * 0.0011) * 6 * s }],
    [clock]
  )
  const pullB = useDerivedValue(
    () => [{ translateX: -Math.sin(clock.value * 0.0011) * 6 * s }],
    [clock]
  )
  const jitA = useDerivedValue(
    () => [{ translateX: Math.sin(clock.value * 0.006) * 2.4 * s }],
    [clock]
  )
  const jitB = useDerivedValue(
    () => [{ translateX: -Math.sin(clock.value * 0.006) * 2.4 * s }],
    [clock]
  )
  const sparkOp = useDerivedValue(() => 0.55 + 0.35 * Math.sin(clock.value * 0.009), [clock])

  const tA = state === 'merge' ? pullA : state === 'oppose' ? jitA : undefined
  const tB = state === 'merge' ? pullB : state === 'oppose' ? jitB : undefined

  const inkA = (
    <Group transform={tA}>
      <Points
        points={a}
        mode='points'
        color='rgba(20,19,18,0.6)'
        style='stroke'
        strokeWidth={2.3 * s + 0.7}
        strokeCap='round'
      />
    </Group>
  )
  const inkB = (
    <Group transform={tB}>
      <Points
        points={b}
        mode='points'
        color='rgba(244,243,239,0.62)'
        style='stroke'
        strokeWidth={2.3 * s + 0.7}
        strokeCap='round'
      />
    </Group>
  )

  const body = (
    <>
      {inkA}
      {inkB}
      <Group opacity={state === 'oppose' ? sparkOp : undefined}>
        <Points
          points={accent}
          mode='points'
          color='rgba(168,48,26,0.7)'
          style='stroke'
          strokeWidth={2.6 * s + 0.7}
          strokeCap='round'
        />
      </Group>
    </>
  )

  return (
    <Canvas style={{ width, height }}>
      <Fill color='#bdbcb7' />
      {state === 'resonate' ? (
        <Group transform={spin} origin={{ x: cx, y: cy }}>
          {body}
        </Group>
      ) : (
        body
      )}
    </Canvas>
  )
}
