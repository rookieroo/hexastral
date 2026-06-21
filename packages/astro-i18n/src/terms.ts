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

// ── 干支 primitives → compositional popups ───────────────────────────────────
//
// The four pillars (甲戌 庚午…) and the day-master spelling (己土, 乙木) are NOT
// table entries — there are 60 jiazi and 10 stem+element forms, and their meaning
// is compositional. Rather than hand-author them, resolve them on the fly from the
// single-char 天干/地支/五行 entries, so a non-CJK reader can tap a raw pillar or
// day master and still get its parts explained.
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
/** Each Heavenly Stem's own 五行 — for the day-master spelling 己土 / 乙木. */
const STEM_ELEMENT: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}
/** The 10 day-master spellings (干+本气五行): 甲木 乙木 丙火 … 壬水 癸水. */
const DAY_MASTER_FORMS: string[] = Object.entries(STEM_ELEMENT).map(([s, e]) => s + e)

/** Localized framing for a composed 干支 pillar bubble (stem sitting over branch). */
const PILLAR_TEXT: Partial<Record<Locale, (s: ResolvedTerm, b: ResolvedTerm) => TermMeaning>> = {
  en: (s, b) => ({
    short: 'one of the four pillars',
    long: `A pillar of the birth chart — ${s.zh} (${s.short}) sitting over ${b.zh} (${b.short}).`,
  }),
  zh: (s, b) => ({
    short: '四柱之一',
    long: `命盘四柱之一：${s.zh}（${s.short}）坐${b.zh}（${b.short}）。`,
  }),
  'zh-Hant': (s, b) => ({
    short: '四柱之一',
    long: `命盤四柱之一：${s.zh}（${s.short}）坐${b.zh}（${b.short}）。`,
  }),
  ja: (s, b) => ({
    short: '四柱の一つ',
    long: `命式の四柱の一つ：${s.zh}（${s.short}）が${b.zh}（${b.short}）の上に座す。`,
  }),
}

/**
 * Resolve a compound 干支 token that isn't a table entry:
 *   干+本气五行 (己土, 乙木) → the stem's meaning, keeping the 2-char label.
 *   干支 pillar (甲戌, 庚午)  → the stem's nature composed over the branch's.
 * Returns null for anything else, so getTermByZh stays null for unknown tokens.
 */
function resolveCompound(zh: string, locale: Locale): ResolvedTerm | null {
  if (zh.length !== 2) return null
  const c0 = zh[0] as string
  const c1 = zh[1] as string
  const stem = byZh.get(c0)
  if (!stem || !STEMS.includes(c0)) return null
  // 干+本气五行 — the element just restates the stem's element; meaning IS the stem's.
  if (STEM_ELEMENT[c0] === c1) {
    return { ...resolve(stem, locale), id: `daymaster_${zh}`, zh }
  }
  // 干支 pillar — compose stem over branch.
  const branch = byZh.get(c1)
  if (branch && BRANCHES.includes(c1)) {
    const rs = resolve(stem, locale)
    const rb = resolve(branch, locale)
    const tmpl = PILLAR_TEXT[locale] ?? PILLAR_TEXT.en
    const m = tmpl ? tmpl(rs, rb) : { short: rs.short, long: `${rs.long} ${rb.long}` }
    return {
      id: `pillar_${zh}`,
      zh,
      pinyin: `${rs.pinyin} ${rb.pinyin}`,
      category: 'tiangan',
      short: m.short,
      long: m.long,
    }
  }
  return null
}

/** Look up a term by its canonical Chinese token (the engine's key). Falls back to
 *  compositional resolution for 干支 pillars + day-master spellings (己土, 甲戌). */
export function getTermByZh(zh: string, locale: Locale): ResolvedTerm | null {
  const entry = byZh.get(zh)
  if (entry) return resolve(entry, locale)
  return resolveCompound(zh, locale)
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
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Multi-char canonical tokens (用神, 三合, 命宫, 化忌, 紫微…), matched longest-first
// so 夫妻宫 wins over a bare 宫 and 三方四正 over 三方. This is the ONLY layer for
// CJK prose: a Chinese reader doesn't need 金/甲/子 underlined, and doing so would
// shred dense text.
const MULTI_TOKENS: string[] = Array.from(
  new Set(TERMS.filter((t) => t.zh.length >= 2).map((t) => t.zh))
).sort((a, b) => b.length - a.length)
const PROSE_RE_MULTI = new RegExp(`(${MULTI_TOKENS.map(escapeRegExp).join('|')})`, 'g')

// Single-char primitives (五行 金木…, 天干 甲乙…, 地支 子丑…). Excluded from CJK
// prose for the reason above, but in NON-CJK prose a lone 卯/土 is rare and always
// opaque, so each is a useful tap target. The 干支 pillar (甲戌) + day-master spelling
// (己土) are matched as 2-char units AHEAD of the single chars, so a pillar opens one
// bubble, not two. Alternation order = match priority (JS takes the first matching
// branch), so every 2-char alternative is listed before the 1-char ones.
const SINGLE_TOKENS: string[] = Array.from(
  new Set(TERMS.filter((t) => t.zh.length === 1).map((t) => t.zh))
)
const PROSE_RE_NONCJK = new RegExp(
  `(${[
    ...MULTI_TOKENS.map(escapeRegExp),
    ...DAY_MASTER_FORMS, // 干+本气五行 (2-char): 己土, 乙木 …
    `[${STEMS}][${BRANCHES}]`, // 干支 pillar (2-char): 甲戌, 庚午 …
    ...SINGLE_TOKENS.map(escapeRegExp), // 1-char primitives, lowest priority
  ].join('|')})`,
  'g'
)

export interface TermSegment {
  text: string
  /** The canonical 命理 token when this segment is a known term, else null. */
  termZh: string | null
}

export interface SegmentOptions {
  /** Also detect single-char 五行/天干/地支 and their 干支/日主 compounds (己土,
   *  甲戌). Default false — multi-char terms only. Enable for NON-CJK readers, where
   *  a raw primitive is rare and opaque; see PROSE_RE_NONCJK. */
  includeSingleChar?: boolean
}

/**
 * Split prose into plain + term segments for tap-to-explain. Term segments carry
 * `termZh` (resolve the meaning with `getTermByZh`, which also handles the compound
 * pillar/day-master forms). With `includeSingleChar`, single 干支/五行 + their
 * compounds become tap targets too. When nothing matches → one plain segment, so
 * callers render exactly as before. Tokens match the canonical (simplified) form;
 * traditional-only variants are a follow-up.
 */
export function segmentTextByTerms(text: string, opts?: SegmentOptions): TermSegment[] {
  if (!text) return [{ text, termZh: null }]
  const re = opts?.includeSingleChar ? PROSE_RE_NONCJK : PROSE_RE_MULTI
  const out: TermSegment[] = []
  let last = 0
  re.lastIndex = 0
  let m: RegExpExecArray | null = re.exec(text)
  while (m !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), termZh: null })
    out.push({ text: m[0], termZh: m[0] })
    last = m.index + m[0].length
    m = re.exec(text)
  }
  if (last < text.length) out.push({ text: text.slice(last), termZh: null })
  return out.length > 0 ? out : [{ text, termZh: null }]
}
