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

export type {
  AlmanacResult,
  Branch,
  ComputeAlmanacInput,
  DailyHookInput,
  DailyHookResult,
  DayContext,
  Direction,
  EnergyLevel,
  Relation,
  UserStaticTraits,
  WuXing,
} from './almanac/computeAlmanac'
export { computeAlmanac, computeDailyHook } from './almanac/computeAlmanac'
export type { ExplanationDict } from './explain'
export { explainTerm } from './explain'
export { getLocalizedDictionary, labelize, labelizeMany } from './labelize'
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
export type {
  ResolvedTerm,
  SegmentOptions,
  TermCategory,
  TermEntry,
  TermMeaning,
  TermSegment,
} from './terms'
export {
  getAllTerms,
  getTerm,
  getTermByZh,
  getTermCategoryLabel,
  getTermsByCategory,
  resolveTermMeaning,
  segmentTextByTerms,
  TERM_CATEGORY_ORDER,
} from './terms'
export type { Dictionary, Locale, TokenCategory } from './types'
