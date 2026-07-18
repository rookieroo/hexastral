# ADR-0028: Face Oracle dual-track monetization + three-source funnel

## Status

Accepted — 2026-07-18

## Context

Face Oracle was a single-photo teaser scaffold with a consumable `faceoracle_reading` and stale client Pro SKUs. Product needs a high-COGS path (3× Vision + LLM + natal) that still supports retention via subscription Timeline and push.

## Decision

1. **Independent app** `apps/face-oracle-app` (Yuel-quality shell, no bonds). Not embedded in Yuel/Yuun.
2. **Hard baseline before any paid reading:** left palm + right palm + clear face selfie + birth Form (solar date, 时辰 index, gender; city optional).
3. **Dual IAP:**
   - Consumable `faceoracle_reading` — floor **USD 9.99** — one complete result page (includes forward event table).
   - Subscription `faceoracle_pro_monthly` / `faceoracle_pro_annual` → entitlement `faceoracle_pro` — Timeline of Snapshots + Period briefs; monthly **photo-slot** quota (default **6 slots** / UTC month ≈ 2 full refreshes or 6 partials).
4. **Privacy:** images are request-ephemeral; only structured features + reading JSON persist. No `imageBase64` in `portfolio_readings.resultJson`. Biometric consent required before linked processing.
5. **LLM contract:** inputs = face + palm_l + palm_r features + natal summary (+ optional previous features / partialUpdate). Output includes narrative + structured `events[]` (3 or 6 month horizon). Each successful reading replaces the user's active event table used for Pro push.
6. **Push (Pro only):** monthly re-capture reminder; event-window reminders from the active event table. Copy uses “宜留意” framing — not deterministic fate (ADR-0003).

## Consequences

- Server catalog gains `faceoracle_pro` entitlement + products; client `useEntitlements` must recognize it.
- Palm structured extract lives on svc-astro (`/physiognomy/extract-palm-features`).
- AGENTS birth-info table: face-oracle moves to **required**.

## References

- [apps/face-oracle/product.md](../apps/face-oracle/product.md)
- [0003-portfolio-voice-compliance.md](./0003-portfolio-voice-compliance.md)
