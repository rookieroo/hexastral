/**
 * Yuun terminology × locale policy (SSOT for chrome vs faces).
 *
 * Brand core = 黄历 / Chinese Almanac — never 万年历 / perpetual calendar.
 *
 * ## 宜忌 labels
 * - zh UI: 宜 · 忌
 * - ja compact UI: 向く · 避ける
 * - en UI (home, widgets, Watch chrome): Good · Avoid
 * - Verbs always via `localizeYijiVerb` (locale glosses)
 * - ASO keywords may keep `yiji` for search; user-facing prose never uses yi/ji
 *
 * ## 干支 — Wiktionary split (CJK is the word; pinyin is pronunciation aid)
 *
 * | Context | Form | Example |
 * |---------|------|---------|
 * | zh value slots | CJK primary | 癸卯 |
 * | en widgets | Wiktionary headword order: toned Hanyu Pinyin first, Han form retained | guǐmǎo (癸卯) |
 * | English prose (Settings, ASO, calendar blurb) | roman-first + CJK paren | stem-branch (干支) |
 * | Teaching (glossary / ExplainSheet) | full wiki line | 癸卯 · guǐmǎo · "Water Rabbit" |
 *
 * ## Compact surfaces
 * - Watch narrow slots (en): toned pinyin; Han form may be omitted only when the slot cannot fit it
 * - Widget small/medium (en): single-line `guǐmǎo (癸卯)`
 * - Widget large (en): pinyin primary + `(癸卯)` secondary
 * - Omit on en dial when cramped: 丙午年, 成日, 二十八宿, 冲生肖
 * - Keep: Wiktionary-order stem-branch headword, Good/Avoid + localized verbs, lunar `6/15`
 * - en tip: body only (no Tip chrome label on native watch tip line)
 * - Verbs: small 2 (1 line); medium/large 4–5 (up to 2 lines); join with ` · `
 *
 * ## Japanese
 * - UI: CJK only — no romaji / ruby on cards
 * - Glossary only: 訓読み (きのとうし) under the selected combo; 音読み needs a
 *   per-combo table (乙丑 = いっちゅう ≠ おつ+ちゅう) — deferred, not concatenated
 *
 * ## Other
 * - 节气 en UI: English gloss (Pinyin) e.g. Major Heat (Dashu) — see SOLAR_TERM_NAMES
 * - en widget For-you footer omits the categorical 吉/平/凶 verdict and shows
 *   the complete localized sentence; zh/ja may show their localized verdict
 * - Water Rabbit / Fire Horse = gloss only, never the day-pillar identity
 * - Padding: small 14 / medium 16 / large 18 pt
 * - Widgets use app locale; tipLabel written into App Group
 */

/** Dial identities that stay CJK where the locale policy permits it. */
export const FACE_KEEP_CJK = ['ganzhi', 'fit_glyph'] as const

export type FaceKeepCjk = (typeof FACE_KEEP_CJK)[number]

/** en 宜忌 chrome uses English words, not 宜/忌 glyphs. */
/**
 * @deprecated Face/widget chrome now comes from `t.widgetChrome` (i18n tables)
 * via `compactChrome()`. Kept only for ASO copy audits that assert en wording.
 */
export const EN_YIJI_LABELS = { yi: 'Good', ji: 'Avoid' } as const
