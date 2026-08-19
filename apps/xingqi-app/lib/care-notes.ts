/**
 * Home care notes — lifestyle pacing only, from health axis + horizon.remedy.
 * No new model, no diagnosis, no census 铁口.
 */

import type { PortfolioReadingItem } from '@zhop/portfolio-client'

import type { Locale } from './i18n'
import { homeCareCopy } from './living-copy'
import { adaptReadingChapters } from './report-chapters'
import { verdictFromReading } from './verdict'

export type CareNote = {
  id: string
  label: string
  body: string
  chapter: 'horizon'
}

const BAN =
  /癌|肿瘤|腫瘤|处方|處方|诊断|診斷|糖尿病|高血压|高血壓|心脏病|心臟病|怀孕|懷孕|已婚|未婚|孩子|手术|手術|就医|就醫|疾病|抗生素|cancer|diagnos|prescri|pregnant|marital|unmarried|surgery|disease/i

const KEEP =
  /吃|餐|饭|飯|饮食|飲食|睡|熬夜|作息|休息|节奏|節奏|早睡|少熬|按时|按時|饮水|喝水|pace|meal|sleep|rest|night|midnight|dinner|eat|hydrat|circadian|water/i

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function firstSentence(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const cut = t.split(/[。.!?\n]/)[0]?.trim() || t
  return cut.slice(0, 96)
}

export function looksLikeCare(text: string): boolean {
  const t = text.trim()
  if (t.length < 6) return false
  if (BAN.test(t)) return false
  return KEEP.test(t)
}

function pushUnique(out: CareNote[], note: CareNote): void {
  const body = compactKey(note.body)
  if (!body) return
  if (out.some((n) => compactKey(n.body) === body)) return
  out.push(note)
}

function compactKey(s: string): string {
  return s.replace(/\s+/g, '').slice(0, 24)
}

function eventsFromReading(item: PortfolioReadingItem): unknown[] {
  if (!item.resultJson?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(item.resultJson)
    if (!parsed || typeof parsed !== 'object') return []
    const output = parsed as Record<string, unknown>
    const ai = (output.aiInterpretation ?? {}) as Record<string, unknown>
    if (Array.isArray(output.events)) return output.events
    if (Array.isArray(ai.events)) return ai.events
    return []
  } catch {
    return []
  }
}

function parseOutput(item: PortfolioReadingItem): Record<string, unknown> | null {
  if (!item.resultJson?.trim()) return null
  try {
    const parsed: unknown = JSON.parse(item.resultJson)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/** 1–3 lifestyle cards. Falls back to chrome copy when the report has no keep-list lines. */
export function careNotesFromReading(item: PortfolioReadingItem, locale: Locale): CareNote[] {
  const labels = homeCareCopy(locale)
  const out: CareNote[] = []
  const verdict = verdictFromReading(item, locale)
  const health = verdict?.axes.find((a) => a.key === 'health')
  if (health && looksLikeCare(health.note)) {
    pushUnique(out, {
      id: 'health',
      label: labels.pace,
      body: firstSentence(health.note),
      chapter: 'horizon',
    })
  }

  const output = parseOutput(item)
  if (output) {
    const chapters = adaptReadingChapters(output, locale)
    const horizon = chapters.find((c) => c.kind === 'horizon')
    if (horizon?.remedy && looksLikeCare(horizon.remedy)) {
      pushUnique(out, {
        id: 'remedy',
        label: labels.rest,
        body: firstSentence(horizon.remedy),
        chapter: 'horizon',
      })
    }
  }

  for (const ev of eventsFromReading(item)) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    if (asStr(e.axis) !== 'health') continue
    const note = asStr(e.note) || asStr(e.theme)
    if (!looksLikeCare(note)) continue
    pushUnique(out, {
      id: `event-${out.length}`,
      label: labels.body,
      body: firstSentence(note),
      chapter: 'horizon',
    })
    if (out.length >= 3) break
  }

  const fallbackKeys: Array<{ id: string; label: string; body: string }> = [
    { id: 'fb-pace', label: labels.pace, body: labels.fallbacks[0] },
    { id: 'fb-rest', label: labels.rest, body: labels.fallbacks[1] },
    { id: 'fb-body', label: labels.body, body: labels.fallbacks[2] },
  ]
  for (const fb of fallbackKeys) {
    if (out.length >= 3) break
    pushUnique(out, { ...fb, chapter: 'horizon' })
  }

  return out.slice(0, 3)
}

export type PeriodDot = {
  key: string
  label: string
  lit: boolean
}

function padMonth(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function monthLabel(year: number, month: number, locale: Locale): string {
  if (locale === 'en') {
    return new Date(year, month - 1, 1).toLocaleString('en', { month: 'short' })
  }
  if (locale === 'ja') return `${month}月`
  return `${month}月`
}

function eventMonths(item: PortfolioReadingItem): Set<string> {
  const keys = new Set<string>()
  for (const ev of eventsFromReading(item)) {
    if (!ev || typeof ev !== 'object') continue
    const start = asStr((ev as Record<string, unknown>).startMonth)
    const m = start.match(/^(\d{4})-(\d{2})/)
    if (m) keys.add(`${m[1]}-${m[2]}`)
  }
  return keys
}

/** Compact 4-dot near window for home. Does not embed the git-graph. */
export function periodStripDots(
  item: PortfolioReadingItem,
  locale: Locale,
  now = new Date()
): PeriodDot[] {
  const marked = eventMonths(item)
  const dots: PeriodDot[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const key = `${year}-${padMonth(month)}`
    dots.push({
      key,
      label: monthLabel(year, month, locale),
      lit: i === 0 || marked.has(key),
    })
  }
  return dots
}
