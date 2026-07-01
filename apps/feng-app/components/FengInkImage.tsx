/**
 * FengInkImage — the chapter 意象图, react-native-skia + reanimated.
 *
 * 意绘, not 形绘: each field is a soft, boundary-less density gradient — 势 emerges
 * from where the particles cluster, and 留白 is the 界 (no drawn shapes, no
 * connector particles). 五行 color: 土黄(山)/水蓝/风青/气金/墨; 红 only means 煞.
 *
 *   峦头 觅   soft 砂 lobes (玄武/龙虎) embracing a 留白 明堂, 界水 diffuse below
 *   八宅 察   命气 core, 吉方 warm lobes, 凶方 faint-ink + 留白
 *   玄空 察   洛书 density field — 旺=金气密 / 衰=墨疏 (grid only implied)
 *   流年 察   气 streaming toward the year's direction on 青风 currents
 *   化解 调   MORPH: 煞(红)聚 knot → 煞散气宁 (the red 煞 disperses to calm)
 *   布置 调   MORPH: 气散 → 藏风聚气 (particles gather to a core inside a 风 embrace)
 *
 * The two morphs are the SAME particles migrating — a one-shot Group scale +
 * opacity about a fixed origin (radial), played once on open then static (zero
 * sustained cost → no overheating). Requires @shopify/react-native-skia.
 */

import { Canvas, Fill, Group, Points, type SkPoint } from '@shopify/react-native-skia'
import type { FengChapterKind } from '@zhop/scenario-feng'
import { useEffect, useMemo } from 'react'
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const VW = 440
const VH = 300
const CX = 220
const CY = 150

// Monochrome-zinc essence (rgb only — alpha per layer). 五行 hues dropped with
// the theme; 藏风聚气 now reads through BRIGHTNESS + DENSITY on the dark ground,
// not colour — bright/dense = 聚气, dim/scattered = 散. Only 煞 keeps a single
// reserved desaturated red. This actually reinforces 意绘 over 形绘.
const EAR = '113,113,122' // 土 / 山 — dim solid mass (zinc-500)
const WAT = '82,82,91' // 水 — dimmest, sinks (zinc-600)
const WIN = '161,161,170' // 风 — streaming currents, mid (zinc-400)
const QI = '250,250,250' // 气 — the gathered glow, BRIGHTEST (zinc-50)
const INK = '63,63,70' // 墨 — base ground (zinc-700)
const SHA = '180,114,110' // 煞 — the ONLY red (desaturated); disperses in 化解

const SEED: Record<string, number> = {
  external_landform: 11,
  personal_fit: 23,
  flying_stars: 5,
  annual_directions: 31,
  remediation: 17,
  auspicious_objects: 41,
}

// ── deterministic rng ─────────────────────────────────────────────────────────
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
  return (sd: number) =>
    sd * Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd())
}

interface Raw {
  x: number
  y: number
  rgb: string
  a: number
}

// Soft feathered blob — gaussian scatter with a falloff alpha (no edge).
function blobInto(
  A: Raw[],
  rnd: () => number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  rgb: string,
  peak: number,
  count: number
) {
  const g = gaussFrom(rnd)
  for (let i = 0; i < count; i++) {
    const dx = g(sx)
    const dy = g(sy)
    const rr = (dx / sx) ** 2 + (dy / sy) ** 2
    const a = peak * Math.exp(-rr * 0.9)
    if (a < 0.05) continue
    A.push({ x: cx + dx, y: cy + dy, rgb, a })
  }
}

// ── static essence fields ─────────────────────────────────────────────────────
function genStaticRaw(kind: FengChapterKind): Raw[] {
  const A: Raw[] = []
  const rnd = mulberry32(SEED[kind] ?? 7)
  const g = gaussFrom(rnd)

  if (kind === 'external_landform') {
    blobInto(A, rnd, 220, 74, 66, 48, EAR, 0.74, 1500) // 玄武靠山
    blobInto(A, rnd, 108, 122, 46, 56, EAR, 0.66, 1000) // 青龙
    blobInto(A, rnd, 332, 122, 46, 56, EAR, 0.66, 1000) // 白虎
    for (let i = 0; i < 1000; i++) {
      const x = rnd() * VW
      const y = 228 + g(30)
      const a = 0.62 * Math.exp(-(((y - 230) / 42) ** 2))
      if (y < 194 || a < 0.05) continue
      A.push({ x, y, rgb: WAT, a }) // 界水 diffuse; 明堂 (lower center) stays 留白
    }
  } else if (kind === 'personal_fit') {
    blobInto(A, rnd, CX, CY, 27, 23, QI, 0.82, 850) // 命气 core
    for (const d of [-90, 25, 155]) {
      const a = (d * Math.PI) / 180
      blobInto(A, rnd, CX + 80 * Math.cos(a), CY + 80 * Math.sin(a) * 0.86, 36, 32, QI, 0.5, 520) // 吉方
    }
    for (const d of [90, -140]) {
      const a = (d * Math.PI) / 180
      blobInto(A, rnd, CX + 82 * Math.cos(a), CY + 82 * Math.sin(a) * 0.86, 30, 26, INK, 0.26, 200) // 凶方 whisper
    }
  } else if (kind === 'flying_stars') {
    const LO = [
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6],
    ]
    LO.forEach((row, R) => {
      row.forEach((v, c) => {
        const rgb = v >= 6 ? QI : v >= 3 ? EAR : INK // 旺=金 / 中=土 / 衰=墨
        const sd = 17 + v * 0.6
        blobInto(
          A,
          rnd,
          CX + (c - 1) * 82,
          CY + (R - 1) * 74,
          sd,
          sd,
          rgb,
          Math.min(0.92, 0.18 + 0.088 * v),
          90 + v * 34
        )
      })
    })
  } else {
    // annual_directions — 气随风流转 toward the year's dominant direction
    const dom = (-50 * Math.PI) / 180
    for (let i = 0; i < 1500; i++) {
      const t = rnd()
      const ang = dom + g(0.5)
      const rad = t * 128
      const a = 0.78 * (1 - t * 0.55)
      if (a < 0.05) continue
      A.push({ x: CX + rad * Math.cos(ang), y: CY + rad * Math.sin(ang) * 0.86, rgb: QI, a })
    }
    for (let i = 0; i < 650; i++) {
      const t = 0.45 + rnd() * 0.55
      const ang = dom + g(0.6)
      const rad = t * 142
      A.push({
        x: CX + rad * Math.cos(ang),
        y: CY + rad * Math.sin(ang) * 0.86,
        rgb: WIN,
        a: 0.55 * (1 - t * 0.4),
      })
    }
    blobInto(A, rnd, CX, CY, 17, 15, QI, 0.6, 350)
  }
  return A
}

// Quantize per-point alpha into a few tiers → each (color,tier) is one Points call.
const ALPHA_BINS = [0.22, 0.4, 0.58, 0.78]
function nearestBin(a: number): number {
  let bi = 0
  let bd = Number.POSITIVE_INFINITY
  ALPHA_BINS.forEach((bv, i) => {
    const d = Math.abs(a - bv)
    if (d < bd) {
      bd = d
      bi = i
    }
  })
  return bi
}

interface Layer {
  color: string
  pts: SkPoint[]
}

function binize(raw: Raw[], s: number): Layer[] {
  const m = new Map<string, SkPoint[]>()
  for (const r of raw) {
    const key = `${r.rgb}|${nearestBin(r.a)}`
    let arr = m.get(key)
    if (!arr) {
      arr = []
      m.set(key, arr)
    }
    arr.push({ x: r.x * s, y: r.y * s })
  }
  const out: Layer[] = []
  for (const [key, pts] of m) {
    const [rgb, bi] = key.split('|')
    out.push({ color: `rgba(${rgb},${ALPHA_BINS[Number(bi)]})`, pts })
  }
  return out
}

// ── morph fields (化解 / 布置) ─────────────────────────────────────────────────
// Each layer holds the SAME particles in two arrangements — `from` (t=0) and
// `to` (t=1). The transition lerps every point along its own path (intermediate
// keyframes), matching the HTML preview — NOT a uniform scale/zoom.
interface MorphLayer {
  rgb: string
  aFrom: number
  aTo: number
  from: SkPoint[]
  to: SkPoint[]
}
interface MorphSpec {
  layers: [MorphLayer, MorphLayer]
}

function genMorph(kind: FengChapterKind, s: number): MorphSpec {
  const rnd = mulberry32(SEED[kind] ?? 7)
  const g = gaussFrom(rnd)
  const P = (x: number, y: number): SkPoint => ({ x: x * s, y: y * s })

  if (kind === 'remediation') {
    // 煞聚 (tight knot, t=0) → 煞散气宁 (dispersed calm, t=1). The 煞 (red) fades.
    const shaFrom: SkPoint[] = []
    const shaTo: SkPoint[] = []
    const inkFrom: SkPoint[] = []
    const inkTo: SkPoint[] = []
    for (let i = 0; i < 1900; i++) {
      const toX = CX + g(104)
      const toY = CY + g(64)
      const fx = 202 + g(25) // compressed toward the knot center
      const fy = 150 + g(21)
      const core = Math.hypot(fx - 202, fy - 150) < 22
      ;(core ? shaFrom : inkFrom).push(P(fx, fy))
      ;(core ? shaTo : inkTo).push(P(toX, toY))
    }
    return {
      layers: [
        { rgb: SHA, aFrom: 0.82, aTo: 0.12, from: shaFrom, to: shaTo },
        { rgb: INK, aFrom: 0.66, aTo: 0.4, from: inkFrom, to: inkTo },
      ],
    }
  }

  // auspicious_objects — 气散 (scattered, t=0) → 藏风聚气 (gathered, t=1).
  const qiFrom: SkPoint[] = []
  const qiTo: SkPoint[] = []
  const winFrom: SkPoint[] = []
  const winTo: SkPoint[] = []
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * 2 * Math.PI
    const rad = 48 * rnd() ** 0.55
    if (rnd() > Math.exp(-((rad / 30) ** 2)) + 0.06) continue
    const gx = CX + rad * Math.cos(a) // gathered 气 core
    const gy = CY + rad * Math.sin(a) * 0.9
    const sf = 1.7 + rnd() * 0.9 // scattered outward + jitter
    qiFrom.push(P(CX + (gx - CX) * sf + g(26), CY + (gy - CY) * sf + g(22)))
    qiTo.push(P(gx, gy))
  }
  for (let i = 0; i < 1000; i++) {
    const a = rnd() * 2 * Math.PI
    const bottom = a > Math.PI * 0.22 && a < Math.PI * 0.78 // open at the 明堂 (留白)
    if (bottom && rnd() < 0.88) continue
    const rad = 94 + g(15)
    const gx = CX + rad * Math.cos(a) // 风 embrace
    const gy = CY + rad * Math.sin(a) * 0.86
    const sf = 1.6 + rnd() * 0.8
    winFrom.push(P(CX + (gx - CX) * sf + g(24), CY + (gy - CY) * sf + g(20)))
    winTo.push(P(gx, gy))
  }
  return {
    layers: [
      { rgb: QI, aFrom: 0.5, aTo: 0.9, from: qiFrom, to: qiTo },
      { rgb: WIN, aFrom: 0.46, aTo: 0.82, from: winFrom, to: winTo },
    ],
  }
}

export interface FengImagePoint {
  /** In the 440×300 canonical space. */
  x: number
  y: number
  rgb: string
  a: number
}

/**
 * The resolved (final) point set for any chapter — used by the SVG share card
 * (which can't render Skia). Static kinds return their field; morph kinds return
 * the settled 'to' state (化解=散宁 / 布置=聚). Same generators as the on-screen
 * Skia image, so the card matches.
 */
export function fengImageRaw(kind: FengChapterKind): FengImagePoint[] {
  if (kind === 'remediation' || kind === 'auspicious_objects') {
    const spec = genMorph(kind, 1)
    const out: FengImagePoint[] = []
    for (const l of spec.layers) {
      for (const p of l.to) out.push({ x: p.x, y: p.y, rgb: l.rgb, a: l.aTo })
    }
    return out
  }
  return genStaticRaw(kind)
}

interface FengInkImageProps {
  kind: FengChapterKind
  /** Rendered width; height follows the 440×300 aspect. */
  width?: number
  /** Play the morph (for 调 chapters) when the chapter is on screen. Default true. */
  active?: boolean
}

const POINT_W = 2.5

export function FengInkImage({ kind, width = 300, active = true }: FengInkImageProps) {
  const isMorph = kind === 'remediation' || kind === 'auspicious_objects'
  return isMorph ? (
    <MorphInk kind={kind} width={width} active={active} />
  ) : (
    <StaticInk kind={kind} width={width} />
  )
}

function StaticInk({ kind, width }: { kind: FengChapterKind; width: number }) {
  const s = width / VW
  const height = (width * VH) / VW
  const layers = useMemo(() => binize(genStaticRaw(kind), s), [kind, s])
  return (
    <Canvas style={{ width, height }}>
      <Fill color='#111113' />
      {layers.map((l) => (
        <Points
          key={l.color}
          points={l.pts}
          mode='points'
          color={l.color}
          style='stroke'
          strokeWidth={POINT_W}
          strokeCap='round'
        />
      ))}
    </Canvas>
  )
}

function MorphInk({
  kind,
  width,
  active,
}: {
  kind: FengChapterKind
  width: number
  active: boolean
}) {
  const s = width / VW
  const height = (width * VH) / VW
  const spec = useMemo(() => genMorph(kind, s), [kind, s])
  const l0 = spec.layers[0]
  const l1 = spec.layers[1]

  // One-shot: 0 (气散/煞聚) → 1 (聚/散宁). Plays when the chapter becomes active
  // (the pager mounts all pages up front, so an unmemoized play would finish
  // before it's ever seen); resets when off-screen so it replays on return.
  const t = useSharedValue(0)
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1
      return
    }
    if (!active) {
      t.value = 0
      return
    }
    t.value = withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.cubic) })
  }, [active, reduceMotion, t])

  // Per-point lerp: each particle travels its own path from→to. Rebuilt only
  // while `t` is animating (the ~2.6s play), then it rests → no sustained cost.
  const pts0 = useDerivedValue(() => {
    const tt = t.value
    const from = l0.from
    const to = l0.to
    const out: SkPoint[] = []
    for (let i = 0; i < from.length; i++) {
      const a = from[i]
      const b = to[i]
      if (!a || !b) continue
      out.push({ x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt })
    }
    return out
  })
  const pts1 = useDerivedValue(() => {
    const tt = t.value
    const from = l1.from
    const to = l1.to
    const out: SkPoint[] = []
    for (let i = 0; i < from.length; i++) {
      const a = from[i]
      const b = to[i]
      if (!a || !b) continue
      out.push({ x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt })
    }
    return out
  })
  const op0 = useDerivedValue(() => l0.aFrom + (l0.aTo - l0.aFrom) * t.value)
  const op1 = useDerivedValue(() => l1.aFrom + (l1.aTo - l1.aFrom) * t.value)

  return (
    <Canvas style={{ width, height }}>
      <Fill color='#111113' />
      <Group opacity={op0}>
        <Points
          points={pts0}
          mode='points'
          color={`rgb(${l0.rgb})`}
          style='stroke'
          strokeWidth={POINT_W}
          strokeCap='round'
        />
      </Group>
      <Group opacity={op1}>
        <Points
          points={pts1}
          mode='points'
          color={`rgb(${l1.rgb})`}
          style='stroke'
          strokeWidth={POINT_W}
          strokeCap='round'
        />
      </Group>
    </Canvas>
  )
}
