/**
 * Compatibility shim — prefer `@zhop/astro-core` `formatYijiVerb`.
 * Keeps existing call sites that pass Locale from auspice i18n.
 */

import {
  formatYijiVerb as formatCore,
  type YijiVocabularyMode,
} from '@zhop/astro-core'
import type { Locale } from './i18n'

/**
 * Translate a 黄历 宜忌 verb into the user's locale (traditional gloss).
 * Pass-through for zh-Hans. Falls back to source CJK when unmapped.
 */
export function localizeYijiVerb(verb: string, locale: Locale): string {
  return formatCore(verb, locale, 'traditional')
}

/** Display with an explicit modern/traditional mode. */
export function displayYijiVerb(
  verb: string,
  locale: Locale,
  mode: YijiVocabularyMode
): string {
  return formatCore(verb, locale, mode)
}
