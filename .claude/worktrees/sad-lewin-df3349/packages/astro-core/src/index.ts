/**
 * @zhop/astro-core — 天文历法核心库
 *
 * 所有术数（周易、八字、紫微斗数、风水）共享的基础计算层。
 *
 * 模块:
 * - ganzhi:     天干地支、四柱排盘
 * - jieqi:      二十四节气
 * - lunar:      农历公历转换
 * - solar-time: 真太阳时修正
 * - shichen:    十二时辰
 * - constants:  五行、方位、纳音等基础常量
 */

// Types
export type {
  DateTimeInput,
  EarthlyBranch,
  FourPillars,
  GanZhi,
  HeavenlyStem,
  JieQi,
  LunarDate,
  ShiChen,
  TrueSolarTime,
  WuXing,
  YinYang,
} from './types'

// 天干地支
export {
  dayGanZhi,
  ganZhiFromIndex,
  getBranch,
  getFourPillars,
  getNaYin,
  getStem,
  hourGanZhi,
  makeGanZhi,
  monthGanZhi,
  toJulianDay,
  yearGanZhi,
  yearZodiac,
} from './ganzhi'

// 十二时辰
export {
  allShiChen,
  getCurrentShiChen,
  getFullShiChen,
  getShiChen,
  getShiChenGanZhi,
  shiChenByBranch,
} from './shichen'

// 二十四节气
export {
  findJieQi,
  getAllJie,
  getCalendarYMDInTimeZone,
  getJieQiDay,
  getMonthByJie,
  getMonthJieQi,
  getNearestJieQi,
  getNearestJieQiForGregorianDate,
  getYearJieQi,
} from './jieqi'

// 农历
export {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  getLunarNewYear,
  getLunarYearDays,
  lunarToSolar,
  solarToLunar,
} from './lunar'

// 真太阳时
export {
  CITY_LONGITUDES,
  equationOfTime,
  getCityLongitude,
  getTrueSolarHour,
  getTrueSolarTime,
} from './solar-time'

// 基础常量
export {
  BRANCH_WUXING,
  BRANCH_YINYANG,
  BRANCH_ZODIAC,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  JIEQI_ORDER,
  JIEQI_TABLE,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
  MONTH_JIE,
  SEXAGENARY_CYCLE,
  SHI_CHEN_TABLE,
  STEM_WUXING,
  STEM_YINYANG,
  WUXING_GENERATE,
  WUXING_OVERCOME,
} from './constants'

// 十神 (BaZi)
export type {
  ShiShen,
  ShiShenCategory,
  ShiShenInfo,
  FourPillarsShiShen,
} from './shishen'

export {
  BRANCH_HIDDEN_STEMS,
  getShiShen,
  getFourPillarsShiShen,
  countShiShen,
  analyzeShiShenStrength,
} from './shishen'

// 格局分析 (BaZi)
export type { GeJuType, GeJuAnalysis } from './geju'

export {
  calculateDayMasterStrength,
  analyzeGeJu,
} from './geju'

// 调候用神 (BaZi)
export type { TiaohouResult } from './tiaohou'

export {
  getTiaohou,
  hasTiaohouGod,
} from './tiaohou'

// 合化冲 (BaZi)
export type {
  BranchClash,
  BranchCombination,
  CombinationAnalysis,
  CombinationStatus,
  StemCombination,
} from './combinations'

export {
  analyzeBranchClashes,
  analyzeBranchCombinations,
  analyzeCombinations,
  analyzeStemCombinations,
} from './combinations'

// Geo-Time Engine (全球真太阳時 + 南半球置换)
export type {
  CityGeoInfo,
  GlobalSolarTimeResult,
  HemisphereAdjustmentResult,
} from './geo-time'

export {
  applySouthernHemisphereAdjustment,
  calcGlobalTrueSolarTime,
  getTimezoneOffset,
  getSouthernMonthBranch,
  GLOBAL_CITIES,
  isSouthernHemisphere,
  searchCity,
} from './geo-time'

// 四化结构化 (紫微)
export type {
  SiHuaType,
  SiHuaAbbr,
  StarSiHua,
  SiHuaGroup,
  YearlySiHuaResult,
} from './sihua'

export {
  getSiHua,
  getYearlySiHua,
  parseMutagen,
  findStarSiHua,
  annotateSiHua,
} from './sihua'

// 大运 (Major Fortune Timeline)
export type {
  Gender,
  DaYunStep,
  StartAgeDetail,
  DaYunResult,
  LiuNianInfo,
  TimelineEntry,
} from './dayun'

export {
  calculateDaYun,
  getDaYunDirection,
  getDaYunAtAge,
  getDaYunAtYear,
  getLiuNian,
  getLiuNianRange,
  buildTimeline,
  formatDaYunForPrompt,
} from './dayun'

// 核心神煞 (Shen Sha)
export type {
  ShenShaType,
  ShenShaPolarity,
  ShenShaItem,
  ShenShaAnalysis,
} from './shensha'

export {
  getTianYiGuiRen,
  getWenChangGuiRen,
  getTaoHua,
  getYiMa,
  getHuaGai,
  getJiangXing,
  getJieSha,
  getWangShen,
  analyzeShenSha,
  formatShenShaForPrompt,
} from './shensha'

// 八字合婚 (Marriage Compatibility)
export type {
  WuXingRelation,
  BranchRelation,
  DimensionScore,
  HeHunResult,
} from './hehun'

export {
  getWuXingRelation,
  getBranchRelation,
  calculateHeHun,
  formatHeHunForPrompt,
} from './hehun'

// 纳甲六爻装卦引擎
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
} from './liuyao'

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
  NAJIA_TABLE,
  TRIGRAM_PAIR_TO_HEXAGRAM,
} from './liuyao'

// 流日感应 — Daily Synastry
export type { SynastryResult } from './synastry'
export { calculateDailySynastry } from './synastry'

// 个人日运评分 — Daily Fortune
export type { DailyFortuneResult } from './daily'
export { calculateDailyFortune } from './daily'
