/**
 * InkCenterpiece — the chapter centerpiece, react-native-skia, STATIC.
 *
 * Performance + feel come first. A per-particle animated sim ran hot and dropped
 * frames on device (≈thousands of points re-simulated + re-allocated every frame
 * on the UI thread), so this renders ONE settled particle field: generated once
 * (deterministic), drawn as a few static `Points` clouds, then zero ongoing cost
 * (no clock, no frame callback — Skia paints it once and leaves it).
 *
 * Two masses (her = ink/dark, his = pale) on a grey ground; their arrangement
 * alone is the relationship — no glyphs, no 干支/五行 text, no red:
 *   merge      生    the two diffuse into one
 *   oppose     克    two masses crowd a seam; neither crosses
 *   resonate   比和  distinct yet entwined — the 太極 swirl
 *   transition from→to  the 解法 frozen at its turn: the `from` static essence
 *                       morphs once into the `to` essence (default 克→生). The
 *                       endpoints are parameterized so every remedy reads as its
 *                       own path — 克→生 通关 / 比和→生 泄秀 / 生→生 续生
 *                       (see `deriveTransitionEndpoints`).
 *
 * The three static essences (merge / oppose / resonate) ARE the fixed 静态本质 of
 * a couple — day-master 五行 生/克/比和. `transition` is the 动态 layer: ch6 解法
 * always resolves toward 生; the living timeline layer may morph any direction.
 *
 * Composition is ported from the approved 2D study (gen_states.py / states.png).
 */

import { Canvas, Fill, Group, Points, type SkPoint } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'

const VW = 560
const VH = 320
const CX = 280
const CY = 160

export type Mode = 'merge' | 'oppose' | 'resonate' | 'transition'
/** The three fixed static essences — a transition morphs between two of them. */
export type StaticMode = 'merge' | 'oppose' | 'resonate'

// Fallback arc, used when no real relation is supplied (kind alone). Real data
// should call `deriveCenterpieceMode` so the state reflects the actual couple.
const CHAPTER_MODE: Record<string, Mode> = {
  first_impression: 'resonate',
  communication: 'merge',
  conflict: 'oppose',
  complement: 'transition',
  monthly_outlook: 'oppose',
  long_term_advice: 'transition',
}

// ── derive the state from the real 命理 relation ─────────────────────────────
const ELEMENT_KEY: Record<string, string> = {
  wood: 'wood',
  木: 'wood',
  fire: 'fire',
  火: 'fire',
  earth: 'earth',
  土: 'earth',
  metal: 'metal',
  金: 'metal',
  water: 'water',
  水: 'water',
}
const GENERATE: Record<string, string> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}
const OVERCOME: Record<string, string> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

export type Relation = 'generate' | 'overcome' | 'peer'

export function elementRelation(aEl?: string, bEl?: string): Relation {
  const a = aEl ? ELEMENT_KEY[aEl.trim().toLowerCase()] : undefined
  const b = bEl ? ELEMENT_KEY[bEl.trim().toLowerCase()] : undefined
  if (!a || !b) return 'overcome'
  if (a === b) return 'peer'
  if (GENERATE[a] === b || GENERATE[b] === a) return 'generate'
  if (OVERCOME[a] === b || OVERCOME[b] === a) return 'overcome'
  return 'peer'
}

/** True only when BOTH elements map to a known 五行 — guards the essence chip
 *  from rendering a default 'overcome' on missing/legacy data. */
export function hasValidElements(aEl?: string, bEl?: string): boolean {
  const a = aEl ? ELEMENT_KEY[aEl.trim().toLowerCase()] : undefined
  const b = bEl ? ELEMENT_KEY[bEl.trim().toLowerCase()] : undefined
  return !!a && !!b
}

function chapterIntent(kind: string): 'tension' | 'remedy' | 'union' {
  if (kind === 'conflict' || kind === 'monthly_outlook') return 'tension'
  if (kind === 'complement' || kind === 'long_term_advice') return 'remedy'
  return 'union'
}

/** Map a chapter to a centerpiece state using the couple's real element relation. */
export function deriveCenterpieceMode(
  kind: string,
  aEl?: string,
  bEl?: string,
  severity?: string
): Mode {
  const rel = elementRelation(aEl, bEl)
  // ch1 (first_impression) is the 静态本质 summary — paint the couple's REAL
  // fixed essence (生→merge / 克→oppose / 比和→resonate), not a hardcoded swirl.
  if (kind === 'first_impression') {
    return rel === 'generate' ? 'merge' : rel === 'overcome' ? 'oppose' : 'resonate'
  }
  const intent = chapterIntent(kind)
  const hot = severity === 'high'
  if (intent === 'remedy') {
    // 解法 chapter — drive the static essence toward 生. 克 and 比和 both morph
    // (通关 / 泄秀) via `transition`; 生 is already union, so it rests on merge.
    // The from→to endpoints are supplied by `deriveTransitionEndpoints`.
    return rel === 'generate' ? 'merge' : 'transition'
  }
  if (intent === 'tension') {
    if (rel === 'overcome') return 'oppose'
    if (rel === 'generate') return hot ? 'oppose' : 'merge'
    return hot ? 'oppose' : 'resonate'
  }
  // union
  if (rel === 'generate') return 'merge'
  if (rel === 'peer') return 'resonate'
  return hot ? 'oppose' : 'merge'
}

/**
 * The two endpoints of a 解法 morph for this couple — every remedy resolves
 * toward 生 (merge), but from its own static essence:
 *   克   →  oppose → merge   通关 (a 用神 bridges the wall)
 *   比和 →  resonate → merge  泄秀 (the swirl pours into one)
 *   生   →  merge → merge     续生 (already union; a still, breathing field)
 * Pass these to `InkCenterpiece` as `from`/`to` when `mode === 'transition'`.
 */
export function deriveTransitionEndpoints(
  aEl?: string,
  bEl?: string
): { from: StaticMode; to: StaticMode } {
  const rel = elementRelation(aEl, bEl)
  if (rel === 'overcome') return { from: 'oppose', to: 'merge' }
  if (rel === 'peer') return { from: 'resonate', to: 'merge' }
  return { from: 'merge', to: 'merge' }
}

// ── deterministic rng + value noise (stable, always-good layout) ─────────────
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
function makeNoise(seed: number, cells = 16) {
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

// Two tonal tiers per mass give depth without per-particle draw cost.
interface Clouds {
  inkFaint: SkPoint[]
  inkBold: SkPoint[]
  paleFaint: SkPoint[]
  paleBold: SkPoint[]
}

const BASE_SEED: Record<Mode, number> = { resonate: 7, oppose: 19, merge: 3, transition: 23 }

// Per-chapter salt so two chapters in the same state don't render an identical
// field (e.g. both 'oppose' chapters) — same essence, different particular.
function saltFromKind(kind: string): number {
  let h = 0
  for (let i = 0; i < kind.length; i++) h = (h * 31 + kind.charCodeAt(i)) | 0
  return (h >>> 0) % 4099
}

function generate(mode: Mode, s: number, salt: number): Clouds {
  const inkFaint: SkPoint[] = []
  const inkBold: SkPoint[] = []
  const paleFaint: SkPoint[] = []
  const paleBold: SkPoint[] = []
  const rnd = mulberry32(BASE_SEED[mode] + salt * 1009)
  const gauss = gaussFrom(rnd)
  const push = (ink: boolean, x: number, y: number) => {
    const bold = rnd() < 0.36
    const arr = ink ? (bold ? inkBold : inkFaint) : bold ? paleBold : paleFaint
    arr.push({ x: x * s, y: y * s })
  }

  if (mode === 'merge') {
    // 生 — two wide blobs that overlap into one; a dense fused core in the middle
    const nz = makeNoise(11 + salt)
    for (const [ink, cx, off] of [
      [true, 210, 0],
      [false, 350, 99],
    ] as const) {
      for (let i = 0; i < 3400; i++) {
        const x = cx + gauss(118)
        const y = CY + gauss(86)
        const f =
          Math.exp(-(((x - cx) / 130) ** 2) - ((y - CY) / 96) ** 2) * (0.5 + 0.7 * nz(x + off, y))
        if (rnd() > f) continue
        push(ink, x, y)
      }
    }
    for (let i = 0; i < 1050; i++) {
      push(rnd() < 0.5, CX + gauss(52), CY + gauss(40))
    }
  } else if (mode === 'oppose') {
    // 克 — two camps pressed CLOSE, divided by an irregular no-man's-land that is
    // never crossed: each front is jagged (noise) and the gap between them varies
    // along the seam — nearly touching in places, open in others. An irregular
    // untouched middle, not a clean void.
    const nz = makeNoise(9 + salt)
    const nf = makeNoise(57 + salt)
    const seamAt = (y: number) => CX + 26 * (nf(150, y * 2.3) - 0.5)
    const halfGapAt = (y: number) => 5 + 16 * nf(610, y * 1.6)
    for (const [ink, cx, sign] of [
      [true, 205, 1],
      [false, 355, -1],
    ] as const) {
      for (let i = 0; i < 3600; i++) {
        const x = cx + gauss(70)
        const y = CY + gauss(100)
        const front = seamAt(y) - sign * halfGapAt(y)
        if (sign * (x - front) > 0) continue
        const comp = Math.exp(-((Math.abs(x - front) / 36) ** 2))
        const f =
          Math.exp(-(((x - cx) / 80) ** 2) - ((y - CY) / 110) ** 2) * (0.45 + 0.55 * nz(x, y)) +
          0.55 * comp
        if (rnd() > Math.min(0.95, f)) continue
        push(ink, x, y)
      }
    }
  } else if (mode === 'transition') {
    // 克→生 解法, frozen at the turn. Unlike oppose (a VOID at the seam), here the
    // seam is a BRIDGE: two clearly polar masses (ink left, pale right) joined by a
    // dense intermixed 用神 channel — the wall has become a gate.
    const nz = makeNoise(15 + salt)
    for (const [ink, cx, off] of [
      [true, 178, 0],
      [false, 382, 60],
    ] as const) {
      for (let i = 0; i < 3600; i++) {
        const x = cx + gauss(62)
        const y = CY + gauss(96)
        const f =
          Math.exp(-(((x - cx) / 74) ** 2) - ((y - CY) / 104) ** 2) * (0.5 + 0.55 * nz(x + off, y))
        if (rnd() > f) continue
        push(ink, x, y)
      }
    }
    // the bridge — a dense intermixed column filling the seam (用神 channel)
    for (let i = 0; i < 1700; i++) {
      const x = CX + gauss(54)
      const y = CY + gauss(82)
      const f = Math.exp(-(((x - CX) / 64) ** 2))
      if (rnd() > 0.4 + 0.6 * f) continue
      push(rnd() < 0.5, x, y)
    }
  } else {
    // 比和 resonate — the 太極 swirl; tone owned by S-line membership
    const ns = makeNoise(33 + salt, 22)
    const R = 130
    const cy = 158
    const isDark = (x: number, y: number) => {
      const dt = Math.hypot(x, y + R / 2)
      const db = Math.hypot(x, y - R / 2)
      if (dt <= R / 2) return false
      if (db <= R / 2) return true
      return x > 0
    }
    for (let i = 0; i < 8500; i++) {
      const ang = rnd() * 2 * Math.PI
      const rr = R * 1.16 * rnd() ** 0.62
      let x = rr * Math.cos(ang)
      let y = rr * Math.sin(ang)
      const tw = (rr / R) * 9 * (ns(CX + x, cy + y) - 0.5)
      x += -Math.sin(ang) * tw
      y += Math.cos(ang) * tw
      const fade = rr < R * 0.82 ? 1 : Math.max(0, 1 - (rr - R * 0.82) / (R * 0.36))
      if (fade <= 0 || rr > R * 1.18) continue
      const d = isDark(x, y)
      if (rnd() > (d ? 0.72 : 0.62) * fade) continue
      push(d, CX + x, cy + y)
    }
    for (const [ex, ey, ink] of [
      [CX, cy - R / 2, false],
      [CX, cy + R / 2, true],
    ] as const) {
      for (let i = 0; i < 90; i++) {
        const ang = rnd() * 2 * Math.PI
        const r = Math.abs(gauss(6))
        push(ink, ex + r * Math.cos(ang), ey + r * Math.sin(ang))
      }
    }
  }
  return { inkFaint, inkBold, paleFaint, paleBold }
}

// ── render helpers ───────────────────────────────────────────────────────────
const INK_FAINT = 'rgba(20,19,18,0.5)'
const INK_BOLD = 'rgba(20,19,18,0.74)'
const PALE_FAINT = 'rgba(244,243,239,0.5)'
const PALE_BOLD = 'rgba(244,243,239,0.82)'

function InkPoints({ faint, bold }: { faint: SkPoint[]; bold: SkPoint[] }) {
  return (
    <>
      <Points
        points={faint}
        mode='points'
        color={INK_FAINT}
        style='stroke'
        strokeWidth={2.1}
        strokeCap='round'
      />
      <Points
        points={bold}
        mode='points'
        color={INK_BOLD}
        style='stroke'
        strokeWidth={2.9}
        strokeCap='round'
      />
    </>
  )
}
function PalePoints({ faint, bold }: { faint: SkPoint[]; bold: SkPoint[] }) {
  return (
    <>
      <Points
        points={faint}
        mode='points'
        color={PALE_FAINT}
        style='stroke'
        strokeWidth={2.1}
        strokeCap='round'
      />
      <Points
        points={bold}
        mode='points'
        color={PALE_BOLD}
        style='stroke'
        strokeWidth={2.9}
        strokeCap='round'
      />
    </>
  )
}

function smoothstep(x: number) {
  'worklet'
  return x * x * (3 - 2 * x)
}

export interface InkCenterpieceProps {
  /** Chapter kind → fallback relationship state when `mode` is omitted. */
  kind: string
  /** Rendered width; height follows the 560×320 aspect. */
  width: number
  /** Explicit state, derived from real 命理 (via `deriveCenterpieceMode`). */
  mode?: Mode
  /**
   * Transition endpoints. Only read when `mode === 'transition'`; the field
   * morphs `from` → `to` once. Default 克→生 (`oppose`→`merge`) for back-compat;
   * supply via `deriveTransitionEndpoints` to reflect the couple's real 解法.
   */
  from?: StaticMode
  to?: StaticMode
  /**
   * Whether this chapter is the one on screen. Only the `transition` state uses
   * it: when it becomes active it plays the from→to morph ONCE (~3s) and rests
   * on `to`. Every other state is fully static and ignores this. Default true.
   */
  active?: boolean
}

export function InkCenterpiece({
  kind,
  width,
  mode: modeProp,
  from = 'oppose',
  to = 'merge',
  active = true,
}: InkCenterpieceProps) {
  const mode = modeProp ?? CHAPTER_MODE[kind] ?? 'oppose'
  const height = (width * VH) / VW
  const s = width / VW
  const salt = useMemo(() => saltFromKind(kind), [kind])
  const isTransition = mode === 'transition'

  // Static geometry. Non-transition: one field. Transition: the `from` and `to`
  // endpoints of the morph — both generated ONCE; only opacity + slide animate
  // between them.
  const single = useMemo(
    () => (isTransition ? null : generate(mode, s, salt)),
    [isTransition, mode, s, salt]
  )
  const morph = useMemo(
    () => (isTransition ? { from: generate(from, s, salt), to: generate(to, s, salt) } : null),
    [isTransition, from, to, s, salt]
  )

  // from→to progress (0 = from, 1 = to). Driven through opacity + transform only —
  // GPU-side, no per-particle work, no per-frame allocation. Plays once when the
  // chapter becomes active, then rests on 生 (animation stops → zero ongoing cost).
  const t = useSharedValue(0)
  useEffect(() => {
    if (!isTransition || !active) return
    t.value = 0
    t.value = withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) })
  }, [isTransition, active, t])

  const fadeOut = useDerivedValue(() => 1 - t.value)
  const fadeIn = useDerivedValue(() => t.value)
  const slideInk = useDerivedValue(() => [{ translateX: 40 * s * smoothstep(t.value) }])
  const slidePale = useDerivedValue(() => [{ translateX: -40 * s * smoothstep(t.value) }])

  return (
    <Canvas style={{ width, height }}>
      <Fill color='#bdbcb7' />
      {morph ? (
        <>
          {/* from endpoint — its two masses slide toward centre and fade out */}
          <Group opacity={fadeOut} transform={slideInk}>
            <InkPoints faint={morph.from.inkFaint} bold={morph.from.inkBold} />
          </Group>
          <Group opacity={fadeOut} transform={slidePale}>
            <PalePoints faint={morph.from.paleFaint} bold={morph.from.paleBold} />
          </Group>
          {/* to endpoint — the resolved field fades in */}
          <Group opacity={fadeIn}>
            <PalePoints faint={morph.to.paleFaint} bold={morph.to.paleBold} />
            <InkPoints faint={morph.to.inkFaint} bold={morph.to.inkBold} />
          </Group>
        </>
      ) : single ? (
        <>
          <PalePoints faint={single.paleFaint} bold={single.paleBold} />
          <InkPoints faint={single.inkFaint} bold={single.inkBold} />
        </>
      ) : null}
    </Canvas>
  )
}
