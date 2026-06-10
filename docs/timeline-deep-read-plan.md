# Timeline deep-read + 流月 window + 落库 + push — build spec

> **Status**: BUILT — typecheck-clean, **deploy-gated** (2026-06-10). P0 + P1 + P2
> all coded; migration `0012_petite_tana_nile` generated and in sync. Founder
> decisions baked in: 流月 window = next **12 months**; navigating to a **further
> year → on-demand LLM generate + 落库**. This is a server + D1 + LLM + cron
> feature — code is done and compiles, but it CANNOT be verified/deployed from the
> agent sandbox (CI is validation-only; svc-astro + D1 + cron run only on a local
> `bun deploy`). Remaining work is the human deploy + on-device verify (see §7).
>
> **HEADLINE (founder, 2026-06-10):** the **流月 / 流年 / 大运 three-dimension node
> push is the #1 paid-subscription hook** — the primary reason to go Pro, not a
> retention afterthought. And **落库 is mandatory** — without durable persistence
> the LLM regenerates the same (deterministic-input) reading every time. So the
> build is really one thing: a **persisted per-node deep-read** that BOTH the
> in-app view AND the push draw from — generate-once, reuse-everywhere.
>
> **Build log (what shipped, 2026-06-10):**
> - **P0** `timeline.tsx` — 流月 next-12-months window, default-open current period,
>   age-primary chips (干支 zh-only/muted), locale-aware 大运 labels.
> - **P1** `POST /api/auspice/timeline/explain` (`cycle-timeline.ts`) — `resolveNodeFacts`
>   reuses `personalAlmanacOverlay`; reads/writes **`timeline_readings`** D1 table
>   (落库, permanent); `llm-guard` for spend; calls svc-astro `/timeline/explain`
>   (superset schema, now serves 流月 + the 对你而言 overlay); client `fetchTimelineExplain`
>   + `timeline.tsx` deep-read swap-in.
> - **P2** `runAuspiceTimelinePush` (`svc-notify/index.ts`) — month-starts 09:00 local;
>   `GET …/timeline/push/targets` picks ONE node/device (大运 boundary > 流年 Jan-1 >
>   流月), deterministic teaser; rich LLM read generated lazily in-app on tap (落库,
>   reused). No per-user LLM in the cron → no thundering herd.
> - **Pref plumbing** `timeline_remind_on` column → register endpoint → `serverPush`
>   → `push.ts` reads `isTimelineRemindersEnabled()`. Local `scheduleTimelineReminders`
>   **defers when server push is active** (mirrors daily) → no double-fire.
> - **Bonus** evening daily push now appends the deterministic 对你而言 fit (zero cost).

## 0. The problem (from on-device feedback)

The timeline's per-node reading is **deterministic canned advice**
(`t.timelineAdvice[fit]` in `apps/auspice-app/app/timeline.tsx` `resolveNodeDetail`)
— too thin; users "感知不到价值". 流月 (months) currently weave deterministically
for a selected year with no rich reading. We want richer per-node readings (LLM),
focused on the actionable **next 12 months**, with depth generated on demand and
**persisted (落库)** so it's instant on re-view and reusable by push.

## 1. Reuse — almost all the infra already exists

| Need | Already in repo |
|---|---|
| Per-node LLM deep-read (recompute node → guard → cache → svc-astro → deterministic fallback → Pro tier) | **`/api/timeline/explain`** (`apps/hexastral-api/src/routes/timeline.ts`, fate) and its mirror **`/api/auspice/explain`** (C.4) |
| On-demand LLM → **D1 落库** (durable persist) | **`makeifForks`** table + `auspice.ts:1759` (`source:'cache'`) |
| Deterministic timeline data cache | **`lifeTimelineCache`** table (30-day TTL) |
| LLM cost control (daily/lifetime/global budget, anon vs signed, template fallback) | **`llm-guard.ts`** (`evaluateLlmGuard`/`recordLlmGuardGrant`) |
| Push subscriptions | **`auspicePushSubs`** table |
| Local timeline reminders + the settings toggle | `scheduleTimelineReminders` (push.ts) + **`timelineRemindToggle`** |

The gaps to close: (a) **流月 nodeType** in the explain endpoint, (b) **D1 落库**
instead of KV-24h (so cron can reuse it; and a deterministic-input reading is
stable forever, so it should be cached forever, not 24h), (c) **wire the
auspice timeline client** to the deep-read, (d) the **svc-astro prompt** for the
流年/流月 read, (e) the **cron** that reuses the cache.

## 2. The model (decided)

- **Free / instant layer (all periods, client-side, deterministic):** the spine,
  the 吉/平/凶 verdict dot, the one-line `timelineAdvice` — unchanged, zero cost.
- **流月 window = next 12 months:** the deterministic 流月 weave focuses on the
  coming ~12 months (current year's remaining months → into next year). This is
  the "actionable now" window; past months are not woven (done — 2026-06).
- **Pro deep-read layer (per node, LLM, on-demand, 落库):** opening a 流年/流月
  node fetches a rich reading.
  - Within the 12-month window → pre-warmed / fast.
  - **Navigating to a further year (再下一年) → dynamically generate via LLM and
    落库** — exactly the make-if on-demand pattern. Once persisted, re-views and
    the cron push reuse it (no regen). Inputs are deterministic (birth + period),
    so the cached reading is permanent.
  - Free taste / guard-exhausted → degrade to the deterministic `summary` + the
    existing 流月 upsell (`timelineLiuyueUpsell`, shipped 2026-06).

## 3. Build phases

### P0 — client, deterministic (buildable + typecheck-verifiable in-sandbox)
- 流月 weave focuses the **next 12 months**; default-open the current period
  (the "直给当前年" ask) — small client change in `timeline.tsx` / `lib/liuyue`.
- Coverage hints: the free-preview note + the shipped `timelineLiuyueUpsell`
  already say "this year & ahead"; add the explicit 12-month framing.

### P1 — the deep-read (server + D1 + svc-astro + client wiring) — **deploy-gated**
1. **D1 cache table** (落库). Reuse the `makeifForks` shape or add
   `timelineReadings`: key = `(birthHash, gender, timeIndex, nodeType, year[, month], locale)`,
   value = `reading text`, `tier`, `createdAt`. Permanent (deterministic input).
   - `birthHash` not raw birth (PII-light, mirrors makeif).
2. **Endpoint**: extend `/api/auspice/explain` (or add `/api/auspice/timeline/explain`)
   to accept `nodeType: 大运 | 流年 | 流月` (+ `month` for 流月) and to **read/write
   the D1 table** (not just GUARD_KV). Keep `llm-guard` for the LLM spend; the D1
   hit is free (no guard). Pro gating via `userId` subject → `tier: 'deep'`.
   - Template fallback = the engine's deterministic `summary` (never blank).
3. **svc-astro prompt** (`/timeline/explain`): author the 流年/流月 deep-read
   prompt — feed it the facts the engine computes (干支, 十神, 用神/忌神,
   冲/合/刑/害, 大运 context, the fit) and ask for a grounded, reflective read
   (NOT prediction — Terms §3 register, same as make-if). 流月 prompt is a finer
   grain (the month within its 流年 within its 大运).
4. **Client wiring** (`timeline.tsx` + `lib/api.ts`): on node select, for Pro,
   `fetchTimelineExplain(...)` → show the deep-read in the `ReadingBubble` (deterministic
   `summary` shown instantly, deep-read swaps in when it returns). Generating state
   for a fresh (uncached) further-year node.

### P2 — cron push (svc-notify) — **deploy-gated** — THE HEADLINE PRO VALUE
- The 流月 / 流年 / 大运 node push IS the subscription (founder, above), not a P1
  add-on. Build it on the SAME 落库 substrate as P1.
- Cadence (the three dimensions):
  - **流月** — 1st of each month → the month's read. The frequent touchpoint
    (~12/yr) that makes the subscription feel alive month to month.
  - **流年** — year boundary → the year ahead.
  - **大运** — transition year → "a new 10-year chapter" (rare, high-significance).
- Cron (svc-notify) → for `auspicePushSubs` rows with timeline reminders on (the
  existing `timelineRemindToggle`) + Pro → **read-or-generate the period's deep-read
  from the shared `timelineReadings` D1 table** (generate-once: if the user already
  opened it in-app it's cached; if not, the cron generates + 落库, and the next
  in-app open reuses it) → Expo push. Free: deterministic verdict in-app only, no
  rich push — the push is the Pro draw.

## 4. Preference setting — **do NOT add one**

There's already `timelineRemindToggle` (Pro, local). Do **not** fragment into
流月 / 流年 / 大运 toggles — the settings tree is already deep (per me.tsx history).
The push just upgrades to server LLM content under the SAME toggle. If over-notify
becomes a complaint, add ONE frequency/quiet option later — never per-type.

## 5. Cost / safety

- `llm-guard` caps LLM spend (anon 1/day, signed 5/day, global budget) — unchanged.
- **落库 = generate-once.** Deterministic inputs → a period's reading never
  changes, so persist permanently and never regen. This bounds total LLM cost to
  ~(periods a user actually opens), and cron reuses the same rows.
- Register-safety: the read is "reflection, not prediction" (Terms §3, make-if
  register) — the svc-astro prompt must hold that line (4.3(b)).

## 6. What's buildable here vs needs local deploy

- **In-sandbox (typecheck only)**: P0 client; P1's client wiring + the `lib/api.ts`
  fetch + the D1 schema definition (Drizzle) + the endpoint code — all compile-checkable.
- **Needs `bun deploy` (local, human)**: the D1 migration, the svc-astro prompt
  deploy, the worker deploy, and any real LLM/cron verification.
