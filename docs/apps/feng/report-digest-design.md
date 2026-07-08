# Feng report digest — qualitative overview (no percentile score)

Decision (2026-07-08): Kanyu reports open with a **deterministic digest cover**
instead of a headline percentile. The digest mirrors what a 风水师 would say in
the first minute of a walk-through: 坐向、格局、宅命、外局、两处优先宫位 — not
「这宅 82 分」.

## What ships

| Layer | Location | Role |
| --- | --- | --- |
| `deriveReportDigest()` | `packages/scenario-feng/src/lib/report-digest.ts` | Pure aggregation from `FengComputeJson` |
| `FengDigestCard` | `apps/feng-app/components/FengDigestCard.tsx` | Chips + headline + focus lines + disclaimer |
| Cover page | `app/(report)/[siteId].tsx` page 0 | Full digest before the six chapters |
| Shell preview | Same file, `ReportShellView` | Digest while chapters synthesize |

## Chip vocabulary (fixed set)

1. **格局** — primary `patterns[]` entry (priority: 旺山旺向/上山下水/…, else first
   inauspicious, else 平局). Appends **有救 / 待补** when `formLi.patternRescue` matches.
2. **宅命** — `baZhai.concord` → 宅命相配 / 宅命不配 (omitted when no birth profile).
3. **外局** — count of 化煞 + 动凶 findings in `formLi.palaces`:
   - 0 → 外局尚清
   - 1–2 → 形煞 N 处 (light)
   - ≥3 → 形煞 N 处 (heavy tone)
4. **飞星置信** — only when `dataQuality.flyingStarsConfidence` is medium/low.

No chip is synthesized by the LLM. No aggregate index.

## Headline priority (one sentence)

1. 上山下水 + 无救 → steer to remediation chapter
2. 旺山旺向 + 有救 → affirm true 旺
3. Top malefic focus (动凶 > 破财 > 损丁)
4. Heavy exterior sha count (≥3)
5. 宅命不配
6. Default 平局 copy

## Focus list (max 2)

Sorted by severity: 动凶 → 破财 → 损丁 → 化煞 → 旺财 → 旺丁. Deduped by
`palace:verdict`.

## Explicit non-goals

- No 0–100, A/B/C, or 「风水指数」
- No LLM-generated summary on the cover (chapters still LLM)
- No list-row digest until `GET /api/feng/sites` embeds a compute summary (future)

## Parallels

Same product move as Yuel **EssenceTag** (相生/比和/相克) replacing blunt 53 —
here the vocabulary is 风水-native (格局/宅命/形煞/形理 verdict).

## Acceptance

- Digest renders whenever `compute.flyingStars` is present (shell + full report)
- Footer line states digest is not a fortune score (4 locales)
- Golden behaviour: extend `packages/astro-core` fixtures + call
  `deriveReportDigest` in a future unit test when scenario-feng gains a test script
