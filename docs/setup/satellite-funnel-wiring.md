# Satellite → Flagship Funnel Wiring Pattern

> Reference for adding the G.1 question-type picker + flagship upsell card to a
> satellite app. The face-oracle wiring at
> [apps/face-oracle-app/app/result.tsx](../../apps/face-oracle-app/app/result.tsx)
> is the canonical example.

---

## What you're adding

1. **Question-type picker** on the result page (or capture, your call) — 4
   choices: `relationship` / `home_office` / `career_wealth` / `self_daily`.
2. **Flagship upsell card** below — a 3-line CTA pointing at the right
   flagship (Kindred / Fēng / HexAstral) based on user's answer (or the
   satellite's default if they skip).

Both components live in `@zhop/satellite-ui`. The routing function lives in
`@zhop/portfolio-client`.

---

## 1. Decide where the picker goes

| Pattern | When to use |
|---|---|
| **On result page** (post-reading) | Recommended default. The user has seen their reading and is primed to engage — asking "what brought you here today?" frames the CTA without slowing time-to-result. |
| **On capture page** (pre-reading) | Use when the reading itself benefits from intent context (e.g. dream-oracle could tune interpretation toward relationship if specified). |
| **As a bottom sheet from CTA** | Use when you want to keep the result page minimal and only ask if the user shows interest in upgrading. |

`face-oracle` uses the result-page pattern.

---

## 2. Add the constants per-app

Define 3 maps in your app — typically in `lib/funnel-config.ts` (face-oracle's
reference inlines them in [`app/result.tsx`](../../apps/face-oracle-app/app/result.tsx)
for clarity, but a real production app should extract them):

**You probably don't need to define these per-satellite anymore.** The shared
[`packages/satellite-ui/src/funnel-config.ts`](../../packages/satellite-ui/src/funnel-config.ts)
exports `defaultFlagshipUpsellLabels(locale)`, `defaultQuestionTypeLabels(locale)`,
`buildFlagshipDeepLink({...})` and `flagshipAppStoreUrl(flagship)`. Use those
unless you need to override copy for a specific satellite.

Deep-link schemes (from each flagship's `app.json`):

| Flagship | Scheme |
|---|---|
| HexAstral | `hexastral://onboard?from=<slug>&signal=<question>&ddl=<token>` |
| Kindred | `yuan://onboard?...` |
| Fēng | `feng://onboard?...` |

The `from=<slug>` query param is read by the flagship's
`app/_layout.tsx` deep-link handler (via
`lib/funnel-attribution.ts` → AsyncStorage key
`flagship_funnel_attribution`) to attribute the install. If a `ddl=` token is
also present, hexastral-app's existing DDL flow claims the anonymous portfolio
reading to the user post-sign-in (yuan-app + feng-app currently only persist
attribution; full claim flow is a G.2 follow-up).

---

## 3. Wire on the result page

```tsx
import { useState } from 'react'
import { type QuestionType, routePortfolioToFlagship } from '@zhop/portfolio-client'
import {
  buildFlagshipDeepLink,
  defaultFlagshipUpsellLabels,
  defaultQuestionTypeLabels,
  flagshipAppStoreUrl,
  SatelliteFlagshipUpsellCard,
  SatelliteQuestionTypePicker,
} from '@zhop/satellite-ui'

const { locale } = useSatelliteI18n()
const [questionType, setQuestionType] = useState<QuestionType | null>(null)
const suggestedFlagship = routePortfolioToFlagship('faceoracle', questionType)
const upsellLabels = defaultFlagshipUpsellLabels(locale)
const pickerLabels = defaultQuestionTypeLabels(locale)
const deepLink = buildFlagshipDeepLink({
  flagship: suggestedFlagship,
  fromSlug: 'face-oracle',
  signal: questionType,
})

return (
  <ScrollView>
    {/* ... existing result UI ... */}

    <SatelliteQuestionTypePicker
      value={questionType}
      onChange={setQuestionType}
      labels={pickerLabels}
    />

    <SatelliteFlagshipUpsellCard
      suggestedFlagship={suggestedFlagship}
      labelsByFlagship={upsellLabels}
      deepLink={deepLink}
      appStoreUrl={flagshipAppStoreUrl(suggestedFlagship)}
      onUpgrade={(flagship) => {
        // Optional: emit a growth-funnel event for analytics
      }}
    />
  </ScrollView>
)
```

Replace `'faceoracle'` with your satellite's portfolio target (`starpalace` /
`soulmatch` / `fengshui` / `dreamoracle` / `eightpillars` / `coincast`). For
satellites NOT in the `PortfolioTarget` union (e.g. numerology-app), use
`routeQuestionToFlagship(questionType) ?? 'hexastral'` instead.

The target's default flagship mapping lives in
[`packages/portfolio-client/src/routing.ts`](../../packages/portfolio-client/src/routing.ts).
Default copy + locale fallback for the picker and upsell card live in
[`packages/satellite-ui/src/funnel-config.ts`](../../packages/satellite-ui/src/funnel-config.ts) —
4 locales (en / zh / zh-Hant / ja) are translated; the rest fall back to en.

---

## 4. Wire on the capture page (optional, for pre-reading intent)

If your satellite collects `questionType` before generating, pass it through
`runPreview` / `runLinked` / `runAuto`:

```tsx
const result = await runPreview({
  target: 'faceoracle',
  input: { /* ... */ },
  questionType,                  // ← here
  locale,
  anonymousStoragePrefix: 'face-oracle',
})
// result.suggestedFlagship is now server-computed; pass to the result screen
```

Server computation lives in
[`apps/hexastral-api/src/routes/portfolio.ts`](../../apps/hexastral-api/src/routes/portfolio.ts)
(`suggestFlagship` helper).

---

## 5. Receive the deep link in the flagship

All 3 flagships already capture `<scheme>://onboard?from=...` and persist to
AsyncStorage key `flagship_funnel_attribution`. The helper lives at
`apps/<flagship>/lib/funnel-attribution.ts`. Onboarding screens can read it
via `getFlagshipAttribution()`.

Wired in:
- [`apps/hexastral-app/app/_layout.tsx`](../../apps/hexastral-app/app/_layout.tsx)
  (extends existing DDL handler with `captureOnboardAttribution`)
- [`apps/kindred-app/app/_layout.tsx`](../../apps/kindred-app/app/_layout.tsx)
- [`apps/feng-app/app/_layout.tsx`](../../apps/feng-app/app/_layout.tsx)

If you need to read it from an onboarding screen:

```tsx
import { getFlagshipAttribution } from '@/lib/funnel-attribution'

useEffect(() => {
  void getFlagshipAttribution().then((a) => {
    if (!a) return
    // a.from   — 'face-oracle' | 'dream-oracle' | 'coin-cast' | 'numerology'
    // a.signal — 'relationship' | 'home_office' | 'career_wealth' | 'self_daily' | null
    // a.ddlToken — claim token if satellite sent one
  })
}, [])
```

**DDL claim**: hexastral-app's existing `attemptDDLRestore` consumes the `ddl`
token after sign-in. yuan-app + feng-app currently only persist; full claim
flow is a G.2 follow-up.

---

## 6. RevenueCat: cross-app entitlement sync

After the user signs in to the flagship via the deep link, the flagship app
must call `Purchases.logIn(internalUserId)` so that any entitlements granted
by a previous satellite purchase appear. The
[`useEntitlements()`](../../packages/satellite-runtime/src/entitlements/use-entitlements.ts)
hook listens for customer info updates and re-fires when the identity swap
completes.

See [docs/setup/revenuecat-entitlements.md](./revenuecat-entitlements.md) §5
for the SDK key configuration each app needs.

---

## 7. Checklist when wiring a new satellite

- [ ] Confirm satellite's portfolio target is in `PortfolioTarget` (currently:
      faceoracle, starpalace, soulmatch, fengshui, dreamoracle, eightpillars,
      coincast).
- [ ] Add `FLAGSHIP_LABELS`, `DEEP_LINK_BY_FLAGSHIP`, `APP_STORE_URL_BY_FLAGSHIP`
      constants — extract to `lib/funnel-config.ts` after the first 2 satellites.
- [ ] Render `<SatelliteQuestionTypePicker>` on result (or capture) page.
- [ ] Render `<SatelliteFlagshipUpsellCard>` below.
- [ ] Pass `questionType` through to `runPreview` / `runLinked` if you collect
      it pre-reading.
- [ ] In the flagship side: handle deep link `<scheme>://onboard?from=...`
      (G.1.c follow-up).
- [ ] In the flagship side: call `Purchases.logIn(userId)` after sign-in.
