/**
 * 紫微 timing signals for the relationship living layer (ADR-0014 P5).
 *
 * The 合盘 report already computes each person's 紫微 chart (iztro, in svc-astro)
 * and persists a compact per-person summary. This module is the PURE, deterministic
 * half: given two persisted summaries + a year/month, does 紫微 ALSO flag that
 * window as relationship-relevant? It reuses the report's known 紫微 info so the
 * timeline + what-if can fold a second-system signal into their ranking WITHOUT a
 * fresh LLM call and WITHOUT recomputing the charts (no iztro here).
 *
 * The rule mirrors the report prompt's "两套系统不约而同 → 可信度更高": when 八字
 * marks a turning point AND 紫微 also lights a bond palace that year, the node is
 * higher-confidence. 八字 stays the deterministic spine; 紫微 only corroborates.
 */

import { getSiHua, getYearlySiHua } from './sihua'
import type { HeavenlyStem } from './types'

/**
 * The minimal slice of a person's 紫微 chart needed for timing corroboration: a
 * map from each major star to the palace it sits in. The persisted `ZiweiSummary`
 * (svc-astro) is a structural superset of this, so a stored summary passes as-is.
 */
export interface ZiweiTimingSummary {
  /** Major-star name → its natal palace (命宫 / 夫妻 / 福德 / …). */
  starToPalace: Record<string, string>
}

export type ZiweiTone = 'harmony' | 'tension' | 'growth' | 'neutral'

/** Palaces that make a window relationship-relevant: the self, the bond, the heart. */
const BOND_PALACES = ['命宫', '夫妻', '福德'] as const

const SIHUA_TONE = {
  化禄: 'harmony',
  化科: 'harmony',
  化权: 'growth',
  化忌: 'tension',
} as const

export interface ZiweiRelationSignal {
  /** True when at least one person's bond palace is lit this window. */
  significant: boolean
  tone: ZiweiTone
  /** How many bond-palace landings fired (both people, all four 化). */
  hitCount: number
}

/** Aggregate a list of 四化 hits (by tone) into a single signal. */
function toSignal(tones: ZiweiTone[]): ZiweiRelationSignal {
  if (tones.length === 0) return { significant: false, tone: 'neutral', hitCount: 0 }
  const score = tones.reduce((a, t) => a + (t === 'harmony' ? 1 : t === 'tension' ? -1 : 0), 0)
  const tone: ZiweiTone = score > 0 ? 'harmony' : score < 0 ? 'tension' : 'growth'
  return { significant: true, tone, hitCount: tones.length }
}

/** Do the given 四化 stars land in either person's bond palaces? */
function landings(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  stars: ReadonlyArray<{ starName: string; type: keyof typeof SIHUA_TONE }>
): ZiweiTone[] {
  const tones: ZiweiTone[] = []
  for (const summ of [a, b]) {
    for (const s of stars) {
      const palace = summ.starToPalace[s.starName]
      if (palace && (BOND_PALACES as readonly string[]).includes(palace)) {
        tones.push(SIHUA_TONE[s.type])
      }
    }
  }
  return tones
}

/**
 * 紫微 流年 corroboration: does this YEAR's 流年四化 light either person's bond
 * palace? Pure — reads only the persisted `starToPalace` maps + the year 四化 table.
 */
export function ziweiRelationYearSignal(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  year: number
): ZiweiRelationSignal {
  const stars = getYearlySiHua(year).sihua.all
  return toSignal(landings(a, b, stars))
}

/**
 * 紫微 流月 corroboration: derive this MONTH's 四化 from its 流月天干 and check the
 * same bond-palace landings. Used by what-if to weight a monthly window.
 */
export function ziweiRelationMonthSignal(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  monthStem: HeavenlyStem
): ZiweiRelationSignal {
  const stars = getSiHua(monthStem).all
  return toSignal(landings(a, b, stars))
}
