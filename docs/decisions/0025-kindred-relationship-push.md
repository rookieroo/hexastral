# ADR-0025: Kindred relationship push — harvest-fed queue + deterministic synastry scheduler

- Status: Proposed (harvest → queue prototype landed; delivery stack pending)
- Date: 2026-06-18
- Builds on: the Auspice timeline-node push pattern (LLM-once → 落库 → cron), `apps/hexastral-api/src/routes/cycle-timeline.ts`, `services/svc-notify/src/index.ts`
- Relates to: ADR brand naming (Yuel = `apps/kindred-app`)

## Context

Auspice (Yuun) push is **deterministic**: a per-day 干支 reading drawn from a static
25-cell corpus (`@zhop/astro-i18n` `computeDailyHook`), zero LLM, cheap to run daily.
That works because the input space is small.

Kindred (Yuel) is different. Its high-value push is **relational, narrative, and
per-Thread** (this relationship, this transit, this anniversary). Templates read
generic for relationships — the quality lives in LLM prose. But the naive approach,
"run an LLM each day for each of a user's Threads," is O(threads × days) and wasteful:
it recomputes stable context every day and drifts from the report the user already read.

Two facts about today's codebase shape this:
1. **The 合盘 report already runs an LLM with the full relational context loaded** —
   `services/svc-astro/src/services/hehun/hehun.ts` fires 7 parallel `callWithFallback`s
   (6 chapters + aha hook). The marginal cost of *also* emitting a few push teasers there
   is ~nothing.
2. **Kindred push delivery is greenfield** — there is no `kindredPushSubs` table, no Expo
   token registration in `apps/kindred-app`, and no kindred cron in `svc-notify`. Only a
   local `push-preference` toggle + local timeline notifications exist.

## Decision

### D1 — Three layers, harvest-primary (not daily-LLM)

- **Layer 1 — Deterministic floor (no LLM).** `calculateDailySynastry(pillarsA, pillarsB,
  todayGanZhi, date)` (`packages/astro-core/src/synastry.ts`) returns
  `{ synergy, friction, status: 'resonance'|'tension'|'neutral' }`. This is the **scheduler's
  input** — which Thread to ping today and in what register — not the copy. It also
  guarantees there is always *something* to send.
- **Layer 2 — LLM-harvested 语料 (primary copy source).** Every LLM moment that already
  runs for a Thread (合盘报告, and later timeline / what-if) emits a small bank of future
  push snippets as a structured side-output, 落库 to a queue. Zero extra per-day LLM, and
  the push **echoes the report's voice** (continuity — same principle as Yuun's push↔home echo).
- **Layer 3 — Periodic planner (LLM, backstop only, weekly).** A low-frequency cron tops up
  Threads whose queue is **running dry** (cold Threads the user created but never generated a
  report for — exactly the ones harvest can't cover). Batched over stale Threads; never daily,
  never per-Thread-per-day.

> Rejected: making Layer 3 the primary (a daily/periodic LLM over all Threads). It recomputes
> stable context and regenerates what the reports already imply — the cost-wrong split.

### D2 — A 落库 queue with two trigger kinds

`kindred_push_queue` (`apps/hexastral-api/src/db/schema.ts`, migration `0016`):
- **`conditional`** (`triggerKind`): fires when the day's `calculateDailySynastry().status`
  equals the trigger (e.g. `resonance` on a high-契合 day). A handful of snippets cover many
  future days without predicting exact dates — the deterministic Layer-1 signal does the matching.
- **`dated`** (`fireOn`): anniversaries, a 流年/大运 transit date affecting the pair, a what-if
  "revisit in 30 days."

The send-time cron stays **dumb and cheap**: select due `fireOn` rows + conditional rows whose
`triggerKind` matches today's Layer-1 status → send → flip `status`. No LLM at send time.

### D3 — Harvest attaches at the report's `waitUntil`, bond-resolved lazily

The 合盘 compute (`svc-astro /pair/compute`) generates snippets in parallel with the chapters
and returns `pushSnippets[]`; the API (`apps/hexastral-api/src/routes/pair/pair.ts`) 落库s them
in the existing `c.executionCtx.waitUntil(...)` block. `bondId` is null when harvested from a raw
compute that precedes bond creation; the cron resolves the Thread via `sourceReadingId`
(`userBonds.hehunReadingId`). Harvest is **non-fatal** — a parse/LLM failure returns `[]`, the
report never 500s over a push side-output.

### D4 — Same privacy + dedup gates as the Auspice relationship nudge

- Counterpart privacy / App Store 4.3: both parties need solar dates + opt-in; copy stays
  **relationship-framed** (Kindred never implies a personal timeline — per the report-redesign doctrine).
- Dedup across Threads: the Layer-1 scheduler picks the **single strongest** Thread-signal per day
  (Auspice already does "strongest match, one per device", `routes/auspice.ts`).

## Consequences

### Positive
- No per-day LLM for the common case; push quality is LLM-grade and continuous with the report.
- The queue + deterministic matcher make the send path trivial and cheap to operate.
- Generalizes cleanly to timeline / what-if harvest (same `source` column, same queue).

### Negative / Deferred (greenfield delivery stack — NOT in the prototype)
- **Kindred push registration**: `apps/kindred-app` must register an Expo token + prefs
  (mirror `apps/auspice-app/lib/serverPush.ts`); add a `kindredPushSubs` (or extend `pushTokens`).
- **Scheduler + targets endpoint**: `GET /api/kindred/push/targets` that, per timezone, runs
  Layer-1 over each user's active `userBonds`, matches conditional/dated queue rows, returns
  pre-rendered messages (mirror `/api/auspice/timeline/push/targets`).
- **Cron**: `runKindredPush` in `services/svc-notify/src/index.ts` (no kindred slot today).
- **Layer-3 planner** + a **template floor** for empty queues.

### Risk
- Queue starvation for cold Threads until Layer-3 lands → mitigate with the template floor.
- Snippet staleness if a relationship's facts change → expire on new report harvest (re-harvest replaces).

## Prototype landed in this change

- `kindred_push_queue` table + migration `0016_clumsy_catseye.sql`.
- `generateRelationshipPushSnippets()` in `hehun.ts` (1 structured `callWithFallback`, non-fatal),
  run in parallel in `svc-astro /pair/compute`.
- API 落库 of `pushSnippets[]` → `kindred_push_queue` (conditional, `source='report'`).

## References
- `packages/astro-core/src/synastry.ts` (`calculateDailySynastry`)
- `services/svc-astro/src/services/hehun/hehun.ts` (`generateRelationshipPushSnippets`)
- `apps/hexastral-api/src/routes/pair/pair.ts` (harvest 落库)
- `apps/hexastral-api/src/routes/cycle-timeline.ts` + `services/svc-notify/src/index.ts` (the delivery precedent to mirror)
