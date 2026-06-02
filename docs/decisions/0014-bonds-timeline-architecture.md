# ADR-0014: Bonds timeline architecture — pairwise fan-out, server-side merge, local push

- Status: Accepted
- Date: 2026-05-22
- Builds on: [ADR-0012](0012-matrix-freemium-monetization.md) (Kindred = subscription flagship, value = Timeline + tiered chat), [ADR-0013](0013-iap-system-architecture.md) (capability resolver / entitlement gate), `packages/astro-core/src/relationship-timeline.ts` (the pairwise engine this composes), `apps/hexastral-api/src/db/schema.ts` (`userBonds`, `pairReadings`)
- Companion: [bonds-timeline-plan.md](../bonds-timeline-plan.md) (BT.0–BT.6 build roadmap)

> ADR-0012 decided Kindred's subscription value is the **Timeline** (proactive prediction) plus tiered chat (passive retrieval). This ADR decides the *architecture* of the ego-centric multi-bond timeline — one time axis weaving 本我 × all bonds — that is Kindred's subscription moat.

## Context

The pairwise relationship engine is shipped: `getRelationshipTimelineNodes(A, B)` ([relationship-timeline.ts:189](../../packages/astro-core/src/relationship-timeline.ts)) computes per-year 流年 冲/合 against both day-branches plus either party's 大运 transitions, all UTC-deterministic. What does **not** exist is the ego-centric merge: one 本我 calendar overlaying the significant future nodes of *all* the user's relationships, proactively pushed, tap-to-explain via LLM.

A founder call (2026-05-22) locked three framing decisions that override the earlier "ship single-pair first / don't touch schema" caution:

1. **Merged multi-bond view ships directly as MVP** — no standalone single-pair release. Single-pair timeline is the N=1 degenerate case of the merged view.
2. **Recompute-on-write, never daily cron** — the timeline is a pure function of birth charts; recompute only when the bond set or ego birth data changes, then cache.
3. **Collect full birth precision now, schema is free to change** — no real users, not in production (per CLAUDE.md house rules), so adding precision columns is safe.

## Decision

### D1 — Pairwise fan-out, no N-body reading

The merged axis is `⋃ getRelationshipTimelineNodes(ego, bond_i)` over each bond, **not** a single N-body synastry reading.

Why: 命理 synastry is intrinsically pairwise (合婚 = two charts' 干支 冲/合/刑/害). There is no mature framework for reading N charts simultaneously; feeding an N-body prompt to an LLM forces fabrication, violating monetization §7 ("LLM polishes, does not decide"). Fanning out keeps every node grounded in a deterministic pairwise computation.

### D2 — Server-side merge (privacy-driven)

The merge runs server-side and the response carries **only derived nodes** (date / kind / significance / bond name / label / id) — never personB's raw birth date/time.

Why: [schema.ts](../../apps/hexastral-api/src/db/schema.ts) is explicit that B's birth chart is not exposed to A. For a resonance bond, the counterpart's raw chart lives in `pairReadings` and **must not be shipped to the ego's device**. A solo bond's target chart could be computed on-device, but the server handles both modes uniformly so the privacy boundary has a single enforcement point. The client receives a calendar of derived nodes, never the underlying charts.

### D3 — Push via local notifications, not server cron

The server returns a *future push schedule*; the client schedules a rolling window with `expo-notifications` and re-schedules on app open.

Why: this mirrors the cycle-app pattern ([cycle-app/lib/push.ts](../../apps/auspice-app/lib/push.ts), `scheduleDailyAlmanac` / `refreshDailyPush`). No push tokens, no server cron, no per-device delivery infrastructure. The per-user global push cap (so N bonds don't each fire independently) is computed server-side in the merge; the client just lays the resulting schedule onto its local notification queue.

## Consequences

### Positive
- The moat reuses shipped, tested deterministic engines — the new code is one merge/sort/cap pure function (`composeBondsTimeline`), one server read route, one client screen. Low surface area, high differentiation: a chatbot cannot produce a forward-looking calendar across all relationships.
- Privacy boundary has one enforcement point (the server route); the client never sees raw counterpart charts.
- No new push/cron infrastructure — local notifications are already proven in cycle-app.

### Negative
- Server holds counterpart charts during merge — the route must be audited line-by-line to confirm derived-nodes-only responses (no `personB` date/time leakage). The plan flags this as a load-bearing assumption to verify in BT.3.
- Birth-precision schema change (BT.2) is a D1 migration touching `userBonds` + `pairReadings`, and onboarding UIs must collect the new fields.

### Risk
- **Cache staleness**: recompute-on-write means every mutation point (solo create, resonance respond, `PATCH`/`DELETE`, ego birth `PUT`) must invalidate the cache; missing one leaves the axis stale.
- **Push flooding**: mitigated by the server-side global cap, not per-pair independent scheduling.

## References
- [ADR-0012](0012-matrix-freemium-monetization.md) (model: Timeline §2 vs chat §3) · [ADR-0013](0013-iap-system-architecture.md) (capability gate) · [bonds-timeline-plan.md](../bonds-timeline-plan.md) (BT roadmap)
- `packages/astro-core/src/relationship-timeline.ts` (pairwise engine) · `apps/hexastral-api/src/db/schema.ts` (`userBonds` / `pairReadings`) · `apps/auspice-app/lib/push.ts` (local push pattern) · `apps/hexastral-api/src/lib/access/capabilities.ts` (yuan gate)
