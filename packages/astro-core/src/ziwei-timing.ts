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

/**
 * 紫微's edge in synastry is that the twelve palaces ARE a relationship map: a
 * parent bond lives in 父母/子女, siblings in 兄弟, friends in 仆役, work in 官禄.
 * So the palaces that make a window "relationship-relevant" depend on the bond's
 * TYPE — not one fixed set. We always keep 命宫 (core self) + 福德 (the heart),
 * then add the palaces this relationship actually inhabits. Tokens match iztro's
 * `starToPalace` values (命宫 is 宫-suffixed; the rest are bare).
 */
export type BondCategory =
  | 'spouse'
  | 'partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'friend'
  | 'colleague'
  | 'boss'

const CORE_PALACES = ['命宫', '福德'] as const

const CATEGORY_PALACES: Record<BondCategory, readonly string[]> = {
  spouse: ['夫妻'],
  partner: ['夫妻'],
  // Family vertical is read from both ends — my 父母 ↔ their 子女 (and vice versa).
  parent: ['父母', '子女'],
  child: ['父母', '子女'],
  sibling: ['兄弟'],
  friend: ['仆役'],
  colleague: ['仆役', '官禄'],
  boss: ['官禄', '父母'],
}

/** Default lens (romantic) — also the back-compat set for callers that pass none. */
export const DEFAULT_BOND_PALACES: readonly string[] = [...CORE_PALACES, '夫妻']

/**
 * Solo life palaces — the lens for a SINGLE person's own timeline / what-if (auspice).
 * Not a relationship; the year is "significant for ME" when its 四化 lights a major
 * life domain: 命宫 (self), 官禄 (career/path), 财帛 (resources), 福德 (heart/fortune),
 * 迁移 (the outer world & moves). Mirrors the 八字 spine's life-phase framing.
 */
export const SOLO_LIFE_PALACES: readonly string[] = ['命宫', '官禄', '财帛', '福德', '迁移']

/** Relationship type → the palaces a year/month must light to count, 命宫/福德 always. */
export function relationshipBondPalaces(category?: BondCategory | null): readonly string[] {
  if (!category) return DEFAULT_BOND_PALACES
  return [...CORE_PALACES, ...CATEGORY_PALACES[category]]
}

/**
 * Normalize a free-text bond label (userBonds.relationshipLabel — 配偶/父母/朋友/…
 * or English) to a {@link BondCategory}. Custom/unknown labels → undefined (the
 * caller then uses the romantic default lens). Substring match, longest intent first.
 */
export function labelToBondCategory(label?: string | null): BondCategory | undefined {
  if (!label) return undefined
  const s = label.trim().toLowerCase()
  const has = (...ks: string[]) => ks.some((k) => s.includes(k))
  // Boss / report-line before generic "同事" (上下级 implies hierarchy).
  if (has('上司', '老板', '领导', '下属', '上下级', 'boss', 'manager')) return 'boss'
  // 合伙人/business partner reads as a work peer (官禄/仆役), not a romantic 'partner'.
  if (
    has(
      '同事',
      '同僚',
      '合伙',
      '合作',
      'colleague',
      'coworker',
      'co-worker',
      'cofounder',
      'business'
    )
  )
    return 'colleague'
  if (has('配偶', '老婆', '老公', '丈夫', '妻', '夫人', 'wife', 'husband', 'spouse'))
    return 'spouse'
  if (has('情侣', '对象', '男友', '女友', '恋人', '伴侣', 'partner', 'boyfriend', 'girlfriend'))
    return 'partner'
  // 长辈/平辈/晚辈 (generational family sub-types) + the concrete kin terms. The
  // axis is what the palace lens cares about: 长辈/晚辈 → the 父母·子女 vertical,
  // 平辈 → 兄弟. (Gender is captured by each person's birth, not the label.)
  if (
    has(
      '父',
      '母',
      '爸',
      '妈',
      '爹',
      '娘',
      '长辈',
      '長輩',
      '目上',
      'dad',
      'mom',
      'mother',
      'father',
      'parent',
      'elder'
    )
  )
    return 'parent'
  if (
    has(
      '子',
      '女儿',
      '儿',
      '孩子',
      '晚辈',
      '晚輩',
      '目下',
      'son',
      'daughter',
      'child',
      'kid',
      'junior'
    )
  )
    return 'child'
  if (has('兄', '弟', '姐', '妹', '手足', '平辈', '平輩', 'brother', 'sister', 'sibling', 'peer'))
    return 'sibling'
  if (has('朋友', '闺蜜', '哥们', '好友', 'friend', 'bestie')) return 'friend'
  return undefined
}

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

/** Do the given 四化 stars land in either person's relationship palaces? */
function landings(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  stars: ReadonlyArray<{ starName: string; type: keyof typeof SIHUA_TONE }>,
  palaces: readonly string[]
): ZiweiTone[] {
  const tones: ZiweiTone[] = []
  for (const summ of [a, b]) {
    for (const s of stars) {
      const palace = summ.starToPalace[s.starName]
      if (palace && palaces.includes(palace)) tones.push(SIHUA_TONE[s.type])
    }
  }
  return tones
}

/**
 * 紫微 流年 corroboration: does this YEAR's 流年四化 light either person's relationship
 * palace? `palaces` is the type-aware lens (see {@link relationshipBondPalaces});
 * defaults to the romantic set for back-compat. Pure — reads only the persisted
 * `starToPalace` maps + the year 四化 table.
 */
export function ziweiRelationYearSignal(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  year: number,
  palaces: readonly string[] = DEFAULT_BOND_PALACES
): ZiweiRelationSignal {
  const stars = getYearlySiHua(year).sihua.all
  return toSignal(landings(a, b, stars, palaces))
}

/**
 * 紫微 流月 corroboration: derive this MONTH's 四化 from its 流月天干 and check the
 * same (type-aware) palace landings. Used by what-if to weight a monthly window.
 */
export function ziweiRelationMonthSignal(
  a: ZiweiTimingSummary,
  b: ZiweiTimingSummary,
  monthStem: HeavenlyStem,
  palaces: readonly string[] = DEFAULT_BOND_PALACES
): ZiweiRelationSignal {
  const stars = getSiHua(monthStem).all
  return toSignal(landings(a, b, stars, palaces))
}

/** Like {@link landings} but for ONE chart (no double-count) — the solo case. */
function selfLandings(
  self: ZiweiTimingSummary,
  stars: ReadonlyArray<{ starName: string; type: keyof typeof SIHUA_TONE }>,
  palaces: readonly string[]
): ZiweiTone[] {
  const tones: ZiweiTone[] = []
  for (const s of stars) {
    const palace = self.starToPalace[s.starName]
    if (palace && palaces.includes(palace)) tones.push(SIHUA_TONE[s.type])
  }
  return tones
}

/**
 * 紫微 流年 corroboration for ONE person (auspice solo timeline): does this YEAR's
 * 流年四化 light any of the native's life palaces? Pure — reads the persisted
 * `starToPalace` map + the year 四化 table.
 */
export function ziweiSelfYearSignal(
  self: ZiweiTimingSummary,
  year: number,
  palaces: readonly string[] = SOLO_LIFE_PALACES
): ZiweiRelationSignal {
  return toSignal(selfLandings(self, getYearlySiHua(year).sihua.all, palaces))
}

/** 紫微 流月 corroboration for ONE person — the solo what-if monthly weight. */
export function ziweiSelfMonthSignal(
  self: ZiweiTimingSummary,
  monthStem: HeavenlyStem,
  palaces: readonly string[] = SOLO_LIFE_PALACES
): ZiweiRelationSignal {
  return toSignal(selfLandings(self, getSiHua(monthStem).all, palaces))
}
