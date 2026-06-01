/**
 * Report type registry — maps each reading kind to its visual config.
 *
 * Combines gradient, overlay pattern, seal placement, and icon hint
 * into one lookup. Both iOS and web renderers consume this to produce
 * consistent report card backgrounds.
 */

import type { ReportGradient, SealPlacement } from './gradients'
import {
  annualGradient,
  careerGradient,
  chartCardGradient,
  constellationGradient,
  dailyFortuneGradient,
  decadalGradient,
  defaultSealPlacement,
  fateGradient,
  synastryGradient,
  wealthGradient,
} from './gradients'
import { cinnabar, ink } from './palette'

// ── Report types ─────────────────────────────────────────────────────────────

export type ReportType =
  | 'fate' // 天命解读 (命格 + 星宫双盘合參)
  | 'decadal' // 大运
  | 'annual' // 流年
  | 'love' // 爱情 / 合盘
  | 'wealth' // 财运
  | 'career' // 事业 / 仕途
  | 'daily-fortune' // 每日推送
  | 'constellation' // 关系图谱
  | 'chart-card' // 命盘公开卡

export interface ReportVisualConfig {
  gradient: ReportGradient
  seal: SealPlacement
  /** Accent color used for key metrics / headlines in this report. */
  accentColor: string
  /** Optional secondary tint for decorative elements. */
  tintColor?: string
  /** Machine-readable icon hint (maps to Lucide icon name on each platform). */
  iconHint: string
  /** CJK short label for watermarks / seal text. */
  sealText: string
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const REPORT_CONFIGS: Record<ReportType, ReportVisualConfig> = {
  fate: {
    gradient: fateGradient,
    seal: { ...defaultSealPlacement, rotation: -8, opacity: 0.65 },
    accentColor: ink.gold,
    tintColor: 'rgba(196,168,130,0.12)',
    iconHint: 'sparkles',
    sealText: '命',
  },
  decadal: {
    gradient: decadalGradient,
    seal: { ...defaultSealPlacement, rotation: -3 },
    accentColor: ink.gold,
    iconHint: 'hourglass',
    sealText: '大运',
  },
  annual: {
    gradient: annualGradient,
    seal: { ...defaultSealPlacement, rotation: -7, opacity: 0.6 },
    accentColor: ink.gold,
    iconHint: 'calendar',
    sealText: '流年',
  },
  love: {
    gradient: synastryGradient,
    seal: {
      ...defaultSealPlacement,
      color: cinnabar.muted,
      rotation: 2,
      opacity: 0.8,
    },
    accentColor: cinnabar.bright,
    tintColor: 'rgba(192,57,43,0.15)',
    iconHint: 'heart',
    sealText: '合',
  },
  wealth: {
    gradient: wealthGradient,
    seal: { ...defaultSealPlacement, rotation: -4 },
    accentColor: '#D4AF37',
    tintColor: ink.goldMuted,
    iconHint: 'coins',
    sealText: '财',
  },
  career: {
    gradient: careerGradient,
    seal: { ...defaultSealPlacement, rotation: 0, opacity: 0.6 },
    accentColor: ink.gold,
    iconHint: 'mountain',
    sealText: '仕',
  },
  'daily-fortune': {
    gradient: dailyFortuneGradient,
    seal: {
      ...defaultSealPlacement,
      sizeFrac: 0.06,
      opacity: 0.5,
      x: 0.92,
      y: 0.04,
    },
    accentColor: ink.gold,
    iconHint: 'sun',
    sealText: '日',
  },
  constellation: {
    gradient: constellationGradient,
    seal: {
      ...defaultSealPlacement,
      sizeFrac: 0.06,
      opacity: 0.4,
    },
    accentColor: ink.gold,
    iconHint: 'users',
    sealText: '缘',
  },
  'chart-card': {
    gradient: chartCardGradient,
    seal: {
      ...defaultSealPlacement,
      sizeFrac: 0.1,
      opacity: 0.75,
      rotation: -2,
    },
    accentColor: ink.gold,
    tintColor: ink.goldMuted,
    iconHint: 'compass',
    sealText: '命',
  },
}

/** Look up report visual config by type. */
export function getReportConfig(type: ReportType): ReportVisualConfig {
  return REPORT_CONFIGS[type]
}
