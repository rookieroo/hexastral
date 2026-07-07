/**
 * Localized hexagram fields for classical/AI readings.
 * JSON bundles synced from @zhop/hexastral-tokens via scripts/sync-hexagram-corpus.mjs
 */

import type { Hexagram } from './hexagrams'
import corpusZhCn from './hexagram-i18n/corpus.zh-CN.json'
import i18nEn from './hexagram-i18n/i18n.en.json'
import i18nJa from './hexagram-i18n/i18n.ja.json'
import i18nKo from './hexagram-i18n/i18n.ko.json'
import i18nZhTw from './hexagram-i18n/i18n.zh-TW.json'

type HexagramLocale = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'

type I18nOverlay = {
  judgmentExplain: string
  keywords: string[]
}

const I18N_BY_LOCALE: Record<Exclude<HexagramLocale, 'zh-CN'>, Record<string, I18nOverlay>> = {
  en: i18nEn as Record<string, I18nOverlay>,
  'zh-TW': i18nZhTw as Record<string, I18nOverlay>,
  ja: i18nJa as Record<string, I18nOverlay>,
  ko: i18nKo as Record<string, I18nOverlay>,
}

export function resolveHexagramLocale(language: string): HexagramLocale {
  const normalized = language.trim().toLowerCase().replace('_', '-')
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN'
  if (normalized === 'zh-hant' || normalized === 'zh-tw' || normalized === 'tw') return 'zh-TW'
  if (normalized.startsWith('ja')) return 'ja'
  if (normalized.startsWith('ko')) return 'ko'
  if (normalized.startsWith('en')) return 'en'
  return 'en'
}

function overlayFor(number: number, locale: HexagramLocale): I18nOverlay | null {
  if (locale === 'zh-CN') return null
  const table = I18N_BY_LOCALE[locale]
  const entry = table[String(number)]
  if (entry) return entry
  if (locale !== 'en') return I18N_BY_LOCALE.en[String(number)] ?? null
  return null
}

/** Apply locale overlay to hexagram for interpretation/summary; classical block stays canonical zh. */
export function applyHexagramLocale(hexagram: Hexagram, language: string): Hexagram {
  const overlay = overlayFor(hexagram.number, resolveHexagramLocale(language))
  if (!overlay) return hexagram
  return { ...hexagram, judgmentExplain: overlay.judgmentExplain, keywords: overlay.keywords }
}

/** Validate corpus count at module load (sync script also checks). */
const _corpusCount = (corpusZhCn as unknown[]).length
if (_corpusCount !== 64) {
  console.warn(`[hexagram-i18n] expected 64 corpus entries, got ${_corpusCount}`)
}
