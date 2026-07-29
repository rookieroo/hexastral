/**
 * 干支 pinyin helpers — toned for UI/glossary; ASCII for ASO keywords / slugs.
 * Stem/branch tables live in `ganzhi-content.ts` (glossary SSOT).
 */

import { TEN_STEMS, TWELVE_BRANCHES } from './ganzhi-content'

const STEM_BY_CHAR = Object.fromEntries(TEN_STEMS.map((s) => [s.char, s])) as Record<
  string,
  (typeof TEN_STEMS)[number]
>
const BRANCH_BY_CHAR = Object.fromEntries(TWELVE_BRANCHES.map((b) => [b.char, b])) as Record<
  string,
  (typeof TWELVE_BRANCHES)[number]
>

/** Strip tone marks: guǐmǎo → guimao */
export function stripPinyinTones(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

export interface GanzhiPinyin {
  /** e.g. 癸卯 */
  cjk: string
  /** Toned Mandarin, e.g. guǐmǎo */
  toned: string
  /** ASCII for keywords/slugs, e.g. guimao */
  ascii: string
}

/** Resolve day-pillar 干支 (two chars) to pinyin. Returns null if unknown. */
export function ganzhiPinyin(ganZhi: string): GanzhiPinyin | null {
  const stem = ganZhi[0]
  const branch = ganZhi[1]
  if (!stem || !branch) return null
  const s = STEM_BY_CHAR[stem]
  const b = BRANCH_BY_CHAR[branch]
  if (!s || !b) return null
  const toned = `${s.pinyin}${b.pinyin}`
  return { cjk: `${stem}${branch}`, toned, ascii: stripPinyinTones(toned) }
}

/**
 * Teaching / ExplainSheet wiki line (en).
 * Gloss uses element+animal English nicknames — auxiliary only.
 */
export function ganzhiWikiLineEn(
  ganZhi: string,
  gloss: string | null,
  index1Based?: number
): string {
  const p = ganzhiPinyin(ganZhi)
  if (!p) return ganZhi
  const parts = [p.cjk, p.toned]
  if (gloss) parts.push(`"${gloss}"`)
  if (index1Based != null) parts.push(`sexagenary #${index1Based}`)
  return parts.join(' · ')
}

/** Japanese glossary 訓読み for a combo (黄历 register). 音読み varies by compound — not concatenated. */
export function ganzhiJaKunyomi(ganZhi: string): string | null {
  const stem = ganZhi[0]
  const branch = ganZhi[1]
  if (!stem || !branch) return null
  const s = STEM_BY_CHAR[stem]
  const b = BRANCH_BY_CHAR[branch]
  if (!s?.kunyomi || !b?.kunyomi) return null
  return `${s.kunyomi}${b.kunyomi}`
}

/** @deprecated Prefer ganzhiJaKunyomi — on'yomi needs per-combo table (e.g. 乙丑 = いっちゅう). */
export function ganzhiJaReadings(ganZhi: string): { kun: string; on: string } | null {
  const kun = ganzhiJaKunyomi(ganZhi)
  if (!kun) return null
  const stem = ganZhi[0]!
  const branch = ganZhi[1]!
  const s = STEM_BY_CHAR[stem]
  const b = BRANCH_BY_CHAR[branch]
  if (!s?.onyomi || !b?.onyomi) return { kun, on: '' }
  return { kun, on: `${s.onyomi}${b.onyomi}` }
}
