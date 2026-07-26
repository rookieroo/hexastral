/**
 * svc-astro 类型定义
 *
 * 核心算力引擎的类型，从 hexastral-api 提取
 */

import type { Ai } from '@cloudflare/workers-types'
import type { SiHuaType } from '@zhop/astro-core'

// ==================== Cloudflare Bindings ====================

export interface Env {
  GEMINI_API_KEY: string
  ENVIRONMENT: string
  /** Cloudflare Workers AI — LLM 兜底 (Tier 2 fallback) */
  AI: Ai
  /** Admin notify service binding — LLM fallback 告警 */
  SVC_ADMIN_NOTIFY: Fetcher
  /** Cloudflare Rate Limiting — 30 req/min defense-in-depth */
  RATE_LIMITER: RateLimit
}

// ==================== 星宫 ===================

/** 性别 */
export type Gender = '男' | '女'

/** 命盘请求参数 */
export interface ChartInput {
  solarDate: string
  timeIndex: number
  gender: Gender
  longitude?: number
  city?: string
  userId: string
}

/** 简化的宫位信息 */
export interface PalaceSummary {
  index: number
  name: string
  heavenlyStem: string
  earthlyBranch: string
  isBodyPalace: boolean
  majorStars: Array<{
    name: string
    brightness: string
    mutagen: string
    siHua: SiHuaType | null
  }>
  minorStars: Array<{
    name: string
    type: string
    brightness?: string
    mutagen?: string
  }>
  decadal: {
    range: [number, number]
    heavenlyStem: string
    earthlyBranch: string
  }
  ages: number[]
}

/** AI 解读结果 (星宫) */
export interface ChartInterpretation {
  overview: string
  career: string
  relationship: string
  wealth: string
  health: string
  currentYear: string
  summary: string
  /** Punchy one-liner for social share card (≤20 chars, no fate claim) */
  shareQuote?: string
}

// ==================== 易经占卜 ====================

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
  /** 变卦 summary when there are changing lines */
  derived?: {
    number: number
    name: string
    pinyin: string
    symbol: string
  }
  /** 互卦 name when available */
  nuclearName?: string
}

export type InterpretationMode = 'classical' | 'ai'

/** Structured 装卦 desk — primary UI, not a prompt dump. */
export interface LiuyaoDeskLine {
  index: number
  ganZhi: string
  liuQin: string
  liuShen: string
  wangXiu: string
  isChanging: boolean
  isShiYao: boolean
  isYingYao: boolean
  isEmpty: boolean
}

export interface LiuyaoDesk {
  benName: string
  benPalace: string
  bianName?: string
  bianPalace?: string
  huName?: string
  shiLine: number
  yingLine: number
  /** Display order: 上爻 → 初爻 */
  lines: LiuyaoDeskLine[]
}

export interface ClassicalReadingDetail {
  judgment: string
  image: string
  lines: string[]
  changingLineTexts: string[]
  naJiaContext?: string
  desk?: LiuyaoDesk
}

export interface DivinationReading {
  /** When true, LLM refused under 三不占 — no interpretation should be shown as a reading. */
  refused?: boolean
  refusal_reason?: string
  interpretationMode: InterpretationMode
  classical?: ClassicalReadingDetail
  hexagram: HexagramResult
  /** Structured 本/变/互 + 装卦表 for client desk UI */
  desk?: LiuyaoDesk
  interpretation: string
  advice: string
  summary: string
  fortune: 'great-fortune' | 'fortune' | 'neutral' | 'caution' | 'misfortune'
}
