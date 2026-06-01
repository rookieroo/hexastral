/**
 * Per-entry Wikipedia titles — festival ids only.
 *
 * The 24 solar terms used to live here too, but their EN article titles are
 * inconsistent across Wikipedia (some have `_(solar_term)` disambiguation,
 * some don't, a few 404). Per 2026-06 user feedback ("二十四个节气是不可翻
 * 译的") the per-term Wiki link is dropped — the category-level
 * `二十四節氣` / `Solar_term` overview from `getWikipediaUrl` still appears
 * in CultureIntroBlock at the top of the expanded section, and each row
 * keeps its locale-aware 1-2 sentence summary. Festival names DO have
 * well-established translations on Wikipedia, so those keep per-item links.
 */

import type { Locale } from '../i18n'
import type { LocalizedText } from './types'
import { getWikipediaUrl } from './wikipedia'

/** Eight major festivals (`CycleFestival.id`). */
const FESTIVAL_WIKI: Record<string, LocalizedText> = {
  chunjie: {
    'zh-Hans': '春节',
    'zh-Hant': '春節',
    ja: '春節',
    en: 'Chinese_New_Year',
  },
  yuanxiao: {
    'zh-Hans': '元宵节',
    'zh-Hant': '元宵節',
    ja: '元宵節',
    en: 'Lantern_Festival',
  },
  qingming: {
    'zh-Hans': '清明节',
    'zh-Hant': '清明節',
    ja: '清明節',
    en: 'Qingming_Festival',
  },
  duanwu: {
    'zh-Hans': '端午节',
    'zh-Hant': '端午節',
    ja: '端午の節句',
    en: 'Dragon_Boat_Festival',
  },
  qixi: {
    'zh-Hans': '七夕',
    'zh-Hant': '七夕',
    ja: '七夕',
    en: 'Qixi_Festival',
  },
  zhongqiu: {
    'zh-Hans': '中秋节',
    'zh-Hant': '中秋節',
    ja: '中秋節',
    en: 'Mid-Autumn_Festival',
  },
  chongyang: {
    'zh-Hans': '重阳节',
    'zh-Hant': '重陽節',
    ja: '重陽節',
    en: 'Double_Ninth_Festival',
  },
  dongzhi: {
    'zh-Hans': '冬至',
    'zh-Hant': '冬至',
    ja: '冬至',
    en: 'Dongzhi_Festival',
  },
}

export function getCultureEntryWikipediaUrl(entryId: string, locale: Locale): string | null {
  const titles = FESTIVAL_WIKI[entryId]
  if (!titles) return null
  return getWikipediaUrl(locale, titles[locale])
}
