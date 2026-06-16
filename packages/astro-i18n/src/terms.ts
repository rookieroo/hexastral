/**
 * @zhop/astro-i18n — curated 命理 term glossary (meaning-first)
 *
 * Distinct from `explainTerm` (which gives chart-MECHANICS captions for the
 * detail UI, e.g. "Day Master generates, same polarity"). This module is the
 * single curated source for two layperson surfaces:
 *   1. the synastry generation prompt (consistent inline glosses), and
 *   2. the Settings 命理 glossary page.
 *
 * Voice rule: translate the EFFECT, never the characters. The reader who
 * can't read Chinese should follow the prose without ever opening a glossary;
 * the Chinese term is optional flavor, never load-bearing.
 *
 *   short — ≤~8-word plain-language gist, droppable as an inline gloss.
 *   long  — one plain-language sentence for the glossary page.
 *
 * @example
 *   import { getTermByZh } from '@zhop/astro-i18n'
 *   getTermByZh('三合', 'en')?.short   // → 'ambitions align and reinforce'
 */

import { TERMS } from './terms-data'
import type { Locale } from './types'

export type TermCategory =
  | 'wuxing' // 五行
  | 'tiangan' // 天干
  | 'dizhi' // 地支
  | 'shishen' // 十神
  | 'shensha' // 神煞
  | 'geju' // 格局
  | 'hechong' // 合冲
  | 'relation' // 关系/方法 — 用神/通关/日主
  | 'cycle' // 周期 — 大运/流年/流月
  | 'ziwei' // 紫微斗数 — 宫位/四化/概念
  | 'ziweistar' // 紫微 14 主星

export interface TermMeaning {
  /** ≤~8-word plain-language gist — the EFFECT. Inline gloss + prompt feed. */
  short: string
  /** One plain-language sentence for the glossary page. */
  long: string
}

export interface TermEntry {
  /** Stable category-prefixed slug, e.g. 'hechong_san_he'. For keys/links. */
  id: string
  /** Canonical Chinese token — matches the engine + labelize keys. */
  zh: string
  /** Hanyu Pinyin with tone marks, for display. */
  pinyin: string
  category: TermCategory
  /** Meaning-first content per locale. Resolves target → en → zh. */
  meaning: Partial<Record<Locale, TermMeaning>>
}

/** A {@link TermEntry} with its meaning flattened for one locale. */
export interface ResolvedTerm {
  id: string
  zh: string
  pinyin: string
  category: TermCategory
  short: string
  long: string
}

/** Display order for the glossary page — foundations first, then advanced. */
export const TERM_CATEGORY_ORDER: TermCategory[] = [
  'wuxing',
  'tiangan',
  'dizhi',
  'shishen',
  'shensha',
  'geju',
  'hechong',
  'relation',
  'cycle',
  'ziwei',
  'ziweistar',
]

const CATEGORY_LABELS: Partial<Record<Locale, Record<TermCategory, string>>> = {
  zh: {
    wuxing: '五行',
    tiangan: '天干',
    dizhi: '地支',
    shishen: '十神',
    shensha: '神煞',
    geju: '格局',
    hechong: '合冲',
    relation: '核心概念',
    cycle: '时间周期',
    ziwei: '紫微斗数',
    ziweistar: '紫微主星',
  },
  'zh-Hant': {
    wuxing: '五行',
    tiangan: '天干',
    dizhi: '地支',
    shishen: '十神',
    shensha: '神煞',
    geju: '格局',
    hechong: '合衝',
    relation: '核心概念',
    cycle: '時間週期',
    ziwei: '紫微斗數',
    ziweistar: '紫微主星',
  },
  en: {
    wuxing: 'Five Elements',
    tiangan: 'Heavenly Stems',
    dizhi: 'Earthly Branches',
    shishen: 'Ten Gods',
    shensha: 'Symbolic Stars',
    geju: 'Chart Structures',
    hechong: 'Harmonies & Clashes',
    relation: 'Core Concepts',
    cycle: 'Time Cycles',
    ziwei: 'Zi Wei Dou Shu',
    ziweistar: 'Major Stars',
  },
  ja: {
    wuxing: '五行',
    tiangan: '十干',
    dizhi: '十二支',
    shishen: '十神',
    shensha: '神殺',
    geju: '格局',
    hechong: '合冲',
    relation: '中心概念',
    cycle: '時間サイクル',
    ziwei: '紫微斗数',
    ziweistar: '紫微の主星',
  },
}

const byId = new Map<string, TermEntry>(TERMS.map((t) => [t.id, t]))
const byZh = new Map<string, TermEntry>(TERMS.map((t) => [t.zh, t]))

/** Resolve a single entry's meaning for a locale: target → en → zh. */
export function resolveTermMeaning(entry: TermEntry, locale: Locale): TermMeaning {
  return (
    entry.meaning[locale] ??
    entry.meaning.en ??
    entry.meaning.zh ?? { short: entry.zh, long: entry.zh }
  )
}

function resolve(entry: TermEntry, locale: Locale): ResolvedTerm {
  const m = resolveTermMeaning(entry, locale)
  return {
    id: entry.id,
    zh: entry.zh,
    pinyin: entry.pinyin,
    category: entry.category,
    short: m.short,
    long: m.long,
  }
}

/** Look up a term by its stable id. */
export function getTerm(id: string, locale: Locale): ResolvedTerm | null {
  const entry = byId.get(id)
  return entry ? resolve(entry, locale) : null
}

/** Look up a term by its canonical Chinese token (the engine's key). */
export function getTermByZh(zh: string, locale: Locale): ResolvedTerm | null {
  const entry = byZh.get(zh)
  return entry ? resolve(entry, locale) : null
}

/** Localized section header for a category (falls back to en). */
export function getTermCategoryLabel(category: TermCategory, locale: Locale): string {
  return CATEGORY_LABELS[locale]?.[category] ?? CATEGORY_LABELS.en?.[category] ?? category
}

/** The full table grouped by category in display order, resolved for a locale. */
export function getTermsByCategory(
  locale: Locale
): Array<{ category: TermCategory; label: string; terms: ResolvedTerm[] }> {
  return TERM_CATEGORY_ORDER.map((category) => ({
    category,
    label: getTermCategoryLabel(category, locale),
    terms: TERMS.filter((t) => t.category === category).map((t) => resolve(t, locale)),
  }))
}

/** Raw entries (all locales), e.g. for svc-astro prompt construction. */
export function getAllTerms(): readonly TermEntry[] {
  return TERMS
}

// ── in-prose term detection (tap-to-explain) ─────────────────────────────────
//
// Only MULTI-character tokens are detectable in prose: the single-char 五行 /
// 天干 / 地支 (金, 甲, 子…) recur constantly in ordinary text, so underlining
// every one would shred the reading — the load-bearing tap targets are the 2+
// char domain terms (用神, 三合, 命宫, 化忌, 紫微…). Matched longest-first so
// 夫妻宫 wins over a bare 宫, 三方四正 over 三方.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const PROSE_TOKENS: string[] = Array.from(
  new Set(TERMS.filter((t) => t.zh.length >= 2).map((t) => t.zh))
).sort((a, b) => b.length - a.length)
const PROSE_RE = new RegExp(`(${PROSE_TOKENS.map(escapeRegExp).join('|')})`, 'g')

export interface TermSegment {
  text: string
  /** The canonical 命理 token when this segment is a known term, else null. */
  termZh: string | null
}

/**
 * Split prose into plain + term segments for tap-to-explain. Term segments carry
 * `termZh` (look up the meaning with `getTermByZh`). For non-CJK prose (the model
 * writes the term's effect, not the characters) nothing matches → one plain
 * segment, so callers render exactly as before. Tokens are matched against the
 * canonical (simplified) form; traditional-only variants are a follow-up.
 */
export function segmentTextByTerms(text: string): TermSegment[] {
  if (!text) return [{ text, termZh: null }]
  const out: TermSegment[] = []
  let last = 0
  PROSE_RE.lastIndex = 0
  let m: RegExpExecArray | null = PROSE_RE.exec(text)
  while (m !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), termZh: null })
    out.push({ text: m[0], termZh: m[0] })
    last = m.index + m[0].length
    m = PROSE_RE.exec(text)
  }
  if (last < text.length) out.push({ text: text.slice(last), termZh: null })
  return out.length > 0 ? out : [{ text, termZh: null }]
}
