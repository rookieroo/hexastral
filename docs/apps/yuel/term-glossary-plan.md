# Plan — 命理 terms Route B + a Settings glossary page

From the 2026-06 round-2 report review; **updated 2026-07** to align with Syel
Route B (通俗白话 + 保留汉字术语). Synastry prose used to be either raw jargon
or opaque coinages — the goal is: **plain prose carries every sentence; 汉字
terms stay as load-bearing anchors; Settings glossary is the decoder.**

## Principles
1. A reader who can't decode classical terms still follows the prose (meaning in
   surrounding plain language).
2. Keep load-bearing **汉字** terms (七杀、三合、日主、用神…); do not romanize or
   invent English coinages. App tap-gloss / Settings page explains them.
3. First mention: term + one short plain gloss; later mentions may be term-only.
4. Terms render consistently across chapters (canonical `astro-i18n` table).
5. Ban only fearmongering / ironclad labels (绝命、克妻…) — not classical craft
   tokens themselves (`jargon-ban.ts`).

## Part A — canonical term data (the spine) — ✅ DONE (P1)
A curated table is the single source of truth for BOTH the generation prompt and the
Settings page. Home: **`packages/astro-i18n`** — it already holds
`explanations/{en,zh,ja}.ts` + signature types; add a `terms` module:

> **Shipped.** `packages/astro-i18n/src/terms.ts` (types + accessors) +
> `terms-data.ts` (69 curated terms, zh + en authored meaning-first; ja/ko fall
> back to en). Accessors: `getTermByZh` / `getTerm` / `getTermsByCategory` /
> `resolveTermMeaning` / `getTermCategoryLabel` / `getAllTerms`, all exported from
> the package index. **Key design call:** this is deliberately SEPARATE from the
> pre-existing `explainTerm` — that gives chart-MECHANICS captions ("Day Master
> generates, same polarity") for the detail UI; `terms` gives plain-language
> EFFECT ("their ambitions align") for synastry prose + a layperson glossary.
> Same tokens, different register, different surfaces. Coverage: 五行(5) 天干(10)
> 地支(12) 十神(10) 神煞(8) 格局(12) 合冲(6) 关系/用神通关日主(3) 周期(3).
> `zh` keys match the engine/labelize tokens so lookups line up.

```
interface TermEntry {
  id: string            // 'san_he', 'wang_shen', 'yong_shen', 'ri_zhu'…
  zh: string            // 三合局
  pinyin: string        // sān hé jú
  category: 'wuxing' | 'tiangan' | 'dizhi' | 'shishen' | 'shensha' | 'geju' | 'hechong' | 'cycle'
  meaning: Record<Locale, { short: string; long: string }>  // PLAIN-LANGUAGE effect
}
```
`short` = the inline gloss (≤6 words, "their ambitions align"); `long` = the glossary
page paragraph. Curate the core set first:
- 五行 金木水火土; 天干 甲乙丙丁戊己庚辛壬癸; 地支 子丑寅卯辰巳午未申酉戌亥
- 十神 比肩/劫财/食神/伤官/偏财/正财/七杀/正官/偏印/正印
- 神煞 亡神/劫煞/桃花/驿马/华盖/文昌/天乙 (the ones the engine actually emits)
- 格局 建禄格/羊刃格/从格… ; 合冲 三合/六合/六冲/相刑/相害
- 周期 大运/流年/流月; 关系 用神/通关/日主
Authoring `meaning` is the heavy part — it's content + voice work; do it in batches and
review. (Some already exist literal-ish in `svc-astro/lib/i18n-prompt.ts` SHISHEN/WUXING
maps — migrate + rewrite those meaning-first, then have svc-astro import from astro-i18n
so there's ONE table.)

## Part B — generation uses the table (svc-astro) — ✅ DONE (P2) + Route B refresh (2026-07)
- ✅ **zh Route B directive** (replaces effect-only wipe): keep 汉字 terms + 白话
  承接 in `buildLanguageBlock` pair domains; chapters/aha/flat prompts drop
  「命理书面语」register.
- ✅ **en/ja keep-汉字** pair override (unchanged).
- ✅ **jargon-ban narrowed** to fearmongering labels only (绝命/克妻…); 七杀/八字 allowed.
- ✅ **Person-reference fix** (甲方/乙方 verbatim) — still requires deploy + review pass.
- ⏭️ **Deferred: feeding the curated `short` table into the prompt.**

## Part C — Settings glossary page
A new screen, distinct from the existing `(settings)/glossary.tsx` (that one decodes the
report's VISUAL seals/marks; this one decodes the 命理 TERMS). Renders the astro-i18n
`terms` table grouped by `category`, each entry: 中文 + pinyin + plain-language meaning,
in the device locale. Reachable from Settings + (P4) from a tapped term in the report.

## Phasing
- **P1** ✅ Curate the term table in `astro-i18n` (zh + en meaning-first; ja/ko fall
  back to en). 69 terms shipped in `terms.ts` + `terms-data.ts`.
- **P2** ✅ svc-astro: zh meaning-first directive + cross-lingual meaning-first
  reminder + the verbatim 甲方/乙方 person rule (pair domains only). Table-import
  deferred (see Part B). **Needs an svc-astro deploy + generate-and-review.**
- **P3** ⏭️ NEXT — the Settings 命理 glossary page (render `getTermsByCategory(locale)`).
- **P4** (optional) In-report term linking: tap a term → its glossary entry / a sheet.

## Acceptance
A fresh en report reads cleanly with ≤ a couple of parenthetical terms per chapter, no
literal coinages, consistent person references, and every term that does appear is in
the Settings glossary.
