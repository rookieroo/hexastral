# Phase J — Progress + outstanding work

> Companion to [phase-j-plan.md](./phase-j-plan.md). Updated as slices land.
> **Last updated**: 2026-05-20.

## What's landed

### J.1 — Cross-cutting flows into `core-ui`

| Slice | Status | Notes |
|---|---|---|
| J.1.1 BirthInfoForm | ✅ done (commit f58f1d9e) | Adopted in hexastral-app + yuan-app |
| J.1.2 CapturePipeline | ✅ done | `<CapturePipeline<T>>` + `captureCopyForLocale`; face-oracle-app adopted; hexastral-app/(explore)/palmface deferred until J.3.1 delete |
| J.1.3 PaywallView | ✅ done | Rich modal-style content (bullets + multi-tier + state machine). Adopted in yuan-app (-150 LOC). 4 satellites stay on `<SatellitePaywall>` from satellite-ui (already consolidated; not worth re-pointing) |
| J.1.4 DiscoveryCard | ✅ done | Linking.canOpenURL + App Store fallback; brand palette + onAttribution hooks |
| J.1.5 ReadingChatScreen | ⏸ deferred | Plan §1.5 says deferrable to J.4 unless a satellite needs chat |

### J.3 — hexastral-app refocus

| Slice | Status | Notes |
|---|---|---|
| J.3.1 Delete palmface routes | ✅ done | `(explore)/palmface.tsx` + `palmface-result.tsx` + `lib/runFacePortfolioPreview.ts` removed. Orphan i18n keys (`explore_palmface_*`) remain in 9 locale files — see cleanup-tasks §1 |
| J.3.2 Bonds delete (revised) | ✅ done | See §A below — deleted instead of migrated. yiching / meihua moves still pending (§B, §D) |
| J.3.3 Tab bar 4 → 3 | ✅ done | `index (命) · report (书) · you (我)`; `friends` Tabs.Screen registration also removed after J.3.2 delete |
| J.3.4 Discovery cards on Fate home | ✅ done | `<DiscoverSatellitesSection>` renders 5 cards (yuan / faceoracle / dreamoracle / coincast / numerology) above the recent-strip |

## Outstanding — needs follow-up work

### A · Bonds — DELETE (revised from "migrate to yuan-app")

**Resolution**: deletion, not migration. Plan §J.3.2's original target
(move hexastral bonds components into yuan-app/components) was based on
the assumption that yuan-app needed bonds UI. Audit revealed yuan-app
**already has a complete bonds system** via `scenario-yuan` hooks
(`useBondList`, `useBondInvitation`, `useSynastryReport`) + components
(`ChapterPager`, `CompatibilityScore`, `InviteAcceptSheet`,
`WaitingForOther`, `YuanSeal`). Yuán is editorial chapter-style synastry;
hexastral's bonds tab was a force-graph constellation of the user's
social network — a different product, not a missing piece.

By ADR-0008 "package test", single-consumer code (hexastral-only) that
has no second consumer doesn't earn its abstraction → delete.

**Deleted** (Phase J · J.3.2):

| File | LOC | Note |
|---|---|---|
| `app/(bonds)/{_layout,bond-accept,bond-create,bond-detail}.tsx` | ~600 | Routes — bonds tab in (tabs) was already hidden |
| `app/(tabs)/friends.tsx` | 164 | Tab content + Tabs.Screen registration |
| `app/(explore)/starfield.tsx` | — | Full-screen constellation view pushed from bonds tab |
| `components/bonds/BondsStarfieldImpl.tsx` | 1221 | Skia + Reanimated v4 force-graph |
| `components/bonds/BondsConstellation.tsx` | 768 | SVG concentric-orbit graph |
| `components/bonds/BondsStarfield.tsx` | 58 | Wrapper for `BondsStarfieldImpl` |
| `components/bonds/BondCard.tsx` | 134 | Bonds-list item |
| `components/bonds/BondsMiniCard.tsx` | 164 | Bonds preview card |
| `components/bonds/BondSharePoster.tsx` | 196 | Bonds share poster |
| `components/bonds/bonds-constellation-data.ts` | — | Demo bond layouts |
| `lib/domain/bonds.ts` | 351 | All bonds CRUD + types |
| `lib/hooks/useBondsQuery.ts` | — | List query (sole consumer was friends.tsx) |
| `lib/hooks/useBondDetailQuery.ts` | — | Detail query (sole consumer was bond-detail) |
| `lib/hooks/useAggregateDimensionsQuery.ts` | — | Dead code (0 callers even before delete) |

**Rehomed** (preserved with new locations):

| Old path | New path | Reason |
|---|---|---|
| `components/bonds/InterpretationSections.tsx` | `components/pair/InterpretationSections.tsx` | Used by `(settings)/history/pair/[id]` — pair-reading is staying |
| `components/bonds/ShareCard.tsx` | `components/share/ShareCard.tsx` | Used by `detail/yiching/[id]` — domain-agnostic share primitive |
| `BondDimension` interface from `lib/domain/bonds.ts` | `lib/hooks/usePairReadingQuery.ts` | Used by InterpretationSections + pair history; co-located with `PairCompatibilityDimension` |

**Resolves plan open-question §8.1**: BondsStarfieldImpl used Skia
(`@shopify/react-native-skia` Canvas/Circle/Fill/Group/Line/RadialGradient)
+ Reanimated v4 useSharedValue + gesture-handler. yuan-app would have
needed these peer-deps. Sidestepped via deletion.

**Follow-up cleanup**: i18n keys (`bonds_*`, `friends_*`, `tab_friends`,
unused `bond_*`) — see phase-j-cleanup-tasks.md §2.

### B · Yiching / hexagrams — DELETE (revised from "migrate to coin-cast-app")

**Resolution**: deletion, not migration. Same logic as §A bonds: by
ADR-0008 "package test", single-consumer code (hexastral-only) that has
no second consumer in coin-cast-app today doesn't earn its abstraction.
The DiscoveryCard for `coincast://` already covers the handoff.

**Deleted** (Phase J · J.3.2 follow-up):

| File | LOC | Note |
|---|---|---|
| `app/(tabs)/yiching/` (entire group) | — | Tab + Tabs.Screen registration removed |
| `app/hexagrams/[number].tsx` + `index.tsx` | — | 64-hexagram reference removed |
| `components/divination/YaoHexagramDisplay.tsx` | 276 | Shake-result display gone (only `TrigramIcon.tsx` remains in `components/divination/`) |
| `lib/ux/useShakeDivination.ts` | — | Shake-mode hook gone |

**Resolves plan open-questions §8.3, §8.4**: sidestepped via deletion —
no need to audit hexagram-data i18n source or extend coin-cast-app's
portfolio schema. If/when coin-cast-app grows shake mode natively, it
starts from scratch with its own data.

### C · Dream — DELETE (already complete)

**Resolution**: deletion already done in J.3.1 batch. `find dream*`
inside `apps/hexastral-app/` returns 0 files. dream-oracle-app's own
`dream.tsx` + `result.tsx` flow is the only remaining surface, reachable
from hexastral via the existing `dreamoracle://` DiscoveryCard.

### D · Meihua — DELETE (revised from "migrate to numerology-app")

**Resolution**: deletion, same pattern as §A bonds + §B yiching. Audit
showed `lib/domain/meihua.ts` had zero callers after the J.3.2 yiching
tab deletion — the only creation surface was the now-deleted
`(tabs)/yiching/index.tsx`. Remaining references in 5 other files were
type literals + i18n keys + read-only historical-record display, all
trivial to strip per ADR-0008 "package test".

**Deleted** (Phase J · J.3.2 follow-up):

| File / Change | Note |
|---|---|
| `lib/domain/meihua.ts` (226 LOC) | Algorithm — zero callers post-J.3.2 |
| `components/branding/RitualCeremony.tsx` (~170 LOC) | Bonds artifact discovered during meihua sweep; only consumer was deleted `(bonds)/bond-create.tsx` |
| `meihua` literal from `BeforeReadingType` union | `BeforeReadingModal.tsx` |
| `meihua` literal from `ReadingType` union | `app/(reading)/before-reading.tsx` |
| `r.method === 'meihua'` branch removed | `components/fate/FateRecentStrip.tsx` |
| Method label conditional simplified | `app/(settings)/history.tsx` |
| `about_meihua_*` SECTIONS entry | `app/(settings)/about.tsx` |

**Resolves plan open-question §8.5**: sidestepped via deletion. If
numerology-app later wants meihua, it starts fresh.

### F · Per-scenario package trimming (J.4.4 partial)

| Package | Action taken | Reason |
|---|---|---|
| `scenario-bazi` | **DELETED** | Orphan directory — `node_modules` + `.turbo` only, no `package.json` |
| `scenario-ziwei` | **DELETED** | Same — orphan scaffolding |
| `scenario-bonds` | **DELETED** | Same — orphan scaffolding |
| `scenario-palmface` | **DELETED** (2026-05-20) | 357 LOC + 0 code imports. face-oracle-app already adopted core-ui's CapturePipeline, so there was nothing to absorb. Stale dep also removed from face-oracle-app/package.json; core-ui CapturePipeline header comment updated |
| `scenario-dream` | keep (1 consumer: dream-oracle-app) | Single-consumer; per ADR-0008 should fold into dream-oracle-app, but non-trivial — leave for separate pass |
| `scenario-yuan` | keep (yuan-app only) | Same — single-consumer but substantial; fold-in is a separate task |
| `scenario-feng` | keep | 2 consumers (compass-app + feng-app) — passes package test |

**Also removed**: stale `@zhop/scenario-{dream,palmface,yuan}` deps from
`apps/hexastral-app/package.json` (zero code imports — leftover from
pre-J.3.2 state).

### E · Polish

| Cleanup item | Status |
|---|---|
| §1 — orphan `explore_palmface_*` i18n keys (10 × 9 locales) | ✅ done (2026-05-20) — script-driven removal |
| §2 — orphan `bonds_*` / `friends_*` / unused `bond_*` i18n keys (~150 × 9 locales) | ✅ done (2026-05-20) — preserved the 9 keys still referenced by retained pair-reading + you-tab share + yuan-style RitualCeremony — but RitualCeremony itself was orphan, so deleted that and its 4 ritual keys too |
| §4 — placeholder App Store IDs in DiscoverSatellitesSection + funnel-config | pending (blocked on first satellite submission — App Store IDs only mint at submission time) |
| §5 — AASA universal-link entries | pending — bundle IDs are already finalized (`com.hexastral`, `com.hexastral.{yuan,faceoracle,dreamoracle,coincast,numerology,feng,compass}`); blocker is the Apple Developer Team ID (10-char alphanumeric) which lives in Apple Developer Portal and needs to be set as a repo secret or added to each app's AASA file |
| §6 — discovery card funnel attribution wiring | ✅ done (2026-05-20). Added `CrossAppDiscoveryTapEvent` to `@zhop/growth-funnel` schema; new `createFunnelEmitter()` helper for fire-and-forget POST to existing `/api/growth/events` endpoint; hexastral-app `lib/analytics.ts` singleton; `_layout.tsx` syncs userId + locale; DiscoverSatellitesSection emits real events on tap / open_native / fallback_app_store |
| §7 — App Store metadata refresh per ADR-0007 §4 | pending (ASO content work, no code) |
| §8 — per-scenario package trimming | ✅ partial — see §F above |
| §9 — ReadingChatScreen | ✅ done (2026-05-20). Extracted into `packages/core-ui/src/components/ReadingChatScreen.tsx` (adapter pattern: caller provides `fetchHistory` + `sendMessage` + paywall callback + copy table + header slot). hexastral-app's `/detail/chat/[readingType]/[id].tsx` is now a 130-LOC wrapper (was 507 LOC). Other satellites (feng / oracle / palmface-face / numerology / synastry) can drop the same shell over their own backend |

Also done in this pass:
- Total LOC removed: ~1450 (1422 locale-key lines × 9, plus RitualCeremony, meihua.ts, and assorted single-line edits).

## Open questions still pending

From [phase-j-plan.md](./phase-j-plan.md) §8:

1. **§8.1** ~~Does BondsStarfieldImpl use Skia?~~ — RESOLVED: yes (Skia +
   Reanimated v4 + gesture-handler). Sidestepped via deletion (§A above)
2. **§8.2** ~~Where does 紫微斗数 compute live?~~ — RESOLVED indirectly:
   `scenario-ziwei` was an empty scaffold (no `package.json` / `src/`),
   deleted in §F. Whatever ziwei compute exists today is owned by
   hexastral-app or astro-core.
3. **§8.3** ~~Is 64-hexagram reference data i18n'd?~~ — RESOLVED via
   deletion. Yiching hexagrams reference removed from hexastral-app per §B;
   no migration to coin-cast-app needed.
4. **§8.4** ~~coin-cast-app portfolio schema for `method: 'coin' | 'shake'`?~~ —
   RESOLVED via deletion (§B). If coin-cast-app later wants shake mode it
   starts fresh.
5. **§8.5** ~~numerology-app portfolio schema for hexagram results?~~ —
   RESOLVED via deletion (§D). Same disposition as §8.4.
6. **§8.6** ~~Paywall divergence audit~~ — RESOLVED: 4 satellites already use `<SatellitePaywall>`; flagships intentionally bespoke
7. **§8.7** Existing satellite AI chat? — affects J.1.5 priority (still
   pending — defer ReadingChatScreen until a satellite needs it)

## Validation status

- `bun typecheck`: passes for hexastral-app (was 0-baseline; stays 0).
  Unrelated 7 errors in numerology-app + satellite-ui re. expo-router
  Href types — pre-existing, unchanged.
- `bun lint` (`--diagnostic-level=error`): 4 errors remaining in
  hexastral-app (organizeImports / format in `birth-form.tsx`,
  `lib/auth.tsx`, `lib/session-reset.ts`) — all pre-existing in files
  this work never touched. Net change: 6 → 4 (deleted 2 error-bearing
  files as side-effect of bonds / meihua cleanup). Other pre-existing
  failures in yuan-app, feng-app, scenario-feng, scenario-yuan,
  hexastral-api, hexastral-web, ai-vision — unrelated to Phase J.
