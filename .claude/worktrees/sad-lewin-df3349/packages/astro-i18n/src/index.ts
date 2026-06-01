/**
 * @zhop/astro-i18n
 *
 * Pure-data dictionary package that translates canonical Chinese metaphysics
 * tokens (天干, 地支, 五行, 十神, 格局, 神煞, 紫微星, 四化, 亮度, 12宫, 时辰)
 * into target-locale strings.
 *
 * @example
 *   import { labelize } from '@zhop/astro-i18n'
 *   labelize('shishen', '正官', 'en')   // → 'Direct Officer'
 *   labelize('palace', '财帛', 'zh-Hant') // → '財帛'
 *   labelize('brightness', '庙', 'en')   // → 'Temple'
 *
 *   import { labelizeMany } from '@zhop/astro-i18n'
 *   labelizeMany('element', ['木', '火'], 'en') // → ['Wood', 'Fire']
 */
export { getLocalizedDictionary, labelize, labelizeMany } from './labelize'
export { explainTerm } from './explain'
export type { ExplanationDict } from './explain'
export type { Dictionary, Locale, TokenCategory } from './types'
export { signature } from './signature'
export type {
  DayMasterStrength,
  SignatureDictionary,
  SignatureInput,
  SignatureOutput,
  Stem,
  TenGod,
  ZiweiMainStar,
} from './signature-types'
export { computeAlmanac } from './almanac/computeAlmanac'
export type {
  AlmanacResult,
  ComputeAlmanacInput,
  DayContext,
  Direction,
  EnergyLevel,
  Relation,
  UserStaticTraits,
  WuXing,
  Branch,
} from './almanac/computeAlmanac'
