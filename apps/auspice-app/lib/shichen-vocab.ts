/**
 * 12 时辰 (shichen) — localized names for the hour-scrubber on Today / day detail.
 *
 * The server's 12 时辰 array returns the canonical CJK form (e.g. "子时"). For
 * non-CN locales, en gets the animal name (more evocative than romanized
 * pinyin) and ja gets the traditional reading 子の刻 / 丑の刻 etc.
 *
 * zh-Hans is pass-through (canonical). Unknown names fall back to source CJK.
 */

import type { Locale } from './i18n'

const ZH_HANT: Record<string, string> = {
  子时: '子時',
  丑时: '丑時',
  寅时: '寅時',
  卯时: '卯時',
  辰时: '辰時',
  巳时: '巳時',
  午时: '午時',
  未时: '未時',
  申时: '申時',
  酉时: '酉時',
  戌时: '戌時',
  亥时: '亥時',
}

const JA: Record<string, string> = {
  子时: '子の刻',
  丑时: '丑の刻',
  寅时: '寅の刻',
  卯时: '卯の刻',
  辰时: '辰の刻',
  巳时: '巳の刻',
  午时: '午の刻',
  未时: '未の刻',
  申时: '申の刻',
  酉时: '酉の刻',
  戌时: '戌の刻',
  亥时: '亥の刻',
}

const EN: Record<string, string> = {
  子时: 'Rat',
  丑时: 'Ox',
  寅时: 'Tiger',
  卯时: 'Rabbit',
  辰时: 'Dragon',
  巳时: 'Snake',
  午时: 'Horse',
  未时: 'Goat',
  申时: 'Monkey',
  酉时: 'Rooster',
  戌时: 'Dog',
  亥时: 'Pig',
}

export function localizeShichen(name: string, locale: Locale): string {
  switch (locale) {
    case 'zh-Hans':
      return name
    case 'zh-Hant':
      return ZH_HANT[name] ?? name
    case 'ja':
      return JA[name] ?? name
    case 'en':
      return EN[name] ?? name
    default:
      return name
  }
}

/** Wall-clock range hints for the glossary 时辰 wheel hub. */
const RANGE_EN: Record<string, string> = {
  子时: '11pm – 1am',
  丑时: '1am – 3am',
  寅时: '3am – 5am',
  卯时: '5am – 7am',
  辰时: '7am – 9am',
  巳时: '9am – 11am',
  午时: '11am – 1pm',
  未时: '1pm – 3pm',
  申时: '3pm – 5pm',
  酉时: '5pm – 7pm',
  戌时: '7pm – 9pm',
  亥时: '9pm – 11pm',
}

const RANGE_JA: Record<string, string> = {
  子时: '23:00 – 01:00',
  丑时: '01:00 – 03:00',
  寅时: '03:00 – 05:00',
  卯时: '05:00 – 07:00',
  辰时: '07:00 – 09:00',
  巳时: '09:00 – 11:00',
  午时: '11:00 – 13:00',
  未时: '13:00 – 15:00',
  申时: '15:00 – 17:00',
  酉时: '17:00 – 19:00',
  戌时: '19:00 – 21:00',
  亥时: '21:00 – 23:00',
}

export function localizeShichenRange(name: string, canonicalRange: string, locale: Locale): string {
  switch (locale) {
    case 'en':
      return RANGE_EN[name] ?? canonicalRange
    case 'ja':
      return RANGE_JA[name] ?? canonicalRange
    case 'zh-Hant': {
      const hant = ZH_HANT[name] ?? name
      return canonicalRange.replace(/时/g, '時')
    }
    default:
      return canonicalRange
  }
}
