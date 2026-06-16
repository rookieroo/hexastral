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

## Part A — canonical term data (the spine)
A curated table is the single source of truth for BOTH the generation prompt and the
Settings page. Home: **`packages/astro-i18n`** — it already holds
`explanations/{en,zh,ja}.ts` + signature types; add a `terms` module:

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

## Part B — generation uses the table (svc-astro)
- The en tone guide is already meaning-first (commit 2483bf6); extend the same directive
  to the **zh path** (寅午三合局 is opaque to zh readers too) and to ja/ko.
- Feed the curated `short` meanings into the prompt so glosses are consistent, not
  re-improvised per chapter.
- **Person-reference fix (kills the 甲乙/you/zy mess without requiring names):** instruct
  the model to refer to the two people by ONE scheme for the whole report — the real
  names when present, else a stable role ("you" / "your partner") — and NEVER 甲乙 /
  jiǎ-yǐ / "Day Master's Wood". This is what lets us keep name OPTIONAL in onboarding.

## Part C — Settings glossary page
A new screen, distinct from the existing `(settings)/glossary.tsx` (that one decodes the
report's VISUAL seals/marks; this one decodes the 命理 TERMS). Renders the astro-i18n
`terms` table grouped by `category`, each entry: 中文 + pinyin + plain-language meaning,
in the device locale. Reachable from Settings + (P4) from a tapped term in the report.

## Phasing
- **P1** Curate the term table in `astro-i18n` (zh + en meaning-first; ja next). Highest
  effort — it's the content.
- **P2** svc-astro: zh/ja meaning-first directive + import the table for consistent
  glosses + the consistent person-reference rule. Deploy + generate-and-review.
- **P3** The Settings 命理 glossary page (render the table).
- **P4** (optional) In-report term linking: tap a term → its glossary entry / a sheet.

## Acceptance
A fresh en report reads cleanly with ≤ a couple of parenthetical terms per chapter, no
literal coinages, consistent person references, and every term that does appear is in
the Settings glossary.
