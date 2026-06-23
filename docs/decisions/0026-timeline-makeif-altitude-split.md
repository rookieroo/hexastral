# ADR-0026: Personal vs Relationship Timeline & Make-If — the altitude split

- Status: Accepted
- Date: 2026-06-23
- Amends: [ADR-0021](0021-kindred-v2-solo-first-mingpan-frame.md) (solo-report scope in kindred), [ADR-0023](0023-timeline-makeif-insight-layer.md) (timeline/make-if home)
- Builds on: [ADR-0020](0020-cycle-life-timeline-and-glossary.md) (Yuun life timeline), [ADR-0024](0024-app-brand-naming.md) (Yuel / Yuun brand naming), [ADR-0014](0014-bonds-timeline-architecture.md) (bonds timeline)

## Context

Both consumer apps grew a personal timeline + what-if surface, and they now overlap.

- **Yuun (运 / `auspice-app`)** is the canonical, deep one: interactive git-graph
  人生时间线 (`app/timeline.tsx`, ~1050 lines, Skia + Reanimated) + make-if 择时
  decision engine (`app/makeif.tsx`, ~1520 lines) + server-cron push (`lib/push.ts`
  + `svc-notify` hourly cron). ADR-0020/0023 define this as Yuun's reason to exist.
- **Yuel (缘 / `kindred-app`)** is solo-first per ADR-0021 — a single user must get
  value before a second person arrives. Its solo report ships with content parity to
  ming-pan, including the `solo · timeline` (罗盘) and `monthly_outlook` (月相)
  *report chapters*. Recent "living-layer" work then added **interactive** personal
  screens — `app/(reading)/timeline.tsx` (流年/大运) and `app/(reading)/whatif.tsx`
  (假如, a deterministic window ranker) — plus a home 流年 timeline doorway.

Those living-layer screens pushed Yuel's personal surface from ADR-0021's *narrative
chapter* altitude up into Yuun's *interactive tool* altitude. The result is two apps
shipping near-duplicate interactive personal timeline/what-if: a maintenance drain, a
cannibalization risk (why own Yuun if Yuel does the same?), and an App Store 4.3
(duplicate-app) exposure for one publisher.

The deterministic substance is **already shared** — `periodSignals`
(`packages/astro-core/src/period-signals.ts`) and `composeMonthlyFortune`
(`packages/scenario-yuan`). So this is a *surface / altitude* allocation, not an
engine split.

## Decision

Allocate timeline & make-if by **subject × altitude**, on shared deterministic code.

### 1. Personal (single-chart) interactive timeline + make-if → Yuun only

The interactive git-graph 人生时间线 and the make-if 择时 decision engine are **Yuun's
canonical surfaces** (unchanged from ADR-0020/0023). Yuel ships no interactive personal
timeline screen and no personal make-if / decision engine.

### 2. Relationship (two-chart) 合盘 timeline + what-if → Yuel only

The 合盘 relationship timeline (ego-centric bond nodes) and relationship what-if
(求婚/同居/异地/要孩子 windows, 你们的通关用神) are **Yuel's canonical surfaces**
(ADR-0014 bonds timeline + ADR-0025 push). Yuun ships no relationship timeline/what-if.

### 3. Yuel personal = the solo report + 本月深度 as its sole living extension

Yuel keeps the **static solo report in full** (ADR-0021 parity — every chapter,
including the `solo · timeline` 罗盘 narrative chapter and the `monthly_outlook` 月相
chapter). On top of that report it ships **exactly one living extension — 本月深度 — and
nothing else**: no interactive timeline, no personal what-if, no make-if. Concretely:

- **Retire** `app/(reading)/timeline.tsx` (interactive 流年/大运 screen),
  `app/(reading)/whatif.tsx` (interactive 假如 ranker), and the home 流年 timeline doorway.
- **Keep** the lightweight **本月运势** card (`components/reading/MonthlyFortune.tsx`) and
  its **本月深度** deep-read — the single living surface that extends the personal report.
- A Yuel user who wants the interactive life-map / decision engine is **cross-linked to
  Yuun (运)** — an intentional cross-sell, not an in-app rebuild.

### 4. 本月深度 (structured monthly LLM read) — shared, kept in Yuel

The 本月深度 deep-read (`POST /api/report/monthly` →
`MonthlyDepth{ overview, themes, advice, watchFor }`) is **reflective, not a decision
tool**, so by the altitude logic above it sits squarely in Yuel's allowed set — and
ADR-0021 already sanctions a monthly LLM read (the `monthly_outlook` chapter). It
therefore stays on Yuel's 本月运势 card as the one tangible LLM touchpoint, **and** is
grafted onto Yuun's git-graph current-月 HEAD node. Promote the `MonthlyDepth` contract
+ fetch/cache helper (`apps/kindred-app/lib/solo/monthly-depth.ts`) to a shared package
so both apps speak one contract; `composeMonthlyFortune` is already shared.

> Rejected alternative: strip Yuel to the deterministic 本月运势 card and make 本月深度
> a Yuun-exclusive Pro hook. Rejected because it pulls a *reflective* feature out of the
> reflective app and thins Yuel's solo-first experience exactly where it is most concrete.

### 5. The shared deterministic layer is the de-dup boundary

`periodSignals`, `composeMonthlyFortune`, and the `MonthlyDepth` contract live in
`packages/*` and power both apps. The interactive git-graph **renderer** stays bespoke
in Yuun for now (it is top-tier; do not genericize prematurely). Revisit only if Yuel
ever needs an interactive relationship git-graph — at which point extract the renderer
as a data-in / render-out component, feeding it relationship nodes instead of personal
大运/流年.

### App Store posture

Hero surfaces stay distinct — Yuel leads with relationships (你 + TA), Yuun leads with
the personal life-map + decisions. A shared lightweight 本月运势 card is not a "duplicate
app"; two near-identical interactive timelines would be. This split *is* the 4.3
differentiation, by design — not architectural taste.

## Consequences

### Positive

- One interactive personal timeline / make-if to maintain (Yuun), not two.
- Each brand keeps a defensible reason to exist; 4.3 exposure contained.
- Yuel stays focused: solo report (funnel) + 本月 pulse + the relationship product.
- Deterministic substance shared → the two surfaces cannot drift apart again.

### Negative

- Retiring Yuel's living-layer timeline/what-if screens writes off recent work — sunk
  cost accepted per the pre-PMF house rule.
- A Yuel user wanting an interactive life-map must install Yuun (intentional cross-sell;
  some friction at the seam).
- Yuun must adopt 本月深度 (net-new there, but small — reuses the existing per-node
  explain plumbing and the shared `MonthlyDepth` contract).

## Migration targets

- **Yuel** — deprecate `app/(reading)/timeline.tsx`, `app/(reading)/whatif.tsx`, and the
  home 流年 doorway; keep `components/reading/MonthlyFortune.tsx` (+ 本月深度).
- **Shared** — promote `MonthlyDepth` + `lib/solo/monthly-depth.ts` helper to a package
  (`scenario-yuan` or a new `monthly` module). `composeMonthlyFortune` already there.
- **Yuun** — graft 本月深度 onto `app/timeline.tsx` current-月 HEAD; re-point the
  month-start push landing to it (the one design Yuun borrows from Yuel).

## References

- ADR-0020 (Yuun life timeline), ADR-0021 (kindred solo-first), ADR-0023 (timeline/
  make-if insight layer), ADR-0024 (brand naming), ADR-0014 (bonds timeline),
  ADR-0025 (kindred relationship push)
- `packages/astro-core/src/period-signals.ts`, `packages/scenario-yuan/src/monthly-fortune.ts`
- Yuun: `apps/auspice-app/app/{timeline,makeif}.tsx`, `apps/auspice-app/lib/push.ts`
- Yuel: `apps/kindred-app/app/(reading)/{timeline,whatif}.tsx`,
  `apps/kindred-app/components/reading/MonthlyFortune.tsx`,
  `apps/kindred-app/lib/solo/monthly-depth.ts`
