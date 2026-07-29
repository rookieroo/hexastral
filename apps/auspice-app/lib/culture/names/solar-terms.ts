/**
 * 24 solar terms — keyed by canonical simplified Chinese (API / astro-core).
 *
 * English UI chrome uses "English gloss (Pinyin)" so Today / glossary / push match
 * detail-page titles. Bare pinyin stays only for Wikipedia route/slug parity
 * (see entry-wikipedia.ts). Editorial rules: docs/apps/yuun/copy-voice.md.
 */

import { JIEQI_PINYIN } from '../../festival-content'
import type { Locale } from '../../i18n'
import type { LocalizedText } from '../types'

export const SOLAR_TERM_NAMES: Record<string, LocalizedText> = {
  立春: { 'zh-Hans': '立春', 'zh-Hant': '立春', ja: '立春', en: 'Start of Spring (Lichun)' },
  雨水: { 'zh-Hans': '雨水', 'zh-Hant': '雨水', ja: '雨水', en: 'Rain Water (Yushui)' },
  惊蛰: { 'zh-Hans': '惊蛰', 'zh-Hant': '驚蟄', ja: '啓蟄', en: 'Awakening of Insects (Jingzhe)' },
  春分: { 'zh-Hans': '春分', 'zh-Hant': '春分', ja: '春分', en: 'Spring Equinox (Chunfen)' },
  清明: { 'zh-Hans': '清明', 'zh-Hant': '清明', ja: '清明', en: 'Clear and Bright (Qingming)' },
  谷雨: { 'zh-Hans': '谷雨', 'zh-Hant': '穀雨', ja: '穀雨', en: 'Grain Rain (Guyu)' },
  立夏: { 'zh-Hans': '立夏', 'zh-Hant': '立夏', ja: '立夏', en: 'Start of Summer (Lixia)' },
  小满: { 'zh-Hans': '小满', 'zh-Hant': '小滿', ja: '小満', en: 'Grain Buds (Xiaoman)' },
  芒种: { 'zh-Hans': '芒种', 'zh-Hant': '芒種', ja: '芒種', en: 'Grain in Ear (Mangzhong)' },
  夏至: { 'zh-Hans': '夏至', 'zh-Hant': '夏至', ja: '夏至', en: 'Summer Solstice (Xiazhi)' },
  小暑: { 'zh-Hans': '小暑', 'zh-Hant': '小暑', ja: '小暑', en: 'Minor Heat (Xiaoshu)' },
  大暑: { 'zh-Hans': '大暑', 'zh-Hant': '大暑', ja: '大暑', en: 'Major Heat (Dashu)' },
  立秋: { 'zh-Hans': '立秋', 'zh-Hant': '立秋', ja: '立秋', en: 'Start of Autumn (Liqiu)' },
  处暑: { 'zh-Hans': '处暑', 'zh-Hant': '處暑', ja: '処暑', en: 'End of Heat (Chushu)' },
  白露: { 'zh-Hans': '白露', 'zh-Hant': '白露', ja: '白露', en: 'White Dew (Bailu)' },
  秋分: { 'zh-Hans': '秋分', 'zh-Hant': '秋分', ja: '秋分', en: 'Autumn Equinox (Qiufen)' },
  寒露: { 'zh-Hans': '寒露', 'zh-Hant': '寒露', ja: '寒露', en: 'Cold Dew (Hanlu)' },
  霜降: { 'zh-Hans': '霜降', 'zh-Hant': '霜降', ja: '霜降', en: 'Frost Descent (Shuangjiang)' },
  立冬: { 'zh-Hans': '立冬', 'zh-Hant': '立冬', ja: '立冬', en: 'Start of Winter (Lidong)' },
  小雪: { 'zh-Hans': '小雪', 'zh-Hant': '小雪', ja: '小雪', en: 'Minor Snow (Xiaoxue)' },
  大雪: { 'zh-Hans': '大雪', 'zh-Hant': '大雪', ja: '大雪', en: 'Major Snow (Daxue)' },
  冬至: { 'zh-Hans': '冬至', 'zh-Hant': '冬至', ja: '冬至', en: 'Winter Solstice (Dongzhi)' },
  小寒: { 'zh-Hans': '小寒', 'zh-Hant': '小寒', ja: '小寒', en: 'Minor Cold (Xiaohan)' },
  大寒: { 'zh-Hans': '大寒', 'zh-Hant': '大寒', ja: '大寒', en: 'Major Cold (Dahan)' },
}

const PINYIN_TO_HAN = Object.fromEntries(
  Object.entries(JIEQI_PINYIN).map(([han, py]) => [py, han])
) as Record<string, string>

export function localizeSolarTermName(cjkName: string, locale: Locale): string {
  return SOLAR_TERM_NAMES[cjkName]?.[locale] ?? cjkName
}

export function localizeJieqiRouteId(routeId: string, locale: Locale): string | null {
  if (!routeId.startsWith('jieqi-')) return null
  const han = PINYIN_TO_HAN[routeId.slice('jieqi-'.length)]
  if (!han) return null
  return localizeSolarTermName(han, locale)
}
