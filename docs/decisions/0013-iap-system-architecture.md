# ADR-0013: IAP system architecture — single-source entitlements, capability resolver, credit ledger

- Status: Accepted
- Date: 2026-05-22
- Builds on: [ADR-0012](0012-matrix-freemium-monetization.md) (the monetization **model** this implements), `apps/hexastral-api/src/config/products.ts`, `services/{entitlements,quota}.ts`, `routes/{webhook,purchase,chat}.ts`, `lib/access-check.ts`, the K.4 guard, the chat-context-builder
- Companion: [monetization-and-capabilities-plan.md](../monetization-and-capabilities-plan.md) (B-iap build roadmap)

> ADR-0012 decided the *business* model. This ADR decides the *system architecture* that implements it: how money→access actually flows, end to end, across the matrix.

## Context

ADR-0012 settled instrument-by-engagement (3 subscription flagships **fate / Yuán / Cycle** + episodic consumables for Fēng/Face/Coin/Dream/Numerology + a `universe_pro` bundle + chat as the tiered hook). The *implementation* still runs **two disconnected entitlement models**:

- **Legacy global Pro** — `users.subscription_status` → `isProUser()` drives **all** gating (chat, `checkReadingAccess`, quota). It is set **only** for `hexastral_pro` (the retired omnibus).
- **New per-flagship** — `user_entitlements` (`fate_pro`/`yuan_pro`/`cycle_pro`/…) written by the RevenueCat webhook, but read by almost nothing (only `universe_pro` → chat tier).

**Result (the headline bug):** a `fate_pro` / `yuan_pro` / `cycle_pro` subscriber has `subscription_status='free'` → `isProUser=false` → **blocked from chat (402 at `routes/chat.ts`) and from quota-gated readings**. The new subscriptions are sold but unlock nothing server-side.

Supporting problems: credits are scattered per-type columns (`chat_credits_remaining`, `divination_credits_remaining`, `coincast_credits_remaining`); verification is webhook-only (no reconciliation, non-atomic `consume`); the client reads entitlements from the RC SDK only (5 keys, missing `cycle_pro`/`fate_pro`) and ignores the existing `GET /api/users/me/entitlements`; and the yuan-app product IDs (`hexastral_yuan_pro_monthly`) diverge from the server catalog (`yuan_pro_monthly`).

## Decision

### 1. Single source of truth: `user_entitlements` (server-canonical)
D1 `user_entitlements` is the authority for subscription access. `users.subscription_status` / `subscription_plan` / `subscription_expires_at` become a **derived back-compat shim** during migration and are dropped in P5. The client treats `GET /api/users/me/entitlements` as canonical (RC SDK = fast local cache + refetch trigger), resolving the 5-vs-7-key and product-ID divergences.

### 2. Capability resolver (one gating engine)
All gating goes through one resolver keyed on the active entitlement set — never `isProUser`. A **capability** is the unit gated; each maps to the entitlement(s) that grant it:

| Capability (app) | Granted by | Instrument |
|---|---|---|
| fate (命) | `fate_pro` ∪ `universe_pro` | subscription |
| yuan (緣) | `yuan_pro` ∪ `universe_pro` | subscription |
| cycle (黄历) | `cycle_pro` ∪ `universe_pro` | subscription |
| feng (风水) | one-shot purchase ∪ universe allowance | episodic |
| face (面相) | consumable credit ∪ universe allowance | episodic |
| coincast / dream / numerology | pack credit ∪ universe allowance | episodic |

`hasCapability(entitlements, cap)` + `resolveChatTier(...)` (→ `free`/`pro`/`universe`) replace scattered `isProUser` checks. `lib/access/capabilities.ts` is **pure** (no DB) so it is exhaustively unit-testable; thin async wrappers fetch the entitlement set. **Face Oracle is episodic** (per-reading consumable, ADR-0012) — `faceoracle_pro` (shipped in K.3) is being retired, not extended.

### 3. Subscriptions = unlimited, abuse-capped (retire metered pools for subs)
Subscription value (ADR-0012) is *unlimited* timeline + chat. The metered `subscription_quotas` pools (pair / divination / chatPool) were built for the single-Pro era; for the new subs, access is unlimited within the app, abuse-capped by the **K.4 daily guard** rather than a monthly pool. The pools survive only on the legacy omnibus path until P5.

### 4. Unified credit / allowance ledger
Replace the per-type columns with a `user_credits(user_id, credit_type, balance, source, reset_at)` table. The **universe monthly allowance** is a `source='allowance'` bucket topped up on RENEWAL (resets, no rollover), consumed before `source='purchased'` credits. Episodic apps spend purchased/allowance credits through one resolver — no column sprawl, and the universe bundle's "capped monthly allowance" (ADR-0012 §4) gets a real home.

### 5. Verification hardening
(a) Client adopts `GET /me/entitlements` as canonical. (b) Add a RevenueCat REST reconciliation fallback (on app launch / scheduled sweep) so a missed webhook self-heals — today drift is unrecoverable (the backend is purely webhook-push). (c) Make `POST /purchase/consume` atomic (single conditional UPDATE) to close the read-then-write double-spend race. (d) Keep the solid bits: webhook Bearer-secret (constant-time) + `rc_event_id` UNIQUE + KV idempotency.

### 6. Product-ID naming convention
Subs `<flagship>_pro_{monthly,annual}` (e.g. `yuan_pro_monthly`); episodic `<app>_<kind>` (`feng_site`, `faceoracle_reading`, `coincast_cast_pack_10`). `products.ts` is the single catalog; client `growth-config` **imports** IDs, never redefines them. Reconcile the yuan-app divergence before the manual ASC/RC product setup.

### 7. Phased migration (dependency-true; P1–P3 server-verifiable)
- **P1** (this change): capability resolver + rewire **chat** off `isProUser` → entitlements, with the **free-taste** tier. Fixes the headline "subscribers blocked" bug. Pure + unit-tested.
- **P2**: `user_credits` ledger + universe allowance + episodic gates (feng one-shot, **face sub→consumable flip**, coin/dream/numerology packs) + `checkReadingAccess` on entitlements; subscriptions go unlimited.
- **P3**: verification hardening (client `/me/entitlements`, RC reconciliation, atomic consume).
- **P4**: client paywalls — offerings / restore / post-purchase verify across satellites; feng + face flows (real device / EAS).
- **P5**: drop legacy `subscription_status` / `hexastral_pro` / `coincast_pro_expires_at` + omnibus products (with the hexastral-app deletion, Phase K Wave 4).

## Consequences

### Positive
- One gating path; subscriptions actually unlock what they sell; the credit model extends without column sprawl; verification self-heals; client/server entitlements converge.

### Negative
- Touches the billing core (webhook / quota / access) — pre-PMF (zero users) so safe to restructure, but every change must `bun typecheck` + `bun test` on a real machine. P4 needs a device/EAS. The credit ledger is a D1 migration (P2).

### Risk
- The legacy `isProUser` shim must remain until P5 so any existing omnibus-Pro / CoinCast user keeps access — resist deleting `subscription_status` readers before then.

## References
- [ADR-0012](0012-matrix-freemium-monetization.md) (model) · [monetization-and-capabilities-plan.md](../monetization-and-capabilities-plan.md) (B-iap)
- `config/products.ts` · `services/entitlements.ts` · `services/quota.ts` · `lib/access-check.ts` · `routes/{webhook,purchase,chat}.ts` · `lib/reading-context-builder.ts` (`ChatTier`)
