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
| [setup/web-url-surfaces.md](./setup/web-url-surfaces.md) | Brand vs `/lp` vs legal; UTM/click ids; merchant CAPI postback + admin alerts |
| [setup/sentry-crash-reporting.md](./setup/sentry-crash-reporting.md) | Crash reporting across satellites |
| [setup/api-cron-cache-eval.md](./setup/api-cron-cache-eval.md) | Read-only eval: API / cron / cache waste & fit (2026-07) |
| [setup/push-retention-playbook.md](./setup/push-retention-playbook.md) | Yuun/Yuel/Syel push fuel, cron, compliance, smoke |

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
| [apps/yuun/yiji-vocabulary.md](./apps/yuun/yiji-vocabulary.md) | 宜忌 display mode + search aliases |
| [apps/yuun/copy-voice.md](./apps/yuun/copy-voice.md) | Editorial / terminology voice |

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
| [apps/feng/v11-parity-plan.md](./apps/feng/v11-parity-plan.md) | V1.1 scope: 扬长避短, cut list, WS1–6 |

### CoinCast (`apps/coin-cast-app`)

| Doc | Purpose |
|---|---|
| [apps/coincast/README.md](./apps/coincast/README.md) | MVP scope, positioning, TODO |

### Syel (`apps/xingqi-app`) — post-wave

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

> 2026-08 说明：历史 ADR 0004–0027 的原文文件已从仓库移除（决策内容已内化到各
> per-app 文档与代码注释），仅保留仍然存在的两篇：

| ADR | Topic |
|---|---|
| [0003](./decisions/0003-portfolio-voice-compliance.md) | Portfolio voice & compliance (ADR-0003 doctrine) |
| [0028](./decisions/0028-face-oracle-dual-track.md) | Syel dual-track + three-source funnel (display Syel; API `faceoracle`) |
