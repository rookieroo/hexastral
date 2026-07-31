# Yuel push fuel contract

**Status:** product SSOT for report → push windows (2026-07).  
**Related:** [push-retention-playbook.md](../../setup/push-retention-playbook.md) · ADR-0025 pattern in code.

## Principle

Yuel sells **relationship time**, not just a PDF-like report. Each Pro 合盘 mints
push fuel into `kindred_push_queue`; the home **Upcoming** strip surfaces the
aggregated future window. Cron at **19:00** local sends ≤1/user/day (no LLM).

## Per-report fuel disclosure (copy)

| Report | Window | Cadence |
|---|---|---|
| Pro 合盘 | ~30–45 days: conditional (resonance/tension/neutral) + dated (~7d / ~30d / node) | 19:00 pick from union queue |
| Personal 命书 | Not in MVP | — |
| Timeline / 流月 nodes | Boundary teasers | Local today; **server 09:00** target path planned |

On report complete / unlock:

- Disclose: “本报告将产生约 N 条关系提醒（约 30–45 天窗口）+ 可选节点日”
- Settings: ~19:00, not a personal morning almanac
- Empty harvest → surface “本次未生成提醒窗口” (no silent failure)

## LLM batches (do not merge)

| Batch | When | Context | Tier |
|---|---|---|---|
| A Report shell | User wait | Chart facts | `standard` |
| B Remaining chapters | Background | Chart facts | `standard` |
| C Push harvest | Parallel with A (today) | Chart facts | `standard`, short JSON |
| C′ Pass-2 (optional) | After ≥1 chapter/aha | Digest of report claims | `standard` |
| D Refill | New reading / living-layer event | Prior queue + events | `standard` |

Model SSOT: **Kimi K2.6** flagship head; **K3 shadow-only** until latency/JSON eval
(`[packages/ai-vision/src/router.ts](../../../packages/ai-vision/src/router.ts)`).

## Layer-1 uncovered days

Playbook boundary ① today = **silence** when queue empty. Optional deterministic
synastry templates (Pro + prior reading only) are **proposed, not enabled** —
requires an explicit playbook change before coding.

## Home Upcoming

- `GET /api/kindred/push/fuel` (HMAC) — remaining count + next windows preview
- Does not mark rows `sent` (unlike `/targets`)
- Empty CTA → invite / open a bond report

## Timeline nodes (server)

- `GET /api/kindred/push/timeline-targets` (Internal-Key) — Pro teasers where
  `fireDate === date`; svc-notify slot **09:00** local
- Local `lib/timeline-push.ts` remains a fallback when the timeline is opened

## Kimi K3 (shadow only)

Production flagship stays **K2.6**. Optional offline A/B: one chapter kind with
`reasoning_effort: 'low'` — gate on p95 latency, JSON parse rate, locale drift,
CF cost. Do **not** put K3 on push harvest or 6-way parallel chapters until measured.
See `packages/ai-vision/src/router.ts` (`LLM_MODELS.KIMI_K3`).
