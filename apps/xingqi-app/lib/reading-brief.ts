/**
 * Period brief card — short schema on resultJson (period_brief readings).
 */

export type ReadingBrief = {
  title: string
  excerpt: string
  summary: string
  suggestion: string
  axis: 'career' | 'love' | 'health' | null
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
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
  return { title, excerpt, summary, suggestion, axis }
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
