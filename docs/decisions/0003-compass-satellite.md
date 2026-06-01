# ADR-0003: Compass as a satellite, not a Fēng-only feature

- Status: **REVERTED** (2026-05-20) — Compass satellite was killed during Phase K matrix simplification
- Date: 2026-05-15
- Supersedes / amends: ADR-0002 (extends the satellite tier)
- Amended by: [ADR-0006](0006-satellite-tiers.md) (2026-05-17)
- Reverted by: Phase K matrix simplification (2026-05-20)

> **REVERSAL (2026-05-20)**: The standalone Compass app is killed. Reason: red-ocean
> compass market + Tier-3 utility with weak conversion to Fēng + user education cost
> too high vs Cycle (黄历 satellite) which serves daily-utility need more directly.
> The in-app compass tab inside feng-app survives as a pure magnetic compass utility
> (no separate app, no IAP, no /api/compass route).
>
> Removed in this revert:
>   - `apps/compass-app/` directory (deleted)
>   - `apps/hexastral-api/src/routes/compass.ts` + `/api/compass/*` mounts (deleted)
>   - `compassBearings` D1 table + relations (dropped; never had real users)
>   - `com.hexastral.compass` AASA entry (deleted)
>   - "Open Compass app" deep-link button in feng-app's compass tab (deleted)
>
> Below ADR is preserved as historical context only.

> **Phase G amendment (ADR-0006)**: the pricing table below
> (`hexastral_compass_pro_monthly`, `_lifetime`) is **retracted**. Compass is
> locked to **Tier 3 (free utility)** in V1 — no IAP, no portfolio history,
> no Me tab. Promote to Tier 2 only after post-launch D30 retention warrants
> it. The funnel rationale (Compass → Fēng deep link) in this ADR remains
> authoritative; only the pricing tier table is retracted.

## Context

Phase E (`docs/feng-plan.md`) requires a compass with magnetic-declination
correction to support feng-shui orientation reading. Two placements were
considered:

1. **In-app tab inside Fēng only.** Simple, but invisible to users outside
   the Fēng paywall and absent from App Store utility searches.
2. **Standalone satellite app + in-app tab.** Doubles the build / submission
   work but creates a top-of-funnel utility with high organic install volume.

App Store search volume for "compass" in our target markets (US / SG / MY / JP)
is roughly **two orders of magnitude** higher than for "feng shui." A free
compass listing is an acquisition wedge that the in-app tab cannot replicate.

## Decision

Spawn **Compass** as a new entry in the satellite tier of the HexAstral brand
matrix. Fēng keeps an in-app compass tab for paid-user convenience; the two
surfaces share the same `BaguaCompassOverlay` component from
`packages/scenario-feng` so visual identity stays consistent.

### Surface map

| Surface | Path | Audience |
|---|---|---|
| Compass satellite app | `apps/compass-app/` (bundle `com.hexastral.compass`) | Anonymous free users; pro unlocks logging |
| Fēng in-app tab | `apps/feng-app/app/(tabs)/compass.tsx` | Fēng paying users |
| Web compass | `apps/hexastral-web/app/[locale]/compass/page.tsx` | SEO / browser-only users |
| Web learn page | `apps/hexastral-web/app/[locale]/compass/learn/page.tsx` | SEO bait for "magnetic declination" / "how to use a compass for feng shui" |

### Naming + bundle

Per ADR-0002 satellite naming rules:

| Asset | Value |
|---|---|
| App Store name | `Compass` (or `Compass by HexAstral` if `Compass` is taken) |
| CJK name (zh / zh-Hant) | 羅 (single glyph — matches flagship CJK pattern even though Compass is a satellite, because the seal-script 羅 reads natively as 罗盘 in zh) |
| Bundle id | `com.hexastral.compass` |
| Workspace | `apps/compass-app/` |
| Shared logic package | `packages/scenario-feng` (Compass and Fēng share types + overlay components) |
| RevenueCat product prefix | `hexastral_compass_` |

This is the **first satellite to ship with a CJK alias.** The justification:
Compass is the only satellite whose Chinese-market analog (羅盤 / 罗盘) is a
single-glyph cultural object on par with 緣 / 風, and the in-app tab inside Fēng
is labeled 羅 for consistency. Treating Compass with a CJK alias does not
break ADR-0002 because the App Store name and identity remain Western —
the CJK glyph is a marketing accent, not the primary identifier.

### Funnel design

```
Compass (free, anonymous, organic App Store discovery)
   ↓ contextual prompt at first declination-correction event:
   ↓ "Use this bearing for a personalized feng-shui audit?"
   ↓ DDL → Fēng install (or Fēng open if installed)
Fēng (premium, $59 one-shot / $19.99/mo)
   ↓ in-app compass tab gives paying users the same utility without
     leaving the premium app
```

Conversion target: **≥ 2% Compass → Fēng install within 30 days of Compass
install.** Below this we revisit whether the satellite is pulling its weight.

### Pricing

| SKU | Price | Unlocks |
|---|---|---|
| (free) | — | Live compass needle, true/magnetic toggle, declination value, GPS, 24山 ring overlay |
| `hexastral_compass_pro_monthly` | $1.99 | Bearing logging, multi-point bearings, .csv export |
| `hexastral_compass_pro_lifetime` | $19.99 | Same, one-time |

Compass is intentionally underpriced as a satellite — its value is funnel
volume, not direct ARPU.

### No sign-in for free tier

Free users use Compass anonymously. Sign-in is required only at the moment
the user purchases pro logging (so server-side bearing history has an account
to attach to). This removes the largest install-funnel friction.

## Consequences

Positive:

- Top-of-funnel surface for Fēng without diluting Fēng's premium positioning
- Reusable App Store / hexastral-web SEO presence around "magnetic declination,"
  "true north," "compass calibration" — broad utility queries
- The shared `BaguaCompassOverlay` component compounds investment across two
  apps
- Establishes pattern for future "utility satellite serving a flagship"
  arrangements (e.g., a "Lunar Phase" companion to HexAstral)

Negative:

- Second App Store listing to maintain, submit, and re-review
- Apple may reject "duplicates iOS Compass" — mitigation: clear differentiation
  in screenshots (declination, 24山 ring, bearing log)
- Slight risk of brand confusion if Compass users assume the app does
  feng-shui readings; mitigated by clear copy and the in-app DDL prompt

## References

- ADR-0002: Brand matrix
- `docs/feng-plan.md` — Phase E plan, Compass funnel detail in §4 and §6
- `packages/scenario-feng/` — shared compass / bagua overlay components (to be
  created in Phase E Week 1)
