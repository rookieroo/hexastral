/**
 * @zhop/astro-core — 纳甲六爻装卦引擎
 *
 * 将六爻值(6/7/8/9)完整装配为专业六爻卦:
 * 纳甲干支、六亲、六神、世应、旺衰、空亡、互卦、变卦
 */

// Types
export type {
  YaoLine,
  YaoIndex,
  YaoValue,
  LiuQin,
  LiuShen,
  WangXiu,
  PalaceName,
  NaJiaHexagramData,
  FullHexagram,
} from './types'

// Engine
export {
  assembleHexagram,
  lookupHexagram,
  lookupByName,
  yaoToYinYang,
  isChangingYao,
  calcLiuQin,
  calcLiuShen,
  calcWangXiu,
  calcKongWang,
  getXunKong,
  calcNuclearHexagram,
  calcDerivedHexagram,
  formatHexagramForPrompt,
} from './engine'

// Data
export { NAJIA_TABLE, TRIGRAM_PAIR_TO_HEXAGRAM } from './najia-table'
