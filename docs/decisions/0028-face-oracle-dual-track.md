# ADR-0028: Face Oracle dual-track monetization + three-source funnel

## Status

Accepted — 2026-07-18 · **Client renamed 2026-07-18:** product ships as **Xingqi** (`apps/xingqi-app`); API/RC ids remain `faceoracle`.

## Context

The physiognomy satellite needed a high-COGS path (3× Vision + LLM + natal) that still supports retention via subscription Timeline and push. An earlier `face-oracle-app` scaffold accumulated kindred-rsync baggage; the client was reset as a greenfield Xingqi app.

## Decision

1. **Independent app** [`apps/xingqi-app`](../../apps/xingqi-app) — display brand **Xingqi**, bundle `com.hexastral.xingqi`, scheme `xingqi`. Shell chrome from Yuel patterns (Sign-In, BirthForm, Settings, Timeline density) + ADR funnel from the former face-oracle slices — **no bonds / 合盘 / solo 命书**. Not embedded in Yuel/Yuun.
2. **Hard baseline before any paid reading:** left palm + right palm + clear face selfie + birth Form (solar date, 时辰 index, gender; city optional).
3. **Dual IAP** (opaque server ids — product UI says Xingqi):
   - Consumable `faceoracle_reading` — floor **USD 9.99** — one complete result page (includes forward event table).
   - Subscription `faceoracle_pro_monthly` / `faceoracle_pro_annual` → entitlement `faceoracle_pro` — Timeline of Snapshots + Period briefs; monthly **photo-slot** quota (default **6 slots** / UTC month ≈ 2 full refreshes or 6 partials).
4. **Privacy:** images are request-ephemeral; only structured features + reading JSON persist. No `imageBase64` in `portfolio_readings.resultJson`. Biometric consent required before linked processing.
5. **LLM contract:** inputs = face + palm_l + palm_r features + natal summary (+ optional previous features / partialUpdate). Output includes narrative + structured `events[]` (3 or 6 month horizon). Each successful reading replaces the user's active event table used for Pro push.
6. **Push (Pro only):** monthly re-capture reminder; event-window reminders from the active event table. Copy uses “宜留意” framing — not deterministic fate (ADR-0003).
7. **Identity:** portfolio session (`usePortfolioSatelliteBootstrap`, `PORTFOLIO_TARGET_APP=faceoracle`) — SignInSheet uses portfolio Apple/Google exchange.
8. **UI tokens:** `CoreUIProvider brand='faceoracle'` (jade palette). Display strings say Xingqi.

## Consequences

- Server catalog keeps `faceoracle_*` products; client entitlements recognize `faceoracle_pro`.
- Palm structured extract lives on svc-astro (`/physiognomy/extract-palm-features`).
- AGENTS birth-info table: Xingqi requires birth + three photos.
- `apps/face-oracle-app` retired.

## References

- [apps/xingqi/product.md](../apps/xingqi/product.md)
- [0003-portfolio-voice-compliance.md](./0003-portfolio-voice-compliance.md)
