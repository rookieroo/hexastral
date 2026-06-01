# Phase J — Cross-cutting flow extraction + hexastral-app refocus

> **Status**: planning only (no code execution this session).
> **Decision records**:
> - [ADR-0007](decisions/0007-hexastral-app-fate-refocus.md) — hexastral-app becomes Personal Fate flagship
> - [ADR-0008](decisions/0008-three-layer-architecture.md) — three-layer model + the "package test"
> **Created**: 2026-05-19. **Revised**: 2026-05-19 (pivoted from per-scenario extraction to cross-cutting flow extraction per ADR-0008).
> **Prerequisite**: Phase H must close out (F3 Bucket A icon assets pending design — they don't block Phase J).

## Why the pivot?

Original Phase J plan was "extract per-scenario domain code from hexastral-app
into `@zhop/scenario-*` packages." Audit revealed that after Phase J strips
duplicated flows from hexastral-app, **3 of 4 scenario packages have only one
consumer**. Per-scenario packaging stops earning its keep.

Meanwhile, **cross-cutting flows that repeat across 3+ apps** — paywall, birth
info entry, camera-to-VLM, discovery cards, AI chat — are NOT packaged and are
re-implemented per app. That's the actual reuse opportunity.

ADR-0008 codifies the architectural decision: package only what's genuinely
shared, by the test "2+ consumers today" (not "might be later"). Phase J is
rewritten around that.

---

## 0. TL;DR — four steps

| Step | What | Risk |
|---|---|---|
| **J.1** | Extract **cross-cutting flows** (birth info / camera / paywall / discovery card / chat) into `core-ui`. Touches every app eventually but landed package-by-package. | Low–Medium per slice |
| **J.2** | hexastral-app **adopts** the new core-ui flows for its remaining Fate-only screens; satellite apps adopt the shared paywall + capture. | Medium — touches multiple apps |
| **J.3** | hexastral-app **refocuses to Fate** per ADR-0007: delete duplicated routes (bonds / palmface / dream / yiching / hexagrams / meihua); replace with discovery cards. Tab bar 4 → 3. | Medium — UX change |
| **J.4** | Satellite **adoption + cross-app polish**: yuan-app gets full bonds (moved from hexastral-app into yuan-app/components, not into scenario-yuan); coin-cast-app gets shake mode; numerology-app gets meihua; AASA universal-links wired; App Store metadata refresh. | Low–Medium |

Total scope: similar to original plan (~2000 LOC moved, 4–5 apps modified, 2–3 weeks). Different axis: flows go *up* into core-ui, per-scenario UI moves *across* into the owning app.

---

## 1. J.1 — Extract cross-cutting flows into `core-ui`

Each slice is independently shippable and independently testable.

### J.1.1 · Birth-info entry (continue Y4)

Phase H · Y4 already shipped `ShichenPicker` in core-ui. Finish the set:

- `BirthDateField` — solar/lunar toggle + DateTimePicker wrapper (default 1990-01-01, format `YYYY-MM-DD`)
- `BirthGenderToggle` — 男/女 chip pair, accent-color override
- `BirthInfoForm` — composition of `CityPicker` + `BirthDateField` + `ShichenPicker` + `BirthGenderToggle` with a single `value`/`onChange` shape for app-level draft state

Adoption in J.2: hexastral-app `(birth)/*` swaps from inline components; yuan-app `fill-other.tsx` swaps from inline; feng-app's personal-fit chapter (if/when needed) has the form ready.

### J.1.2 · Camera-to-VLM pipeline

Generalize what we did for palmface this session into a reusable flow:

`<CapturePipeline>` props:
```ts
{
  strings: { title, body, openCamera, qualityFocus, qualityLight,
             qualityFraming, aiDisclaimer, statusWorking, errorGeneric, ... }
  palette: BrandPalette
  onCapture: (uri: string) => Promise<VlmResult>
  paywallGate?: () => Promise<{ granted: boolean }>
}
```

Behavior:
1. Render disclaimer + 3-bullet photo-quality guidance + Open Camera CTA
2. On tap → if `paywallGate` provided, run it; if denied, surface paywall
3. `ImagePicker.launchCameraAsync` → `onCapture(uri)` → loading overlay
4. Bubble result or error to caller

Adoption in J.2: face-oracle-app + future feng-floor-plan flow consume directly. `scenario-palmface` simplifies to types + API client only (or absorbs into core-ui entirely).

### J.1.3 · Paywall modal

Every app today has its own ~150-LOC `paywall.tsx`. Lift to core-ui:

`<PaywallModal>` props:
```ts
{
  visible: boolean
  onClose: () => void
  reason?: string                          // contextual subtitle
  productIds: { monthly: string; annual?: string; single?: string }
  brand: BrandPalette                      // colors per app
  copy: PaywallStrings                     // localized strings
  onPurchase: (productId: string) => Promise<PurchaseOutcome>
  onRestore: () => Promise<boolean>
  bullets: string[]                        // 3 value props
}
```

Behavior covers the full state machine: idle / purchasing / restoring / success / error / cancelled, with the standard restore-purchases affordance.

Adoption in J.2: yuan-app + face-oracle-app + coin-cast-app + numerology-app + feng-app all replace their `(commerce)/paywall.tsx` with thin wrappers around `<PaywallModal>`. Per-app theming via the `brand` prop.

### J.1.4 · Discovery card (for J.3 deep links)

`<DiscoveryCard>` — companion-app deep-link tile.

```ts
{
  icon: ReactNode
  title: string              // "看你和 TA 的缘"
  subtitle?: string
  targetScheme: string       // "yuan://..."
  targetUrl: string          // App Store fallback with ?via=hexastral
  brand?: BrandPalette
  onAttribution?: (event: 'tap' | 'open' | 'install_redirect') => void
}
```

Behavior: tap → `Linking.canOpenURL(targetScheme)` → either `Linking.openURL(targetScheme)` or fall back to `Linking.openURL(targetUrl)` with `?via=` for funnel attribution (reuses ADR-0004 §3 discount machinery).

Used in J.3.4 on hexastral-app's Fate home; also useful for satellite cross-promotion later.

### J.1.5 · AI follow-up chat shell

`detail/chat/[readingType]/[id].tsx` currently lives only in hexastral-app
but every reading-producing satellite eventually wants Pro-tier follow-up
chat. Lift the shell:

`<ReadingChatScreen>` — the chat UI (message list + input + streaming response). Adapter pattern:
```ts
{
  readingId: string
  readingType: 'yiching' | 'bazi' | 'feng' | 'face' | ...
  onSend: (msg: string) => AsyncIterable<string>   // streaming
  paywallGate?: () => Promise<{ granted: boolean }>
}
```

Each app provides its own `onSend` (delegating to its API endpoint), reuses the shared chat shell.

Deferrable to J.4 if budget tight — only matters once any satellite wants chat.

### J.1 acceptance gate per slice

- core-ui changes typecheck + lint clean
- New component has at least one example consumer wired (could be storybook-style, could be a real app screen)
- No app behavior regression
- 0 net new lint failures

---

## 2. J.2 — Apps adopt the new core-ui flows

Touches every app; sequence by lowest-risk first.

### J.2.1 · Adopt birth-info form

- hexastral-app `(birth)/birth-date.tsx`, `birth-gender.tsx` → use core-ui components
- yuan-app `fill-other.tsx` → use `<BirthInfoForm>` instead of inline composition
- yuan-app `birth-date.tsx`, `birth-place.tsx` → use core-ui components
- Acceptance: each onboarding flow still functional; draft state preserved

### J.2.2 · Adopt CapturePipeline

- face-oracle-app `capture.tsx` → swap `<PalmfaceCaptureScreen>` for `<CapturePipeline>` (or keep wrapper if minor adapter needed)
- hexastral-app `(explore)/palmface.tsx` → temporarily adopts too, then deleted in J.3
- `scenario-palmface` slims: keep only types + API. If empty, absorb into core-ui or face-oracle-app

### J.2.3 · Adopt PaywallModal

- yuan-app `(commerce)/paywall.tsx` → `<PaywallModal>` wrapper
- face-oracle-app, coin-cast-app, numerology-app, dream-oracle-app, feng-app — same swap
- Acceptance: each app's IAP flow still works end-to-end on TestFlight build

### J.2 acceptance gate

- Every app uses the shared core-ui flows for the listed concerns
- No regressions on existing UX
- Code line count net negative across apps (the whole point)

---

## 3. J.3 — hexastral-app refocus per ADR-0007

After J.1 + J.2 have stabilized, contract hexastral-app to Fate-only.

### J.3.1 · Routes to remove

```
app/(bonds)/                       — entire group → yuan-app
app/(tabs)/friends.tsx             — bonds tab on bottom nav
app/(explore)/palmface.tsx         → face-oracle-app (via CapturePipeline)
app/(explore)/palmface-result.tsx
app/(explore)/dream.tsx            → dream-oracle-app
app/(explore)/dream-result.tsx
app/(tabs)/yiching/                — entire group (shake) → coin-cast-app
app/hexagrams/[number].tsx         → coin-cast-app (hexagram reference)
```

### J.3.2 · Components + lib to delete (after their consumers are removed)

```
components/bonds/BondsStarfieldImpl.tsx     → MOVE INTO apps/yuan-app/components/
components/bonds/InterpretationSections.tsx → MOVE INTO apps/yuan-app/components/
components/divination/YaoHexagramDisplay.tsx → MOVE INTO apps/coin-cast-app/components/
lib/domain/bonds.ts                          → trim shared types into scenario-yuan; the rest into yuan-app/lib/
lib/domain/meihua.ts                         → MOVE INTO apps/numerology-app/lib/
lib/hooks/useBondsQuery.ts                   → apps/yuan-app/lib/
lib/hooks/useBondDetailQuery.ts              → apps/yuan-app/lib/
lib/hooks/usePairReadingQuery.ts             → apps/yuan-app/lib/
lib/ux/useShakeDivination.ts                 → apps/coin-cast-app/lib/
```

**Critical**: these components/hooks move **into the owning app**, NOT into
scenario-* packages. Per ADR-0008 §"Package test" — single-consumer code
doesn't earn package abstraction.

### J.3.3 · Tab bar re-layout

Current: `index` (命) · `friends` (缘) · `void` (◯) · `you` (我).
After: `index` (命) · `report` (书) · `you` (我), with `void` either
absorbed into `index` as a "today" card-strip or removed entirely.

### J.3.4 · Discovery cards on Fate home

Replace each removed top-level entry with a `<DiscoveryCard>` (from J.1.4):

```
你的命盘                  ← native
今日大运 / 流年           ← native
─────────────────────────
看你和 TA 的缘  →         ← <DiscoveryCard> targetScheme="yuan://"
面相 · 手相 AI 解读  →    ← <DiscoveryCard> targetScheme="faceoracle://"
解梦  →                  ← <DiscoveryCard> targetScheme="dreamoracle://"
摇卦 / 六爻  →           ← <DiscoveryCard> targetScheme="coincast://"
梅花 · Numerology  →     ← <DiscoveryCard> targetScheme="numerology://"
风水报告  →              ← <DiscoveryCard> targetScheme="feng://"
```

### J.3 acceptance gate

- hexastral-app contains zero functional duplication of any satellite
- Discovery cards work on a device with companion installed (deep link
  fires) and without (App Store fallback)
- App Store listing screenshots updated to match the new home
- yuan-app's bonds-tab now matches the old hexastral-app bonds UX
- coin-cast-app has shake mode + hexagram reference
- numerology-app has meihua mode

---

## 4. J.4 — Cross-app polish

### J.4.1 · AASA universal-links

Each app's `apple-app-site-association` gets bidirectional entries so:
- hexastral-app's discovery card opens the satellite's relevant screen
- Satellite result screens can deep-link back into hexastral-app's
  profile / chart when relevant

### J.4.2 · App Store metadata refresh

Per ADR-0007 §4 — new title / subtitle / screenshots / pricing-page copy
per app to read as a focused product.

### J.4.3 · Funnel attribution

- Discovery-card taps log a `hexastral_discovery_tap` event
- Satellite first-launch from `?via=hexastral` deep link applies the
  ADR-0004 §3 funnel discount
- Confirm each satellite's Pro IAP recognizes the discount

### J.4.4 · Per-scenario package trimming

After all adoption is done:
- `scenario-yuan` → types + `bonds-api.ts` + `facing-deg.ts` only
- `scenario-palmface` → likely empty; absorb into core-ui or face-oracle-app
- `scenario-dream` → likely empty; same trajectory
- `scenario-feng` → stays (2 mobile consumers + future web)
- `scenario-bazi`, `scenario-ziwei` → stay if hexastral-app + web share them; otherwise fold into hexastral-app

### J.4 acceptance gate

- Full round-trip works: hexastral-app → discovery tap → satellite install
  → onboarding → Pro discount applied → result → back-link works
- Each App Store listing reads as a single-purpose product
- Per-scenario packages either have 2+ consumers OR have been trimmed/folded

---

## 5. Validation gates (apply to every step)

- `bun typecheck` — passes for all changed packages
- `bun lint` — zero net new failures
- `bun test` — astro-core tests stay green
- Manual: each app on iOS Simulator — every adoption preserves behavior
- Manual: deep-link round-trips (companion installed and not installed)

---

## 6. Risk register

| Risk | Mitigation |
|---|---|
| core-ui balloons into a god-package | Subfolder by concern (`forms/`, `pipelines/`, `modals/`); refactor when patterns emerge; keep presentational-only |
| PaywallModal can't handle every app's IAP quirks | Test on each app individually before declaring J.2.3 done; allow per-app `customSlot` prop for edge cases |
| Discovery cards underperform satellite install | Track tap → install conversion; iterate copy; ADR-0004 discount is the main lever |
| Existing hexastral-app users lose features mid-flight | Pre-PMF; gate J.3 behind a remote-config flag if needed |
| BondsStarfieldImpl has hexastral-app theme tokens | Audit during J.3.2 move; pass colors as props |
| Apple rejects despite refocus | Each app's ASO explicitly disclaims overlap; J.4.2 metadata calls out single-purpose framing |

---

## 7. What this plan does NOT do

- Touch hexastral-web (separate refactor)
- Ship F3 Bucket A icon designs (unrelated)
- Remove or rename satellite apps (matrix shape stays; hexastral-app contracts)
- Introduce new IAP SKUs (`hexastral_feng_single` from Phase H · G1 already covered new SKU; rest reuse existing)
- Touch HMAC / auth / hexastral-client infrastructure

---

## 8. Open questions to resolve before starting

1. Does the BondsStarfieldImpl canvas use Skia / react-native-skia / plain
   `<Canvas>`? Affects yuan-app peer-deps after J.3.2 move.
2. Where does 紫微斗数 compute live today? If in hexastral-app, fine; if
   in scenario-ziwei, verify the package stays justified (only hexastral-app
   consumes it after refocus).
3. Is the I-Ching 64-hexagram reference data i18n'd? Where does the
   translation source live? Affects the move to coin-cast-app.
4. Does coin-cast-app's existing portfolio history schema accommodate
   a `method: 'coin' | 'shake'` discriminator?
5. Does numerology-app's existing portfolio pipeline handle hexagram
   results, or only number readings?
6. How many `paywall.tsx` files exist across apps today, and how much do
   they actually diverge? Affects PaywallModal's prop surface in J.1.3.
7. Is there an existing app that already does AI follow-up chat outside
   hexastral-app? If yes, that's the second consumer that justifies
   J.1.5; if no, defer.

These don't block planning but should be answered in the J.1 audit pass.
