/**
 * Yuun terminology × locale policy (SSOT for chrome vs faces).
 *
 * ## Identity (always CJK glyphs)
 * - 干支 day pillar (癸卯)
 * - 宜 / 忌 label glyphs (not "Suit" / "Avoid")
 * - 吉 / 平 / 凶 fit glyphs
 *
 * ## Follow locale
 * - 宜忌 **verbs** (`localizeYijiVerb`)
 * - 节气 display name (en → Dashu pinyin)
 * - Face chrome: For you / Tip / empty / lunar fallback
 * - App chrome (Settings, Welcome, home body)
 *
 * ## en compact surfaces (widget + watch almanac) — cut CJK density
 * - Omit: 丙午年, 成日, 二十八宿, 冲生肖
 * - Keep: 癸卯 + 宜/忌 + localized verbs + lunar `6/15`
 * - en tip: **body only** (no 日签 / Tip chrome label)
 * - Verbs: small 2 (1 line); medium/large 4–5 (up to **2 lines**); join with ` · ` so wrap is between words
 * - Yi/Ji lines: small **1 line**; medium/large **max 2 lines**, truncate with ellipsis
 *
 * ## Layout
 * - Padding fixed: small 14 / medium 16 / large 18 pt
 * - Widgets / previews use **app locale** (system by default; Me override when set)
 * - `tipLabel` is written into the App Group so native chrome cannot drift to 日签
 *
 * Glossary teaching (汉字 + pinyin + gloss) stays off the dial.
 */

export const FACE_KEEP_CJK = [
  'ganzhi',
  'yi_ji_label',
  'fit_glyph',
] as const

export type FaceKeepCjk = (typeof FACE_KEEP_CJK)[number]
