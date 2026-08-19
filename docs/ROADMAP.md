# HexAstral Roadmap — four-app launch wave

**Goal:** ship four apps to the App Store — **Yuun** (黄历 utility), **Yuel** (relationships / 合盘), **Feng** (风水), **CoinCast** (易经 study tool).

Architecture truth for agents: this file + [decisions/](./decisions/). Doc index: [README.md](./README.md).

---

## Apps in scope

| Brand | Directory | Bundle ID | Role | Status doc |
|---|---|---|---|---|
| **Yuun** | `apps/auspice-app` | `com.hexastral.yuun` | Daily 黄历 · Pro personalization · gateway to Yuel | [apps/yuun/launch.md](./apps/yuun/launch.md) |
| **Yuel** | `apps/kindred-app` | `com.hexastral.yuel` | Solo 八字紫微 → Bonds / 合盘 · receives Yuun 亲友 carry-over | [apps/yuel/launch.md](./apps/yuel/launch.md) · [status.md](./apps/yuel/status.md) |
| **Kanyu** | `apps/feng-app` | `com.hexastral.kanyu` | 风水 readings · natural depth for Yuun 入宅/动土 intents | [apps/feng/fix-plan.md](./apps/feng/fix-plan.md) |
| **Yaul** | `apps/coin-cast-app` | `com.hexastral.yaul` | I Ching study + hexagram journal (scaffold → MVP) | [apps/coincast/README.md](./apps/coincast/README.md) |

Internal **directory / API** codenames (`auspice`, `kindred`, …) and RevenueCat product IDs stay unchanged per [ADR-0024](./decisions/0024-app-brand-naming.md). **Bundle ID + URL scheme** are brand-aligned (`com.hexastral.{yuel|yuun|kanyu|yaul|syel}`).

**Not in this wave (app dirs removed):** dream-oracle, numerology, ming-pan
(donor code already ported into Yuel; API/web routes for numerology/dream may
remain for future reuse). Legacy `hexastral-app` is also not a launch target.

**Syel (after Yuel):** J2 问命 — three photos + birth + IAP reading / Pro timeline. Not a daily journal. Spec: [apps/xingqi/product.md](./apps/xingqi/product.md) · split: [apps/lantai/demand.md](./apps/lantai/demand.md) · home mock: [apps/xingqi/home-ui-mock.html](./apps/xingqi/home-ui-mock.html).

**Lantai (parallel):** J3 记一笔 — in-app capture + observation (diet + custom DB). Shortcuts and Notion optional. No official face/palm template. [demand.md](./apps/lantai/demand.md) · [plan.md](./apps/lantai/plan.md).

---

## Shared backend (`hexastral-api`)

One Worker hosts launch-wave apps, plus Lantai when wired:
- `/api/auspice/*` — Yuun almanac + personal calendar
- `/api/bonds/*` — Yuel bond graph (HMAC, sign-in required)
- `/api/feng/*` — Feng chapters
- `/api/divination/*` — CoinCast casting (when wired)
- `/api/portfolio/auth/{apple,google}` — unified identity
- `/api/lantai/*` — Notion OAuth + configs (HMAC); iCloud slot files hold `config_id`; `POST /api/lantai/ai/jobs` (secret-link `config_id`, Kimi + Queue); `GET /s/:id` legacy only

Deploy: `cd apps/hexastral-api && bun deploy`. No CI — validate locally with `bun run preflight`.

Setup: [setup/](./setup/) · Store checklist: [publish/README.md](./publish/README.md)

---

## Cross-app glue (Yuun → Yuel)

Free 黄历 is anonymous. **Subscribe** requires sign-in → portfolio auth → RC alias. Yuun 亲友 push to `/api/bonds/solo` and appear in Yuel with zero friction. Detail: [apps/yuun/launch.md](./apps/yuun/launch.md) · [apps/yuel/launch.md](./apps/yuel/launch.md).

---

## Suggested ship order

Per [ADR-0019](./decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md) (updated 2026-07):

1. **Yuun** — daily utility anchor + publisher credit (**W1 live**)
2. **Yuel** — portfolio upsell; Yuun 亲友 carry-over is the moat (**W2 live / brand host open**)
3. **Syel** — next engineering + ASC after Yuel (not the same review day). Funnel unchanged; home UI mock: [apps/xingqi/home-ui-mock.html](./apps/xingqi/home-ui-mock.html)
4. **Kanyu / Yaul** — **deferred**: craft bar and GTM/physical-cast gap
5. **Lantai** — parallel, not in this ASC queue; do not block Syel chrome work

Builds can run in parallel; ASC **submission** priority is Yuun → Yuel → **Syel**. Do not submit Syel on the same day as Yuel.

---

## Web disclosure (`hexastral-web`)

**Marketing narrative** (distinct from ASC submission order):

| Tier | Apps | Role |
|------|------|------|
| **Flagship** | Yuel (Kanyu later) | Depth, Pro reports, primary monetization |
| **Funnel** | Yuun (Yaul later) | Daily entry → upsell to flagship |

**Technical submission order:** Yuun → Yuel → Syel. Kanyu / Yaul / Lantai stay deferred.

Single source for visibility, sitemap, and homepage cards: `apps/hexastral-web/lib/growth/launch-status.ts`. Bump `visibility` per wave (W1 Yuun → W2 Yuel → Syel next; defer Kanyu/Yaul).

**Not indexed on hexastral.com:** DreamOracle, FaceOracle, StarPalace, EightPillars, omnibus HexAstral iOS app, `/onboarding` flagship funnel.

**Compliance:** Privacy/Terms pages retain **UseONE, LLC**; marketing footers link Privacy · Terms only.

Detail: [publish/brand-aso-gtm-plan.md](./publish/brand-aso-gtm-plan.md) § Web disclosure.

---

## Outstanding work (index)

| Stream | Doc |
|---|---|
| Yuun timeline push + make-if | [apps/yuun/timeline-deep-read-plan.md](./apps/yuun/timeline-deep-read-plan.md) · [launch.md](./apps/yuun/launch.md) |
| Yuun / Yuel brand + ASC | [publish/trademark-clearance-and-filing.md](./publish/trademark-clearance-and-filing.md) · [publish/brand-aso-gtm-plan.md](./publish/brand-aso-gtm-plan.md) |
| Yuel solo-first + report | [apps/yuel/status.md](./apps/yuel/status.md) · [ADR-0021](./decisions/0021-kindred-v2-solo-first-mingpan-frame.md) |
| Feng polish + acceptance | [apps/feng/fix-plan.md](./apps/feng/fix-plan.md) · [acceptance-standard.md](./apps/feng/acceptance-standard.md) |
| CoinCast MVP | [apps/coincast/README.md](./apps/coincast/README.md) |
| Lantai (parallel) | [apps/lantai/plan.md](./apps/lantai/plan.md) |
| Shared store steps | [publish/launch-checklist.md](./publish/launch-checklist.md) |

---

## Reference

- [decisions/](./decisions/) — active ADRs
- [archive/decisions/](./archive/decisions/) — superseded ADRs (historical)
- [shared/birth-info-form-spec.md](./shared/birth-info-form-spec.md) — birth-info component contract
