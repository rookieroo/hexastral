# HexAstral docs index

Pruned to **launch scope**: four shipping apps (**Yuun**, **Yuel**, **Feng**, **CoinCast**), shared **publish** + **setup**, and architecture ADRs that still govern those surfaces.

**Architecture SSOT:** [ROADMAP.md](./ROADMAP.md) · **ADRs:** [decisions/](./decisions/) · **Agent entry:** [AGENTS.md](../AGENTS.md)

---

## Publish (App Store / human-only)

| Doc | Purpose |
|---|---|
| [publish/README.md](./publish/README.md) | Yuel + Yuun ASC / RC / deploy checklist |
| [publish/launch-checklist.md](./publish/launch-checklist.md) | Shared store steps (privacy, screenshots, reviewer notes) |
| [publish/brand-aso-gtm-plan.md](./publish/brand-aso-gtm-plan.md) | ASO metadata strategy |
| [publish/screenshot-direction.md](./publish/screenshot-direction.md) | Per-app screenshot doctrine (4.3(b)) |
| [publish/trademark-clearance-and-filing.md](./publish/trademark-clearance-and-filing.md) | Yuun / Yuel trademark |

Brand assets: [brand/](./brand/) · Yuel design: [design/](./design/)

---

## Setup (infra wiring)

| Doc | Purpose |
|---|---|
| [setup/revenuecat-entitlements.md](./setup/revenuecat-entitlements.md) | RC products ↔ API entitlements |
| [setup/satellite-funnel-wiring.md](./setup/satellite-funnel-wiring.md) | DDL, growth events, portfolio bootstrap |
| [setup/sentry-crash-reporting.md](./setup/sentry-crash-reporting.md) | Crash reporting across satellites |

---

## Apps

### Yuun (`apps/auspice-app`)

| Doc | Purpose |
|---|---|
| [apps/yuun/launch.md](./apps/yuun/launch.md) | Launch checklist + open work |
| [apps/yuun/timeline-deep-read-plan.md](./apps/yuun/timeline-deep-read-plan.md) | Pro timeline + make-if + push |
| [apps/yuun/timeline-makeif-gitgraph.md](./apps/yuun/timeline-makeif-gitgraph.md) | Make-if insight layer spec |
| [apps/yuun/synastry-plan.md](./apps/yuun/synastry-plan.md) | In-app synastry surface plan |
| [apps/yuun/widget-build-runbook.md](./apps/yuun/widget-build-runbook.md) | WidgetKit / watchOS (post-MVP) |
| [apps/yuun/widget-watch-scope.md](./apps/yuun/widget-watch-scope.md) | Widget scope |

### Yuel (`apps/kindred-app`)

| Doc | Purpose |
|---|---|
| [apps/yuel/launch.md](./apps/yuel/launch.md) | Launch checklist + Auspice carry-over |
| [apps/yuel/status.md](./apps/yuel/status.md) | Implementation status (living) |
| [apps/yuel/bonds-timeline-plan.md](./apps/yuel/bonds-timeline-plan.md) | Bonds timeline IP |
| [apps/yuel/living-layer-todo.md](./apps/yuel/living-layer-todo.md) | Post-MVP living layer TODO |
| [apps/yuel/term-glossary-plan.md](./apps/yuel/term-glossary-plan.md) | Relationship term glossary |
| [apps/yuel/ziwei-synastry-plan.md](./apps/yuel/ziwei-synastry-plan.md) | Zi Wei synastry spine |
| [apps/yuel/us-compatibility-positioning.md](./apps/yuel/us-compatibility-positioning.md) | US market positioning |

### Feng (`apps/feng-app`)

| Doc | Purpose |
|---|---|
| [apps/feng/fix-plan.md](./apps/feng/fix-plan.md) | Fix / polish backlog (Waves 1–3) |
| [apps/feng/closeout-plan.md](./apps/feng/closeout-plan.md) | Closeout milestones |
| [apps/feng/deploy-acceptance.md](./apps/feng/deploy-acceptance.md) | Deploy + acceptance gates |
| [apps/feng/acceptance-standard.md](./apps/feng/acceptance-standard.md) | Quality rubric |
| [apps/feng/pro-grade-plan.md](./apps/feng/pro-grade-plan.md) | Pro-tier depth |
| [apps/feng/optimization-progress.md](./apps/feng/optimization-progress.md) | Shipped fixes + Mapillary diligence + backlog |
| [apps/feng/report-v2-plan.md](./apps/feng/report-v2-plan.md) | Report v2 structure |

### CoinCast (`apps/coin-cast-app`)

| Doc | Purpose |
|---|---|
| [apps/coincast/README.md](./apps/coincast/README.md) | MVP scope, positioning, TODO |

### Xingqi (`apps/xingqi-app`) — post-wave

| Doc | Purpose |
|---|---|
| [apps/xingqi/product.md](./apps/xingqi/product.md) | Three-photo + birth funnel, dual IAP |
| [decisions/0028-face-oracle-dual-track.md](./decisions/0028-face-oracle-dual-track.md) | ADR — dual track + events + privacy (API ids `faceoracle`) |

---

## Shared

| Doc | Purpose |
|---|---|
| [shared/birth-info-form-spec.md](./shared/birth-info-form-spec.md) | `@zhop/core-ui` birth-info contract |

---

## Architecture decisions (active)

| ADR | Topic |
|---|---|
| [0004](./decisions/0004-satellite-funnel-pattern.md) | Satellite funnel pattern |
| [0005](./decisions/0005-package-boundaries.md) | Package boundaries |
| [0010](./decisions/0010-cycle-satellite.md) | Yuun (cycle) satellite |
| [0012](./decisions/0012-matrix-freemium-monetization.md) | Freemium matrix |
| [0013](./decisions/0013-iap-system-architecture.md) | IAP system |
| [0014-bonds](./decisions/0014-bonds-timeline-architecture.md) | Yuel bonds timeline |
| [0018](./decisions/0018-hexastral-design-language.md) | Ink Brutalism design language |
| [0019](./decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md) | V1 wave scope (Yuun / Feng / Yuel) |
| [0020](./decisions/0020-cycle-life-timeline-and-glossary.md) | Yuun life timeline |
| [0021](./decisions/0021-kindred-v2-solo-first-mingpan-frame.md) | Yuel solo-first frame |
| [0023](./decisions/0023-timeline-makeif-insight-layer.md) | Yuun make-if layer |
| [0024](./decisions/0024-app-brand-naming.md) | Yuun / Yuel brand naming |
| [0025](./decisions/0025-kindred-relationship-push.md) | Yuel relationship push |
| [0026](./decisions/0026-timeline-makeif-altitude-split.md) | Yuun make-if altitude |
| [0027](./decisions/0027-bond-credit-and-locale-economy.md) | Yuel bond credits |
| [0028](./decisions/0028-face-oracle-dual-track.md) | Xingqi dual-track + three-source funnel (API `faceoracle`) |

Superseded ADRs: [archive/decisions/](./archive/decisions/)
