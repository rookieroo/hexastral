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

**Syel (post-wave):** independent satellite (`apps/xingqi-app`, display **Syel**) — three photos (L/R palm + face) + birth Form + dual IAP (consumable ≥ $9.99 + `faceoracle_pro` Timeline with photo-slot quota + event table for push). Spec: [ADR-0028](./decisions/0028-face-oracle-dual-track.md) · [apps/xingqi/product.md](./apps/xingqi/product.md).

---

## Shared backend (`hexastral-api`)

One Worker hosts all four apps:
- `/api/auspice/*` — Yuun almanac + personal calendar
- `/api/bonds/*` — Yuel bond graph (HMAC, sign-in required)
- `/api/feng/*` — Feng chapters
- `/api/divination/*` — CoinCast casting (when wired)
- `/api/portfolio/auth/{apple,google}` — unified identity

Deploy: `cd apps/hexastral-api && bun deploy`. CI is validation-only.

Setup: [setup/](./setup/) · Store checklist: [publish/README.md](./publish/README.md)

---

## Cross-app glue (Yuun → Yuel)

Free 黄历 is anonymous. **Subscribe** requires sign-in → portfolio auth → RC alias. Yuun 亲友 push to `/api/bonds/solo` and appear in Yuel with zero friction. Detail: [apps/yuun/launch.md](./apps/yuun/launch.md) · [apps/yuel/launch.md](./apps/yuel/launch.md).

---

## Suggested ship order

Per [ADR-0019](./decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md) (updated for four apps):

1. **Yuun** — daily utility anchor + publisher credit
2. **Yuel** — portfolio upsell (Yuun carry-over is the moat)
3. **Feng** — parallel build; submit after Yuun stabilises
4. **CoinCast** — after V1 trio telemetry validates 4.3(b) framing; see [apps/coincast/README.md](./apps/coincast/README.md)

Builds can run in parallel; ASC **submission** order follows the list above.

---

## Web disclosure (`hexastral-web`)

**Marketing narrative** (distinct from ASC submission order):

| Tier | Apps | Role |
|------|------|------|
| **Flagship** | Yuel, Kanyu (Feng) | Depth, Pro reports, primary monetization |
| **Funnel** | Yuun, Yaul (CoinCast) | Daily entry → upsell to flagship |

**Technical submission order** remains Yuun → Yuel → Feng → CoinCast (unchanged above).

Single source for visibility, sitemap, and homepage cards: `apps/hexastral-web/lib/growth/launch-status.ts`. Bump `visibility` per wave (W1 Yuun live → W2 Yuel → W3 Kanyu + `kanyu.png` → W4 Yaul).

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
| Shared store steps | [publish/launch-checklist.md](./publish/launch-checklist.md) |

---

## Reference

- [decisions/](./decisions/) — active ADRs
- [archive/decisions/](./archive/decisions/) — superseded ADRs (historical)
- [shared/birth-info-form-spec.md](./shared/birth-info-form-spec.md) — birth-info component contract
