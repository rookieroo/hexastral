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

---

## Outstanding work — snapshot 2026-06-10

A single "what's left" view across the work streams in play. Detail lives in the linked docs; this is the index.

### A. Timeline node push — the #1 Pro hook (Auspice/Yuun) — **deploy-gated**
Code-complete + typecheck-clean (svc-notify cron + `/api/auspice/timeline/explain` + 落库 `timeline_readings` + `timeline_remind_on` plumbing + What-If 干支 de-emphasis). CANNOT be built/verified in-sandbox (D1 + cron). **Remaining = local deploy only:**
- Apply migration `0012_petite_tana_nile` to prod D1; deploy svc-astro → hexastral-api → svc-notify; tune the DRAFT svc-astro `/timeline/explain` prompt; on-device verify (no double-fire, 落库 hit, evening fit line).
- Detail: `timeline-deep-read-plan.md` §7 + `auspice-launch.md` → "Timeline node push".

### B. Brand rename Yuun / Yuel — finalization (human, not code)
In-app code/config rename is **done** (app.json, Info.plist, strings.xml, share cards, i18n). **Remaining:**
- Trademark filing for **Yuun** (cl. 9/42) + **Yuel** (cl. 9/42) — founder accepted the rejection risk; file or sit on it. Detail: `trademark-clearance-and-filing.md`.
- Create the App Store Connect records under the new display names (gated on clearance comfort).
- Stale: `auspice-launch.md` / `yuan-launch.md` headers still say "Auspice" / "Kindred" as display names — refresh to Yuun / Yuel when the ASC records are cut. Dirs + bundle ids stay (`com.hexastral.cycle`, etc.).

### C. ASO + store entry (human)
- `aso-metadata.json` rewritten for 8 locales (+ en-GB / ms / th / es-MX) — **done**. Detail: `brand-aso-gtm-plan.md`.
- **Remaining:** enter the metadata into ASC; per-locale screenshots (`launch-checklist.md`).

### D. Per-app June-launch checklists (pre-existing, still open)
- Auspice: secrets (`CYCLE_CALENDAR_SECRET`), RC products live, ASC record, onboarding redesign, non-zh i18n sweep — `auspice-launch.md`.
- Kindred: solo-first ming-pan frame (K1–K4), report redesign to justify $6.99 (墨儀 visual + per-chapter 4-layer) — `yuan-launch.md`, `kindred-status.md`, `kindred-report-redesign.md`.

## Reference

- `decisions/` — every ADR (historical reasoning)
- `setup/` — RC entitlements, Sentry, satellite funnel wiring
- `cycle-widget-build-runbook.md` + `cycle-widget-watch-scope.md` — native WidgetKit/watchOS (post-June, scaffolded)
- `bonds-timeline-plan.md` — Kindred's core IP (kept for reference)
- `birth-info-form-spec.md` — shared core-ui birth-info component
