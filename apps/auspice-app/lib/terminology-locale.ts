/**
 * Yuun terminology × locale policy (SSOT for chrome vs faces).
 *
 * Brand core = 黄历 / Chinese Almanac — never 万年历 / perpetual calendar.
 *
 * ## 宜忌 labels
 * - zh / ja UI: 宜 · 忌
 * - en UI (home, widgets, Watch chrome): Good · Avoid
 * - Verbs always via `localizeYijiVerb` (locale glosses)
 * - ASO keywords may keep `yiji` for search; user-facing prose never uses yi/ji
 *
 * ## 干支 — Wiktionary split (CJK is the word; pinyin is pronunciation aid)
 *
 * | Context | Form | Example |
 * |---------|------|---------|
 * | Value slots (home, widgets, calendar cells) | CJK primary; en may add small toned pinyin | 癸卯 + guǐmǎo |
 * | English prose (Settings, ASO, calendar blurb) | roman-first + CJK paren | stem-branch (干支) |
 * | Teaching (glossary / ExplainSheet) | full wiki line | 癸卯 · guǐmǎo · "Water Rabbit" |
 *
 * ## Compact surfaces
 * - Watch narrow slots: **CJK ganzhi only** (no pinyin row — 癸卯 is denser than Guimao)
 * - Widget medium/large (en): CJK + optional pinyin under the day pillar
 * - Omit on en dial when cramped: 丙午年, 成日, 二十八宿, 冲生肖
 * - Keep: 干支 CJK, Good/Avoid + localized verbs, lunar `6/15`
 * - en tip: body only (no Tip chrome label on native watch tip line)
 * - Verbs: small 2 (1 line); medium/large 4–5 (up to 2 lines); join with ` · `
 *
 * ## Japanese
 * - UI: CJK only — no romaji / ruby on cards
 * - Glossary only: 訓読み (きのとうし) under the selected combo; 音読み needs a
 *   per-combo table (乙丑 = いっちゅう ≠ おつ+ちゅう) — deferred, not concatenated
 *
 * ## Other
 * - 节气 en: pinyin proper names (Dashu) — noun-like, OK without CJK
 * - 吉/平/凶 fit glyphs stay CJK on dial; prose may gloss
 * - Water Rabbit / Fire Horse = gloss only, never the day-pillar identity
 * - Padding: small 14 / medium 16 / large 18 pt
 * - Widgets use app locale; tipLabel written into App Group
 */

/** Dial identity that stays CJK even on en (value slots / Watch). */
export const FACE_KEEP_CJK = ['ganzhi', 'fit_glyph'] as const

export type FaceKeepCjk = (typeof FACE_KEEP_CJK)[number]

/** en 宜忌 chrome uses English words, not 宜/忌 glyphs. */
export const EN_YIJI_LABELS = { yi: 'Good', ji: 'Avoid' } as const
