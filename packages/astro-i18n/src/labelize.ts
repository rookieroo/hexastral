import { de } from './dictionaries/de'
import { en } from './dictionaries/en'
import { es } from './dictionaries/es'
import { ja } from './dictionaries/ja'
import { ko } from './dictionaries/ko'
import { th } from './dictionaries/th'
import { vi } from './dictionaries/vi'
import { zh } from './dictionaries/zh'
import { zhHant } from './dictionaries/zh-Hant'
import type { Dictionary, Locale, TokenCategory } from './types'

const DICTS: Record<Locale, Dictionary> = {
  zh,
  'zh-Hant': zhHant,
  en,
  ja,
  ko,
  de,
  es,
  vi,
  th,
}

/**
 * Resolve a single token in the target locale.
 *
 * Resolution chain:
 *   1. target locale dictionary
 *   2. English (en)
 *   3. canonical zh
 *   4. raw key (last-resort, prevents `undefined` in UI)
 */
export function labelize(
  category: TokenCategory,
  key: string | null | undefined,
  locale: Locale
): string {
  if (!key) return ''
  const target = DICTS[locale] ?? en
  return target[category]?.[key] ?? en[category]?.[key] ?? zh[category]?.[key] ?? key
}

/**
 * Bulk-translate an array of tokens of the same category.
 * Returns localized strings in the same order.
 */
export function labelizeMany(
  category: TokenCategory,
  keys: ReadonlyArray<string | null | undefined>,
  locale: Locale
): string[] {
  return keys.map((k) => labelize(category, k, locale))
}

/**
 * Get the entire localized dictionary for a locale (with English/zh fallbacks merged in).
 * Useful when a component needs many lookups in the same render pass.
 */
export function getLocalizedDictionary(locale: Locale): Dictionary {
  return DICTS[locale] ?? en
}
