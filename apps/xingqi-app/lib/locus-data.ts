/**
 * Client-side locus / landmark types and resultJson parsing for Locus Hero.
 *
 * Face: always plot every Moondream key that has coords.
 * Palm: always plot all 13 canonical keys (pure anatomical layout).
 * Note: loci[].reading only — never paste raw VLM feature text as a "reading".
 * Missing reading → empty note → sheet shows teaching blurb + noReadingHint.
 */

import type { PortfolioReadingItem } from '@zhop/portfolio-client'
import { locusBlurbForLocale, locusTitleForLocale } from '@/lib/ancient-glyphs'
import { PALM_ALWAYS_KEYS, resolvePalmPoints } from '@/lib/palm-layout'

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

export type ReadingFeatures = {
  face: Record<string, string>
  palmLeft: Record<string, string>
  palmRight: Record<string, string>
}

export type LocusExplorerData = {
  readingId: string
  createdAt: string
  locale?: string
  landmarks: ReadingLandmarks
  locusIndex: LocusIndex
  features: ReadingFeatures
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

function parseFeatureMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

function parseCitation(raw: unknown): LocusCitation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const locus = typeof o.locus === 'string' ? o.locus.trim() : ''
  const note =
    (typeof o.note === 'string' ? o.note.trim() : '') ||
    (typeof o.reading === 'string' ? o.reading.trim() : '')
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

/** Preferred: top-level loci[] → LocusIndex. */
function buildIndexFromLoci(raw: unknown): LocusIndex {
  const index: LocusIndex = { face: [], palm_l: [], palm_r: [] }
  if (!Array.isArray(raw)) return index
  for (const item of raw) {
    const cite = parseCitation(item)
    if (!cite) continue
    if (cite.part === 'face') index.face.push(cite)
    else if (cite.part === 'palm_l') index.palm_l.push(cite)
    else if (cite.part === 'palm_r') index.palm_r.push(cite)
  }
  return index
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
    return Array.from(byKey.values())
  }
  return {
    face: mergePart(primary.face, fallback.face),
    palm_l: mergePart(primary.palm_l, fallback.palm_l),
    palm_r: mergePart(primary.palm_r, fallback.palm_r),
  }
}

/**
 * Reading note for a star: loci[].reading only.
 * Never paste VLM feature text — that is a description, not an interpretation.
 * Empty string → sheet shows teaching blurb + noReadingHint.
 */
function resolveStarNote(cite: LocusCitation | undefined): string {
  return cite?.note?.trim() ?? ''
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

  const featRaw = output.features
  let features: ReadingFeatures = { face: {}, palmLeft: {}, palmRight: {} }
  if (featRaw && typeof featRaw === 'object') {
    const f = featRaw as Record<string, unknown>
    features = {
      face: parseFeatureMap(f.face),
      palmLeft: parseFeatureMap(f.palmLeft),
      palmRight: parseFeatureMap(f.palmRight),
    }
  }

  const fromLoci = buildIndexFromLoci(output.loci)
  const fromChapters = buildIndexFromChapters(output)
  const fromStored =
    output.locusIndex != null
      ? parseLocusIndex(output.locusIndex)
      : { face: [], palm_l: [], palm_r: [] }

  // Prefer first-class loci[] → stored locusIndex → chapter citations.
  let locusIndex = fromLoci
  if (locusIndex.face.length + locusIndex.palm_l.length + locusIndex.palm_r.length === 0) {
    locusIndex = mergeLocusIndex(fromStored, fromChapters)
  } else {
    locusIndex = mergeLocusIndex(fromLoci, mergeLocusIndex(fromStored, fromChapters))
  }

  const landmarkCount =
    Object.keys(landmarks.face).length +
    Object.keys(landmarks.palmLeft).length +
    Object.keys(landmarks.palmRight).length
  const featureCount =
    Object.keys(features.face).length +
    Object.keys(features.palmLeft).length +
    Object.keys(features.palmRight).length
  const hasAny =
    landmarkCount > 0 ||
    featureCount > 0 ||
    locusIndex.face.length + locusIndex.palm_l.length + locusIndex.palm_r.length > 0
  if (!hasAny) return null

  return {
    readingId: item.id,
    createdAt: item.createdAt,
    locale: item.locale,
    landmarks,
    locusIndex,
    features,
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
  /** loci[].reading when present; empty when absent (never VLM feature text). */
  note: string
  /** Canon teaching line for the locus (always filled when known). */
  blurb: string
  x: number
  y: number
  /** True only when an LLM reading exists for this star. */
  fromReading: boolean
}

function normalizeLocusKey(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

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
    mountJupiter: ['木星丘', '木丘'],
    mountSaturn: ['土星丘', '土丘'],
    mountApollo: ['太阳丘', '太陽丘', '日丘'],
    mountMercury: ['水星丘', '水丘'],
    mountVenus: ['金星丘', '金丘'],
    mountMoon: ['月丘', '太阴丘', '太陰丘'],
    mountMars: ['火星丘', '火丘'],
    specialMarks: ['纹记', '紋記', '岛纹', '島紋', '十字'],
    handShape: ['掌形', '手形'],
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

function locusTitleFromCite(
  cite: LocusCitation | undefined,
  featureKey: string,
  locale: string
): string {
  if (cite && cite.locus !== 'face' && cite.locus !== 'palm_l' && cite.locus !== 'palm_r') {
    return cite.locus
  }
  return locusTitleForLocale(featureKey, locale)
}

/** Palm: plot all 13 keys; coords from landmarks when present, else canonical. */
function palmStars(
  data: LocusExplorerData,
  part: 'palm_l' | 'palm_r',
  locale: string
): LocusStar[] {
  const cites = part === 'palm_l' ? data.locusIndex.palm_l : data.locusIndex.palm_r
  const keys = [...PALM_ALWAYS_KEYS]
  const lm = landmarksForPart(data.landmarks, part)
  const { points } = resolvePalmPoints(part, keys, lm)

  return keys.map((key) => {
    const cite = findCitationForFeature(cites, key, locale)
    const pt = points[key]
    const blurb = locusBlurbForLocale(key, locale)
    const note = resolveStarNote(cite)
    return {
      featureKey: key,
      locus: locusTitleFromCite(cite, key, locale),
      note,
      blurb,
      x: pt.x,
      y: pt.y,
      fromReading: note.length > 0,
    }
  })
}

/** __DEV__ overlay: photo vs fallback (canon/interp). */
export function palmPointDebugSources(
  data: LocusExplorerData,
  part: 'palm_l' | 'palm_r'
): Record<string, 'photo' | 'canon'> {
  const lm = landmarksForPart(data.landmarks, part)
  const { sources } = resolvePalmPoints(part, PALM_ALWAYS_KEYS, lm)
  return Object.fromEntries(
    Object.entries(sources).map(([k, v]) => [k, v === 'photo' ? 'photo' : 'canon'])
  )
}

/**
 * Face: plot every Moondream key that has coords.
 * Palm: full 13-key set; photo landmarks preferred over canonical.
 * Reading note only from loci[] / locusIndex — never feature text.
 */
export function starsForPart(data: LocusExplorerData, part: LocusPart): LocusStar[] {
  const locale = data.locale ?? 'zh-CN'

  if (part === 'palm_l' || part === 'palm_r') {
    return palmStars(data, part, locale)
  }

  const cites = data.locusIndex.face
  const lm = landmarksForPart(data.landmarks, part)
  const byKey = new Map<string, LocusStar>()

  for (const [featureKey, pt] of Object.entries(lm)) {
    if (!pt) continue
    const cite = findCitationForFeature(cites, featureKey, locale)
    const note = resolveStarNote(cite)
    byKey.set(featureKey, {
      featureKey,
      locus: locusTitleFromCite(cite, featureKey, locale),
      note,
      blurb: locusBlurbForLocale(featureKey, locale),
      x: pt.x,
      y: pt.y,
      fromReading: note.length > 0,
    })
  }

  return Array.from(byKey.values())
}
