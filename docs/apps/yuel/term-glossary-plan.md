# Plan — 命理 term meaning-first + a Settings glossary page

From the 2026-06 round-2 report review. The synastry prose is dense with 命理 jargon
that's either raw ("寅午三合局") or literally mistranslated ("tiger-horse trinity",
"Death Star") — opaque even to zh readers, and so frequent that "just open chat" would
fire on half the report. Goal: **the meaning carries every sentence; the term is
optional flavor; one Settings page is the canonical decoder.** This is a real
differentiator vs other 命理 apps — worth doing rigorously.

## Principles
1. A reader who can't read Chinese never needs a glossary to follow the prose.
2. Translate the EFFECT/meaning, never the characters (no coined literals).
3. The Chinese term may appear once, parenthetically, as seasoning — never load-bearing.
4. Terms render consistently across all six chapters (today they drift: "Day Master's
   Wood" in one, "Jia's 乙木" in another).

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

## Part B — generation uses the table (svc-astro) — ✅ DONE (P2)
- ✅ **zh meaning-first directive.** The zh path of `buildLanguageBlock` had NO tone
  guidance (only "output in 简体中文"); added a meaning-first block for the pair
  domains (`hehun`/`shuangpan`) — rewrite 寅午三合局/亡神/建禄格 as their effect, ≤1-2
  terms/chapter, gloss in parens on first use. (en was already meaning-first via
  `TONE_GUIDES.en`.) A light cross-lingual meaning-first reminder also covers
  ja/ko/de/es pair reports. ja/ko TONE_GUIDES intentionally KEEP 漢字 terms (those
  are natively readable for that audience — the literal-translation problem was an
  en problem), so they're not forced term-free.
- ✅ **Person-reference fix.** Root cause: the two people enter the prompt as the
  neutral tokens 甲方/乙方 (so the client swaps them per reader → 你 / the other's
  name), but in non-zh output the model romanized them to "Jia"/"Yi" (or invented
  "Person A" / "Day Master's Wood"), which the client's 甲方/乙方 replacement missed.
  Fix = a hard rule in the non-zh path: keep 甲方/乙方 EXACTLY verbatim in every
  language, never romanize/translate/rename, possessive = `甲方's`. This is what
  lets onboarding keep the name OPTIONAL. Forward-looking — archived reports keep
  their original text. **Needs `cd services/svc-astro && bun deploy` + a
  generate-and-review pass.**
- ⏭️ **Deferred: feeding the curated `short` table into the prompt.** svc-astro does
  NOT currently depend on `@zhop/astro-i18n` (only astro-core), and adding a
  workspace dep to a CF Worker risks the bundle/`bun install`. Since the en path is
  already meaning-first via the tone guide, importing the table is marginal upside
  for real risk — deferred. The curated table is still the canonical CONTENT source
  (it feeds the glossary page, P3) and the prompt's example glosses were authored to
  match it. Wire it in later behind a verified install if we want one literal source.

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
