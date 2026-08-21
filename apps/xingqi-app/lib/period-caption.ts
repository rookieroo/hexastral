import type { PortfolioReadingItem } from '@zhop/portfolio-client'

import type { Locale } from '@/lib/i18n'
import { parseReadingBrief } from '@/lib/reading-brief'
import { verdictFromReading } from '@/lib/verdict'

export const EXCERPT_MAX_CHARS = 42

export function localeFromTag(tag: string | undefined): Locale {
  if (!tag) return 'en'
  const t = tag.toLowerCase()
  if (t.startsWith('zh-tw') || t.startsWith('zh-hk') || t.startsWith('zh-mo') || t.startsWith('zh-hant')) return 'zh-Hant'
  if (t.startsWith('zh')) return 'zh'
  if (t.startsWith('ja')) return 'ja'
  return 'en'
}

export function clampExcerpt(text: string, maxChars = EXCERPT_MAX_CHARS): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxChars) return oneLine
  return `${oneLine.slice(0, maxChars).trimEnd()}…`
}

export function formatChromeDate(iso: string, chromeLocale: Locale): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  // Compact rail label (scrolls with the wheel). Locale only affects separators lightly.
  if (chromeLocale === 'en') return `${y}\n${m}.${day}`
  return `${y}\n${m}.${day}`
}

function excerptFromResultJson(resultJson: string | undefined): string {
  if (!resultJson?.trim()) return ''
  try {
    const output = JSON.parse(resultJson) as Record<string, unknown>
    const brief = parseReadingBrief(output)
    if (brief?.excerpt) return clampExcerpt(brief.excerpt)
  } catch {
    // fall through
  }
  return ''
}

export function periodCaption(
  item: PortfolioReadingItem,
  chromeLocale: Locale
): { title: string; excerpt: string } {
  const title = formatChromeDate(item.createdAt, chromeLocale)
  const fromBrief = excerptFromResultJson(item.resultJson)
  if (fromBrief) return { title, excerpt: fromBrief }
  const verdict = verdictFromReading(item, localeFromTag(item.locale))
  return { title, excerpt: verdict ? clampExcerpt(verdict.goldenLine) : '' }
}
