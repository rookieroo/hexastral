# HexAstral docs index

Pruned to **launch scope**: four shipping apps (**Yuun**, **Yuel**, **Feng**, **CoinCast**), shared **publish** + **setup**, and architecture ADRs that still govern those surfaces.

**Architecture SSOT:** [ROADMAP.md](./ROADMAP.md) · **ADRs:** [decisions/](./decisions/) · **Agent entry:** [AGENTS.md](../AGENTS.md)

---

## Publish (App Store / human-only)

| Doc | Purpose |
|---|---|
| [publish/README.md](./publish/README.md) | Yuel + Yuun ASC / RC / deploy checklist |
| [publish/launch-checklist.md](./publish/launch-checklist.md) | 上架总清单（按顺序勾选；含 no-IAP 先发说明） |
| [publish/asc-yuun-yuel-guide.md](./publish/asc-yuun-yuel-guide.md) | ASC 控制台逐步操作 |
| [publish/yuun-yuel-launch-runbook.md](./publish/yuun-yuel-launch-runbook.md) | 上架缺口总览 + 环境变量 + 部署顺序 |
| [publish/brand-aso-gtm-plan.md](./publish/brand-aso-gtm-plan.md) | ASO metadata strategy |
| [publish/screenshot-direction.md](./publish/screenshot-direction.md) | Per-app screenshot doctrine (4.3(b)) |
| [publish/trademark-clearance-and-filing.md](./publish/trademark-clearance-and-filing.md) | Yuun / Yuel trademark |
| [publish/app-review-qa-checklist.md](./publish/app-review-qa-checklist.md) | 提审前合规 QA（ADR-0003） |
| [publish/post-bundle-rename-portal.md](./publish/post-bundle-rename-portal.md) | Bundle 改名后 Portal 核对 |

Design assets: [design/](./design/) · Market research: [research/](./research/)

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
| [deploy.md](./deploy.md) | 本地生产部署 runbook（wrangler / EAS，无 CI） |

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

### Lantai (`apps/lantai-app`) — parallel track

| Doc | Purpose |
|---|---|
| [apps/lantai/plan.md](./apps/lantai/plan.md) | Notion capture iOS app; hexastral-api `/api/lantai`; Yuun scaffold + zinc |

### Syel (`apps/xingqi-app`) — post-wave

| Doc | Purpose |
|---|---|
| [apps/xingqi/product.md](./apps/xingqi/product.md) | Three-photo + birth funnel, dual IAP |
| [apps/xingqi/launch.md](./apps/xingqi/launch.md) | 提审清单骨架（post-wave，Yuun+Yuel 之后） |
| [apps/xingqi/regression-checklist.md](./apps/xingqi/regression-checklist.md) | 真机回归清单 |
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
| [decisions/README.md](./decisions/README.md) | **索引 + 历史编号映射**（0001–0027 结论落点表；文档中裸编号 ADR-XXXX 按此查） |
| [0003](./decisions/0003-portfolio-voice-compliance.md) | Portfolio voice & compliance (ADR-0003 doctrine) |
| [0028](./decisions/0028-face-oracle-dual-track.md) | Syel dual-track + three-source funnel (display Syel; API `faceoracle`) |
