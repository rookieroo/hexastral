/**
 * Deterministic CJK↔Latin spacing (盤古之白 / "pangu spacing").
 *
 * The report LLMs sometimes embed a raw 命理 term in non-Chinese prose with no
 * separating space — "...the clash of卯酉..." / "乙木day master". The shared
 * language block (svc-astro i18n-prompt) is the source-level fix (it asks for
 * 「term (pinyin, gloss)」), but a model can still leak; this is the belt-and-
 * suspenders render-time guard so the glued glyphs never reach the eye.
 *
 * Inserts a single regular space at every boundary between a CJK/kana ideograph
 * and an adjacent ASCII letter or digit, in both directions. It is a no-op when
 * there is no such boundary (already-spaced text, pure-Latin, pure-CJK), so it
 * is safe to wrap any string. Apply it ONLY for non-CJK locales — a CJK reader
 * expects "2024年" unspaced, and the gluing complaint is en-only.
 */

// Han ideographs + Hiragana/Katakana + CJK Ext-A + compatibility ideographs.
// Punctuation is deliberately excluded so we never space "中、" or "（A）".
const CJK = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'
const CJK_THEN_LATIN = new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g')
const LATIN_THEN_CJK = new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g')

export function spaceCjkLatin(input: string): string {
  if (!input) return input
  return input.replace(CJK_THEN_LATIN, '$1 $2').replace(LATIN_THEN_CJK, '$1 $2')
}
