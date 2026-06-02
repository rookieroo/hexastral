/**
 * Signature dictionaries — barrel export keyed by Locale.
 */

import type { SignatureDictionary } from '../../signature-types'
import type { Locale } from '../../types'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { ja } from './ja'
import { ko } from './ko'
import { th } from './th'
import { vi } from './vi'
import { zh } from './zh'
import { zhHant } from './zh-Hant'

export const signatureDictionaries: Record<Locale, SignatureDictionary> = {
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
