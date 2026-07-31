# Launch checklist — shared App Store / Play Store steps

Single consolidated checklist. Per-app details: [yuun/launch.md](../apps/yuun/launch.md),
[yuel/launch.md](../apps/yuel/launch.md). Executable console runbook:
[yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md). Five-app code vs human
matrix: [publish/README.md](./README.md) § Code readiness.

Last updated: 2026-07-26.

---

## Pre-submission

### Developer portal (Apple)
- [ ] App ID for each bundle id (`com.hexastral.yuun`, `com.hexastral.yuel`)
- [ ] Enable capabilities per app:
  - **Yuun**: Sign in with Apple, **App Groups** (`group.com.hexastral.yuun` — needed even though widget ships post-v1)
  - **Yuel**: Sign in with Apple
- [ ] Provisioning profiles regenerated after capability changes

### App Store Connect
- [ ] App record created per bundle id, primary category set:
  - Yuun → Reference
  - Yuel → Lifestyle
- [ ] Pricing: free with IAP (subscriptions)
- [ ] Subscription / IAP products:
  - `auspice_pro_monthly`, `auspice_pro_annual` (Yuun)
  - `hexastral_compatibility` (Yuel one-time — **MVP**); defer `kindred_pro_*` to Phase 2
- [ ] Localizations: zh-Hans, zh-Hant, ja, en — name + subtitle + keywords + description + promotional text

### RevenueCat
- [ ] Products imported from App Store Connect for both apps
- [ ] Entitlements (MVP only): `auspice_pro` (Yuun), `kindred_pro` (Yuel) — **do NOT create** `universe_pro` at MVP; see `setup/revenuecat-entitlements.md`
- [ ] Webhook → `/api/webhooks/revenuecat` (confirm path against live Worker) firing
- [ ] Secret REST API key set as `REVENUECAT_API_KEY` on the Worker

### Privacy
Both apps file the same privacy posture:
- **Collected on sign-in only**: Apple email or Google email (purpose: account / customer support / restore)
- **Collected on purchase**: Purchases (RC manages, linked to the userId)
- **User content** (typed): birth info, 亲友 birthdays (stored locally + relayed to portfolio bonds on Kindred transfer)
- **Tracking**: none
- [ ] Privacy URL live + linked in app + App Store Connect
- [ ] Privacy nutrition labels filled per above

### Code-side (do not re-open as console work)
- [x] `ALLOW_DEV_PRO=0` + cron HMAC exemptions
- [x] Yuun server-side Pro for LLM routes; Yuel push harvest reliability + Yuel-branded lifecycle push
- [x] Yuel EAS slug `yuan` aligned with Expo project
- [ ] Human: fill `appl_*` + `ascAppId` + secrets; run [yuun/pre-submit-smoke.md](../apps/yuun/pre-submit-smoke.md) then [yuel/pre-submit-smoke.md](../apps/yuel/pre-submit-smoke.md)

---

## Screenshots

6.7" iPhone (mandatory) + 5.5" iPhone (still required for older devices). iPad optional unless we declare iPad support.

Per app, 4 locales × 5–6 screens. Sample shot list:

**Yuun (Reference):**
1. Hero — dark watch-face card showing today's 干支 + 月相 + 宜忌
2. CalendarStrip + DayView (the everyday glance)
3. 今日文化 + 文化导览 (drives the cultural depth angle)
4. PersonalCard (对你而言) — the Pro hook
5. 节假日提醒 + 表盘 settings — the CN differentiation

**Yuel (Lifestyle):**
1. Bonds home (the "your people" map) — include Yuun carry-over banner if demo account has transferred 亲友
2. Pair reading hero (合婚)
3. Bonds timeline (the IP)
4. Solo-create flow (the receive surface for Yuun carry-over)
5. Subscribe — the IAP page

Caption discipline: one short line per screenshot, no marketing fluff. The product reads "useful first."

---

## Reviewer notes (App Store Connect → Review Information)

Template — fill in per app:

```
Test account: (none required — anonymous-first)
To exercise Pro: tap any "Pro" element → "Sign in with Apple/Google" → restore purchases works for re-review.

Yuun (黄历):
- Daily Chinese almanac (干支 / 宜忌 / 节气) — deterministic, no fortune-telling, no health claims.
- Sign-in only at the subscribe step (not gating the daily content).
- Holiday reminders follow published State Council schedules where enabled; product default may keep holiday push off.

Yuel (relationships / 合盘):
- Relationship analysis using 八字 (Bazi) — entertainment / cultural reference.
- Sign-in required to record bonds (each is stored under the user's identity).
- No matchmaking / dating features.
- Daily relationship nudge (~19:00) is optional; not a personal almanac morning push.
```

---

## Submission order

Per ADR-0019: ship the lowest-risk first to build publisher credibility.
1. **Yuun** — Reference category, deterministic utility, plenty of approved precedents (黄历 / LunaCal / Almanac+).
2. **Yuel** — Lifestyle, references 八字; safer once Yuun has shipped under the same publisher.
3. **Kanyu** — after Yuun stabilises **and** LLM prose P0 (Vision contract + combination compliance) lands — see [feng/report-quality-plan.md](../apps/feng/report-quality-plan.md).
4. **Yaul** — after V1 trio telemetry + ASO/legal/ASC readiness — see [coincast/README.md](../apps/coincast/README.md) § Readiness. **Not ready today.**
5. **Syel** — post-wave; code mostly ready, EAS `projectId` still placeholder.

Submit Yuun → wait for approval → submit Yuel the same day Yuun approves. Don't pile two new apps into review at once from a fresh-ish publisher.

---

## Post-submission

Monitor crash reports + RC webhook delivery. Do not enable `universe_pro` until 3+ apps are live.
