/**
 * 五行 / 阴阳 — localized labels for glossary grids and detail rows.
 */

import type { Wuxing } from '../ganzhi-content'
import type { Locale } from '../i18n'
import type { LocalizedText } from './types'

const WUXING: Record<Wuxing, LocalizedText> = {
  木: { 'zh-Hans': '木', 'zh-Hant': '木', ja: '木', en: 'Wood' },
  火: { 'zh-Hans': '火', 'zh-Hant': '火', ja: '火', en: 'Fire' },
  土: { 'zh-Hans': '土', 'zh-Hant': '土', ja: '土', en: 'Earth' },
  金: { 'zh-Hans': '金', 'zh-Hant': '金', ja: '金', en: 'Metal' },
  水: { 'zh-Hans': '水', 'zh-Hant': '水', ja: '水', en: 'Water' },
}

const POLARITY: Record<'阳' | '阴', LocalizedText> = {
  阳: { 'zh-Hans': '阳', 'zh-Hant': '陽', ja: '陽', en: 'Yang' },
  阴: { 'zh-Hans': '阴', 'zh-Hant': '陰', ja: '陰', en: 'Yin' },
}

export function localizeWuxing(element: Wuxing, locale: Locale): string {
  return WUXING[element][locale]
}

export function localizePolarity(polarity: '阳' | '阴', locale: Locale): string {
  return POLARITY[polarity][locale]
}
