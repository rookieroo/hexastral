# HexAstral Roadmap — June 2026 launch wave

**Goal:** ship two apps to the App Store in June 2026 — **Auspice** (the 黄历 utility) and **Kindred / Kindred** (the relationships product). Everything in this repo is in service of those two ships.

This doc replaces the prior multi-phase plan. ADRs in `decisions/` are the historical record; everything else has been pruned to the launch surface.

---

## Apps in scope

| App | Role | Status (early June) |
|---|---|---|
| **Auspice** (`apps/auspice-app`, bundle `com.hexastral.cycle`) | Daily 黄历 utility · login-at-subscribe Pro · 对你而言 personal calendar · gateway to Bonds | Core complete; needs rename surfaced, secrets deployed, ASO + screenshots, on-device smoke |
| **Kindred** (`apps/kindred-app`) | Solo 八字紫微 reading first, then Bonds / 合盘 Threads · receives Auspice's 亲友 carry-over via `/api/bonds/solo` | Backend bonds API live; receive path verified; **pivoting to solo-first on the ming-pan frame per [ADR-0021](decisions/0021-kindred-v2-solo-first-mingpan-frame.md)** (phases K1–K4); intro animation precision landed |

**Out of scope for June** (post-V1 wave per ADR-0019): Feng, Fate, V1.5 face/coin/dream apps.
**Never launches** (per [ADR-0022](decisions/0022-mingpan-disposition-donor-not-launch.md)): MingPan — it is the donor frame for Kindred v2; its code ports into kindred-app (K1–K2), then the app archives.

---

## The shared surfaces (`hexastral-api`)

One Worker (`hexastral-api`) hosts everything both apps consume:
- `/api/auspice/*` — almanac (free) + personal `.ics` (Pro, signed-token + server RC check)
- `/api/bonds/*` — Kindred's bond graph (HMAC-gated, requires sign-in)
- `/api/portfolio/auth/{apple,google}` — unified identity (creates `{userId, deviceSecret}`)

Deploy: `cd apps/hexastral-api && bun deploy`. CI is validation-only — deploy is local.

Secrets to set (via `wrangler secret put`):
- `CYCLE_CALENDAR_SECRET` — HMAC for signed personal-calendar tokens (generate: `openssl rand -hex 32`)
- `REVENUECAT_API_KEY` — secret REST key from RC dashboard (sk_…)

---

## The identity flow (the cross-app glue)

Free 黄历 is anonymous. The **subscribe step** requires sign-in (Apple or Google) → `POST /portfolio/auth/{apple,google}` → `{userId, deviceSecret}` → `Purchases.logIn(userId)` aliases RC.

**Why this matters:** the moment the user signs in to subscribe in Auspice, their 亲友 (recorded in Auspice) push to `/api/bonds/solo` and appear in Kindred with zero friction. That's the portfolio's selling moment.

See `auspice-launch.md` for the gate UI; `yuan-launch.md` for the receive path.

---

## What's left for each app — see the focused docs

- `auspice-launch.md` — Auspice-only checklist
- `yuan-launch.md` — Kindred-only checklist
- `launch-checklist.md` — shared App Store / Play Store steps (privacy manifests, screenshots, reviewer notes)

## Reference

- `decisions/` — every ADR (historical reasoning)
- `setup/` — RC entitlements, Sentry, satellite funnel wiring
- `cycle-widget-build-runbook.md` + `cycle-widget-watch-scope.md` — native WidgetKit/watchOS (post-June, scaffolded)
- `bonds-timeline-plan.md` — Kindred's core IP (kept for reference)
- `birth-info-form-spec.md` — shared core-ui birth-info component
