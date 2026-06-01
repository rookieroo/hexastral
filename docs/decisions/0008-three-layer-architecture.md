# ADR-0008: Three-layer architecture — package only what's shared

- Status: Accepted
- Date: 2026-05-19
- Amends: ADR-0005 (package boundaries), ADR-0007 (hexastral-app refocus)
- Triggers: revision of [phase-j-plan.md](../phase-j-plan.md)

## Context

By Phase H we have 24 packages and 11 apps. After auditing for ADR-0007
(hexastral-app refocus), an empirical question surfaced: do the
`packages/scenario-*` packages actually share code, or are they pre-extracted
for hypothetical reuse that never materialized?

The audit (scenario-yuan / scenario-feng / scenario-palmface / scenario-dream):

| Package | Mobile consumers today | Mobile consumers after Phase J | Web consumer | API consumer |
|---|---|---|---|---|
| scenario-yuan | hexastral-app + yuan-app | yuan-app only | 1 share-card route | ❌ |
| scenario-feng | feng-app + compass-app | feng-app + compass-app | ❌ | ❌ |
| scenario-palmface | hexastral-app + face-oracle-app | face-oracle-app only | ❌ | ❌ |
| scenario-dream | hexastral-app + dream-oracle-app | dream-oracle-app only | ❌ | ❌ |

After Phase J refocuses hexastral-app to Fate-only, **three of four scenario
packages have exactly one consumer**. At that point the package boundary
adds friction (extra typecheck/lint jobs in CI, extra README to maintain,
extra peer-dep coordination) without buying reuse.

Meanwhile, **truly cross-cutting concerns are not yet packaged**. Every app
has its own:
- Paywall modal (face-oracle / yuan-app / coin-cast / etc. — each ~150 LOC, all the same shape)
- Birth-info entry screens (hexastral-app + yuan-app re-implement; feng-app needs it for personal-fit chapters)
- Camera capture + VLM upload flow (face-oracle / palmface / future feng-floor-plan)
- "Companion app deep-link" cards (hexastral-app's Fate home for Phase J; also useful for satellite cross-promotion)

These are the flows that genuinely repeat across 3+ apps. They belong in a
shared package; they currently aren't.

The mismatch: we packaged things that didn't need it (per-scenario) and
left things that did (cross-cutting) inside individual apps.

## Decision

### Three layers

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 3 · App                                                   │
│   apps/*-app                                                    │
│   Screens, navigation, app-specific copy + theming.            │
│   ALWAYS single-purpose, NEVER shared.                          │
├────────────────────────────────────────────────────────────────┤
│ Layer 2 · Per-scenario domain (slim)                            │
│   packages/scenario-*                                           │
│   Types, API client wrappers, pure helpers.                     │
│   Justified ONLY when shared across (mobile + web) or            │
│   (mobile + api) or (multiple satellites in the same scenario).  │
│   No screens, no heavy UI components, no app-specific styling.  │
├────────────────────────────────────────────────────────────────┤
│ Layer 1 · Cross-cutting infrastructure                           │
│   packages/core-ui · satellite-runtime · satellite-ui ·          │
│   portfolio-client · hexastral-client · astro-core ·            │
│   hexastral-tokens · logger · etc.                              │
│   Used by 3+ apps OR pure-compute / no-UI-runtime.              │
└────────────────────────────────────────────────────────────────┘
```

### Package test

A piece of code earns a package only if it answers YES to at least one:

1. **Used by 2+ apps today** (mobile or web — not "might be later")
2. **Used by the API server** for shared types / validation schemas
3. **Pure compute** with no UI-runtime dependency (astro-core territory)
4. **Tier-3 infrastructure**: auth, fetch, portfolio, IAP — flows that
   every app touches regardless of scenario

If none → keep it in the consuming app. **Do not pre-extract for
hypothetical futures.**

### What this means concretely

#### Per-scenario packages stay slim

| Allowed in `scenario-*` | Not allowed (move to app) |
|---|---|
| Domain types (`Bond`, `FengSite`, etc.) | App-specific screens |
| API client wrappers (HMAC fetch + envelope unwrap) | Heavy visualizations used by one app only |
| Pure helpers / validators with no React deps | Themed UI components |
| Re-exports from astro-core for ergonomics | App-specific draft/state stores |

#### Cross-cutting flows belong in core-ui (or a sibling)

Promote when 3+ apps need the same shape:

- **Birth-info entry**: `ShichenPicker` (✅ Phase H · Y4), `BirthDateField`,
  `BirthGenderToggle`, `CityPicker` (✅ Phase H · Y3)
- **Camera-to-VLM pipeline**: capture screen + photo-quality bullets +
  AI-processing disclaimer + paywall integration. Generalizes the
  per-scenario palmface + future feng-floor-plan flows.
- **Paywall modal**: brand-color via props; SKU + RC offerings via hook;
  single source of truth for "purchasing... / success / error / restore"
  UX patterns.
- **Discovery card**: companion-app deep-link tile with universal-link
  + App Store fallback + funnel attribution (for Phase J.3 hexastral-app
  home + cross-promotion between satellites).
- **AI follow-up chat**: shared chat shell for any reading/divination
  result. Currently hexastral-app-only; will be wanted by every satellite
  that wants Pro-tier follow-up.

#### What to do with existing over-extracted packages

- **scenario-yuan**: trim to `types.ts` + `lib/bonds-api.ts` + `lib/facing-deg.ts`. Move heavy UI (`BondsStarfieldImpl`, `InterpretationSections`, hooks) **into yuan-app** during Phase J. Keep the package small but real.
- **scenario-feng**: keep — has 2 mobile consumers (feng-app + compass-app). `FlyingStarsGrid` and `BaZhaiWheel` shipped in Phase H Bucket B technically have one consumer (feng-app). They can stay in the package for now since compass-app could plausibly want them later, but new feng-only components should land in `apps/feng-app/components/` by default.
- **scenario-palmface**: after Phase J strips hexastral-app's `(explore)/palmface*`, this becomes single-consumer (face-oracle-app). The camera+VLM logic should generalize into the new core-ui `CapturePipeline` (cross-cutting); what's left in scenario-palmface is types + API only. The package likely collapses into `core-ui/CapturePipeline` + face-oracle-app internals.
- **scenario-dream**: same trajectory as scenario-palmface. Slim or fold into core-ui.

## Consequences

### Positive

- CI runs fewer per-package typecheck/lint jobs (faster pipeline)
- App-specific UI lives next to where it's used (faster to navigate, easier to modify)
- Genuinely shared flows have a real home, not scattered re-implementations
- Future scenarios know exactly where to put code — answer the package test
- Forces honesty about what's reused vs what's pre-extracted hope

### Negative

- Some Phase H work (FlyingStarsGrid / BaZhaiWheel in scenario-feng) is in
  the "wrong" layer per the new rule. Not urgent to move; leave as-is until
  the package collapses or grows a second consumer
- Refactor cost: extracting cross-cutting flows into core-ui is a new
  workstream (added to phase-j-plan.md)
- Slight risk of "too much in core-ui" — mitigated by keeping core-ui
  presentational-only (no business logic, no API calls)

### Out of scope for this ADR

- core-ui's internal structure (subfolders by concern: forms / pipelines / modals / etc. — let it grow organically and refactor when patterns emerge)
- web-only or web-mostly code (hexastral-web has different ergonomics — Next.js components colocate naturally)
- TypeScript path aliasing or workspace plumbing (no change)

## Alternatives considered

**A. Keep per-scenario packages indefinitely.**
Rejected — empirical audit shows most are single-consumer after Phase J. The maintenance cost is real (per-package CI, peer-dep coordination, README drift) and the reuse benefit is hypothetical.

**B. Collapse everything into core-ui.**
Rejected — Layer 2 still has a real purpose for genuinely cross-mobile+web scenarios (scenario-feng, future scenario-numerology if web /numerology renders interactive widgets). Throwing it all into core-ui muddies the boundary between "primitive UI" and "domain UI".

**C. New `flows/` top-level alongside packages.**
Rejected — adds a new top-level concept without value. core-ui can have a `pipelines/` subfolder.

**D. Code-mod the existing scenario-* packages to be private to one app each.**
Rejected — that's just folder-naming theater. Either share or don't.

## How this changes Phase J

See [phase-j-plan.md](../phase-j-plan.md) (revised). The original plan was
"extract per-scenario domain into scenario-* packages." The revised plan
is:

- **J.1**: extract **cross-cutting flows** into core-ui (birth-info, capture, paywall, discovery card, chat) — this is where most of the reusable code actually lives
- **J.2**: per-scenario UI moves **into the owning app**, not into a scenario package
- **J.3**: scenario-* packages are **trimmed** to types + API client only (or absorbed entirely where there's no shared consumer)
- hexastral-app refocus + satellite adoption + cross-app polish stay as originally planned
