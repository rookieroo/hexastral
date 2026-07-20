/**
 * Client-side locus / landmark types and resultJson parsing for Locus Hero.
 */

import { locusBlurbForLocale, locusTitleForLocale } from '@/lib/ancient-glyphs'
import type { PortfolioReadingItem } from '@zhop/portfolio-client'

export type LandmarkPoint = { x: number; y: number }

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
  face: Partial<Record<string, LandmarkPoint>>
  palmLeft: Partial<Record<string, LandmarkPoint>>
  palmRight: Partial<Record<string, LandmarkPoint>>
}

export type LocusExplorerData = {
  readingId: string
  createdAt: string
  locale?: string
  landmarks: ReadingLandmarks
  locusIndex: LocusIndex
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function parsePoint(v: unknown): LandmarkPoint | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.x !== 'number' || typeof o.y !== 'number') return null
  return { x: clamp01(o.x), y: clamp01(o.y) }
}

function parseLandmarkMap(raw: unknown): Partial<Record<string, LandmarkPoint>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<string, LandmarkPoint>> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = parsePoint(v)
    if (p) out[k] = p
  }
  return out
}

function parseCitation(raw: unknown): LocusCitation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const locus = typeof o.locus === 'string' ? o.locus.trim() : ''
  const note = typeof o.note === 'string' ? o.note.trim() : ''
  const featureKey = typeof o.featureKey === 'string' ? o.featureKey.trim() : locus
  const partRaw = typeof o.part === 'string' ? o.part : 'face'
  const part: LocusPart =
    partRaw === 'palm_l' || partRaw === 'palm_r' || partRaw === 'face' ? partRaw : 'face'
  if (!locus || !note) return null
  return { locus, featureKey, part, note }
}

function parseLocusIndex(raw: unknown): LocusIndex {
  const empty: LocusIndex = { face: [], palm_l: [], palm_r: [] }
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>
  const load = (key: keyof LocusIndex) => {
    if (!Array.isArray(o[key])) return []
    return o[key].map(parseCitation).filter((c): c is LocusCitation => Boolean(c))
  }
  return {
    face: load('face'),
    palm_l: load('palm_l'),
    palm_r: load('palm_r'),
  }
}

function buildIndexFromChapters(output: Record<string, unknown>): LocusIndex {
  const index: LocusIndex = { face: [], palm_l: [], palm_r: [] }
  const chapters = output.chapters
  if (!Array.isArray(chapters)) return index
  for (const ch of chapters) {
    if (!ch || typeof ch !== 'object') continue
    const kind = (ch as Record<string, unknown>).kind
    const cites = (ch as Record<string, unknown>).citations
    if (!Array.isArray(cites)) continue
    for (const raw of cites) {
      const cite = parseCitation(raw)
      if (!cite) continue
      if (cite.part === 'face') index.face.push(cite)
      else if (cite.part === 'palm_l') index.palm_l.push(cite)
      else if (cite.part === 'palm_r') index.palm_r.push(cite)
      else if (kind === 'face') index.face.push({ ...cite, part: 'face' })
      else if (kind === 'palms') index.palm_l.push({ ...cite, part: 'palm_l' })
    }
  }
  return index
}

export function locusExplorerFromResultJson(
  item: PortfolioReadingItem
): LocusExplorerData | null {
  if (!item.resultJson?.trim()) return null
  let output: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(item.resultJson)
    if (!parsed || typeof parsed !== 'object') return null
    output = parsed as Record<string, unknown>
  } catch {
    return null
  }

  const lmRaw = output.landmarks
  let landmarks: ReadingLandmarks = {
    face: {},
    palmLeft: {},
    palmRight: {},
  }
  if (lmRaw && typeof lmRaw === 'object') {
    const lm = lmRaw as Record<string, unknown>
    landmarks = {
      face: parseLandmarkMap(lm.face),
      palmLeft: parseLandmarkMap(lm.palmLeft),
      palmRight: parseLandmarkMap(lm.palmRight),
    }
  }

  const locusIndex =
    output.locusIndex != null
      ? parseLocusIndex(output.locusIndex)
      : buildIndexFromChapters(output)

  const landmarkCount =
    Object.keys(landmarks.face).length +
    Object.keys(landmarks.palmLeft).length +
    Object.keys(landmarks.palmRight).length
  const hasAny =
    landmarkCount > 0 ||
    locusIndex.face.length + locusIndex.palm_l.length + locusIndex.palm_r.length > 0
  if (!hasAny) return null

  return {
    readingId: item.id,
    createdAt: item.createdAt,
    locale: item.locale,
    landmarks,
    locusIndex,
  }
}

export function landmarksForPart(
  landmarks: ReadingLandmarks,
  part: LocusPart
): Partial<Record<string, LandmarkPoint>> {
  if (part === 'face') return landmarks.face
  if (part === 'palm_l') return landmarks.palmLeft
  return landmarks.palmRight
}

export type LocusStar = {
  featureKey: string
  locus: string
  /** Reading citation note when present; empty → sheet shows teaching blurb only. */
  note: string
  /** Canon teaching line for the locus (always filled when known). */
  blurb: string
  x: number
  y: number
  fromReading: boolean
}

/**
 * Stars = all landmarks with coords for this part.
 * Citation notes overlay when the report cited that featureKey.
 */
export function starsForPart(data: LocusExplorerData, part: LocusPart): LocusStar[] {
  const cites =
    part === 'face'
      ? data.locusIndex.face
      : part === 'palm_l'
        ? data.locusIndex.palm_l
        : data.locusIndex.palm_r
  const citeByKey = new Map<string, LocusCitation>()
  for (const cite of cites) {
    if (!citeByKey.has(cite.featureKey)) citeByKey.set(cite.featureKey, cite)
  }

  const locale = data.locale ?? 'zh-CN'
  const lm = landmarksForPart(data.landmarks, part)
  const byKey = new Map<string, LocusStar>()

  for (const [featureKey, pt] of Object.entries(lm)) {
    if (!pt) continue
    const cite = citeByKey.get(featureKey)
    const title =
      cite && cite.locus !== 'face' && cite.locus !== 'palm_l' && cite.locus !== 'palm_r'
        ? cite.locus
        : locusTitleForLocale(featureKey, locale)
    byKey.set(featureKey, {
      featureKey,
      locus: title,
      note: cite?.note ?? '',
      blurb: locusBlurbForLocale(featureKey, locale),
      x: pt.x,
      y: pt.y,
      fromReading: Boolean(cite),
    })
  }

  return Array.from(byKey.values())
}
