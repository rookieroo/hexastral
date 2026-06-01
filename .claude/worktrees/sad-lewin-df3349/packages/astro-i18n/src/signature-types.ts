/**
 * @zhop/astro-i18n — archetype signature types.
 *
 * The "signature" is the 2-3 token line displayed beneath the user's name in
 * the Fate tab and report header — e.g. "Blazing Sun · Empire Star · Blade".
 * It compresses the four canonical inputs (day-master + strength, ziwei main
 * star, dominant ten-god) into a localized, human-readable identity badge.
 */

import type { Locale } from './types'

/** Day-master heavenly stem — 10 values. */
export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** Day-master strength bucket. */
export type DayMasterStrength = '极强' | '偏强' | '中和' | '偏弱' | '极弱'

/** Ten-gods canonical names. */
export type TenGod =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '正财'
  | '偏财'
  | '正官'
  | '七杀'
  | '正印'
  | '偏印'

/**
 * Ziwei 命宫 main star (14 values). Plus '空宫' (empty palace) when none.
 * Empty palace falls back to the day-master archetype as primary; signature
 * still renders without secondary.
 */
export type ZiweiMainStar =
  | '紫微'
  | '天机'
  | '太阳'
  | '武曲'
  | '天同'
  | '廉贞'
  | '天府'
  | '太阴'
  | '贪狼'
  | '巨门'
  | '天相'
  | '天梁'
  | '七杀'
  | '破军'
  | '空宫'

export interface SignatureInput {
  dayMasterStem: Stem
  dayMasterStrength: DayMasterStrength
  ziweiPalaceStar: ZiweiMainStar | null
  dominantTenGod: TenGod | null
  locale: Locale
}

export interface SignatureOutput {
  /** Ordered tokens for rendering: [primary, secondary, tertiary]. Length 1–3. */
  tokens: string[]
  /** Render hint — CJK locales pack tokens onto one row; Latin/Thai stack them. */
  display: 'compact' | 'stacked'
  /** Primary archetype (always present). */
  primary: string
  /** Secondary archetype (ziwei star), or null if 空宫 / unavailable. */
  secondary: string | null
}

/** A locale's archetype dictionary — pure data, hand-curated, no LLM. */
export interface SignatureDictionary {
  /** Day-master archetype keyed by stem. Strength modifies the descriptor, see strengthDescriptor. */
  dayMasterArchetype: Record<Stem, string>
  /** Optional per-(stem,strength) override; falls back to dayMasterArchetype[stem]. */
  dayMasterByStrength?: Partial<Record<Stem, Partial<Record<DayMasterStrength, string>>>>
  /** Ziwei main-star archetype. */
  ziweiArchetype: Record<ZiweiMainStar, string>
  /** Ten-god archetype (used as tertiary token when dominant ten-god is known). */
  tenGodArchetype: Record<TenGod, string>
}
