# Yuun copy voice (editorial SSOT)

Consumer brand: **Yuun**. Engineering/API/SKU may still say Auspice.

Policy companion: this doc + [yiji-vocabulary.md](./yiji-vocabulary.md).

## Rules

1. **EN prose** — English primary. CJK / classical terms get **one** first-mention gloss in parentheses, then English only. Do not append `(漢字)` after every clause.
2. **Phenology (三候)** — English (or modern JA) pentads as the body. Classical lines may appear **once** as a trailing blockquote, never inline after each pentad.
3. **EN poetry** — At most 1–2 quoted lines + paraphrase. Never paste whole classical poems into EN.
4. **JA poetry / 物候** — Modern Japanese commentary + optional 原詩 block. No kanbun word-order glosses (`始めて` / `乃ち` / `把って` as line-by-line 訓読).
5. **Solar-term EN UI** — `English gloss (Pinyin)` e.g. `Start of Spring (Lichun)`. Bare pinyin only for Wikipedia slugs.
6. **Product verbs** — Do not use 推演 / 测算 as CTAs or Pro bullets. Prefer 探索 / 对照 / 生成 / 参考. EN: explore / contrast / generate — not fortune, seize, fate verdict.
7. **宜忌** — zh/ja keep 宜·忌 chrome; EN chrome uses Good · Avoid. Verb chips follow the local **display mode** (modern scene words vs traditional 通书 terms). Scoring / Explain fields always use canonical CJK. See [yiji-vocabulary.md](./yiji-vocabulary.md).
8. **黄历** — Never brand as 万年历 / 万年暦.
9. **zh-Hant 命盤** — Keep (Traditional convention). JA uses 命式.
10. **Library naming**

| Surface | zh-Hans / zh-Hant | en | ja |
|---------|-------------------|----|-----|
| Settings section | 文库 / 文庫 | Library | ライブラリ |
| Row into `/glossary` | 文化 | Culture | 文化 |
| Glossary page H1 | 文化百科 | Culture guide | 文化ガイド |

## Satellite copy (not only `lib/i18n.ts`)

Edit these in the same PR when voice changes:

- `apps/auspice-app/lib/i18n.ts` — UI chrome, Pro, personal, timeline
- `apps/auspice-app/lib/makeIfBranches.ts` — make-if sandbox
- `apps/auspice-app/lib/push.ts` — daily / evening / timeline reminders
- `apps/auspice-app/lib/share.ts` — share chrome
- `apps/auspice-app/lib/culture/**` — Culture long bodies + summaries + names
- `apps/auspice-app/components/ExplainSheet.tsx` — deep-read sheet labels
- `apps/auspice-app/aso-metadata.json` — store copy (must match `proBenefits`)

Reading / 命书 handoff copy may live in `@zhop/scenario-yuan` — do not edit there for Culture work.

## Regression greps

```bash
# User-facing bans / calques (spot-check)
rg -n '推演|测算|宜とし|解錠|万年暦|Auspice Pro|worth seizing' apps/auspice-app --glob '!**/node_modules/**'
```
