# ADR-0009: Two-Layer Matrix — flagships vs. funnel satellites

- Status: Accepted
- Date: 2026-05-20
- Supersedes: [ADR-0007](0007-hexastral-app-fate-refocus.md) (hexastral-app refocus) — reverted; hexastral-app retired
- Amends: [ADR-0004](0004-satellite-funnel-pattern.md) (brand matrix §1), [ADR-0006](0006-satellite-tiers.md) (satellite tiers)
- Companion: [phase-k-plan.md](../phase-k-plan.md), [cycle-satellite-plan.md](../cycle-satellite-plan.md)

> **Naming — not a collision with [ADR-0008](0008-three-layer-architecture.md).**
> "Two-layer" here names the funnel-top **monetization** split (flagship vs. funnel).
> ADR-0008's "three-layer" names **package-sharing** layers (app / scenario-domain /
> cross-cutting infra). Different axes — one is "who pays", the other is "what's shared".
> The *tier* model below is still **three tiers** (flagship / high-cost / funnel).

## Context

[ADR-0007](0007-hexastral-app-fate-refocus.md) repositioned hexastral-app as the
"Personal Fate (个人命理) flagship." The Phase K matrix audit found a deeper problem
than "hexastral.fate is a weak flagship": hexastral-app is an **omnibus** "命緣卦道"
app whose ASO + tabs sell 命 / 星 / 六爻 / 合婚 / 面相 / 黄历 all at once — overlapping
**four** matrix members simultaneously:

| hexastral-app surface | Already owned by |
|---|---|
| 合婚 / synastry | Yuán |
| 六爻 / yiching | Coin Cast |
| 面相 | Face Oracle |
| 黄历 (planned) | Cycle |

Several of those surfaces are already rotting — the personalized almanac
(`apps/hexastral-app/app/(explore)/almanac.tsx`) is **disabled dead code** since
svc-fortune was deleted, so it renders a locked stub.

An omnibus app cannibalizes the very funnel the matrix is built on
([ADR-0004 §2](0004-satellite-funnel-pattern.md) anti-cannibalization) and ranks for
nothing specific in ASO. The **omnibus shape itself** — not the strength of
hexastral.fate as a product — is the real reason the flagship framing of ADR-0007
failed. This reframes the fix: don't refocus the omnibus, **retire it**.

## Decision

### 1. Two monetization layers, three tiers

The matrix splits on **who produces IAP revenue** (flagship) vs. **who is a free
top-of-funnel** (satellite). FaceOracle is the one exception that is neither.

```
HexAstral (master / LLC publisher)
├── Flagships (Tier 1 — IAP-producing, Pro chat)
│   ├── Yuán / 緣  — relationship & compatibility
│   └── Fēng / 風  — feng-shui
├── Tier 2 (high-cost, auth + IAP — neither flagship nor free)
│   └── Face Oracle (面相) — VLM inference cost; trial-or-paid (see K.3)
└── Tier 3 (anonymous ASO funnels → upsell to Yuán/Fēng; no IAP)
    ├── fate-app (命 — 八字 + 紫微; replaces retired hexastral-app)
    ├── Coin Cast (六爻)
    ├── Dream Oracle
    ├── Numerology (梅花)
    └── Cycle (黄历 — planned, see ADR-0010)
```

- **Only two flagships.** Yuán + Fēng are the sole IAP-producing products and the
  only homes for Pro chat. (Chat moves to them in K.5; it leaves with hexastral-app.)
- **FaceOracle is Tier 2.** It can't be free-anonymous (VLM inference cost) but isn't
  a flagship either — it gets auth + a limited paid model. Billing shape decided in K.3.
- **Everything else is Tier 3 funnel.** Anonymous-first, no IAP, each owns one ASO
  keyword cluster, each ends on a flagship upsell.

### 2. Retire hexastral-app; fate-app replaces only its natal surface

hexastral-app is **deleted**, not refactored in place. A new clean Tier-3 satellite
`fate-app` (pure 八字 + 紫微 personal-fate reading) replaces its only non-overlapping
surface. The rest already have homes:

| Retired surface | Goes to |
|---|---|
| 八字 + 紫微 natal/stellar | **fate-app** (new) |
| 合婚 / synastry | Yuán |
| 六爻 / 梅花 | Coin Cast / Numerology |
| 面相 | Face Oracle |
| 黄历 (dead code) | Cycle |
| Pro chat | Yuán + Fēng (K.5) |

Execution is **fate-app-first**: build fate-app (K.1), then delete hexastral-app once
fate-app + Cycle cover its surfaces (Wave 4). Narrowing hexastral in place is rejected —
it just yields fate-app with legacy baggage. See [phase-k-plan.md §0.1.1](../phase-k-plan.md).

### 3. All funnel satellites end on a server-driven flagship upsell

A Tier-3 satellite has **outbound** `SatelliteFlagshipUpsellCard` (`@zhop/satellite-ui`)
pointing at the actual flagships (Yuán + Fēng) — **not** a hub-style central rail
(hexastral-app's `DiscoverSatellitesSection` was flagship/hub behavior, wrong for a funnel).

The cross-app routing is **server-side configurable** (Cloudflare KV), not hardcoded per
app, so business can re-target funnels without shipping new builds. See K.2:
`GET /api/discovery/recommendations` (shipped 2026-05-20).

### 4. One data flow, not three rival apps

fate-app is a **pure funnel + the matrix's birth-chart capture / identity anchor**.
八字/紫微 is one-time深度 consumption — do **not** chase DAU on fate-app. The 命理 line's
daily-active is served by **Cycle** (黄历 + 对你而言), which reads the chart fate-app captured:

```
fate-app (capture 命盘) → portfolio memory → Cycle (daily 对你而言) + Yuán (合婚) + Fēng (命卦)
```

fate-app KPIs = ASO installs · birth-info capture rate · funnel CTR to Yuán/Fēng ·
downstream personalization seed count — **not** D7/D30. Re-engagement, if any, is
low-frequency milestone push only (大运/流年 transitions), never daily 运势 (that re-creates
the Cycle overlap this restructure removes).

### 5. LLM cost/quality is a shared platform capability

The funnel's LLM cost/quality guard is built **once** as a shared package (K.4 —
Conservative Mode: non-periodic hard limits + optional one-time lifetime peak pass +
graceful template/cache fallback; no time-based "first 3 days Pro" freebies) and consumed
by every low-cost satellite — never forked app-by-app. Deterministic compute (命/卦/day)
stays non-LLM; the guard applies only to the explanation/chat layer.

## Consequences

### Positive

- Cheaper top-of-funnel — no need to make a single app a strong product on its own.
- Cleaner billing model — flagships have IAP, funnels don't, FaceOracle is the one
  documented exception.
- Matrix simplification — the omnibus contradiction with ADR-0004 §2 is gone.
- fate-app is greenfield (no legacy migration to break) and seeds personalization for
  the whole matrix via captured birth charts.

### Negative

- hexastral-app is retired/deleted — its Pro features go away and fate-app replaces only
  the natal surface. Mitigated: **pre-PMF, zero real users** (CLAUDE.md), so feature loss
  has no user cost; every surface has a home elsewhere.
- fate-app has no daily-active loop — **by design** (it's a capture/funnel anchor). 命理
  daily-active lives in Cycle, fed by fate's captured chart.
- Tier numbering is redefined relative to ADR-0006 (capability-axis → monetization-axis);
  this ADR's amendment to 0006 documents the remap so the two don't read as contradictory.

## Alternatives considered

**A. Narrow hexastral-app in place to 八字+紫微 only.** Rejected — yields fate-app with
legacy baggage (old subscription/quota/chat code, omnibus AASA, mixed ASO history) for no
benefit over a clean build.

**B. In-place demotion of hexastral-app to a Tier-3 funnel.** Rejected — highest-churn,
lowest-value: rewires every tab, paywall, and discovery surface of a 命緣卦道 app that we
then keep maintaining. (This was the original phase-k §2 draft, now replaced by K.1.)

**C. Keep hexastral-app as the flagship per ADR-0007.** Rejected — the audit shows the
omnibus shape cannibalizes its own satellites; no amount of polish fixes the shape.

## References

- [phase-k-plan.md](../phase-k-plan.md) — full execution plan (K.0–K.5)
- [cycle-satellite-plan.md](../cycle-satellite-plan.md) — Cycle (黄历) satellite, ADR-0010
- [ADR-0004](0004-satellite-funnel-pattern.md) — funnel pattern (amended by this ADR §1)
- [ADR-0006](0006-satellite-tiers.md) — satellite tiers (amended by this ADR)
- [ADR-0007](0007-hexastral-app-fate-refocus.md) — reverted by this ADR
- [ADR-0008](0008-three-layer-architecture.md) — package-sharing layers (orthogonal axis)
