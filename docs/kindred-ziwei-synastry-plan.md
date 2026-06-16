# Plan — 合盘 on 八字 + 紫薇 (and the timeline / what-if built on both)

From the 2026-06 round-2 review. Today the synastry report, timeline, and what-if are
**八字-only**. The ask: ground them in **both 八字 and 紫薇斗数**, where the 紫薇 chart
cross-validates and supplements the 八字 chart (two independent systems agreeing is a
stronger, more defensible read — and a differentiator). This is the heaviest item here;
multi-phase.

## Reframe after code-diving (2026-06) — P1 + P2 SHIPPED
The plan's biggest fear — hand-porting exacting 紫薇 placement logic — is **moot**:
the placement engine is the **`iztro`** npm lib, already wrapped server-side in
`stellar.ts` (`generateChart`), and `shuangpan.ts` already proves a 八字×紫薇
*consensus* pattern (single-person). Two consequences:
- "Share the compute" (P1) = **reuse `generateChart`**, not extract a package. The
  synastry compute is server-side only (the app renders the *result*), so it lives in
  svc-astro — no cross-platform `packages/ziwei` needed.
- **Shipped:** `services/svc-astro/src/services/hehun/ziwei-synastry.ts` (+ golden tests):
  - **P1** `summarizeZiwei(person)` → compact 紫薇 summary (12 palaces, 生年四化 read
    off stars, star→palace map). iztro owns placement; we map its single-char mutagen
    (禄/权/科/忌) → 化禄/权/科/忌 ourselves (note: `parseMutagen` expects the full token,
    so `stellar.ts`'s `siHua` is null — latent bug there, sidestepped here).
  - **P2** `analyzeZiweiSynastry(a, b)` → structured pair facts: 命宫 resonance, 夫妻宫
    cross-read, and **飞星** (one chart's 生年四化 landing in the other's palaces — the
    heart of it: 化禄=ease there, 化忌=deep entanglement/friction there) with a tone +
    a zh note per landing, A↔B mirrored. Output is structured facts (zh), no LLM.

## Current state (what exists)
- `services/svc-astro/services/hehun/hehun.ts` — `computeHeHun(personA, personB)` builds
  chart summaries from `FourPillars` (八字): 十神 + 格局 + 日主五行. No 紫薇.
- `packages/astro-core` — BaZi engine (大运/流年/流月, 冲合, 用神). Has `sihua.ts`
  (四化 — a 紫薇 mechanism) but no full 紫薇 chart compute.
- `apps/ming-pan-app` — the standalone 紫薇 product; it has the 紫薇命盘 compute (12 宫,
  星曜 placement, 四化). NOT shared.
- astro-core timeline + `planRelationshipDecision[ByYear]` — 八字 cycles only.

## Target architecture
1. **Shared 紫薇 chart compute.** Extract ming-pan-app's 紫薇命盘 engine (12 palaces, star
   placement, 四化 via `astro-core/sihua.ts`) into a shared package (`astro-core` or a new
   `packages/ziwei`) so svc-astro + the apps use ONE implementation. Biggest structural
   step; do it cleanly with golden tests (紫薇 placement is exacting).
2. **Pair-level 紫薇 analysis (new domain logic).** Synastry in 紫薇 ≈ how the two 命盘
   interact: 夫妻宫 / 迁移宫 cross-reading, 飞星 (one chart's 四化 landing in the other's
   palaces), 命宫/身宫 resonance. Output structured facts (like hehun's 八字 summary).
3. **Cross-validation layer.** Reconcile 八字 + 紫薇 into the report: where both agree
   (a 八字 用神 of 火 + a 紫薇 财官 pattern pointing the same way → high-confidence), and
   where they diverge (flag as nuance, not contradiction). This corroboration is the
   product value — surface it explicitly ("both systems point to…").
4. **Report integration.** Either a dedicated 紫薇 dimension/section, or weave 紫薇
   findings into the existing six chapters (preferred — one narrative, 八字 + 紫薇
   互相映证). The svc-astro `/pair/compute` prompt gets both chart summaries.
5. **Timeline / what-if on both.** Add 紫薇 大限 + 流年 (and their 四化) alongside 八字
   大运/流年 in `astro-core` timeline + `planRelationshipDecisionByYear`. A turning point
   confirmed by BOTH systems ranks higher / reads as more significant; the what-if
   "best year" weights 八字 用神 timing AND 紫薇 大限 favorability.

## Phasing (each its own focused change + tests)
- **P1** ✅ Share the 紫薇 chart compute — reuse `generateChart` via `summarizeZiwei`
  (golden-tested). (No package extraction needed; see reframe above.)
- **P2** ✅ Pair 紫薇 analysis (命宫 resonance + 夫妻宫 cross-read + 飞星) → structured
  facts. `analyzeZiweiSynastry`, golden-tested.
- **P3** ✅ Woven into the 6-chapter report. `generateSynastryChapters` computes the
  紫微 block once (`buildZiweiBlock`, best-effort → 八字-only on failure) and threads it
  through every chapter prompt + the aha hook via `buildPairFacts`. The block is framed
  as the SECOND system with an explicit cross-validation directive ("八字与紫微指向一致
  时点出『两套系统不约而同』"), and the evidence layer may cite 紫微. 夫妻宫 cross-read
  gated to romantic bonds. Forward-looking — archived reports stay 八字-only. **Needs an
  svc-astro deploy + a generate-and-review pass.** (The flat quick reading stays 八字-only.)
- **P4** ⏭️ NEXT — 紫薇 cycles in timeline + what-if (大限/流年 + their 四化 alongside the
  八字 大运/流年; cross-confirmed turning points rank higher in `planRelationshipDecisionByYear`).

## Risks / decisions
- 紫薇 placement correctness is unforgiving — P1 needs golden tests vs a trusted source.
- Privacy (D2) unchanged: only derived 紫薇 facts leave the server, never raw birth.
- Cost: two systems ≈ more compute + a longer prompt; keep the report generation within
  the existing budget (the 紫薇 summary should be compact structured facts, not prose).
- Existing archived reports are NOT regenerated (matches the frozen-report principle).
