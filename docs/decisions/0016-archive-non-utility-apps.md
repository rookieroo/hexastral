# ADR-0016 · V1.5 Deferral of face-oracle / coin-cast / dream-oracle; yuan-v1 deprecation

> **Status**: SUPERSEDED in part · 2026-05-31 · revised same-day
> **Revision**: archive recommendation REVERSED to V1.5 deferral, per user
> observation that face / I-Ching / dream apps exist and pass App Store review.
> See ADR-0017 for V1.5 wave definition.
> **Retains**: yuan v1 → yuan v2 deprecation. Bundle ID reservation strategy.

## Revision summary (2026-05-31)

The original ADR-0016 (drafted ~14:00 same day) proposed archiving face-oracle,
coin-cast, and dream-oracle into `apps/_archived/`. This was reversed several
hours later upon the user's observation that these app categories DO exist and
pass App Store review (Face Reading - Personality, I Ching - Book of Changes,
Dream Decoder, etc.).

Applying the same Conceptual Uniqueness Checklist (ADR-0015 §"Hard rules") to
the 3 deferred apps shows they can score 5.5-6/6 on uniqueness axes when
redesigned per Doctrine v2. **They are not categorically blocked from the
App Store** — they were just under-developed in the V1 frame.

The corrected decision is: **defer (do not archive) face/coin/dream to a
V1.5 wave**, scheduled to begin after V1 (cycle/feng/yuan v2/MingPan) has
proven the Doctrine v2 framing through actual App Store review outcomes.
This is risk-managed scaling, not capability rejection.

## Context (retained from original)

Three satellite apps were deferred from V1 wave per SPAM-9 (2026-05) because
their core feature touches 4.3(b) trigger phrases cited in the hexastral-app
rejection:

- `face-oracle` — "palm reading" was directly cited
- `coin-cast` — "divination" implied
- `dream-oracle` — "fortune-telling / oracle" implied

Under the original ADR-0016 (now revised), these were marked for archival
because they had no daily-utility layer per Doctrine v2. The user's 2026-05-31
observation showed this reasoning was over-cautious:

1. **Face Reading apps DO pass review** — multiple "Face Reading," "Physiognomy,"
   and "Palmistry" apps are live on the App Store
2. **I-Ching apps DO pass** — "I Ching - Book of Changes," "Wisdom of I-Ching"
   and several dozen others are established App Store presences
3. **Dream interpretation apps DO pass** — "Dream Decoder," "Dream Journal
   Ultimate," and others

Therefore the appropriate decision is V1.5 deferral with redesign-to-Doctrine-v2
in the intervening period.

## Decision (revised)

### face-oracle / coin-cast / dream-oracle: DEFER, do not archive

| App | V1 status | V1.5 plan |
|---|---|---|
| face-oracle | NOT in V1 wave; code stays in repo | Redesign as "FaceRead · Classical Physiognomy Reference + Family Face Lineage" per ADR-0017 |
| coin-cast | NOT in V1 wave; code stays in repo | Redesign as "Coincast · I-Ching Study Tool + Hexagram Journal" per ADR-0017 |
| dream-oracle | NOT in V1 wave; code stays in repo | Redesign as "DreamRead · Dream Journal + Classical 解梦 Reference" per ADR-0017 |

### What does NOT change

- `apps/face-oracle-app/`, `apps/coin-cast-app/`, `apps/dream-oracle-app/`
  STAY in active workspace (not moved to `apps/_archived/`)
- `apps/hexastral-api/src/config/products.ts` keeps existing IAP product entries
  (may need pricing/SKU revision in V1.5, but not removal)
- `apps/hexastral-web/lib/legal/data/terms.{en,ja,tw}.json` keeps existing
  "Coin-Cast Pro", "Face Oracle", "Dream Oracle" mentions (may be updated
  during V1.5 product redesign, not removed)
- `packages/portfolio-posters/src/share/domainPosters.tsx` keeps
  `CoinCastSharePoster`, `DreamSharePoster`, `FaceReadSharePoster` exports
  (used by V1.5 apps when redesigned)
- DB schema retention unchanged — `singlePurchases.skuId` enum values for face /
  coin_cast / dream stay defined
- `apps/hexastral-web/app/lp/` routes for face/coin/dream stay (V1.5 may revise
  copy + assets, not removal)
- All 3 bundle IDs (`com.hexastral.face`, `com.hexastral.coincast`,
  `com.hexastral.dream`) stay reserved in Apple Developer Portal

### V1.5 trigger criteria (when face/coin/dream redesign starts)

V1.5 sprint work begins when ALL of:

1. ✅ V1 W1 cycle approved + live in App Store
2. ✅ ≥ 1 additional V1 app (feng / yuan / MingPan) also approved
3. ✅ ≥ 30 days of cycle production telemetry (subscription conversion ≥ 1% baseline)
4. ✅ Doctrine v2 anti-spam framing empirically validated (no V1 app rejected
   for category-saturation reasons)

If any V1 app is rejected for 4.3(b), V1.5 wait extends until appeal-cycle
completes. If 2+ V1 apps are rejected, V1.5 is paused indefinitely (escalate to
SPAM-11 PWA fallback).

### V1.5 timeline (per ADR-0017)

After V1 trigger criteria met:

- Sprint 1-4 of V1.5 W5 (Coincast): ~4 weeks
- Sprint 1-4 of V1.5 W6 (FaceRead): ~4 weeks
- Sprint 1-4 of V1.5 W7 (DreamRead): ~4 weeks
- Submissions can parallelize after W5 if cycle precedent allows

Total V1.5 wave: ~8-12 weeks of dev work (with 2 apps parallel where possible).

### Yuan v1 deprecation (RETAINED, not revised)

yuan v1 product shape (single-shot couples-chart, $9.99 IAP) is **deprecated** in
favor of yuan v2 (subscription + daily-utility + viral, per ADR-0015). This was
correct in the original ADR-0016 and is retained.

**Bundle**: `com.hexastral.yuan` REMAINS ACTIVE — yuan v2 ships under same
bundle.

**Code retention**: `apps/yuan-app/` stays in active workspace. `packages/scenario-yuan/`
engine stays (used by yuan v2). Existing UI scaffold is partial-reusable; yuan
v2 sprint plan (see `docs/sprints/feng-yuan-mingpan-sprint-plan.md`) details
the redesign work.

**Deprecation = redesign-in-place**, not archive.

### Universe Bundle SKU recomposition (revised)

Old Universe bundle (per ADR-0012, superseded):
```
HexAstral Universe Pro: Yuán + Fate + Cycle Pro + Coin-Cast/Face/Dream/Numerology allowances
```

New Universe bundle (per ADR-0015 + this ADR revision):
```
HexAstral Universe Pro V1 ($9.99/mo · $79.99/yr):
  - cycle Pro entitlement
  - feng Pro entitlement (+ 1 free single audit/quarter)
  - yuan v2 Pro entitlement
  - MingPan lifetime (one-time activation)
  - Cross-app family-tree sync
  - Wiki Pro access (hexastral.com/wiki deep articles)

HexAstral Universe Pro V1.5 ($14.99/mo · $119.99/yr) — activated when V1.5 apps ship:
  - All of V1 Universe
  - Coincast Pro entitlement
  - FaceRead Pro entitlement
  - DreamRead Pro entitlement
```

**RC catalog changes** (post-V1.5 ship):
- Restore entitlements: `entl_face_pro`, `entl_coincast_pro`, `entl_dreamread_pro`
  (use new naming aligned to V1.5 product names)
- Universe Bundle V1.5 SKU: `hexastral_universe_pro_15_monthly` /
  `hexastral_universe_pro_15_annual`
- Sunset V1 Universe SKU after 30-day overlap (existing subscribers
  grandfathered to V1.5 Universe at same price for 1 year)

## Consequences (revised)

### Positive

- **Optionality preserved** — 3 apps remain on the V1.5 roadmap with full code
  + bundle + RC catalog
- **No destructive operations** — apps/_archived/ never created; no code moves
- **TOS continuity** — terms.json files don't need editing; legal continuity
- **Wider matrix possible** — 7-app product line is now in scope, not 4-app
- **Risk-managed scaling** — V1.5 only begins after V1 validates doctrine

### Negative

- **Repo footprint larger** — 3 deferred apps stay in active workspace; some
  cognitive load
- **V1.5 commitment** — ~8-12 weeks additional dev investment after V1
- **Bundle ID maintenance** — 3 extra bundle IDs to keep current in Apple
  Developer Portal (zero monetary cost, minor admin)

### What execution looks like now

**Originally planned** (ARCHIVE actions to execute "after design lands"):
- ~~`git mv apps/face-oracle-app apps/_archived/...`~~ — DO NOT DO
- ~~Edit `apps/hexastral-api/src/config/products.ts` to remove archived IAP entries~~ — DO NOT DO
- ~~Edit `apps/hexastral-web/lib/legal/data/terms.{en,ja,tw}.json` to remove mentions~~ — DO NOT DO
- ~~RC dashboard delete legacy entitlements~~ — DO NOT DO
- ~~`docs/launch-sequence.md` move from "deferred" → "archived" section~~ — DO NOT DO

**Replaced by V1.5 trigger checks** (do nothing now; revisit when V1 ships):
- Monitor V1 cycle + feng + yuan + MingPan App Store review outcomes
- When trigger criteria met → execute V1.5 sprint plan per ADR-0017
- V1.5 sprint plan begins with content + UX redesign, not deletion

## References

- ADR-0014 (hexastral-app bundle retirement)
- ADR-0015 (Product Doctrine v2)
- **ADR-0017** (V1.5 wave definition — face/coin/dream redesign)
- SPAM-9 (initial deferral decision)
- SPAM-17 (Oracle suffix display name rename — completed; relevant to V1.5 redesign)
- `docs/anti-spam-positioning.md`
- `docs/launch-sequence.md` §2 (deferred apps section, will be updated to reflect V1.5)
- `docs/sprints/v1.5-face-coin-dream-sprint-plan.md` (new, per ADR-0017)
