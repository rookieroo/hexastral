# Phase J — Cleanup tasks (independent, low-risk)

> Companion to [phase-j-plan.md](./phase-j-plan.md) + [phase-j-progress.md](./phase-j-progress.md).
> Each item below is self-contained, low-risk, and parallelizable. Pick any.
>
> The remaining hard, sequential work (yiching → coin-cast-app,
> meihua → numerology-app, dream cleanup) is tracked in
> phase-j-progress.md §B–D. Bonds (§A) has now been resolved by deletion
> rather than migration — see the cleanup task below for details.

---

## 1. Delete orphan `explore_palmface_*` i18n keys

**Status**: ✅ done (2026-05-20). Script-driven removal across all 9 locales.
**Scope**: 90 lines across 9 locale files
**Risk**: low — keys are unused after J.3.1 palmface route delete

`apps/hexastral-app/locales/{en,zh,zh-Hant,ja,ko,es,de,vi,th}.ts` each
contain 10 keys that are no longer referenced anywhere in source:

```
explore_palmface_title
explore_palmface_body          (multi-line)
explore_palmface_open_camera
explore_palmface_back
explore_palmface_status_idle
explore_palmface_status_denied
explore_palmface_status_cancelled
explore_palmface_status_working
explore_palmface_error
explore_palmface_features_title
```

`TranslationKeys` is derived from `zh.ts`, so deletion must happen across
all 9 locales in the same change to keep `Record<TranslationKeys, string>`
satisfied.

**Acceptance**: `bun typecheck` passes; `grep -r "explore_palmface" apps/hexastral-app/` returns nothing.

---

## 2. Delete orphan `bonds_*` / `friends_*` / unused `bond_*` i18n keys

**Status**: ✅ done (2026-05-20). 158 keys removed per locale × 9 locales = 1,422 lines. Also discovered and deleted orphan `RitualCeremony.tsx` (only consumer was deleted bonds flow) and its 4 `bond_ritual_*` keys.
**Scope**: ~150 keys per locale × 9 locales (~1350 lines)
**Risk**: low — keys are unused after the J.3.2 bonds delete

After the J.3.2 bonds delete (routes + components + lib/domain + hooks),
the following key families are orphan in
`apps/hexastral-app/locales/{en,zh,zh-Hant,ja,ko,es,de,vi,th}.ts`:

- `bonds_*` (~145 keys)
- `friends_*` (~5 keys) — bonds-tab CTA / empty-state copy
- `tab_friends` — old tab title

**MUST PRESERVE** these 6 keys still referenced by retained pair-reading
code (`components/pair/InterpretationSections.tsx`, `BondRadarChart`,
`lib/ui-mapping.ts`, `(settings)/history/pair/[id].tsx`):

- `bond_detail_archetype_label`
- `bond_detail_dimensions`
- `bond_dim_attraction`
- `bond_dim_communication`
- `bond_dim_emotional`
- `bond_dim_long_term`

Verify before each deletion:
```
grep -rEn "t\(['\"](bond_detail_archetype_label|bond_detail_dimensions|bond_dim_)" apps/hexastral-app/
```

`TranslationKeys` is derived from `zh.ts`, so deletion must be applied
to all 9 locales in the same change to keep `Record<TranslationKeys,
string>` satisfied.

**Acceptance**:
- `bun typecheck` passes
- `grep -E "(^|[^_])bonds_|friends_|^  tab_friends:" apps/hexastral-app/locales/zh.ts` returns nothing
- The 6 preserved keys still resolve via `t('bond_*')` calls in the app

Also delete:
- `tab_friends` key in all 9 locales (after confirming no other references)

**Acceptance**: `grep -r "(tabs)/friends" apps/hexastral-app/` returns
only the deleted file's history.

---

## 3. Delete `(explore)/dream*.tsx` routes

**Status**: ✅ done — already deleted in J.3.1 batch (verified 2026-05-20).
**Scope**: 2 files (123 LOC total) + locale keys
**Risk**: low if dream-oracle-app has feature parity

`apps/hexastral-app/app/(explore)/dream.tsx` (83 LOC) +
`apps/hexastral-app/app/(explore)/dream-result.tsx` (40 LOC).

dream-oracle-app already has its own `dream.tsx` + `result.tsx`.
DiscoveryCard for `dreamoracle://` is already in place (J.3.4).

**Before deleting**, run a 10-minute parity audit:
- Compare hexastral-app's dream input shape vs dream-oracle-app's
- Confirm no hexastral-only features (e.g., chart-aware dream context)
- Locale-key sweep for `explore_dream_*`

**Acceptance**: routes deleted, orphan locale keys (`explore_dream_*`,
~10 per locale × 9) also deleted, `bun typecheck` passes.

---

## 4. Replace placeholder App Store IDs

**Status**: blocked on submission
**Scope**: `apps/hexastral-app/components/fate/DiscoverSatellitesSection.tsx`
+ `packages/satellite-ui/src/funnel-config.ts`
**Risk**: none until submission

Current placeholders:

```
yuan         id0000000010 (DiscoverSatellitesSection) / id0000000002 (funnel-config)
faceoracle   id0000000011
dreamoracle  id0000000012
coincast     id0000000013
numerology   id0000000014
```

Two sources of truth — should consolidate. Recommendation: lift the
satellite + flagship App Store ID map into a single location (probably
`packages/satellite-ui/src/funnel-config.ts` with a new
`SATELLITE_APP_STORE_ID` export) and have DiscoverSatellitesSection
import from there.

**Acceptance**: after first satellite submission, real ID lands in one
place and DiscoveryCard consumes it.

---

## 5. AASA universal-link entries

**Status**: pending (plan §J.4.1)
**Scope**: each app's `apple-app-site-association`
**Risk**: low — wire-up, not behavior change

Each flagship + satellite app needs `apple-app-site-association` entries so:
- hexastral-app DiscoveryCard taps open the satellite's specific screen
  (not just first-launch)
- Satellite result screens can back-link into hexastral's profile/chart

Pattern reference: any existing AASA in the repo (search `apple-app-site-association`).

**Acceptance**: deep-link round-trip works on a device with companion
installed: tap card → land on companion's home or relevant screen.

---

## 6. Discovery card funnel attribution wiring

**Status**: pending (plan §J.4.3)
**Scope**: `apps/hexastral-app/components/fate/DiscoverSatellitesSection.tsx` +
satellite first-launch hook
**Risk**: low

DiscoverSatellitesSection currently has a `console.log` placeholder in
`onAttribution`. Replace with:
- Analytics event `hexastral_discovery_tap` with `{satellite: SatelliteKey, event: 'tap' | 'open' | 'install_redirect'}`
- Confirm satellite first-launch from `?via=hexastral` deep link triggers
  the ADR-0004 §3 funnel discount

Reference: `packages/growth-funnel` for the ADR-0004 §3 discount machinery.

**Acceptance**: tapping a DiscoveryCard logs an event; opening the
satellite from cold install via `?via=hexastral` shows the discounted Pro
price.

---

## 7. App Store metadata refresh per ADR-0007 §4

**Status**: pending (plan §J.4.2)
**Scope**: each app's App Store listing (title, subtitle, screenshots,
pricing copy)
**Risk**: low (no code) — coordinate with ASO docs

Per ADR-0007 §4, refocused listings per app:
- hexastral-app: Personal Fate flagship — "Your life chart, demystified" style
- yuan-app: Relationship synastry — "Read your bonds"
- face-oracle-app: AI face/palm reading
- dream-oracle-app: Dream interpreter
- coin-cast-app: Hexagram divination
- numerology-app: Numerology + plum-blossom

**Acceptance**: each App Store listing reads as a single-purpose product;
explicit overlap disclaimer per app to reduce Apple rejection risk
(plan §6).

---

## 8. Per-scenario package trimming (J.4.4)

**Status**: ✅ partial (2026-05-20) — see phase-j-progress.md §F.
Remaining: scenario-palmface absorption into face-oracle-app, and
optional fold-in of single-consumer scenario-dream / scenario-yuan.
**Scope**: `packages/scenario-{palmface,dream,yuan,feng,bazi,ziwei}`
**Risk**: low

After bonds + dream + yiching + meihua moves land:

| Package | Action |
|---|---|
| `scenario-palmface` | Likely empty after J.2.2 + face-oracle-app adoption complete. Absorb into core-ui or face-oracle-app, OR keep as types-only shim |
| `scenario-dream` | Likely empty after §C move. Same trajectory |
| `scenario-yuan` | Stays — yuan-app + future scenario-yuan/web consumers. Trim to types + bonds-api.ts + facing-deg.ts only |
| `scenario-feng` | Stays (2 mobile consumers + future web) |
| `scenario-bazi`, `scenario-ziwei` | Audit per plan §8.2 — stay if hexastral-app + web share; otherwise fold |

**Acceptance**: per ADR-0008 "package test", each remaining scenario-*
package has 2+ consumers OR has been trimmed/folded.

---

## 9. ReadingChatScreen (J.1.5)

**Status**: deferred per plan §1.5
**Scope**: lift `apps/hexastral-app/app/detail/chat/[readingType]/[id].tsx` to core-ui
**Risk**: low — adapter pattern is clean

Defer until a satellite needs Pro-tier follow-up chat. Per plan open
question §8.7: if any satellite already does AI chat, lift it; otherwise
keep deferred.

---

## How to pick up one of these

1. Branch off `claude/fixes-from-sad-lewin` (or current Phase J branch).
2. Pick exactly one task — they are intentionally independent.
3. Acceptance is `bun typecheck` clean + `bun lint` 0 net new + the
   per-task criterion above.
4. If unblocking work surfaces (e.g., you need an open question answered
   to finish), STOP and flag — don't half-finish.
