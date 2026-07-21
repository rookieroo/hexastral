/**
 * Palm-locus layout helpers.
 *
 * Prefer photo-aligned landmarks from extract (Moondream/VLM). When a hand has
 * no landmarks (legacy rows), fall back to a handedness-mirrored canonical
 * anatomical layout.
 *
 * Base canonical coordinates are for the RIGHT hand (palm facing camera,
 * fingers up → thumb on image-left). LEFT hand mirrors x (1 - x).
 *
 * Normalized: x left(0)→right(1), y fingers/top(0)→wrist/bottom(1).
 */

import type { LocusPart } from '@/lib/locus-data'

export type PalmCanonKey =
  | 'handShape'
  | 'lifeLine'
  | 'headLine'
  | 'heartLine'
  | 'fateLine'
  | 'mountJupiter'
  | 'mountSaturn'
  | 'mountApollo'
  | 'mountMercury'
  | 'mountVenus'
  | 'mountMoon'
  | 'mountMars'
  | 'specialMarks'

export type Point = { x: number; y: number }

/** Always plot the full palm key set (13 loci). */
export const PALM_ALWAYS_KEYS: readonly PalmCanonKey[] = [
  'handShape',
  'lifeLine',
  'headLine',
  'heartLine',
  'fateLine',
  'mountJupiter',
  'mountSaturn',
  'mountApollo',
  'mountMercury',
  'mountVenus',
  'mountMoon',
  'mountMars',
  'specialMarks',
]

/** @deprecated Use PALM_ALWAYS_KEYS */
export const PALM_MAIN_KEYS = PALM_ALWAYS_KEYS

/**
 * Right hand (thumb on image-left). Anatomical zones on the palm pad —
 * NOT on fingertips. Assumes typical capture: fingers upper third, palm
 * middle, wrist lower third.
 *
 * Zones:
 *   mounts (木土日水) — finger-root pads, just below MCP joints
 *   heart / head / life / fate — crease midpoints in palm body
 *   Venus / Moon / Mars — thenar / hypothenar / mid-palm
 */
const PALM_RIGHT: Record<PalmCanonKey, Point> = {
  // Finger-root mounts — below fingers, on the palm pads (y≈0.30–0.34)
  mountJupiter: { x: 0.34, y: 0.3 },
  mountSaturn: { x: 0.48, y: 0.28 },
  mountApollo: { x: 0.62, y: 0.3 },
  mountMercury: { x: 0.76, y: 0.34 },
  // Main lines — mid-crease markers (spread, no cluster)
  heartLine: { x: 0.55, y: 0.36 },
  headLine: { x: 0.48, y: 0.48 },
  lifeLine: { x: 0.32, y: 0.58 },
  fateLine: { x: 0.54, y: 0.58 },
  // Lower / side mounts
  mountMars: { x: 0.42, y: 0.5 },
  mountVenus: { x: 0.24, y: 0.7 },
  mountMoon: { x: 0.78, y: 0.66 },
  // Contour + marks
  handShape: { x: 0.58, y: 0.82 },
  specialMarks: { x: 0.68, y: 0.46 },
}

function mirrorX(map: Record<PalmCanonKey, Point>): Record<PalmCanonKey, Point> {
  const out = {} as Record<PalmCanonKey, Point>
  for (const [key, pt] of Object.entries(map) as [PalmCanonKey, Point][]) {
    out[key] = { x: 1 - pt.x, y: pt.y }
  }
  return out
}

function mirrorPoint(pt: Point): Point {
  return { x: 1 - pt.x, y: pt.y }
}

const PALM_LEFT: Record<PalmCanonKey, Point> = mirrorX(PALM_RIGHT)

export const PALM_CANONICAL: Record<'palm_l' | 'palm_r', Record<PalmCanonKey, Point>> = {
  palm_l: PALM_LEFT,
  palm_r: PALM_RIGHT,
}

const PALM_KEY_ALIASES: Record<PalmCanonKey, string[]> = {
  handShape: ['handshape', 'palm', 'palmshape', '掌形', '手形', '掌型'],
  lifeLine: ['lifeline', '生命线', '生命線'],
  headLine: ['headline', '智慧线', '智慧線', '头脑线', '頭腦線'],
  heartLine: ['heartline', '感情线', '感情線', '婚姻线', '婚姻線', '爱情线', '愛情線'],
  fateLine: ['fateline', '事业线', '事業線', '命运线', '命運線'],
  mountJupiter: ['mountjupiter', 'jupiter', '木星丘', '木丘'],
  mountSaturn: ['mountsaturn', 'saturn', '土星丘', '土丘'],
  mountApollo: ['mountapollo', 'apollo', 'sun', '太阳丘', '太陽丘', '日丘'],
  mountMercury: ['mountmercury', 'mercury', '水星丘', '水丘'],
  mountVenus: ['mountvenus', 'venus', '金星丘', '金丘'],
  mountMoon: ['mountmoon', 'moon', '月丘', '太阴丘', '太陰丘'],
  mountMars: ['mountmars', 'mars', '火星丘', '火丘'],
  specialMarks: [
    'specialmark',
    'specialmarks',
    'mark',
    '纹记',
    '紋記',
    '特殊纹',
    '特殊紋',
    '星纹',
    '星紋',
  ],
}

/** Legacy single-blob `mounts` → prefer Venus (dominant thenar) for alias resolve. */
const LEGACY_MOUNTS_ALIASES = ['mount', 'mounts', '丘', '丘位', '主导丘', '主導丘']

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

/** Resolve an LLM-emitted featureKey/locus to a canonical palm key. */
export function canonicalPalmKey(raw: string): PalmCanonKey | null {
  const n = normalize(raw)
  if (!n) return null

  // Prefer specific mount aliases before generic "mounts" → Venus.
  for (const key of Object.keys(PALM_RIGHT) as PalmCanonKey[]) {
    if (normalize(key) === n) return key
    for (const a of PALM_KEY_ALIASES[key]) {
      const an = normalize(a)
      if (n === an || n.includes(an)) return key
    }
  }
  for (const a of LEGACY_MOUNTS_ALIASES) {
    const an = normalize(a)
    if (n === an || n.includes(an)) return 'mountVenus'
  }
  return null
}

export function canonicalPalmPoint(part: LocusPart, key: PalmCanonKey): Point | null {
  if (part !== 'palm_l' && part !== 'palm_r') return null
  return PALM_CANONICAL[part][key] ?? null
}

function clampPoint(pt: Point): Point {
  return {
    x: Math.min(1, Math.max(0, pt.x)),
    y: Math.min(1, Math.max(0, pt.y)),
  }
}

/** Drop Moondream outliers (table edges, fingertips) — client defense for legacy rows. */
export function isPlausiblePalmLandmark(
  key: PalmCanonKey,
  pt: Point,
  peers: Partial<Record<string, Point>>
): boolean {
  if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return false
  if (pt.x < 0.03 || pt.x > 0.97 || pt.y < 0.03 || pt.y > 0.97) return false
  // Finger band — mounts/lines should sit on the palm pad, not fingertips.
  if (key.startsWith('mount') && pt.y < 0.18) return false
  if (
    (key === 'lifeLine' || key === 'headLine' || key === 'fateLine' || key === 'heartLine') &&
    pt.y < 0.16
  ) {
    return false
  }
  if (key === 'handShape' && pt.y < 0.35) return false

  const cluster = Object.values(peers).filter((p): p is Point => {
    if (!p) return false
    return Number.isFinite(p.x) && Number.isFinite(p.y)
  })
  if (cluster.length >= 4) {
    const xs = cluster.map((p) => p.x).sort((a, b) => a - b)
    const ys = cluster.map((p) => p.y).sort((a, b) => a - b)
    const medX = xs[Math.floor(xs.length / 2)] ?? 0.5
    const medY = ys[Math.floor(ys.length / 2)] ?? 0.5
    if (Math.abs(pt.x - medX) > 0.3 || Math.abs(pt.y - medY) > 0.34) return false
    // Reject points well above the peer palm cloud (classic fingertip miss).
    const q1 = ys[Math.max(0, Math.floor(ys.length * 0.25))] ?? medY
    if (pt.y < q1 - 0.12 && key !== 'mountJupiter' && key !== 'mountSaturn') return false
  }
  return true
}

export type PalmPointResolve = {
  points: Record<PalmCanonKey, Point>
  sources: Record<PalmCanonKey, 'photo' | 'canon' | 'interp'>
}

/**
 * Resolve palm star positions: photo landmarks win per key; missing keys
 * interpolate relative to the detected mount centroid when coverage is thin,
 * otherwise fall back to canonical anatomical slots.
 */
export function resolvePalmPoints(
  part: 'palm_l' | 'palm_r',
  keys: readonly PalmCanonKey[],
  detected?: Partial<Record<string, Point>>
): PalmPointResolve {
  const canon = PALM_CANONICAL[part]
  const points = {} as Record<PalmCanonKey, Point>
  const sources = {} as Record<PalmCanonKey, 'photo' | 'canon' | 'interp'>
  const photo: Partial<Record<PalmCanonKey, Point>> = {}

  for (const key of keys) {
    const d = detected?.[key]
    if (d && isPlausiblePalmLandmark(key, d, detected ?? {})) {
      photo[key] = clampPoint(d)
    }
  }

  const photoCount = Object.keys(photo).length
  const useInterp = photoCount >= 3 && photoCount < keys.length

  let photoCx = 0.5
  let photoCy = 0.5
  let canonCx = 0.5
  let canonCy = 0.5
  if (useInterp) {
    const pxs = Object.values(photo).map((p) => p.x)
    const pys = Object.values(photo).map((p) => p.y)
    photoCx = pxs.reduce((a, b) => a + b, 0) / pxs.length
    photoCy = pys.reduce((a, b) => a + b, 0) / pys.length
    const cks = Object.keys(photo) as PalmCanonKey[]
    const cxs = cks.map((k) => canon[k].x)
    const cys = cks.map((k) => canon[k].y)
    canonCx = cxs.reduce((a, b) => a + b, 0) / cxs.length
    canonCy = cys.reduce((a, b) => a + b, 0) / cys.length
  }

  for (const key of keys) {
    const hit = photo[key]
    if (hit) {
      points[key] = hit
      sources[key] = 'photo'
      continue
    }
    if (useInterp) {
      const dx = canon[key].x - canonCx
      const dy = canon[key].y - canonCy
      points[key] = clampPoint({ x: photoCx + dx, y: photoCy + dy })
      sources[key] = 'interp'
      continue
    }
    points[key] = { x: canon[key].x, y: canon[key].y }
    sources[key] = 'canon'
  }

  return { points, sources }
}

// ── 流年 age-scale geometry (schematic; not a trace of the photographed line) ─

export type PalmLineKind = 'lifeLine' | 'fateLine'

export type PalmAgeAnchor = {
  age: number
  point: Point
}

export type PalmLinePath = {
  kind: PalmLineKind
  /** Polyline samples along the schematic line (start → end). */
  points: readonly Point[]
  /** Decade ticks along the same arc. */
  anchors: readonly PalmAgeAnchor[]
}

/**
 * Right-hand schematic paths.
 * lifeLine: under index finger (young) → arcs around thenar → toward wrist (old).
 * fateLine: wrist (young) → up toward middle finger (old).
 */
const LIFE_RIGHT_POINTS: readonly Point[] = [
  { x: 0.42, y: 0.28 },
  { x: 0.34, y: 0.4 },
  { x: 0.3, y: 0.52 },
  { x: 0.3, y: 0.64 },
  { x: 0.34, y: 0.76 },
  { x: 0.4, y: 0.86 },
]

const FATE_RIGHT_POINTS: readonly Point[] = [
  { x: 0.55, y: 0.88 },
  { x: 0.56, y: 0.74 },
  { x: 0.57, y: 0.6 },
  { x: 0.58, y: 0.46 },
  { x: 0.58, y: 0.34 },
  { x: 0.57, y: 0.24 },
]

/** Decade ages mapped onto the polyline samples (start→end). */
const LIFE_AGES = [10, 20, 30, 40, 50, 60] as const
const FATE_AGES = [15, 25, 35, 45, 55, 65] as const

function buildAnchors(points: readonly Point[], ages: readonly number[]): PalmAgeAnchor[] {
  const n = Math.min(points.length, ages.length)
  const out: PalmAgeAnchor[] = []
  for (let i = 0; i < n; i++) {
    const pt = points[i]
    const age = ages[i]
    if (!pt || age === undefined) continue
    out.push({ age, point: { x: pt.x, y: pt.y } })
  }
  return out
}

function mirrorLinePath(path: PalmLinePath): PalmLinePath {
  return {
    kind: path.kind,
    points: path.points.map(mirrorPoint),
    anchors: path.anchors.map((a) => ({ age: a.age, point: mirrorPoint(a.point) })),
  }
}

const PALM_LINE_PATHS_RIGHT: readonly PalmLinePath[] = [
  {
    kind: 'lifeLine',
    points: LIFE_RIGHT_POINTS,
    anchors: buildAnchors(LIFE_RIGHT_POINTS, LIFE_AGES),
  },
  {
    kind: 'fateLine',
    points: FATE_RIGHT_POINTS,
    anchors: buildAnchors(FATE_RIGHT_POINTS, FATE_AGES),
  },
]

const PALM_LINE_PATHS_LEFT: readonly PalmLinePath[] = PALM_LINE_PATHS_RIGHT.map(mirrorLinePath)

export const PALM_LINE_PATHS: Record<'palm_l' | 'palm_r', readonly PalmLinePath[]> = {
  palm_l: PALM_LINE_PATHS_LEFT,
  palm_r: PALM_LINE_PATHS_RIGHT,
}

/**
 * Interpolate a point on a line path for a given age (clamped to anchor range).
 * Used to place the current-age highlight on the schematic arc.
 */
export function pointAtAge(path: PalmLinePath, age: number): Point {
  const anchors = path.anchors
  if (anchors.length === 0) {
    const fallback = path.points[0]
    return fallback ? { x: fallback.x, y: fallback.y } : { x: 0.5, y: 0.5 }
  }
  if (anchors.length === 1) {
    return { x: anchors[0]!.point.x, y: anchors[0]!.point.y }
  }

  if (age <= anchors[0]!.age) {
    return { x: anchors[0]!.point.x, y: anchors[0]!.point.y }
  }
  const last = anchors[anchors.length - 1]!
  if (age >= last.age) {
    return { x: last.point.x, y: last.point.y }
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age)
      return {
        x: a.point.x + (b.point.x - a.point.x) * t,
        y: a.point.y + (b.point.y - a.point.y) * t,
      }
    }
  }
  return { x: last.point.x, y: last.point.y }
}
