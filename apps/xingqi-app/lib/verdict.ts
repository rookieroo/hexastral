/**
 * Home verdict — the latest reading's one-line 断语 + three-axis chips.
 * Derived from the stored chapters (period → overview) + events, so the home
 * hero shows the report's actual conclusion, not chrome.
 */

import type { PortfolioReadingItem } from '@zhop/portfolio-client'

import type { Locale } from './i18n'
import { axisLabels } from './living-copy'
import { adaptReadingChapters } from './report-chapters'

export type VerdictAxisKey = 'career' | 'love' | 'health'

export type VerdictAxis = { key: VerdictAxisKey; label: string; note: string }

export type HomeVerdict = { goldenLine: string; axes: VerdictAxis[] }

const AXIS_ORDER: VerdictAxisKey[] = ['career', 'love', 'health']

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** First event note per axis, in career/love/health order. */
function axesFromEvents(events: unknown[], locale: Locale): VerdictAxis[] {
  const labels = axisLabels(locale)
  const byAxis = new Map<VerdictAxisKey, string>()
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    const axis = asStr(e.axis)
    if (axis !== 'career' && axis !== 'love' && axis !== 'health') continue
    if (byAxis.has(axis)) continue
    const note = asStr(e.note) || asStr(e.theme)
    if (note) byAxis.set(axis, note)
  }
  return AXIS_ORDER.filter((k) => byAxis.has(k)).map((k) => ({
    key: k,
    label: labels[k],
    note: byAxis.get(k) ?? '',
  }))
}

export function verdictFromReading(item: PortfolioReadingItem, locale: Locale): HomeVerdict | null {
  if (!item.resultJson?.trim()) return null
  let output: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(item.resultJson)
    if (!parsed || typeof parsed !== 'object') return null
    output = parsed as Record<string, unknown>
  } catch {
    return null
  }

  const chapters = adaptReadingChapters(output, locale)
  const period = chapters.find((c) => c.kind === 'period')
  const overview = chapters.find((c) => c.kind === 'overview')
  const goldenLine = (period?.goldenLine || overview?.goldenLine || overview?.evidence || '').trim()
  if (!goldenLine) return null

  const ai = (output.aiInterpretation ?? {}) as Record<string, unknown>
  const events = Array.isArray(output.events)
    ? output.events
    : Array.isArray(ai.events)
      ? ai.events
      : []

  return { goldenLine, axes: axesFromEvents(events, locale) }
}
