/**
 * Yuun terminology × locale policy (SSOT for chrome vs faces).
 *
 * Brand core = 黄历 / Chinese Almanac — never 万年历 / perpetual calendar.
 *
 * ## 宜忌 labels
 * - zh UI: 宜 · 忌
 * - ja compact UI: 向く · 避ける
 * - en UI (home, widgets, Watch chrome): Good · Avoid
 * - Labels are **chrome** (bold, neutral ink), verbs are regular body text
 * - Verbs always via display formatter (locale + modern/traditional mode)
 * - ASO keywords may keep `yiji` for search; user-facing prose never uses yi/ji
 *
 * ## 干支 — CJK is the word; pinyin is pronunciation aid
 *
 * | Context | Form | Example |
 * |---------|------|---------|
 * | zh / ja value slots | CJK primary | 癸卯 |
 * | en widgets / Watch faces | **CJK primary**, toned pinyin secondary gloss | 癸卯 / guǐmǎo |
 * | English prose (Settings, ASO, calendar blurb) | roman-first + CJK paren | stem-branch (干支) |
 * | Teaching (glossary / ExplainSheet) | full wiki line | 癸卯 · guǐmǎo · "Water Rabbit" |
 *
 * ## Compact surfaces
 * - Watch narrow slots (en): CJK first; pinyin only if the slot still has room
 * - Widget small (en): 干支 only — no pinyin; lunar `6/17` (no Lunar/Chinese prefix)
 * - Widget medium/large (en): 干支 + toned pinyin on row 1; calendar row
 *   `JUL 30 · 6/17` (solar · Chinese-calendar numeric); no type prefix
 * - Omit on en dial when cramped: 丙午年, 成日, 二十八宿, 冲生肖
 * - Keep: CJK stem-branch, Good/Avoid chrome (bold, neutral) + localized verbs
 * - en tip: body only (no Tip chrome label on native watch tip line)
 * - Verbs: small Good ≤2 lines / Avoid 1 line; medium two-column ≤2 lines;
 *   large ≤2 lines full width; join with ` · `
 *
 * ## Japanese
 * - UI: CJK only — no romaji / ruby on cards
 * - Glossary only: 訓読み (きのとうし) under the selected combo; 音読み needs a
 *   per-combo table (乙丑 = いっちゅう ≠ おつ+ちゅう) — deferred, not concatenated
 *
 * ## Other
 * - 节气 prose / glossary: English gloss (Pinyin) e.g. Major Heat (Dashu)
 * - 节气 widget chrome (en): bare pinyin only (Dashu) — Wikipedia title style
 * - Large widget For-you footer; medium has no For-you (height budget)
 * - Water Rabbit / Fire Horse = gloss only, never the day-pillar identity
 * - Padding: small 12 / medium 14–16 / large 18 pt
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
