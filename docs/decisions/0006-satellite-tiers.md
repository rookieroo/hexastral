# ADR-0006: Satellite Tiers

- Status: Accepted (tier model redefined by ADR-0009 — see note below)
- Date: 2026-05-17
- Amends: ADR-0004 (Satellite Integration & Funnel Pattern), ADR-0003 (Compass placement)
- Amended by: [ADR-0009](0009-two-layer-matrix.md) (2026-05-20) — tiers re-cut on a monetization axis; Compass rows historical

> **Phase K amendments (2026-05-20):**
>
> **(a) Compass killed** (see ADR-0003 reverted). All Compass-specific entries below
> (Tier 3 reference app, tier-table row, file references) are historical only.
>
> **(b) Tier model redefined by [ADR-0009](0009-two-layer-matrix.md).** The tiers below
> were a **capability axis** (portfolio / premium-utility / free-utility). ADR-0009
> re-cuts them on a **monetization axis**. The canonical tier model is now:
>
> | Tier | Meaning | Members |
> |---|---|---|
> | **1 · Flagship** | full reading product + Pro IAP + Pro chat | yuan, feng |
> | **2 · High-cost limited** | high inference cost; auth + limited paid (not a flagship) | face-oracle |
> | **3 · Anonymous funnel** | no IAP, ASO target, ends on a flagship upsell | fate-app, coin-cast, dream-oracle, numerology, cycle |
>
> Note the renumber: face-oracle and the other satellites were "Tier 1 portfolio
> satellites" under the old axis; under ADR-0009 face-oracle is **Tier 2** and the rest
> are **Tier 3**. Yuán + Fēng sat *above* the satellite tiers before; they are now Tier 1.
>
> **The old capability checklists below still apply as the build contract for Tier-3
> funnel satellites — minus paywall / RC product IDs** (Tier-3 has no IAP, exactly as the
> old "Tier 3 free utility" forbade). A Tier-3 funnel satellite still needs anonymous
> bootstrap, onboarding, history, portfolio writes + memory document, locked brand palette,
> ASO term, and a `SatelliteFlagshipUpsellCard`; it does **not** define RC products.
> `fate-app` is the new reference; Cycle (ADR-0010) follows the same shape.

## Context

After Phase F's matrix audit (see `docs/phase-f-migration-notes.md` audit table), the 5 satellites had diverged into three de facto shapes:

1. **Coin Cast / Face Oracle / Dream Oracle / Numerology** — full portfolio satellites: bootstrap → onboarding → 2-tab(home/me) → result(share + save-to-flagship) → history → paywall → portfolio-memory writes. Numerology was the laggard (no history / me / portfolio plumbing) until Phase G Week 1 brought it up to parity.
2. **Compass** — intentionally minimal per ADR-0003: a free utility tool with no persistence, no monetization, no portfolio integration. Drops bearings into Fēng via deep link; that's the whole funnel.

The shapes were emergent. The matrix audit also surfaced inconsistencies that were costing us — Numerology had RevenueCat product IDs defined but no UI for them; Compass had RC SKUs in its README but no implementation; onboarding patterns split three ways (`showAuthStep=true` vs `false` vs no onboarding at all).

This ADR locks the shapes as **tiers**, codifies the required capabilities per tier, and stops the drift.

## Decision

> The "Three tiers" block below is the **historical capability-axis model**. For the
> canonical (monetization-axis) tier model post-ADR-0009, see the amendment note at the
> top of this file. The capability requirements remain the build contract for Tier-3
> funnel satellites (minus paywall/RC).

### Three tiers

```
Tier 1 · Portfolio satellite
  Full template — onboarding → 2-tab → portfolio pipeline → history → paywall
  Members (V1): coincast · faceoracle · dreamoracle · numerology

Tier 2 · Premium utility
  Paid utility with lighter funnel (no portfolio reading history needed)
  Members (V1): (none)
  Reserved for: future Compass V1.1 if D30 retention warrants

Tier 3 · Free utility
  Anonymous, single-screen, no monetization, deep-link out to a flagship
  Members (V1): compass
```

### Required capabilities per tier

#### Tier 1 — Portfolio satellite

A satellite is Tier 1 if and only if it ships **all** of the following:

| Capability | Source / contract |
|---|---|
| Anonymous bootstrap | `usePortfolioSatelliteBootstrap` from `@zhop/satellite-runtime` |
| Onboarding gate | `<SatelliteOnboarding showAuthStep={false}>` — **Apple step lives in Me, not onboarding** (see §2 below) |
| 2-tab navigation | `<SatelliteTabLayout>` with one home + one Me tab |
| Me panel | `<SatelliteMePanel>` + `<SatelliteAppleAuth>` |
| History list | `<SatelliteHistoryList target={...}>` |
| Paywall | `<SatellitePaywall>` mounted, RC product IDs wired |
| Result share | text-share via `Share.share` minimum; per-app `SharePoster` PNG via view-shot is the V1.1 polish path |
| Flagship upsell | `<SatelliteFlagshipUpsellCard>` on result screen |
| Portfolio reading writes | `runAuto` from `@zhop/portfolio-client` → backend writes to `portfolioReadings` |
| Portfolio-memory document | `build<Sat>MemoryDocument` in `apps/hexastral-api/src/lib/portfolio-memory.ts` + extended `PortfolioMemoryTargetApp` union |
| Backend pipeline branch | case in `runTargetPipeline` switch (`apps/hexastral-api/src/routes/portfolio.ts`) |
| `PortfolioTarget` union member | `packages/portfolio-client/src/types.ts` + default-flagship entry in `routing.ts` |
| Locked brand palette | entry in `packages/hexastral-tokens/src/satellites.ts` (color must not collide with siblings) |
| ASO term | locked entry in ADR-0004 §2 (primary term may not duplicate another satellite's) |

#### Tier 2 — Premium utility (no members in V1)

Reserved for satellites that should monetize but don't produce indexable readings. Required:

- Anonymous bootstrap (optional — depends on whether the utility benefits from cross-device sync)
- Me panel + Apple Sign In (required for restore purchases)
- Paywall
- Locked brand palette + ASO term

**Not** required: portfolio reading writes, memory document, history list (utility is real-time, not historic).

Promote a Tier 3 to Tier 2 only when post-launch data (D30 retention ≥ 25 %) shows users want pro features.

#### Tier 3 — Free utility

Single-screen anonymous tool with one job and a deep-link CTA. Required:

- Locked brand palette
- ASO term
- `<CoreUIProvider brand="...">` wrap
- Deep-link CTA into the matched flagship

**Not** required: bootstrap, onboarding, Me tab, history, paywall, portfolio writes, RC product IDs (do not define them in `app.json` or README — they create launch-blocking expectations that nobody plans to honor).

### 1. Members and migration rules

| Satellite | Tier | Justification |
|---|---|---|
| coincast | 1 | 3D coin ritual produces a hexagram worth remembering; flagship can recall it |
| faceoracle | 1 | Camera capture is a meaningful one-shot reading; vision pipeline writes to memory |
| dreamoracle | 1 | Dream text → interpretation is a discrete reading worth recall |
| numerology | 1 | Six numbers are a personal portrait worth recall; brought to parity in Phase G Week 1 |
| compass | 3 | Bearings are real-time instrumentation, not "readings". No value in persistence |

**Promotion rule**: Tier 3 → Tier 2 → Tier 1 is a one-way ratchet only triggered by post-launch retention data. Demotion (Tier 1 → Tier 3) is allowed when a satellite fails the [ADR-0004 §7 sunset criteria](0004-satellite-funnel-pattern.md#sunset-criteria-post-launch) and we choose to keep it as a free utility.

### 2. Onboarding pattern — locked

All Tier 1 satellites use `<SatelliteOnboarding showAuthStep={false}>`. Apple Sign In is **only** offered in the Me tab.

Rationale: the first-run moment is the cheapest entry the user has. Adding a sign-in step costs ~30 % drop-off (industry benchmark for non-essential auth gates). Sign-in becomes valuable only when the user wants to save / sync — and that intent surfaces naturally in Me.

Phase G Week 2 migrated coin-cast off `showAuthStep={true}` to align.

### 3. Backend gates — required for Tier 1

Every Tier 1 satellite's preview endpoint must have:

- Per-IP / per-anon rate limit via `c.env.RATE_LIMITER`
- Optional daily guest cap (`evaluateXxxQuota`) — required if the compute is expensive (LLM, vision); optional if deterministic (numerology)

Tier 1 linked endpoint must:

- Require HMAC via the existing middleware
- Write to `portfolioReadings`
- Index into portfolio-memory (gated on `users.portfolioMemoryEnabled`)
- Return `suggestedFlagship` for the result-screen funnel

### 4. RevenueCat hygiene

- **Tier 1**: define RC product IDs in `app.json` AND wire them via `<SatellitePaywall>` AND surface them via the Me upgrade CTA. Three places must move together; partial wiring (IDs without UI, or UI without IDs) is rejected at PR review.
- **Tier 2**: same as Tier 1 minus the history surface.
- **Tier 3**: do NOT define RC product IDs anywhere. They create launch-blocking expectations.

Phase G Week 3 strips Compass's RC mentions from `README.md`.

## Consequences

### Positive

- **No more partial implementations**. RC IDs without UI = bug; UI without IDs = bug; either is caught at PR review.
- **Cheap to onboard a new satellite**. The Tier 1 checklist is a copy-paste from Numerology's Phase G Week 1 commit.
- **Compass is allowed to stay simple**. The audit panic about "Compass is incomplete" goes away once it's classified Tier 3 — it's not incomplete, it's done.
- **Drift detection**: any new Tier 1 satellite missing a row from §1.1's table is a PR-block. CI lint candidate later: `bun lint:satellite-tiers` could grep for the required imports.

### Negative

- One more ADR for new contributors to read. Mitigated by the table being self-contained and the rules being mechanical.
- Promoting Compass to Tier 2 in the future requires more thought than "just add a paywall" — it needs an actual product reason.

### Sunset criteria carried forward

ADR-0004 §7's per-satellite sunset criteria apply to all tiers, but the thresholds differ:

| Tier | Install threshold | Funnel threshold | Notes |
|---|---|---|---|
| 1 | ≥ 500 / mo organic | ≥ 5 % to flagship | Reading writes also count as engagement signal |
| 2 | ≥ 200 / mo organic | ≥ 3 % to flagship | Paid utility — fewer installs OK if conversion is strong |
| 3 | ≥ 1000 / mo organic | ≥ 1 % to flagship | Free utility — install volume IS the funnel |

## References

- [ADR-0003](0003-compass-satellite.md) — Compass placement (this ADR locks it as Tier 3)
- [ADR-0004](0004-satellite-funnel-pattern.md) — Brand matrix + ASO + funnel mechanics
- [docs/phase-f-migration-notes.md](../phase-f-migration-notes.md) — capability audit that surfaced the tier split
- `packages/satellite-ui/src/` — Tier 1 primitives (`SatelliteOnboarding`, `SatelliteTabLayout`, `SatelliteMePanel`, `SatelliteHistoryList`, `SatellitePaywall`, `SatelliteFlagshipUpsellCard`)
- `packages/satellite-runtime/src/` — bootstrap + purchases
- `apps/numerology-app` — canonical Tier 1 reference after Phase G Week 1
- `apps/compass-app` — canonical Tier 3 reference
