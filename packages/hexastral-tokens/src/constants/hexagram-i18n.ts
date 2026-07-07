import type { HexagramData } from './hexagram-types'
import corpusZhCn from './hexagram/corpus.zh-CN.json'
import i18nEn from './hexagram/i18n.en.json'
import i18nJa from './hexagram/i18n.ja.json'
import i18nKo from './hexagram/i18n.ko.json'
import i18nZhTw from './hexagram/i18n.zh-TW.json'

export type HexagramLocale = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'

type I18nOverlay = {
  judgmentExplain: string
  keywords: string[]
}

const CORPUS = corpusZhCn as HexagramData[]

const I18N_BY_LOCALE: Record<Exclude<HexagramLocale, 'zh-CN'>, Record<string, I18nOverlay>> = {
  en: i18nEn as Record<string, I18nOverlay>,
  'zh-TW': i18nZhTw as Record<string, I18nOverlay>,
  ja: i18nJa as Record<string, I18nOverlay>,
  ko: i18nKo as Record<string, I18nOverlay>,
}

/** Map app locale strings (coin-cast, web) to hexagram corpus locale. */
export function resolveHexagramLocale(appLocale: string): HexagramLocale {
  const normalized = appLocale.trim().toLowerCase().replace('_', '-')
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
  if (locale !== 'en') {
    return I18N_BY_LOCALE.en[String(number)] ?? null
  }
  return null
}

/** Full hexagram detail with localized judgmentExplain + keywords; canonical Chinese for judgment/image/lines. */
export function getHexagramDetail(number: number, locale: HexagramLocale): HexagramData | null {
  const base = CORPUS.find((h) => h.number === number)
  if (!base) return null
  const overlay = overlayFor(number, locale)
  if (!overlay) return base
  return {
    ...base,
    judgmentExplain: overlay.judgmentExplain,
    keywords: overlay.keywords,
  }
}

/** Localized fields only — for svc-astro classical/AI paths without full object copy. */
export function getLocalizedHexagramFields(
  number: number,
  language: string
): { judgmentExplain: string; keywords: string[] } | null {
  const detail = getHexagramDetail(number, resolveHexagramLocale(language))
  if (!detail) return null
  return { judgmentExplain: detail.judgmentExplain, keywords: detail.keywords }
}

/** @deprecated Use getHexagramDetail — kept for backward compatibility during migration. */
export const HEXAGRAM_DETAILS: HexagramData[] = CORPUS
