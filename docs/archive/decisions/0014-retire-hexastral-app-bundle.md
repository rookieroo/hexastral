# ADR-0014 · Retire `com.hexastral.hexastral` App Store Bundle ID

**Status**: ACCEPTED · 2026-05  
**Supersedes**: prior flagship-app references in ROADMAP / phase-k-plan / monetization plan that assumed `hexastral-app` as an all-in-one storefront

---

## Context

The `hexastral-app` (working name 命Kindred卦道) was scoped in early planning as an all-in-one storefront combining 8 metaphysics business lines (BaZi, Zi Wei, Feng Shui, face/palm, I-Ching, dream interpretation, numerology, lunar calendar).

The app was submitted to App Store Connect under bundle ID `com.hexastral.hexastral` and was **rejected under Guideline 4.3(b) Design — Spam** in the "saturated astrology / horoscope / palm reading / fortune telling / zodiac" category. The rejection language explicitly cited the saturated-category problem and recommended:

> "We encourage you to reconsider the app concept and submit a new app that provides a unique experience not already found on the App Store."

The all-in-one storefront concept inherently combines all of the explicitly-cited trigger categories in a single submission. There is no realistic reframing that gets `hexastral-app` past a 4.3(b) reviewer.

## Decision

1. **`com.hexastral.hexastral` is RETIRED PERMANENTLY**. No future submission may reuse this bundle ID. Apple's account history will remember the 4.3(b) rejection on this bundle; resubmitting under the same ID compounds risk.

2. **The `apps/hexastral-app/` directory remains in the monorepo** for now as a historical reference (legacy schemas, in-progress UI work that may inform satellite apps). It is **not actively developed** and **not built** by `bun dev` / `bun build` for ship purposes.

3. **The "flagship" role transfers** to the new tier structure (per ADR-0012 revision in `docs/anti-spam-positioning.md`):
   - Subscription flagships: `cycle` + `yuan`
   - High ASP: `feng` + `face-oracle`
   - Funnel: `fate` + `numerology` + `coin-cast` + `dream-oracle`
   - There is no longer a single "flagship" all-in-one app.

4. **`useone.tech` (the corporate site)** retains the "HexAstral parent brand" presentation — it is the legal-entity site for UseONE, LLC and can describe the 8-app suite collectively without being itself an App Store submission. The marketing umbrella exists; only the all-in-one *app* is retired.

5. **The brand name "HexAstral" remains** as the master brand. The 8 satellite apps each carry the HexAstral parent brand in their App Store developer attribution (when 4 priority apps eventually ship under UseONE, LLC developer account).

## Consequences

### Positive
- Removes the highest-risk 4.3(b) target from the launch sequence.
- Forces each remaining app to defend its own "non-astrology" positioning individually — easier than defending an 8-category aggregate.
- Permits per-app category specialization in App Store (Education for fate, Reference for cycle, Lifestyle for yuan/feng) instead of forcing a single category onto an aggregate.
- Frees engineering attention to focus on the 4 priority satellites (fate / cycle / yuan / feng) rather than splitting between satellites + an all-in-one.

### Negative
- Loses the "single-install, all 8 metaphysics tools" user value proposition. Users wanting multiple HexAstral tools must install multiple apps OR use the PWA (hexastral.com) which retains the all-in-one form.
- Marketing collateral that referenced "Download HexAstral" must redirect to either (a) a specific satellite app or (b) hexastral.com PWA.

### Neutral
- The `EntitlementKey` `universe_pro` continues to make sense as a bundle subscription (grants auspice_pro + kindred_pro + fate_pro across 3 satellite apps). The "universe" is the *bundle of entitlements*, not a single app.

## Operational steps required

- [x] Document the retirement (this ADR)
- [ ] Remove `apps/hexastral-app/` from any active CI matrix / EAS build profile (audit `turbo.json`, `package.json` workspace patterns — currently `apps/*` includes it; consider explicit exclude or leave as no-op since no `deploy` script exists for it)
- [ ] Confirm `apps/hexastral-app/app.config.cjs` is not referenced by EAS submission pipeline
- [ ] Update `docs/ROADMAP.md` to remove any "flagship hexastral-app" milestones
- [ ] Update `docs/launch-guide.md` table to remove any `com.hexastral.hexastral` references
- [ ] Update marketing copy on useone.tech to stop describing HexAstral as "a single app suite"
- [ ] In App Store Connect, mark the rejected `com.hexastral.hexastral` submission as withdrawn (do not attempt resubmit)

## Links

- `docs/anti-spam-positioning.md` — the full anti-spam playbook this retirement is part of
- `docs/decisions/0012-flagship-subscription-tiers.md` — prior tier structure (now superseded)
- App Store Connect rejection email (archived offline) — 4.3(b) reasoning

## Open items

If a future business reason ever demands an "all-in-one HexAstral experience" again, the path is **PWA at hexastral.com**, not a new App Store submission. The PWA can host all 8 features under one URL without re-triggering 4.3(b) on Apple's side.
