import { isCjkZh, isZhHant, pickZh } from '@/lib/locale-zh'
import { isNearEcho } from '@/lib/text-echo'

export type XingqiChapterKind = 'overview' | 'face' | 'palms' | 'natal' | 'period' | 'advice'

export type XingqiChapterCitation = {
  locus: string
  note: string
  featureKey?: string
  part?: 'face' | 'palm_l' | 'palm_r'
}

export type XingqiChapter = {
  kind: XingqiChapterKind
  goldenLine: string
  evidence: string
  dynamic: string
  reef: string | null
  remedy: string | null
  counterpoint: string | null
  citations: XingqiChapterCitation[]
}

const ORDER: XingqiChapterKind[] = ['overview', 'face', 'palms', 'natal', 'period', 'advice']

export const CHAPTER_TITLE: Record<XingqiChapterKind, { zh: string; zhHant: string; en: string }> =
  {
    overview: { zh: '总格局', zhHant: '總格局', en: 'Overview' },
    face: { zh: '面部', zhHant: '面部', en: 'Face' },
    palms: { zh: '双手', zhHant: '雙手', en: 'Palms' },
    natal: { zh: '形气 × 八字', zhHant: '形氣 × 八字', en: 'Form × BaZi' },
    period: { zh: '本期窗口', zhHant: '本期窗口', en: 'Period' },
    advice: { zh: '建议', zhHant: '建議', en: 'Advice' },
  }

export function chapterTitle(kind: XingqiChapterKind, locale: string): string {
  const row = CHAPTER_TITLE[kind]
  if (isZhHant(locale)) return row.zhHant
  if (isCjkZh(locale)) return row.zh
  return row.en
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parseCitations(raw: unknown): XingqiChapterCitation[] {
  if (!Array.isArray(raw)) return []
  const out: XingqiChapterCitation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const locus = asStr(o.locus)
    const note = asStr(o.note)
    const featureKey = asStr(o.featureKey) || undefined
    const partRaw = asStr(o.part)
    const part =
      partRaw === 'face' || partRaw === 'palm_l' || partRaw === 'palm_r' ? partRaw : undefined
    if (locus && note) out.push({ locus, note, featureKey, part })
  }
  return out
}

function studyDisclaimer(locale: string): string {
  if (!isCjkZh(locale)) {
    return 'Cultural study framing — not deterministic fate.'
  }
  return pickZh(locale, '文化研习参考，不作命运断语。', '文化研習參考，不作命運斷語。')
}

function chapterFromBody(
  kind: XingqiChapterKind,
  body: string,
  locale: string
): XingqiChapter | null {
  if (body.length < 8) return null
  const first = body.split(/[。.!?\n]/)[0]?.trim() || body.slice(0, 48)
  return {
    kind,
    goldenLine: first.slice(0, 80),
    evidence: body,
    dynamic: '',
    reef: null,
    remedy: null,
    counterpoint: studyDisclaimer(locale),
    citations: [],
  }
}

function parseChapter(raw: unknown): XingqiChapter | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind
  if (typeof kind !== 'string' || !ORDER.includes(kind as XingqiChapterKind)) return null
  const goldenLine = asStr(o.goldenLine)
  const evidence = asStr(o.evidence)
  if (!goldenLine && !evidence) return null
  return {
    kind: kind as XingqiChapterKind,
    goldenLine: goldenLine || evidence.slice(0, 80),
    evidence: evidence || goldenLine,
    dynamic: asStr(o.dynamic),
    reef: asStr(o.reef) || null,
    remedy: asStr(o.remedy) || null,
    counterpoint: asStr(o.counterpoint) || null,
    citations: parseCitations(o.citations),
  }
}

export function readingHasReportBody(output: Record<string, unknown>): boolean {
  const chapters = adaptReadingChapters(output, 'zh')
  if (chapters.length >= 2) return true
  const ai = (output.aiInterpretation ?? {}) as Record<string, unknown>
  return ['overview', 'faceSection', 'advice'].some(
    (k) => typeof ai[k] === 'string' && (ai[k] as string).trim().length >= 8
  )
}

/** Build 1–6 chapters from new `chapters[]` or legacy flat aiInterpretation. */
export function adaptReadingChapters(
  output: Record<string, unknown>,
  locale: string
): XingqiChapter[] {
  const byKind = new Map<XingqiChapterKind, XingqiChapter>()

  const topChapters = output.chapters
  const ai = (output.aiInterpretation ?? {}) as Record<string, unknown>
  const nested = ai.chapters

  for (const list of [topChapters, nested]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const ch = parseChapter(item)
      if (ch) byKind.set(ch.kind, ch)
    }
  }

  const overview = asStr(ai.overview)
  const face = asStr(ai.faceSection)
  const left = asStr(ai.palmLeftSection)
  const right = asStr(ai.palmRightSection)
  const natal = asStr(ai.natalContrast)
  const period = asStr(ai.periodDiff)
  const advice = asStr(ai.advice)

  const events = Array.isArray(output.events)
    ? output.events
    : Array.isArray(ai.events)
      ? ai.events
      : []
  const eventsNote = events
    .map((ev) => {
      if (!ev || typeof ev !== 'object') return ''
      const e = ev as Record<string, unknown>
      const theme = asStr(e.theme)
      const note = asStr(e.note)
      const start = asStr(e.startMonth)
      const axis = asStr(e.axis)
      return [start, axis, theme, note].filter(Boolean).join(' · ')
    })
    .filter(Boolean)
    .join('\n')

  if (!byKind.has('overview')) {
    const ch = chapterFromBody('overview', overview, locale)
    if (ch) byKind.set('overview', ch)
  }
  if (!byKind.has('face')) {
    const ch = chapterFromBody('face', face, locale)
    if (ch) byKind.set('face', ch)
  }
  if (!byKind.has('palms')) {
    const palms = [left, right].filter(Boolean).join('\n\n')
    const ch = chapterFromBody('palms', palms, locale)
    if (ch) byKind.set('palms', ch)
  }
  if (!byKind.has('natal')) {
    const ch = chapterFromBody('natal', natal, locale)
    if (ch) byKind.set('natal', ch)
  }
  if (!byKind.has('period')) {
    const body = [period, eventsNote].filter(Boolean).join('\n\n')
    const ch = chapterFromBody('period', body, locale)
    if (ch) byKind.set('period', ch)
  }
  if (!byKind.has('advice')) {
    const ch = chapterFromBody('advice', advice, locale)
    if (ch) byKind.set('advice', ch)
  }

  const ordered = ORDER.map((k) => byKind.get(k)).filter((c): c is XingqiChapter => Boolean(c))
  return dedupCrossChapter(ordered)
}

/**
 * Display-side safety net: null out reef/remedy/counterpoint that merely repeat an
 * earlier chapter (keeps first occurrence). Fixes legacy resultJson that pasted the
 * same 流年 reef / 冥想 remedy / disclaimer into every chapter — no re-run needed.
 */
function dedupCrossChapter(chapters: XingqiChapter[]): XingqiChapter[] {
  const seenReef: string[] = []
  const seenRemedy: string[] = []
  const seenCounter: string[] = []
  for (const ch of chapters) {
    if (ch.reef) {
      if (seenReef.some((p) => isNearEcho(ch.reef as string, p))) ch.reef = null
      else seenReef.push(ch.reef)
    }
    if (ch.remedy) {
      if (seenRemedy.some((p) => isNearEcho(ch.remedy as string, p))) ch.remedy = null
      else seenRemedy.push(ch.remedy)
    }
    if (ch.counterpoint) {
      if (seenCounter.some((p) => isNearEcho(ch.counterpoint as string, p))) ch.counterpoint = null
      else seenCounter.push(ch.counterpoint)
    }
  }
  return chapters
}

/** Stable numeric seed from reading id / feature ids. */
export function inkSeedFromOutput(output: Record<string, unknown>): number {
  const raw = [
    asStr(output.faceFeatureId),
    asStr(output.palmLeftFeatureId),
    asStr(output.palmRightFeatureId),
  ].join('|')
  let h = 2166136261
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}
