# ADR-0019: V1 Launch Wave Narrowed to cycle / feng / yuan

- **Status**: Accepted
- **Date**: 2026-05-31
- **Modifies (V1 wave only)**: ADR-0004 (Satellite Funnel Pattern) — flagship-anchored funnel temporarily replaced by peer-promote
- **Defers**: MingPan (was V1) → V1.1 candidate; numerology / Meihua satellite → V1.1 candidate
- **Re-affirms**: ADR-0017 (V1.5 wave Coincast / FaceRead / DreamRead remain deferred)
- **Related**: ADR-0015 (Product Doctrine v2), ADR-0018 (Design Language)

## Context

The product matrix as scoped through ADR-0015 / 0017 covers ten surfaces:

- V1 satellite-funnel + flagships: cycle, feng, yuan v2, **MingPan**
- V1 satellite (Meihua pivot, ADR-0010+): **numerology**
- V1.5 wave: Coincast, FaceRead, DreamRead
- Web / corporate: hexastral-web, useone-tech

This is a wide submission surface for a pre-PMF, solo-dev launch. Each app
takes ~6 sprints of focused work + ~2-3 weeks ASC review. Submitting four
V1 apps + the Meihua satellite simultaneously risks: (a) reviewer attention
spread thin across half-polished submissions; (b) marketing surface area
the product can't sustain; (c) loss of focus on the funnel core (cycle, the
daily-utility anchor).

The user decision (2026-05-31) narrows V1 to the three apps that together
form the smallest coherent funnel:

- **cycle** (daily-utility 黄历 / 万年历 — the funnel entry point)
- **feng** (occasional 风水 readings — the natural depth for cycle's
  入宅/动土 intents)
- **yuan v2** (occasional 合婚 / compatibility — the natural depth for
  cycle's 嫁娶 intents)

The other surfaces are paused, not killed — they retain code, brand,
bundle IDs, and ADR commitments. Restart is triggered by telemetry from
the V1 trio.

## Decision

### V1 Launch Wave (active scope)

| App         | Tier              | Ship order        | Sprint plan                                  |
| ----------- | ----------------- | ----------------- | -------------------------------------------- |
| cycle       | Tier-3 satellite  | W1 (first)        | `docs/sprints/cycle-sprint-plan.md`           |
| feng        | Tier-1 flagship   | W2 (parallel build, ships after cycle stabilises) | `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Part 1 |
| yuan v2     | Tier-1 flagship   | W3 (parallel build, ships after feng)        | `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Part 2 |

"Ships after" means **ASC submission** order, not build order — builds run
in parallel from W2. cycle ships first because (a) its daily-utility
loop is the simplest to validate, (b) reviewer impressions on the matrix
form on the first app submitted, and (c) cycle's anti-spam positioning is
the least controversial under Apple 4.3(b) (it's literally a Chinese
calendar — the category is well-established).

### Deferred (PAUSED, V1.1 candidates)

| App         | Status / handling                                                              |
| ----------- | ------------------------------------------------------------------------------ |
| MingPan     | **Frozen new dev.** Codebase retained as the ADR-0018 design-language reference. Bundle ID `com.hexastral.mingpan` (per SPAM-18/19/20/21) reserved. ASO metadata, reviewer notes, ITSAppUsesNonExemptEncryption, VoiceOver accessibility all already complete — V1.1 spin-up is days, not weeks. |
| numerology  | **Frozen new dev.** Meihua satellite (Phase K pivot per `apps/numerology-app/lib/api.ts`) remains in the repo; no further work until V1.x. Bundle ID reserved. |
| Coincast    | Already deferred per ADR-0017; no change.                                      |
| FaceRead    | Already deferred per ADR-0017; no change.                                      |
| DreamRead   | Already deferred per ADR-0017; no change.                                      |

**"Frozen new dev" means**:

- No new feature work
- Bug-fix-only when the app is broken by a shared-package change (typecheck
  green is the bar; runtime polish not required)
- The app **must** keep building / typechecking under the shared
  monorepo — it's both the design reference (MingPan) and a test consumer
  for shared packages (`@zhop/core-ui`, `@zhop/satellite-ui`, etc.)
- ASO metadata, reviewer notes, app.json display-name hygiene all stay
  current — these are cheap to maintain and expensive to re-do

### V1 funnel: peer-promote (temporarily replaces ADR-0004 flagship-anchored)

ADR-0004 Satellite Funnel Pattern assumed a flagship at the top of every
funnel arc. With MingPan paused, **V1 has no flagship sitting above
feng / yuan** — they ARE the flagships, and cycle funnels sideways into
them. The three apps cross-promote each other by **intent** (not by
"hey, install our deeper product"):

| Source app | Recommends    | Triggering intent                      |
| ---------- | ------------- | -------------------------------------- |
| cycle      | feng          | 入宅择日, 动土择日, 风水择址            |
| cycle      | yuan          | 嫁娶择日, 合婚                          |
| feng       | cycle         | 动土 / 入宅 actual date selection       |
| feng       | yuan          | 新居 couples 入宅合 (双人风水)          |
| yuan       | cycle         | wedding date selection                  |
| yuan       | feng          | 新居 / 婚后住所布局                     |

This model has a side-benefit for **App Store 4.3(b)** review: each app
reads as a stand-alone utility with relevant sister-app recommendations,
not as a "funnel to a paid flagship." (Compare Microsoft Office vs. a
freemium funnel — Office apps cross-recommend without one being a paywall
trap; reviewers don't flag this.)

All peer-promote entries live in **Me → Discover (collapsed disclosure)**
per ADR-0018 §5. **No peer-promote inserts on home surfaces.**

When MingPan returns in V1.x, the funnel structure adds a fourth node:
yuan / feng → MingPan for "lifelong chart" depth. cycle does **not**
funnel to MingPan directly (utility → contemplative-depth would skip
the intermediate flagship). The peer-promote remains; ADR-0004
flagship-anchored layer is added on top, not substituted back.

### Restart triggers (when MingPan / numerology re-activate)

These are **gating heuristics, not hard rules** — re-evaluated against
real telemetry after 30 days post-launch of each V1 app.

**Resume MingPan dev when ALL true**:

- cycle has shipped + stable in production ≥ 30 days
- cycle DAU ≥ 1000 sustained 30d (a baseline "real users" floor — adjust
  on first telemetry)
- cycle crash-free sessions ≥ 99.5%
- cycle D30 retention ≥ 20% (utility-app threshold)
- AT LEAST ONE of feng / yuan has cleared ASC review (not necessarily
  ramped to traction; just submission-validated)
- No active P0 / P1 incident in the V1 trio

If cycle alone hits the bar but neither feng nor yuan ships, we re-scope
MingPan as a paired launch with whichever of the two ships next, not
solo.

**Resume numerology (Meihua) dev when**:

- MingPan resumes (numerology rides MingPan's V1.1 wave; doesn't justify
  its own wave)
- OR cycle's "calendar +divination crossover" telemetry shows clear
  appetite (e.g. > 5% of cycle Pro users tap an in-app divination
  hint — currently no such hint, so this is a future signal)

### Renaming follow-ups (no code change in V1)

The user's "the matrix only ships three apps" narrative implies the V1
public story should not pretend the four-app matrix exists yet.
Specifically:

- hexastral-web landing copy, footer "Family of apps", any auto-deep-link
  lists → should temporarily show only cycle / feng / yuan, with MingPan
  and the rest moved to "coming soon" or omitted
- Internal docs / ADRs continue to mention the full matrix (they're
  the source of truth for the longer arc; reviewers don't see them)
- Apple Connect / Marketing collateral: cycle / feng / yuan only

Implementation: **tracked separately**, not done in this ADR's PR set.
Touches `apps/hexastral-web/messages/*.json`, `apps/hexastral-web/app/[locale]/page.tsx`,
possibly `apps/useone-tech/*`. Out of scope here, in scope for the
shared landing-copy refresh task.

## Consequences

**Positive**:

- Reviewer attention concentrates on three apps that share the same
  shipping cadence and the same shared-modules tier.
- The ADR-0018 design-language migration cost drops from 4 apps to
  3 apps (cycle done, feng + yuan greenfield-apply).
- Apple 4.3(b) story is cleaner — peer-promote between three substantive
  utilities reads more like Microsoft Office than like a funnel.
- Marketing surface area (websites, ASO, screenshots, social) is
  manageable solo.
- MingPan's deep-content lift (Family Lineage Chart / Historical Figure
  Comparison per Sprint M.2-M.3) takes pressure off the V1 timeline —
  those features alone are 6+ weeks of content authoring.

**Negative**:

- The matrix-narrative "命緣卦道" four-pillar story is temporarily
  shelved. Press / ASO can't lean on "matrix of metaphysics apps" yet;
  must lead with each app's utility individually.
- MingPan is the most premium-feeling app and its absence at launch
  means no "premium contemplative depth" anchor in the matrix. yuan / feng
  must carry the contemplative-depth user.
- Numerology's Meihua pivot work (Phase K) sits idle — the satellite
  build that was done isn't validated against real users. Risk of
  bit-rot in 6+ months. Mitigation: monthly `bun typecheck` is
  CI-validated; runtime regressions caught on V1.1 spin-up smoke test.
- Peer-promote in Me → Discover gives fewer touchpoints for funnel
  conversion vs. an upsell on Today. Mitigation: this was already an
  ADR-0018 constraint (no ad slots on home); not a new cost.

**Reversibility**: high. Each deferred app is a flip of "frozen → active"
in the relevant sprint plan; ASO + reviewer notes + bundle IDs persist;
restart triggers are concrete. The matrix narrative reactivates as soon
as MingPan returns.

## Cross-references

- ADR-0015 Product Doctrine v2 — the utility-anchored brief these three
  apps each implement.
- ADR-0017 V1.5 wave deferral — the precedent for "freeze new dev,
  retain code + bundle IDs" deferral.
- ADR-0018 HexAstral Design Language — the shared module + design
  constraints all three V1 apps must satisfy.
- ADR-0004 Satellite Funnel Pattern — the flagship-anchored funnel model
  this ADR temporarily replaces with peer-promote. Footnoted in 0004
  with the V1-wave override.
- `docs/sprints/cycle-sprint-plan.md` — cycle execution doc.
- `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Parts 1-2 — feng + yuan
  execution (active); Part 3 (MingPan) PAUSED until restart.
- `docs/v1-submission-checklist.md` — narrowed to 3-app coverage per this ADR.
