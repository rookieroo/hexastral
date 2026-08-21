/**
 * Period brief card — short schema on resultJson (period_brief readings).
 */

export type ReadingBrief = {
  title: string
  excerpt: string
  summary: string
  suggestion: string
  points: string[]
  axis: 'career' | 'love' | 'health' | null
}

export type ReadingBriefEvent = {
  startMonth: string
  endMonth: string | null
  theme: string
  note: string
  axis: 'career' | 'love' | 'health' | null
}

export type ReadingBriefLocusHighlight = {
  locus: string
  reading: string
  part?: string
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parsePoints(raw: unknown, suggestion: string): string[] {
  const fromArr: string[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'string') continue
      const t = item.trim()
      if (t) fromArr.push(t)
      if (fromArr.length >= 4) break
    }
  }
  if (fromArr.length >= 2) return fromArr
  return suggestion
    .split(/\n+/)
    .map((l) => l.replace(/^\d+[.)、．]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

export function parseReadingBrief(output: Record<string, unknown> | null | undefined): ReadingBrief | null {
  if (!output) return null
  const raw = output.brief
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const title = asStr(b.title)
  const excerpt = asStr(b.excerpt)
  const summary = asStr(b.summary)
  const suggestion = asStr(b.suggestion)
  if (!title || !excerpt || !summary || !suggestion) return null
  const axisRaw = asStr(b.axis)
  const axis =
    axisRaw === 'career' || axisRaw === 'love' || axisRaw === 'health' ? axisRaw : null
  return {
    title,
    excerpt,
    summary,
    suggestion,
    points: parsePoints(b.points, suggestion),
    axis,
  }
}

export function parseReadingBriefEvents(
  output: Record<string, unknown> | null | undefined
): ReadingBriefEvent[] {
  if (!output || !Array.isArray(output.events)) return []
  const out: ReadingBriefEvent[] = []
  for (const row of output.events) {
    if (!row || typeof row !== 'object') continue
    const e = row as Record<string, unknown>
    const theme = asStr(e.theme)
    const note = asStr(e.note)
    const startMonth = asStr(e.startMonth)
    if (!theme && !note) continue
    const axisRaw = asStr(e.axis)
    const axis =
      axisRaw === 'career' || axisRaw === 'love' || axisRaw === 'health' ? axisRaw : null
    out.push({
      startMonth,
      endMonth: asStr(e.endMonth) || null,
      theme,
      note,
      axis,
    })
    if (out.length >= 3) break
  }
  return out
}

/** Up to 4 loci highlights for the brief card. */
export function parseReadingBriefLoci(
  output: Record<string, unknown> | null | undefined
): ReadingBriefLocusHighlight[] {
  if (!output || !Array.isArray(output.loci)) return []
  const out: ReadingBriefLocusHighlight[] = []
  for (const row of output.loci) {
    if (!row || typeof row !== 'object') continue
    const L = row as Record<string, unknown>
    const locus = asStr(L.locus)
    const reading = asStr(L.reading)
    if (!locus || !reading) continue
    out.push({
      locus,
      reading: reading.length > 90 ? `${reading.slice(0, 90).trimEnd()}…` : reading,
      part: asStr(L.part) || undefined,
    })
    if (out.length >= 4) break
  }
  return out
}

/** Prefer brief card only when the payload actually has the short schema. */
export function shouldOpenBriefCard(output: Record<string, unknown> | null | undefined): boolean {
  return Boolean(parseReadingBrief(output))
}

export function readingHasFiveChapters(output: Record<string, unknown> | null | undefined): boolean {
  if (!output) return false
  const chapters = output.chapters
  return Array.isArray(chapters) && chapters.length >= 4
}
