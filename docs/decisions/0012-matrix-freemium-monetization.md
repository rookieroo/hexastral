# ADR-0012: Matrix-wide freemium monetization — instrument-by-engagement, chat as the paid hook, universe bundle

- Status: Accepted
- Date: 2026-05-21
- Amends: [ADR-0009](0009-two-layer-matrix.md) (Tier-3 is no longer "no IAP"; **Fēng & Face Oracle are NOT subscriptions**), [ADR-0006](0006-satellite-tiers.md) (tier→instrument decoupled), [ADR-0010](0010-cycle-satellite.md) (**fate & Yuán gain timeline/notification layers + subscriptions**)
- Builds on: [ADR-0008](0008-three-layer-architecture.md), `apps/hexastral-api/src/config/products.ts`, the K.4 LLM guard, the chat-context-builder
- Companion: [local-manual-checklist.md](../local-manual-checklist.md) §0 + Wave D · [monetization-and-capabilities-plan.md](../monetization-and-capabilities-plan.md) (global plan + build roadmap — authoritative elaboration)

> **Amended 2026-05-21** (see the plan doc for the final model): (1) **fate AND Yuán** both get a proactive **Timeline** (fate = 命运 流年/流月/大运; Yuán = 关系 流年/合盘变化) — engine `astro-core/timeline.ts` shipped for fate, Yuán reuses it. (2) **Chat is multi-layer** — context scales on two axes by tier: history span (时间长度) + token budget (文本长度): free=L1 short → consumable=limited → subscription=full L1–L4 → universe=cross-app. (3) Per-use **price bands**: Fēng = **high**, Face Oracle = **medium**, Coin Cast / Dream / Numerology = **low**. (4) The 3 **subscription flagships** are **fate · Yuán · Cycle** (a monetization label, orthogonal to brand prominence).

## Context

[ADR-0009](0009-two-layer-matrix.md) made Tier-3 satellites "no IAP, pure funnel." That's a dead-end:
a metered LLM feature must be capped for cost, and a cap with no in-app upgrade frustrates users while
leaving money on the table.

Fixing it naively ("every metered feature → a per-app subscription") *also* mis-fits several apps: a
feng-shui audit or a face reading is **episodic**, not recurring — a monthly sub has no repeat value
and (for the VLM-heavy Face Oracle) is cost-dangerous. The right cut is to classify each business as
**recurring** (subscription) vs **episodic** (consumable / one-shot), and to treat **chat** as the
cross-cutting paid hook layered on top of both.

**Key separation:** *brand tier* (Yuán/Fēng are flagships — premium design + prominence) is
**orthogonal** to *monetization instrument*. Fēng stays a flagship but is sold one-shot.

## Decision

### 1. Consistent freemium + limit-as-paywall

Every app: a permanent, usable free tier (deterministic always free; metered LLM capped **per 24h**
via the K.4 guard) + a paid upgrade. Hitting the cap surfaces an **in-app** upgrade (this app / a pack /
Universe), never "go install another app." Gate = the FaceOracle **402-until-entitled** pattern.

### 2. Instrument matches engagement — recurring vs episodic

| Engagement | Apps | Instrument |
|---|---|---|
| **Recurring** (daily / proactive timeline + chat) | **Cycle** (daily 黄历) · **fate** (命运 timeline + 流年/流月/大运 预警) · **Yuán** (关系 timeline + 每日合盘运势) | **per-app subscription** |
| **Episodic, high VLM cost** | **Face Oracle** (面相) | **high-price single / pack** (not sub — unlimited would blow VLM COGS) |
| **Episodic, one-shot asset** | **Fēng** (per-site audit) | **one-shot per site + annual 流年飞星 refresh** |
| **Episodic, low cost** | coin-cast (六爻) · dream (解梦) · numerology (梅花) | **consumable packs** |

**New features required (amends [ADR-0010](0010-cycle-satellite.md) "fate = no DAU"):** the *subscription*
value of fate and Yuán is a **proactive timeline with advance node notifications** — fate: 流年/流月/大运
转折 (push 半年/一月前); Yuán: 关系流年 / 纪念日 / 合盘变化. These are **sparse-periodic** (not daily, so
they don't cannibalize Cycle's daily cadence) and must be **built** — reuse astro-core (`dayun` / `jieqi`
/ `synastry`) + Cycle's `lib/push.ts` pattern.

### 3. Chat = the cross-cutting paid hook, tiered by spend

Chat (LLM Q&A grounded in a reading via the chat-context-builder L1–L4) is pure-LLM → a **paid**
value-add, but with a free taste. It is the consistent conversion hook **and** the main subscription
anchor:

| Tier | Chat |
|---|---|
| Free | ~3 messages per reading (taste the value) → then paywall |
| Paid one-shot / pack | a **bounded** chat allowance per reading (so the report + follow-ups feel complete; cost-bounded) |
| Per-app subscription | **unlimited** (guard-capped) chat about that app's readings — a primary reason to subscribe |
| **universe_pro** | **unlimited cross-app chat** — L3 cross-reading + L4 cross-app memory, so it knows 八字 + 合盘 + feng *together* (the distinctive universe super-power) |

Chat is never deterministic-free and never unlimited-free; the K.4 guard caps daily/cost on every tier.

### 4. Universe Pro

`universe_pro` = (a) unlock all **subscription** features (Cycle daily + fate & Yuán timelines) +
(b) a **capped monthly consumable allowance** toward the pay-per-use apps (bounded so Face Oracle / Fēng
COGS stays well under price) + (c) **unlimited cross-app chat**. Price anchor: the three subs sum to
~$17/mo bought separately → **universe ≈ $12.99/mo**, allowance tuned so COGS ≪ price. *(Optional later:
unify the pay-per-use apps onto a credit currency; v1 uses plain $ prices + the universe allowance —
credits feel gamey to a traditional 玄学 audience.)*

### 5. Unified entitlement (lean)

Subscription entitlements only — `yuan_pro`, `fate_pro`, `cycle_pro`; `universe_pro` grants those +
allowance + cross-app chat. Episodic apps are **credit/one-shot gated, no per-app entitlement**. Drop the
pre-0009 `hexastral_pro` / `faceoracle_pro` / `feng_pro` (sub) keys.

### v1 product catalog (target for `products.ts`)

- **Subscriptions** → entitlement: `yuan_pro_{m,a}`→`yuan_pro` · `fate_pro_{m,a}`→`fate_pro` · `cycle_pro_{m,a}`→`cycle_pro` · `universe_pro_{m,a}`→ all + allowance + cross-app chat
- **One-shots / consumables** (each bundles a bounded chat allowance): `feng_site`(single ~$49) + `feng_refresh`(~$19/yr) · `faceoracle_reading`(single ~$4.99) or `faceoracle_pack_3` · `coincast_cast_pack_10` · `dream_pack_10` · `numerology_pack_10`
- **Dropped**: all `hexastral_*` omnibus products + `hexastral_pro`; `feng_pro_*` (now one-shot); `faceoracle_pro_*` (now consumable); legacy `coincast_pro_*` + `coincast_pro_expires_at` column

## Consequences

### Positive
- Instrument fits each business; chat is a consistent conversion hook **and** the subscription anchor.
- Universe has a distinctive value (cross-app chat) with bounded cost.
- fate & Yuán become genuine recurring-revenue products; the matrix's revenue spreads across subs + one-shots + packs (healthier than "flagships-only subs").

### Negative
- **fate & Yuán timeline/notification layers are NEW builds** (not yet implemented).
- Multi-file reconciliation: `products.ts` + `routes/webhook.ts` + `services/entitlements.ts` + K.4
  guard per-app quota config + a D1 migration to drop `coincast_pro_expires_at`. Pre-PMF (zero users) so
  safe to restructure; must `bun typecheck` on a real machine.
- Pricing here is illustrative — needs market testing.

### Sunset criteria
Per-app: review a subscription/pack if free→paid conversion stays below a launch-set threshold 3 months in.

## References
- [local-manual-checklist.md](../local-manual-checklist.md) — §0 IAP table + Wave D reflect this
- [ADR-0009](0009-two-layer-matrix.md) · [ADR-0006](0006-satellite-tiers.md) · [ADR-0010](0010-cycle-satellite.md) (all amended)
- `apps/hexastral-api/src/config/products.ts` — the SKU↔entitlement source to reconcile
