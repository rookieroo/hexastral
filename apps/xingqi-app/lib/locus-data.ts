/**
 * Client-side locus / landmark types and resultJson parsing for Locus Hero.
 */

import type { PortfolioReadingItem } from '@zhop/portfolio-client'
import { locusBlurbForLocale, locusTitleForLocale } from '@/lib/ancient-glyphs'

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

function mergeLocusIndex(primary: LocusIndex, fallback: LocusIndex): LocusIndex {
  const mergePart = (a: LocusCitation[], b: LocusCitation[]): LocusCitation[] => {
    const byKey = new Map<string, LocusCitation>()
    for (const c of [...a, ...b]) {
      const key = c.featureKey || c.locus
      const prev = byKey.get(key)
      if (!prev || (c.note.length > prev.note.length && c.note.trim().length > 0)) {
        byKey.set(key, c)
      }
    }
    // Also index by locus name so alias matching can find them.
    return Array.from(byKey.values())
  }
  return {
    face: mergePart(primary.face, fallback.face),
    palm_l: mergePart(primary.palm_l, fallback.palm_l),
    palm_r: mergePart(primary.palm_r, fallback.palm_r),
  }
}

export function locusExplorerFromResultJson(item: PortfolioReadingItem): LocusExplorerData | null {
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

  // Prefer stored index, but always union with chapter citations — regenerate
  // can ship a thin locusIndex while chapters still carry the full cite list.
  const fromChapters = buildIndexFromChapters(output)
  const locusIndex =
    output.locusIndex != null
      ? mergeLocusIndex(parseLocusIndex(output.locusIndex), fromChapters)
      : fromChapters

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

function normalizeLocusKey(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

/**
 * Resolve a citation for a landmark key. LLM sometimes emits classical locus
 * names as featureKey (口唇) or typos (mouth) — match by key, alias, and title.
 */
function findCitationForFeature(
  cites: LocusCitation[],
  featureKey: string,
  locale: string
): LocusCitation | undefined {
  const byExact = cites.find((c) => c.featureKey === featureKey)
  if (byExact) return byExact

  const aliases: Record<string, string[]> = {
    mouthType: ['mouth', 'lips', '口', '口唇', '嘴唇'],
    eyeType: ['eye', 'eyes', '目', '眼'],
    noseShape: ['nose', '鼻', '鼻梁'],
    yinTang: ['印堂'],
    shanGen: ['山根'],
    tianTing: ['天庭'],
    cheekBones: ['颧', '颧骨', '顴骨'],
    nasolabialFolds: ['法令', '法令纹', '法令紋'],
    chin: ['地阁', '地閣', '下巴'],
    earLobes: ['耳垂', '耳'],
    lifeLine: ['生命线', '生命線'],
    heartLine: ['感情线', '感情線', '婚姻线', '婚姻線'],
    headLine: ['智慧线', '智慧線', '头脑线', '頭腦線'],
    fateLine: ['事业线', '事業線', '命运线', '命運線'],
  }
  const aliasList = aliases[featureKey] ?? []
  for (const a of aliasList) {
    const hit = cites.find(
      (c) =>
        normalizeLocusKey(c.featureKey) === normalizeLocusKey(a) ||
        normalizeLocusKey(c.locus) === normalizeLocusKey(a) ||
        c.locus.includes(a)
    )
    if (hit) return hit
  }

  const title = locusTitleForLocale(featureKey, locale)
  const titleN = normalizeLocusKey(title)
  return cites.find((c) => {
    const ln = normalizeLocusKey(c.locus)
    const kn = normalizeLocusKey(c.featureKey)
    return ln === titleN || kn === titleN || ln.includes(titleN) || titleN.includes(ln)
  })
}

/**
 * Stars = all landmarks with coords for this part.
 * Citation notes overlay when the report cited that featureKey (or alias/title).
 */
export function starsForPart(data: LocusExplorerData, part: LocusPart): LocusStar[] {
  const cites =
    part === 'face'
      ? data.locusIndex.face
      : part === 'palm_l'
        ? data.locusIndex.palm_l
        : data.locusIndex.palm_r

  const locale = data.locale ?? 'zh-CN'
  const lm = landmarksForPart(data.landmarks, part)
  const byKey = new Map<string, LocusStar>()

  for (const [featureKey, pt] of Object.entries(lm)) {
    if (!pt) continue
    const cite = findCitationForFeature(cites, featureKey, locale)
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
