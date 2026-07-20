/**
 * Normalized landmark coordinates for Xingqi VLM v6+ (top-left origin, 0..1).
 * Coordinates come from the Moondream `point` pass, with VLM-emitted landmarks
 * as fallback.
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
  | 'mounts'
  | 'specialMarks'

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
