/**
 * 八宅 (Bā Zhái) — V1 implementation.
 *
 * 八宅 maps a person (by birth year + gender) to a 命卦 (one of 8 trigrams).
 * Each 命卦 has 4 lucky and 4 unlucky directions. Combined with a building's
 * 坐山 / 大门 it produces "this house suits you / doesn't" verdicts that the
 * Fēng report uses for chapter 2 (personal-fit) advice.
 *
 * Boundary: year of birth uses 立春 — someone born in January or before 立春
 * is treated as the previous year. We approximate 立春 as Feb 4; precise
 * 立春 dates require `jieqi.ts`.
 *
 * V1 does not cover:
 *   - 游年 (annual-shift) advice — relies on 流年 stars (see flying-stars.ts)
 *   - 命卦 modulation by 命主 八字 — out of scope for 八宅
 */

import type { Gender } from '../dayun'
import type { BaguaPalace } from './twenty-four-mountains'

/** 8 命卦. Identical to BaguaPalace but renamed for clarity at call sites. */
export type MingGua = BaguaPalace

/** 东四命 vs 西四命 group. */
export type EastWest = '东四命' | '西四命'

/** Four lucky direction kinds (吉位). */
export type LuckyKind = '生气' | '天医' | '延年' | '伏位'

/** Four unlucky direction kinds (凶位). */
export type UnluckyKind = '绝命' | '五鬼' | '六煞' | '祸害'

export type DirectionKind = LuckyKind | UnluckyKind

export interface DirectionVerdict {
  kind: DirectionKind
  palace: BaguaPalace
  /** 1 = best 生气, 4 = worst 绝命. Used for sorting. */
  rank: number
}

const EAST_GROUP: ReadonlySet<MingGua> = new Set(['坎', '离', '震', '巽'])

/**
 * 命卦 → ordered directional pairings.
 *
 * Order matters: lucky[0] = 生气, lucky[1] = 天医, lucky[2] = 延年, lucky[3] = 伏位.
 *                unlucky[0] = 绝命, unlucky[1] = 五鬼, unlucky[2] = 六煞, unlucky[3] = 祸害.
 *
 * Source: standard 八宅 mingjing rules. East-group (坎离震巽) pair within
 * themselves; West-group (乾坤艮兑) pair within themselves.
 */
const DIRECTION_MAP: Record<MingGua, { lucky: BaguaPalace[]; unlucky: BaguaPalace[] }> = {
  // 东四命
  坎: { lucky: ['巽', '震', '离', '坎'], unlucky: ['坤', '艮', '乾', '兑'] },
  离: { lucky: ['震', '巽', '坎', '离'], unlucky: ['乾', '兑', '艮', '坤'] },
  震: { lucky: ['离', '坎', '巽', '震'], unlucky: ['兑', '乾', '坤', '艮'] },
  巽: { lucky: ['坎', '离', '震', '巽'], unlucky: ['艮', '坤', '兑', '乾'] },
  // 西四命
  乾: { lucky: ['兑', '艮', '坤', '乾'], unlucky: ['离', '震', '坎', '巽'] },
  坤: { lucky: ['艮', '兑', '乾', '坤'], unlucky: ['坎', '巽', '离', '震'] },
  艮: { lucky: ['坤', '乾', '兑', '艮'], unlucky: ['巽', '坎', '震', '离'] },
  兑: { lucky: ['乾', '坤', '艮', '兑'], unlucky: ['震', '离', '巽', '坎'] },
}

const LUCKY_KINDS: readonly LuckyKind[] = ['生气', '天医', '延年', '伏位'] as const
const UNLUCKY_KINDS: readonly UnluckyKind[] = ['绝命', '五鬼', '六煞', '祸害'] as const

// ────────────────────────────────────────────────────────────────────────────
// 命卦 derivation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reduce a year to a single-digit "year root" by summing all digits until
 * the result is 1-9.
 *
 *   1985 → 1+9+8+5 = 23 → 2+3 = 5
 *   2000 → 2+0+0+0 = 2
 */
function yearDigitRoot(year: number): number {
  let n = Math.abs(year)
  while (n >= 10) {
    let s = 0
    while (n > 0) {
      s += n % 10
      n = Math.floor(n / 10)
    }
    n = s
  }
  return n === 0 ? 9 : n
}

/** Map a numeric 命卦 index (1-9, no 5) to a 八卦 palace. */
const NUM_TO_PALACE: Record<number, MingGua> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
}

/**
 * Derive 命卦 from a year and gender.
 *
 * Formula (standard 八宅):
 *   男: 命卦数 = (11 - yearRoot) mod 9 ; if 0 → 9 ; if 5 → 2 (坤)
 *   女: 命卦数 = (yearRoot + 4) mod 9   ; if 0 → 9 ; if 5 → 8 (艮)
 *
 * Note: the year is the **立春-aligned** year. Use `dateToMingGuaYear` if
 * you have a full birth date rather than just a year.
 */
export function mingGuaForYearGender(year: number, gender: Gender): MingGua {
  const root = yearDigitRoot(year)
  let n = gender === '男' ? (11 - root) % 9 : (root + 4) % 9
  if (n === 0) n = 9
  if (n === 5) n = gender === '男' ? 2 : 8
  // After the substitution, n ∈ {1,2,3,4,6,7,8,9}.
  // Indexed lookup is safe — TypeScript can't see the narrowing but runtime is fine.
  return NUM_TO_PALACE[n] as MingGua
}

/** 立春-aware year resolver. Returns previous year if date is before Feb 4. */
export function dateToMingGuaYear(date: Date): number {
  const m = date.getMonth()
  const d = date.getDate()
  if (m === 0 || (m === 1 && d < 4)) {
    return date.getFullYear() - 1
  }
  return date.getFullYear()
}

/** Group classification. */
export function eastWestGroup(mingGua: MingGua): EastWest {
  return EAST_GROUP.has(mingGua) ? '东四命' : '西四命'
}

// ────────────────────────────────────────────────────────────────────────────
// Direction verdicts
// ────────────────────────────────────────────────────────────────────────────

/** Get the 4 lucky directions for a 命卦, in 生气→天医→延年→伏位 order. */
export function luckyDirections(mingGua: MingGua): DirectionVerdict[] {
  return DIRECTION_MAP[mingGua].lucky.map((palace, i) => ({
    kind: LUCKY_KINDS[i] as LuckyKind,
    palace,
    rank: i + 1,
  }))
}

/** Get the 4 unlucky directions for a 命卦, in 绝命→五鬼→六煞→祸害 order. */
export function unluckyDirections(mingGua: MingGua): DirectionVerdict[] {
  return DIRECTION_MAP[mingGua].unlucky.map((palace, i) => ({
    kind: UNLUCKY_KINDS[i] as UnluckyKind,
    palace,
    rank: i + 1,
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// 宅卦游年 + 宅命合参 + 家具吉位 (D2)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 宅卦 = 坐山所在之卦 (坐北为坎宅、坐南为离宅 …). The 大游年 table
 * (`DIRECTION_MAP`) applies identically to a 宅卦 and a 命卦.
 */
export function houseGuaFromSit(sitPalace: BaguaPalace): MingGua {
  return sitPalace
}

export interface HouseDirections {
  zhaiGua: MingGua
  group: EastWest
  /** 宅卦 8方游年 — 生气/天医/延年/伏位. */
  lucky: DirectionVerdict[]
  /** 宅卦 8方游年 — 绝命/五鬼/六煞/祸害. */
  unlucky: DirectionVerdict[]
}

/** 宅卦大游年 — the house's own 8-direction 游年 verdicts. */
export function houseDirections(sitPalace: BaguaPalace): HouseDirections {
  const zhaiGua = houseGuaFromSit(sitPalace)
  return {
    zhaiGua,
    group: eastWestGroup(zhaiGua),
    lucky: luckyDirections(zhaiGua),
    unlucky: unluckyDirections(zhaiGua),
  }
}

export interface ZhaiMingConcord {
  zhaiGua: MingGua
  zhaiGroup: EastWest
  mingGua: MingGua
  mingGroup: EastWest
  /** true when 宅 与 命 同属东四 / 西四. */
  concordant: boolean
  verdict: '宅命相配' | '宅命不配'
  advice: string
}

/** 宅命合参 — whether 东四宅×东四命 (or 西四×西四) align, + remedy advice. */
export function zhaiMingConcord(mingGua: MingGua, sitPalace: BaguaPalace): ZhaiMingConcord {
  const zhaiGua = houseGuaFromSit(sitPalace)
  const zhaiGroup = eastWestGroup(zhaiGua)
  const mingGroup = eastWestGroup(mingGua)
  const concordant = zhaiGroup === mingGroup
  return {
    zhaiGua,
    zhaiGroup,
    mingGua,
    mingGroup,
    concordant,
    verdict: concordant ? '宅命相配' : '宅命不配',
    advice: concordant
      ? '宅卦与命卦同组，宅之吉方即命之吉方，门、床、灶顺势安于吉方即可。'
      : '宅卦与命卦异组，以人为本：大门、床位、灶口取命卦吉方化解，不必拘泥宅卦。',
  }
}

export interface FurniturePlacement {
  /** 大门宜开于 生气方 (纳旺气). */
  door: DirectionVerdict
  /** 床头宜朝 天医方 (主健康). */
  bedHead: DirectionVerdict
  /** 书桌宜朝 生气方 (主进取). */
  desk: DirectionVerdict
  /** 灶: 坐凶 (压绝命) 向吉 (火口朝天医) — 坐凶向吉. */
  stove: { sitAt: DirectionVerdict; mouthToward: DirectionVerdict }
}

/**
 * 床、灶、门、书桌吉位 — derived from the person's 命卦 吉凶方.
 * 灶 follows the classical 坐凶向吉 rule (灶身压最凶之绝命方, 火口朝天医吉方).
 */
export function furniturePlacement(mingGua: MingGua): FurniturePlacement {
  const lucky = luckyDirections(mingGua) // [生气, 天医, 延年, 伏位]
  const unlucky = unluckyDirections(mingGua) // [绝命, 五鬼, 六煞, 祸害]
  const sheng = lucky[0] as DirectionVerdict
  const tianyi = lucky[1] as DirectionVerdict
  const jueming = unlucky[0] as DirectionVerdict
  return {
    door: sheng,
    bedHead: tianyi,
    desk: sheng,
    stove: { sitAt: jueming, mouthToward: tianyi },
  }
}

/**
 * Score how well a building suits a person.
 *
 * Simple V1 heuristic: house is good if 坐山 + 大门 both fall in the person's
 * lucky directions; bad if either falls in 绝命 / 五鬼. Returns a score
 * 0..100 and a verbal verdict for the synthesis prompt.
 */
export interface BaZhaiFit {
  mingGua: MingGua
  group: EastWest
  sitVerdict: DirectionVerdict
  doorVerdict: DirectionVerdict
  /** 0 (terrible) … 100 (excellent) */
  score: number
  /** One of 'auspicious' | 'mixed' | 'inauspicious'. */
  verdict: 'auspicious' | 'mixed' | 'inauspicious'
}

const KIND_SCORE: Record<DirectionKind, number> = {
  生气: 25,
  天医: 22,
  延年: 20,
  伏位: 15,
  祸害: -10,
  六煞: -15,
  五鬼: -20,
  绝命: -25,
}

function lookupVerdict(mingGua: MingGua, palace: BaguaPalace): DirectionVerdict {
  const map = DIRECTION_MAP[mingGua]
  const luckyIdx = map.lucky.indexOf(palace)
  if (luckyIdx >= 0) {
    return { kind: LUCKY_KINDS[luckyIdx] as LuckyKind, palace, rank: luckyIdx + 1 }
  }
  const unluckyIdx = map.unlucky.indexOf(palace)
  if (unluckyIdx >= 0) {
    return { kind: UNLUCKY_KINDS[unluckyIdx] as UnluckyKind, palace, rank: unluckyIdx + 1 }
  }
  throw new Error(`lookupVerdict: palace ${palace} not in either map for 命卦 ${mingGua}`)
}

/** Compute fit between a person's 命卦 and a building's 坐山 + 大门. */
export function baZhaiFit({
  mingGua,
  sitPalace,
  doorPalace,
}: {
  mingGua: MingGua
  sitPalace: BaguaPalace
  doorPalace: BaguaPalace
}): BaZhaiFit {
  const sitVerdict = lookupVerdict(mingGua, sitPalace)
  const doorVerdict = lookupVerdict(mingGua, doorPalace)
  // Score = base 50 + weighted contributions of sit and door (door weighted higher).
  const raw = 50 + KIND_SCORE[sitVerdict.kind] * 0.6 + KIND_SCORE[doorVerdict.kind] * 1.0
  const score = Math.max(0, Math.min(100, Math.round(raw)))
  const verdict: BaZhaiFit['verdict'] =
    score >= 70 ? 'auspicious' : score >= 45 ? 'mixed' : 'inauspicious'
  return {
    mingGua,
    group: eastWestGroup(mingGua),
    sitVerdict,
    doorVerdict,
    score,
    verdict,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level driver
// ────────────────────────────────────────────────────────────────────────────

export interface BaZhaiInput {
  /** Date of birth, used for 命卦 derivation (立春-aware). */
  birthDate: Date
  gender: Gender
  /** Optional — when provided, returns a fit verdict against the building. */
  sitPalace?: BaguaPalace
  /** Optional — main door palace. Required if `sitPalace` is provided. */
  doorPalace?: BaguaPalace
}

export interface BaZhaiResult {
  mingGua: MingGua
  group: EastWest
  lucky: DirectionVerdict[]
  unlucky: DirectionVerdict[]
  fit?: BaZhaiFit
  /** 床、灶、门、书桌吉位 (always, from 命卦). */
  placement: FurniturePlacement
  /** 宅卦游年 (when `sitPalace` provided). */
  house?: HouseDirections
  /** 宅命合参 (when `sitPalace` provided). */
  concord?: ZhaiMingConcord
}

export function computeBaZhai(input: BaZhaiInput): BaZhaiResult {
  const year = dateToMingGuaYear(input.birthDate)
  const mingGua = mingGuaForYearGender(year, input.gender)
  const result: BaZhaiResult = {
    mingGua,
    group: eastWestGroup(mingGua),
    lucky: luckyDirections(mingGua),
    unlucky: unluckyDirections(mingGua),
    placement: furniturePlacement(mingGua),
  }
  if (input.sitPalace && input.doorPalace) {
    result.fit = baZhaiFit({
      mingGua,
      sitPalace: input.sitPalace,
      doorPalace: input.doorPalace,
    })
  }
  if (input.sitPalace) {
    result.house = houseDirections(input.sitPalace)
    result.concord = zhaiMingConcord(mingGua, input.sitPalace)
  }
  return result
}
