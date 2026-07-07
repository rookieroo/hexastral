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
 * - feng/*:     风水 — 二十四山、玄空飞星、八宅
 */

// 黄历通书 (Daily Almanac) — 干支宜忌 + 建除十二神 + 二十八宿 + 日冲煞
export type {
  DailyAlmanac,
  DayClash,
  DayGod,
  DayGodName,
  DayOfficer,
  ElementRelation,
  Luminary,
  PengZuTaboo,
  PersonalAlmanacOverlay,
  PersonalAlmanacSubject,
  PersonalFit,
  PersonalReasonCode,
  Quadrant,
  TwentyEightMansion,
} from './almanac'
export {
  calculateDailyAlmanac,
  dayClash,
  huangHeiDao,
  jianChu,
  LUMINARY_WEEKDAY,
  OFFICER_YIJI,
  pengZuTaboo,
  personalAlmanacOverlay,
  TWELVE_OFFICERS,
  TWENTY_EIGHT_MANSIONS,
  twentyEightMansions,
} from './almanac'
// 本我中心多关系时间轴 (Bonds Timeline — Kindred BT.1, ADR-0014)
export type {
  BondInput,
  ComposeBondsLiuYueOptions,
  ComposeBondsTimelineOptions,
  MergedBondRef,
  MergedNode,
  MergedNotification,
} from './bonds-timeline'
export { composeBondsLiuYue, composeBondsTimeline } from './bonds-timeline'
// 合化冲 (BaZi)
export type {
  BranchClash,
  BranchCombination,
  CombinationAnalysis,
  CombinationStatus,
  IncomingBranchInteraction,
  IncomingBranchInteractionKind,
  StemCombination,
} from './combinations'
export {
  analyzeBranchAgainstNatal,
  analyzeBranchClashes,
  analyzeBranchCombinations,
  analyzeCombinations,
  analyzeStemCombinations,
} from './combinations'
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
// 个人日运评分 — Daily Fortune
export type { DailyFortuneResult } from './daily'
export { calculateDailyFortune } from './daily'
// 大运 (Major Fortune Timeline)
export type {
  DaYunResult,
  DaYunStep,
  DayunRow,
  Gender,
  LiuNianInfo,
  LiunianRow,
  LiuyueRow,
  PillarUnit,
  StartAgeDetail,
  TimelineEntry,
  TimelinePillars,
} from './dayun'
export {
  buildTimeline,
  calculateDaYun,
  computeBaziPillars,
  computeDayun,
  computeLiunian,
  computeLiuyue,
  formatDaYunForPrompt,
  getDaYunAtAge,
  getDaYunAtYear,
  getDaYunDirection,
  getLiuNian,
  getLiuNianRange,
  stemElement,
} from './dayun'
// 风水 — 八宅 (Ba Zhai)
export type {
  BaZhaiFit,
  BaZhaiInput,
  BaZhaiResult,
  DirectionKind,
  DirectionVerdict,
  EastWest,
  FurniturePlacement,
  HouseDirections,
  LuckyKind,
  MingGua,
  UnluckyKind,
  ZhaiMingConcord,
} from './feng/ba-zhai'
export {
  baZhaiFit,
  computeBaZhai,
  dateToMingGuaYear,
  eastWestGroup,
  furniturePlacement,
  houseDirections,
  houseGuaFromSit,
  luckyDirections,
  mingGuaForYearGender,
  unluckyDirections,
  zhaiMingConcord,
} from './feng/ba-zhai'
// 风水 — 玄空飞星 (Flying Stars)
export type {
  FlyingStarsInput,
  FlyingStarsResult,
  NineChart,
  SanYuan,
  StarQuality,
  YuanYun,
  YuanYunInfo,
} from './feng/flying-stars'
export {
  annualCenterStar,
  annualChart,
  classifyStar,
  computeFlyingStars,
  dateToFlyingYear,
  facingChart,
  facingChartReplaced,
  fillChartFromCenter,
  isProsperous,
  monthlyCenterStar,
  monthlyChart,
  mountainChart,
  mountainChartReplaced,
  NINE_CHART_KEYS,
  periodChart,
  REPLACEMENT_STAR,
  wrapStar,
  yuanYunForYear,
} from './feng/flying-stars'
export type {
  CombinationDomain,
  PalaceCombination,
  StarCombination,
} from './feng/flying-stars-combinations'
export {
  describePalaceCombination,
  lookupCombination,
} from './feng/flying-stars-combinations'
export type {
  DetectPatternsInput,
  FlyingStarPattern,
  FlyingStarPatternKind,
} from './feng/flying-stars-patterns'
export { detectPatterns } from './feng/flying-stars-patterns'
export type {
  FormByPalace,
  FormLiInput,
  FormLiResult,
  FormLiVerdict,
  PalaceForm,
  PalaceFormLi,
  PatternRescue,
  ZhengLingShen,
} from './feng/form-li'
export { correlateFormAndStars, emptyFormByPalace } from './feng/form-li'
// 风水 — 产品级常量 (upload cap, shared client + server)
export { MAX_FLOORPLAN_IMAGES } from './feng/constants'
// 风水 — 二十四山 (24 Mountains)
export type {
  BaguaPalace,
  Cardinal,
  Mountain,
  MountainName,
  SanYuanDragon,
} from './feng/twenty-four-mountains'
export {
  isCompoundFacing,
  LUOSHU_TO_PALACE,
  mountainAtDegree,
  normalizeDegree,
  PALACE_CENTERS,
  PALACE_LUOSHU,
  PALACE_TO_CARDINAL,
  palaceAtDegree,
  sitMountainForFacing,
  TWENTY_FOUR_MOUNTAINS,
} from './feng/twenty-four-mountains'
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
// 格局分析 (BaZi)
export type { GeJuAnalysis, GeJuType } from './geju'
export {
  analyzeGeJu,
  calculateDayMasterStrength,
} from './geju'
// Geo-Time Engine (全球真太阳時 + 南半球置换 + 出生时刻解析)
export type {
  BirthHourInput,
  BirthTimeMode,
  CityGeoInfo,
  GlobalSolarTimeResult,
  HemisphereAdjustmentResult,
  ResolvedBirthHour,
} from './geo-time'
export {
  applySouthernHemisphereAdjustment,
  calcGlobalTrueSolarTime,
  GLOBAL_CITIES,
  getSouthernMonthBranch,
  getTimezoneOffset,
  isSouthernHemisphere,
  resolveBirthHour,
  searchCity,
  shichenMidpointHour,
  timeIndexFromHour,
} from './geo-time'
// 八字合婚 (Marriage Compatibility)
export type {
  BranchRelation,
  DimensionScore,
  HeHunResult,
  WuXingRelation,
} from './hehun'
export {
  calculateHeHun,
  formatHeHunForPrompt,
  getBranchRelation,
  getWuXingRelation,
} from './hehun'
// 二十四节气
export {
  findJieQi,
  getAllJie,
  getCalendarYMDInTimeZone,
  getJieQiDay,
  getJieQiInstant,
  getMonthByJie,
  getMonthJieQi,
  getNearestJieQi,
  getNearestJieQiForGregorianDate,
  getYearJieQi,
} from './jieqi'
// 纳甲六爻装卦引擎
export type {
  FullHexagram,
  LiuQin,
  LiuShen,
  NaJiaHexagramData,
  PalaceName,
  WangXiu,
  YaoIndex,
  YaoLine,
  YaoValue,
} from './liuyao'
export {
  assembleHexagram,
  calcDerivedHexagram,
  calcKongWang,
  calcLiuQin,
  calcLiuShen,
  calcNuclearHexagram,
  calcWangXiu,
  formatHexagramForPrompt,
  getXunKong,
  isChangingYao,
  lookupByName,
  lookupHexagram,
  NAJIA_TABLE,
  TRIGRAM_PAIR_TO_HEXAGRAM,
  yaoToYinYang,
} from './liuyao'
// 农历
export type { Rokuyo, RokuyoName } from './lunar'
export {
  getLeapMonth,
  getLeapMonthDays,
  getLunarMonthDays,
  getLunarNewYear,
  getLunarYearDays,
  getRokuyo,
  lunarToSolar,
  solarToLunar,
} from './lunar'
// Period signals — per-period 命理 forces (用神/忌神/六冲/桃花) for timeline 印证 + make-if grounding
export {
  type FavoredMove,
  favoredMove,
  type LifeEventCategory,
  type MoveArchetype,
  type MoveWindow,
  type PeriodInput,
  type PeriodSignals,
  periodSignals,
  type RankedMoveWindow,
  type RetrodictionMatch,
  type RetrodictionSignals,
  rankWindowsForMove,
  retrodictionMatch,
  type SignalKey,
  type TimeableMove,
} from './period-signals'
// 关系决策推演 (Relationship Make-If — Kindred Workstream B)
export type {
  DecisionLean,
  RelDecisionResult,
  RelDecisionWindow,
  RelDecisionYear,
  RelDecisionYearOptions,
  RelDecisionYearResult,
  RelMakeIfOptions,
} from './relationship-makeif'
export {
  planRelationshipDecision,
  planRelationshipDecisionByYear,
  relationshipYongshen,
} from './relationship-makeif'
// 关系命运时间轴 (Relationship Timeline — Kindred B-yuan.1)
export type {
  RelationshipPerson,
  RelationshipTimelineNode,
  RelLiuYueOptions,
  RelNodeSignificance,
  RelNotificationOptions,
  RelTimelineNodesOptions,
  RelTimelineNodeType,
  RelTimelineNotification,
} from './relationship-timeline'
export {
  getRelationshipLiuYueNodes,
  getRelationshipTimelineNodes,
  getRelationshipTimelineNotifications,
} from './relationship-timeline'
// 核心神煞 (Shen Sha)
export type {
  ShenShaAnalysis,
  ShenShaItem,
  ShenShaPolarity,
  ShenShaType,
} from './shensha'
export {
  analyzeShenSha,
  formatShenShaForPrompt,
  getHuaGai,
  getJiangXing,
  getJieSha,
  getTaoHua,
  getTianYiGuiRen,
  getWangShen,
  getWenChangGuiRen,
  getYiMa,
} from './shensha'
// 十二时辰
export {
  allShiChen,
  getCurrentShiChen,
  getFullShiChen,
  getShiChen,
  getShiChenGanZhi,
  shiChenByBranch,
} from './shichen'
// 十神 (BaZi)
export type {
  FourPillarsShiShen,
  ShiShen,
  ShiShenCategory,
  ShiShenInfo,
} from './shishen'
export {
  analyzeShiShenStrength,
  BRANCH_HIDDEN_STEMS,
  countShiShen,
  getFourPillarsShiShen,
  getShiShen,
} from './shishen'
// 四化结构化 (紫微)
export type {
  SiHuaAbbr,
  SiHuaGroup,
  SiHuaType,
  StarSiHua,
  YearlySiHuaResult,
} from './sihua'
export {
  annotateSiHua,
  findStarSiHua,
  getSiHua,
  getYearlySiHua,
  parseMutagen,
} from './sihua'
// 太阳视黄经（节气底层天文算法）
export {
  apparentSolarLongitude,
  dateToJulianDay,
  deltaTSeconds,
  julianDayToDate,
  solarLongitudeCrossing,
} from './solar-longitude'
// 真太阳时
export {
  CITY_LONGITUDES,
  equationOfTime,
  getCityLongitude,
  getTrueSolarHour,
  getTrueSolarTime,
} from './solar-time'
// 流日感应 — Daily Synastry
export type { SynastryResult } from './synastry'
export { calculateDailySynastry } from './synastry'
// 调候用神 (BaZi)
export type { TiaohouResult } from './tiaohou'
export {
  getTiaohou,
  hasTiaohouGod,
} from './tiaohou'
// 命运时间轴节点 (Fate Timeline — ADR-0012 fate subscription value)
export type {
  NodeSignificance,
  NotificationOptions,
  TimelineNode,
  TimelineNodesOptions,
  TimelineNodeType,
  TimelineNotification,
} from './timeline'
export { getTimelineNodes, getTimelineNotifications } from './timeline'
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
export type {
  BondCategory,
  ZiweiRelationSignal,
  ZiweiTimingSummary,
  ZiweiTone,
} from './ziwei-timing'
export {
  DEFAULT_BOND_PALACES,
  labelToBondCategory,
  relationshipBondPalaces,
  SOLO_LIFE_PALACES,
  ziweiRelationMonthSignal,
  ziweiRelationYearSignal,
  ziweiSelfMonthSignal,
  ziweiSelfYearSignal,
} from './ziwei-timing'
