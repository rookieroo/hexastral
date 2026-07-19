# ADR-0028: Face Oracle dual-track monetization + three-source funnel

## Status

Accepted — 2026-07-18 · **Client renamed 2026-07-18:** product ships as **Xingqi** (`apps/xingqi-app`); API/RC ids remain `faceoracle`.  
**Amended — 2026-07-19:** Pro adds Life axis (WHEN) + What-if under `faceoracle_pro`; Snapshots renamed **History / 档案**. HTTP must not call Yuun `/api/auspice/*` — use faceoracle-owned `/api/physiognomy/cycle/*` facades over shared cycle compute.  
**Amended — 2026-07-19 (cache):** VLM extract is content-addressed per user (`content_hash` on `user_physiognomy_features`); same image bytes + type + model + schemaVersion skip Gemini. Job layer keeps featureId-triple 409 / in-flight dedupe. No source-image retention.  
**Amended — 2026-07-19 (locale + dual quota):** Reading body locale is frozen at generation; device locale switch updates chrome only. Pro meters split into photo slots (6/mo) and report regenerations (3/mo). Explicit `regen: true` bypasses `features_unchanged` and charges report regen. Prompt language uses Route-B blocks; reading LLM stays CF flagship.

## Context

The physiognomy satellite needed a high-COGS path (3× Vision + LLM + natal) that still supports retention via subscription surfaces and push. An earlier `face-oracle-app` scaffold accumulated kindred-rsync baggage; the client was reset as a greenfield Xingqi app.

Matrix rule: satellites share **infra and packages**, not each other’s product HTTP. Yuun owns `/api/auspice/*` (anonymous `deviceId`, `auspice_pro`). Xingqi is portfolio + HMAC + `faceoracle_pro`. Kindred already follows the pattern (own make-if/monthly routes + shared libs).

## Decision

1. **Independent app** [`apps/xingqi-app`](../../apps/xingqi-app) — display brand **Xingqi**, bundle `com.hexastral.xingqi`, scheme `xingqi`. Shell chrome from Yuel patterns (Sign-In, BirthForm, Settings, report density) + ADR funnel — **no bonds / 合盘 / solo 命书 chapters**. Not embedded in Yuel/Yuun.
2. **Hard baseline before any paid reading:** left palm + right palm + clear face selfie + birth Form (solar date, 时辰 index, gender; city optional).
3. **Dual IAP** (opaque server ids — product UI says Xingqi):
   - Consumable `faceoracle_reading` — floor **USD 9.99** — one complete result page (includes forward event table).
   - Subscription `faceoracle_pro_monthly` / `faceoracle_pro_annual` → entitlement `faceoracle_pro`:
     - **History / 档案** — reading snapshots + period briefs; monthly **photo-slot** quota (default **6 slots** / UTC month) plus **report regenerations** (default **3** / UTC month for same-photo locale/body rewrite).
     - **Life axis / 人生时间线** — Yuun-parity git-graph UI (大运→流年→流月) driven by birth; Pro ghost locks match Yuun grammar.
     - **What-if / 假如** — Yuun-parity alternate forks + diff + narrate.
     - Report **划词 chat** (free-taste then Pro) via `/api/chat` + `readingType: physiognomy`.
4. **API ownership (Life axis / What-if):**
   - **Do not** call `/api/auspice/timeline`, `/makeif*`, `/monthly` from Xingqi.
   - Mount **HMAC** facades under `/api/physiognomy/cycle/*` that reuse shared cycle **compute** (extracted from the Auspice timeline assembler).
   - Server-gate with `faceoracle_pro` / `universe_pro` (never trust client `isPro`).
   - LLM fair-use guard namespace `faceoracle-timeline` (or `faceoracle`) — separate from Yuun `cycle` / `auspice-timeline` budgets.
   - Persist make-if forks as `owner = user:faceoracle:{userId}` (not Yuun `device:` space).
5. **Privacy:** images are request-ephemeral; only structured features + reading JSON persist. No `imageBase64` in `portfolio_readings.resultJson`. Biometric consent required before linked processing. VLM cache stores **content hash** of image bytes (not the image) scoped to `userId`.
6. **LLM contract (reading job):** inputs = face + palm_l + palm_r features + natal summary (+ optional previous features / partialUpdate). Output includes narrative + structured `events[]` (3 or 6 month horizon). Each successful reading replaces the user's active event table used for Pro push. `events[]` remain the **形气窗口** layer (push + period chapter + optional strip on Life axis) — **not** the git-graph trunk. Re-enqueue with the same featureId triple is rejected (`features_unchanged`) unless `regen: true` (Pro report-regen meter). In-flight same triple returns 202 `deduped`. Text generation uses **flagship** CF Workers AI + Route-B locale blocks; VLM remains Gemini.
7. **Push (Pro only):** monthly re-capture reminder; event-window reminders from the active event table; optional Life-axis deep links to `/timeline`. Copy uses “宜留意” framing — not deterministic fate (ADR-0003).
8. **Identity:** portfolio session (`usePortfolioSatelliteBootstrap`, `PORTFOLIO_TARGET_APP=faceoracle`) — SignInSheet uses portfolio Apple/Google exchange.
9. **UI tokens:** `CoreUIProvider brand='faceoracle'` (jade palette). Display strings say Xingqi.
10. **Report interaction (Yuel-parity):** term tap → gloss bubble; sentence long-press → SelectionActionBar (copy / chat / highlight); LivingLayerFab → Life axis / What-if / Chat.

## Consequences

- Server catalog keeps `faceoracle_*` products; client entitlements recognize `faceoracle_pro`.
- Palm structured extract lives on svc-astro (`/physiognomy/extract-palm-features`).
- AGENTS birth-info table: Xingqi requires birth + three photos.
- `apps/face-oracle-app` retired.
- Home list labeled **History / 档案** (not “Timeline”); **Timeline** means Life axis only.
- Auspice routes stay Yuun-only; shared math may live in `lib/cycle-timeline-compute` (or equivalent) called by both Auspice mounts and physiognomy facades.

## References

- [apps/xingqi/product.md](../apps/xingqi/product.md)
- [0003-portfolio-voice-compliance.md](./0003-portfolio-voice-compliance.md)
- [apps/yuun/timeline-makeif-gitgraph.md](../apps/yuun/timeline-makeif-gitgraph.md) — UI grammar reference (not HTTP ownership)
