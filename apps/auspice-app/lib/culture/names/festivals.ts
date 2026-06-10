/**
 * Eight major festivals — display names (4 locales).
 */

import type { Locale } from '../../i18n'
import type { LocalizedText } from '../types'

export const FESTIVAL_NAMES: Record<string, LocalizedText> = {
  chunjie: {
    'zh-Hans': '春节',
    'zh-Hant': '春節',
    ja: '春節',
    en: 'Chinese New Year',
  },
  yuanxiao: {
    'zh-Hans': '元宵节',
    'zh-Hant': '元宵節',
    ja: '元宵節',
    en: 'Lantern Festival',
  },
  qingming: {
    'zh-Hans': '清明节',
    'zh-Hant': '清明節',
    ja: '清明節',
    en: 'Qingming Festival',
  },
  duanwu: {
    'zh-Hans': '端午节',
    'zh-Hant': '端午節',
    ja: '端午の節句',
    en: 'Dragon Boat Festival',
  },
  qixi: {
    'zh-Hans': '七夕',
    'zh-Hant': '七夕',
    ja: '七夕',
    en: 'Qixi Festival',
  },
  zhongqiu: {
    'zh-Hans': '中秋节',
    'zh-Hant': '中秋節',
    ja: '中秋節',
    en: 'Mid-Autumn Festival',
  },
  chongyang: {
    'zh-Hans': '重阳节',
    'zh-Hant': '重陽節',
    ja: '重陽節',
    en: 'Double Ninth Festival',
  },
  dongzhi: {
    'zh-Hans': '冬至',
    'zh-Hant': '冬至',
    ja: '冬至',
    en: 'Winter Solstice Festival',
  },
}

export function localizeFestivalId(id: string, locale: Locale, fallback?: string): string {
  return FESTIVAL_NAMES[id]?.[locale] ?? fallback ?? id
}
