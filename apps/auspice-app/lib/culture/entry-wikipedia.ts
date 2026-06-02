/**
 * Per-entry Wikipedia titles.
 *
 * Festivals: well-known translated names per locale (Chinese_New_Year,
 * Lantern_Festival, etc.).
 *
 * 24 solar terms: native CJK characters in zh-Hans/zh-Hant/ja (each term has
 * a dedicated Wikipedia article in those wikis); EN uses the capitalized
 * pinyin form Wikipedia itself uses for article titles (Lichun, Dahan, ...).
 * A few EN articles carry a `_(solar_term)` disambiguation suffix where the
 * bare pinyin collides with other topics — those are encoded explicitly.
 */

import type { Locale } from '../i18n'
import type { LocalizedText } from './types'
import { getWikipediaUrl } from './wikipedia'

/** Eight major festivals (`AuspiceFestival.id`). */
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

/**
 * 24 solar terms (`jieqi-{pinyin}` route ids). Native CJK names for the
 * CJK wikis; EN uses Wikipedia's pinyin article titles, with the
 * `_(solar_term)` disambiguation suffix where the bare pinyin is taken.
 */
const JIEQI_WIKI: Record<string, LocalizedText> = {
  'jieqi-lichun': { 'zh-Hans': '立春', 'zh-Hant': '立春', ja: '立春', en: 'Lichun' },
  'jieqi-yushui': { 'zh-Hans': '雨水', 'zh-Hant': '雨水', ja: '雨水', en: 'Yushui' },
  'jieqi-jingzhe': { 'zh-Hans': '惊蛰', 'zh-Hant': '驚蟄', ja: '啓蟄', en: 'Jingzhe' },
  'jieqi-chunfen': { 'zh-Hans': '春分', 'zh-Hant': '春分', ja: '春分', en: 'Chunfen' },
  // 清明 the solar term shares its Wikipedia article with the Qingming Festival
  // on every wiki — point at the festival page (it covers both senses well).
  'jieqi-qingming': {
    'zh-Hans': '清明',
    'zh-Hant': '清明',
    ja: '清明',
    en: 'Qingming_Festival',
  },
  'jieqi-guyu': { 'zh-Hans': '谷雨', 'zh-Hant': '穀雨', ja: '穀雨', en: 'Guyu_(solar_term)' },
  'jieqi-lixia': { 'zh-Hans': '立夏', 'zh-Hant': '立夏', ja: '立夏', en: 'Lixia' },
  'jieqi-xiaoman': { 'zh-Hans': '小满', 'zh-Hant': '小滿', ja: '小満', en: 'Xiaoman' },
  'jieqi-mangzhong': { 'zh-Hans': '芒种', 'zh-Hant': '芒種', ja: '芒種', en: 'Mangzhong' },
  'jieqi-xiazhi': { 'zh-Hans': '夏至', 'zh-Hant': '夏至', ja: '夏至', en: 'Xiazhi' },
  'jieqi-xiaoshu': { 'zh-Hans': '小暑', 'zh-Hant': '小暑', ja: '小暑', en: 'Xiaoshu' },
  'jieqi-dashu': { 'zh-Hans': '大暑', 'zh-Hant': '大暑', ja: '大暑', en: 'Dashu' },
  'jieqi-liqiu': { 'zh-Hans': '立秋', 'zh-Hant': '立秋', ja: '立秋', en: 'Liqiu' },
  'jieqi-chushu': { 'zh-Hans': '处暑', 'zh-Hant': '處暑', ja: '処暑', en: 'Chushu' },
  'jieqi-bailu': { 'zh-Hans': '白露', 'zh-Hant': '白露', ja: '白露', en: 'Bailu_(solar_term)' },
  'jieqi-qiufen': { 'zh-Hans': '秋分', 'zh-Hant': '秋分', ja: '秋分', en: 'Qiufen' },
  'jieqi-hanlu': { 'zh-Hans': '寒露', 'zh-Hant': '寒露', ja: '寒露', en: 'Hanlu' },
  'jieqi-shuangjiang': {
    'zh-Hans': '霜降',
    'zh-Hant': '霜降',
    ja: '霜降',
    en: 'Shuangjiang',
  },
  'jieqi-lidong': { 'zh-Hans': '立冬', 'zh-Hant': '立冬', ja: '立冬', en: 'Lidong' },
  'jieqi-xiaoxue': { 'zh-Hans': '小雪', 'zh-Hant': '小雪', ja: '小雪', en: 'Xiaoxue' },
  'jieqi-daxue': { 'zh-Hans': '大雪', 'zh-Hant': '大雪', ja: '大雪', en: 'Daxue' },
  // 冬至 the solar term shares its article with the Winter Solstice / Dongzhi
  // Festival on every wiki.
  'jieqi-dongzhi': {
    'zh-Hans': '冬至',
    'zh-Hant': '冬至',
    ja: '冬至',
    en: 'Dongzhi_Festival',
  },
  'jieqi-xiaohan': { 'zh-Hans': '小寒', 'zh-Hant': '小寒', ja: '小寒', en: 'Xiaohan' },
  'jieqi-dahan': { 'zh-Hans': '大寒', 'zh-Hant': '大寒', ja: '大寒', en: 'Dahan' },
}

export function getCultureEntryWikipediaUrl(entryId: string, locale: Locale): string | null {
  const titles = FESTIVAL_WIKI[entryId] ?? JIEQI_WIKI[entryId]
  if (!titles) return null
  return getWikipediaUrl(locale, titles[locale])
}
