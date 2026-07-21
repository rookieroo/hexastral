/**
 * Normalized landmark coordinates for Xingqi (top-left origin, 0..1).
 * Face + palm: Moondream `point` (+ VLM fallback). Palm may be empty on
 * legacy rows — client falls back to canonical layout.
 */

export type LandmarkPoint = { x: number; y: number }

export type FaceLandmarkKey =
  | 'tianTing'
  | 'yinTang'
  | 'shanGen'
  | 'foreheadWidth'
  | 'eyebrowType'
  | 'eyeType'
  | 'noseShape'
  | 'cheekBones'
  | 'nasolabialFolds'
  | 'mouthType'
  | 'chin'
  | 'earLobes'

export type PalmLandmarkKey =
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
  /** @deprecated legacy single-blob mount midpoint */
  | 'mounts'

export type LocusPart = 'face' | 'palm_l' | 'palm_r'

export type LocusCitation = {
  locus: string
  featureKey: string
  part: LocusPart
  note: string
}

export type LocusIndex = {
  face: LocusCitation[]
  palm_l: LocusCitation[]
  palm_r: LocusCitation[]
}

export type ReadingLandmarks = {
  face: Partial<Record<FaceLandmarkKey, LandmarkPoint>>
  palmLeft: Partial<Record<PalmLandmarkKey, LandmarkPoint>>
  palmRight: Partial<Record<PalmLandmarkKey, LandmarkPoint>>
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function isPoint(v: unknown): v is LandmarkPoint {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.x === 'number' && typeof o.y === 'number'
}

/** Parse and clamp landmark JSON from VLM or D1. */
export function parseLandmarksJson(raw: unknown): Partial<Record<string, LandmarkPoint>> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Partial<Record<string, LandmarkPoint>> = {}
  for (const [key, val] of Object.entries(o)) {
    if (isPoint(val)) {
      out[key] = { x: clamp01(val.x), y: clamp01(val.y) }
    }
  }
  return out
}

export function buildLocusIndex(
  chapters: Array<{ kind: string; citations: LocusCitation[] }>
): LocusIndex {
  const index: LocusIndex = { face: [], palm_l: [], palm_r: [] }
  for (const ch of chapters) {
    for (const cite of ch.citations) {
      if (cite.part === 'face') index.face.push(cite)
      else if (cite.part === 'palm_l') index.palm_l.push(cite)
      else if (cite.part === 'palm_r') index.palm_r.push(cite)
    }
  }
  return index
}

/** Build locusIndex from first-class loci[] (preferred over chapter citations). */
export function buildLocusIndexFromLoci(
  loci: Array<{ featureKey: string; part: LocusPart; locus: string; reading: string }>
): LocusIndex {
  const index: LocusIndex = { face: [], palm_l: [], palm_r: [] }
  for (const l of loci) {
    const cite: LocusCitation = {
      featureKey: l.featureKey,
      part: l.part,
      locus: l.locus,
      note: l.reading,
    }
    if (l.part === 'face') index.face.push(cite)
    else if (l.part === 'palm_l') index.palm_l.push(cite)
    else if (l.part === 'palm_r') index.palm_r.push(cite)
  }
  return index
}
