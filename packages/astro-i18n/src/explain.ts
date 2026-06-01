/**
 * @zhop/astro-i18n — explainTerm
 *
 * Returns a one-line teaching caption (≤80 chars) for a canonical
 * metaphysics token, in the requested locale.
 *
 * Falls back to: target locale → zh → null
 *
 * @example
 *   explainTerm('shishen', '正官', 'en')
 *   // → 'Controls Day Master, opposite polarity — career, status, husband (F)'
 */

import { explanationsEn } from './explanations/en'
import { explanationsJa } from './explanations/ja'
import { explanationsZh } from './explanations/zh'
import { explanationsZhHant } from './explanations/zh-Hant'
import type { ExplanationDict } from './types-explanations'
import type { Locale, TokenCategory } from './types'

const dictionaries: Partial<Record<Locale, ExplanationDict>> = {
  zh: explanationsZh,
  'zh-Hant': explanationsZhHant,
  en: explanationsEn,
  ja: explanationsJa,
}

export function explainTerm(
  category: TokenCategory,
  token: string,
  locale: Locale
): string | null {
  const localized = dictionaries[locale]?.[category]?.[token]
  if (localized) return localized

  // Fallback to zh
  if (locale !== 'zh') {
    const zh = explanationsZh[category]?.[token]
    if (zh) return zh
  }

  return null
}

export type { ExplanationDict }
