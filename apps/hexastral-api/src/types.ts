/**
 * HexAstral 统一 API 类型定义
 *
 * 合并自 stellar-api, fengshui-api, yiching-api
 * 纯领域类型（business types），不含 Cloudflare Workers 基础设施类型。
 * 基础设施类型（AppEnv, CloudflareBindings, AppDb 等）在 infra-types.ts 中定义。
 */

import type { SiHuaType } from '@zhop/astro-core'

// ==================== 星宫命理 ====================

/** 性别 */
export type Gender = '男' | '女'

/** 命盘请求参数 */
export interface ChartInput {
  /** 公历出生日期 YYYY-M-D */
  solarDate: string
  /** 时辰序号 0-12（0=早子时, 1=丑, ..., 12=晚子时） */
  timeIndex: number
  /** 性别 */
  gender: Gender
  /** 经度（可选, 用于真太阳时修正） */
  longitude?: number
  /** 出生城市（可选, 用于查经度） */
  city?: string
  /** 用户 ID */
  userId: string
}

/** 简化的宫位信息（返回给客户端） */
export interface PalaceSummary {
  /** 宫位序号 0-11 */
  index: number
  /** 宫位名称 */
  name: string
  /** 天干 */
  heavenlyStem: string
  /** 地支 */
  earthlyBranch: string
  /** 是否身宫 */
  isBodyPalace: boolean
  /** 主星 */
  majorStars: Array<{
    name: string
    brightness: string
    /** 原始四化字符串 (legacy, 供 prompt 使用) */
    mutagen: string
    /** 结构化四化类型 */
    siHua?: SiHuaType | null
  }>
  /** 辅星 */
  minorStars: Array<{
    name: string
    type: string
    brightness?: string
    mutagen?: string
  }>
  /** 大限范围 */
  decadal: {
    range: [number, number]
    heavenlyStem: string
    earthlyBranch: string
  }
  /** 小限年龄列表 */
  ages: number[]
}

/** AI 解读结果 (星宫) */
export interface ChartInterpretation {
  /** 总体命格评述 */
  overview: string
  /** 事业运 */
  career: string
  /** 感情运 */
  relationship: string
  /** 财运 */
  wealth: string
  /** 健康 */
  health: string
  /** 近期运势（流年） */
  currentYear: string
  /** 一句话总结 */
  summary: string
}

// ==================== 易经占卜 ====================

/** 卦象结果 */
export interface HexagramResult {
  number: number
  name: string
  pinyin: string
  symbol: string
  upperTrigram: string
  lowerTrigram: string
  judgment: string
  image: string
  changingLines: number[]
}

/** AI 解卦结果 */
export interface DivinationReading {
  id: string
  hexagram: HexagramResult
  interpretation: string
  advice: string
  summary: string
  fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'
  method?: 'liuyao' | 'meihua'
}

/** 占卜历史记录 */
export interface DivinationRecord {
  id: string
  userId: string
  question: string
  hexagramNumber: number
  hexagramName: string
  changingLines: string | number[]
  interpretation: string
  advice: string
  summary: string
  fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'
  method?: 'liuyao' | 'meihua'
  entropySource: string | null
  bookmarked: boolean
  rating: number | null
  createdAt: string
}

/** 占卜详情（含完整卦象） */
export interface DivinationDetail extends DivinationRecord {
  changingLines: number[]
  hexagramData: HexagramData | null
}

/** 完整卦象数据（64 卦知识库） */
export interface HexagramData {
  number: number
  name: string
  pinyin: string
  symbol: string
  upperTrigram: string
  lowerTrigram: string
  judgment: string
  image: string
  judgmentExplain: string
  keywords: string[]
  fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'
  lines: string[]
}

/** 卦象列表项（精简） */
export interface HexagramListItem {
  number: number
  name: string
  pinyin: string
  symbol: string
  keywords: string[]
  fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'
}

// ==================== 用户 ====================

/** 已登录用户信息 */
export interface User {
  id: string
  email: string | null
  name: string | null
  appleUserId: string | null
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthGender: string | null
  birthCity: string | null
  birthLongitude: string | null
  subscriptionStatus: string
  totalReadings: number
  totalDivinations: number
  totalAnalyses: number
  credits: number
  createdAt: string
  updatedAt: string
}

// ==================== 命格 / 星宫 详细类型 ====================

/** 主星（简化版，不含 siHua） */
export interface MajorStar {
  name: string
  brightness: string
  mutagen: string
}

/** 命盘元数据 */
export interface ChartMeta {
  solarDate: string
  lunarDate: string
  chineseDate: string
  fiveElementsClass: string
  soul: string
  body: string
  sign: string
  zodiac: string
  time: string
  timeRange: string
  earthlyBranchOfSoulPalace: string
  earthlyBranchOfBodyPalace: string
}

/** 完整排盘结果 */
export interface ChartResult {
  id: string
  palaces: PalaceSummary[]
  meta: ChartMeta
  interpretation: ChartInterpretation | null
}

/** 排盘历史记录（列表用） */
export interface ReadingRecord {
  id: string
  chartType: 'stellar' | 'natal'
  solarDate: string
  timeIndex: number
  gender: string
  fiveElementsClass: string | null
  soulPalaceMajorStars: string | null
  bookmarked: boolean
  rating: number | null
  updatedAt: string
  createdAt: string
}

/** 排盘详情 */
export interface ReadingDetail {
  id: string
  solarDate: string
  timeIndex: number
  gender: string
  palaces: PalaceSummary[]
  meta: ChartMeta
  interpretation: ChartInterpretation | null
  bookmarked: boolean
  rating: number | null
  createdAt: string
}

// ==================== 命格类型 ====================

/** 十神 */
export type ShiShen =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '偏财'
  | '正财'
  | '七杀'
  | '正官'
  | '偏印'
  | '正印'

/** 单柱 */
export interface NatalPillar {
  stem: string
  branch: string
  nayin: string
}

/** 单柱十神 */
export interface PillarShiShen {
  stem: ShiShen
  branchMain: ShiShen
  branchMid?: ShiShen
  branchResidue?: ShiShen
}

/** 四柱十神 */
export interface FourPillarsShiShen {
  year: PillarShiShen
  month: PillarShiShen
  day: PillarShiShen
  hour: PillarShiShen
}

/** 格局分析 */
export interface NatalGeJu {
  primary: string
  secondary?: string
  category: string
  dayMasterStrength: string
  favorableElement: string
  unfavorableElement: string
  description: string
}

/** 命格 AI 解读 */
export interface NatalInterpretation {
  overview: string
  personality: string
  career: string
  relationship: string
  wealth: string
  health: string
  luckyYears: string
  advice: string
}

/** 命格完整结果 */
export interface NatalResult {
  id: string
  pillars: {
    year: NatalPillar
    month: NatalPillar
    day: NatalPillar
    hour: NatalPillar
  }
  shishen: FourPillarsShiShen
  geju: NatalGeJu
  dayMaster: string
  interpretation: NatalInterpretation | null
}

/** 命格历史记录 */
export type NatalRecord = ReadingRecord

// ==================== 命运合参类型 (Fate Reading) ====================

/** 命运共识分析 */
export interface FateConsensus {
  overallConfidence: number
  natalSummary: string
  stellarSummary: string
  insights: unknown[]
  fusedConclusion: string
}

/** 命运合参完整结果 */
export interface FateResult {
  id: string
  consensus: FateConsensus
  aiReading: unknown
  natalHighlights: {
    dayMaster: string
    dayMasterWuXing: string
    geju: string
    favorableElement: string
  }
  stellarHighlights: {
    fiveElementsClass: string
    soulPalaceMajorStars: string
  }
  disclaimer: string
  meta: { credits: number; isPro: boolean; creditCost: number }
  createdAt: string
}

/** 命运合参历史记录 */
export interface FateRecord {
  id: string
  queryYear: number
  /** 关联的 userCharts 记录 (chartType='fate' 合盘快照) */
  chartId: string | null
  bookmarked: boolean
  rating: number | null
  createdAt: string
}

/** 命格盘面（命运详情内嵌） */
export interface FateNatalChart {
  pillars: {
    year: NatalPillar
    month: NatalPillar
    day: NatalPillar
    hour: NatalPillar
  }
  shishen?: FourPillarsShiShen
  geju: NatalGeJu
  dayMaster: string
  dayMasterWuXing: string
  nayin?: Record<string, string>
  daYun?: unknown
  shenSha?: unknown
  tiaohou?: { gods: string[]; type: string; satisfied: boolean }
}

/** 星宫盘面（命运详情内嵌） */
export interface FateStellarChart {
  palaces: PalaceSummary[]
  meta: ChartMeta
}

/** 单个神煞警示 (高级提醒节) */
export interface ShenshaWarning {
  name: string
  severity: 'low' | 'medium' | 'high'
  advice: string
}

/** AI 年度解读 — svc-astro shuangpan 输出（Gemini Flash dual-call 结构化部分） */
export interface FateYearReading {
  yearOverview: string
  /** 人格核心 (100-150 chars) — P1 new */
  personalityCore: string
  career: string
  wealth: string
  relationship: string
  health: string
  /** 关键月份提醒：键为月份标签，值为提醒内容 */
  monthlyHighlights: Record<string, string> | string
  /** 大运走势 (100-150 chars) — P1 new */
  decadeArc: string
  /** 高级神煞警示 — P1 new */
  shenshaWarnings: ShenshaWarning[]
  /** Legacy: 年度开运建议 — P1 合并进 decadeArc + advice 可选 */
  advice?: string
  confidence: string
  /** Legacy field — social hook 现迁移到 hooks.socialHooks[0] */
  shareQuote?: string
}

/** AI 创意钩子包 — svc-astro shuangpan dual-call 第二调输出 */
export interface HooksBundle {
  /** “你不知道的三件事” — 80-100 chars each */
  hiddenTraits: string[]
  /** 社交分享金句 — ≤5-25 chars each, 适合截图卡片 */
  socialHooks: string[]
  /** IAP curiosity teaser — ≤5-40 chars each */
  iapCuriosity: string[]
}

/** 命运合参详情 */
export interface FateDetail {
  id: string
  queryYear: number
  /** 关联的 userCharts 记录 (chartType='fate' 合盘快照) */
  chartId: string | null
  /** 出生信息 — 来自关联 userCharts 记录 */
  solarDate: string | null
  timeIndex: number | null
  gender: string | null
  consensus: FateConsensus
  aiReading: FateYearReading | null
  natalChart: FateNatalChart | null
  stellarChart: FateStellarChart | null
  /** Pro-only: 命格 AI 解读 (comes from natal userCharts.interpretationPro) */
  natalInterpretation: NatalInterpretation | null
  /** Pro-only: 星宫 AI 解读 (comes from stellar userCharts.interpretationPro) */
  stellarInterpretation: ChartInterpretation | null
  /** AI 创意钩子包 (Gemini Flash dual-call 第二调) */
  hooks: HooksBundle | null
  bookmarked: boolean
  rating: number | null
  createdAt: string
  /** AI 解读生成时的语言 (BCP-47, e.g. zh-CN, en, ja) */
  language: string
}

// ==================== 合婚类型 ====================

/** 合婚人员信息 */
export interface HehunPerson {
  solarDate: string
  timeIndex: number
  gender: Gender
  name?: string
}

/** 合婚维度 */
export interface HehunDimension {
  name: string
  score: number
  description: string
}

/** 合婚兼容性 */
export interface HehunCompatibility {
  score: number
  grade: string
  gradeLabel: string
  dimensions: HehunDimension[]
  highlights: string[]
  warnings: string[]
  summary: string
}

/** 合婚完整结果 */
export interface HehunResult {
  id: string
  compatibility: HehunCompatibility
  personA: unknown
  personB: unknown
  interpretation: unknown
  disclaimer: string
  meta: { credits: number; isPro: boolean }
  createdAt: string
}

// ==================== 风水面相追加类型 ====================

/** 面相手相类型 */
export type PhysiognomyType = 'face' | 'palm'

/** VLM 第一阶段输出：五官/手相特征描述 */
export interface VLMDescription {
  features: string[]
  observedTraits: string
  quality: 'high' | 'medium' | 'low'
  confidence: number
}

/** 面相 AI 解读结果 */
export interface PhysiognomyInterpretation {
  personalityTraits: string
  careerInsights: string
  wealthPotential: string
  healthIndications: string
  relationshipTendencies: string
  overall: string
  luckyElements?: {
    colors: string[]
    directions: string[]
    numbers: number[]
  }
}

/** 完整面相解读结果 */
export interface PhysiognomyResult {
  id: string
  type: PhysiognomyType
  vlmDescription: VLMDescription
  interpretation: PhysiognomyInterpretation
  createdAt: string
}

// ==================== 基础设施 ====================
// AppEnv, AppDb, CloudflareBindings, ContextVariables 已移至 infra-types.ts
