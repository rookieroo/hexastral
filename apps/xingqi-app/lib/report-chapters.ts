/**
 * Map reading payload → Xingqi report chapters (Yuel-aligned).
 */

export type XingqiChapterKind =
  | 'overview'
  | 'face'
  | 'palms'
  | 'natal'
  | 'period'
  | 'advice'

export type XingqiChapter = {
  kind: XingqiChapterKind
  goldenLine: string
  evidence: string
  dynamic: string
  reef: string | null
  remedy: string | null
  counterpoint: string | null
}

const ORDER: XingqiChapterKind[] = [
  'overview',
  'face',
  'palms',
  'natal',
  'period',
  'advice',
]

export const CHAPTER_TITLE: Record<
  XingqiChapterKind,
  { zh: string; en: string }
> = {
  overview: { zh: '总格局', en: 'Overview' },
  face: { zh: '面部', en: 'Face' },
  palms: { zh: '双手', en: 'Palms' },
  natal: { zh: '形气 × 八字', en: 'Form × BaZi' },
  period: { zh: '本期窗口', en: 'Period' },
  advice: { zh: '建议', en: 'Advice' },
}


function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function chapterFromBody(
  kind: XingqiChapterKind,
  body: string,
  locale: string
): XingqiChapter | null {
  if (body.length < 8) return null
  const zh = locale.startsWith('zh')
  const first = body.split(/[。.!?\n]/)[0]?.trim() || body.slice(0, 48)
  return {
    kind,
    goldenLine: first.slice(0, 80),
    evidence: body,
    dynamic: '',
    reef: null,
    remedy: null,
    counterpoint: zh
      ? '文化研习参考，不作命运断语。'
      : 'Cultural study framing — not deterministic fate.',
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
      return [start, theme, note].filter(Boolean).join(' · ')
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

  return ORDER.map((k) => byKind.get(k)).filter((c): c is XingqiChapter => Boolean(c))
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
