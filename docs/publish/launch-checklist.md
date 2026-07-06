# Launch checklist — shared App Store / Play Store steps

Single consolidated checklist replacing the prior `launch-guide`, `launch-sequence`, `v1-submission-checklist`, `local-manual-checklist`, `reviewer-notes-templates`, and `screenshot-direction`.

Per-app specifics: see [apps/yuun/launch.md](../apps/yuun/launch.md) and [apps/yuel/launch.md](../apps/yuel/launch.md).

---

## Pre-submission

### Developer portal (Apple)
- [ ] App ID for each bundle id (`com.hexastral.cycle`, `com.hexastral.kindred`)
- [ ] Enable capabilities per app:
  - Auspice: **Sign in with Apple**, **App Groups** (`group.com.hexastral.cycle` — needed even though widget ships post-June, since the entitlement is already in the binary)
  - Kindred: **Sign in with Apple**
- [ ] Provisioning profiles regenerated after capability changes

### App Store Connect
- [ ] App record created per bundle id, primary category set:
  - Auspice → Reference
  - Kindred → Lifestyle
- [ ] Pricing: free with IAP (subscriptions)
- [ ] Subscription products:
  - `auspice_pro_monthly`, `auspice_pro_annual` (Auspice)
  - Kindred's product IDs per `apps/kindred-app/lib/iap.ts`
- [ ] Localizations: zh-Hans, zh-Hant, ja, en — name + subtitle + keywords + description + promotional text

### RevenueCat
- [ ] Products imported from App Store Connect for both apps
- [ ] Entitlements: `auspice_pro` (Auspice), Kindred's entitlement, `universe_pro` (cross-app override) — see `setup/revenuecat-entitlements.md`
- [ ] Webhook → `/api/webhook/revenuecat` confirmed firing
- [ ] Secret REST API key set as `REVENUECAT_API_KEY` on the Worker

### Privacy
Both apps file the same privacy posture:
- **Collected on sign-in only**: Apple email or Google email (purpose: account / customer support / restore)
- **Collected on purchase**: Purchases (RC manages, linked to the userId)
- **User content** (typed): birth info, 亲友 birthdays (stored locally + relayed to portfolio bonds on Kindred transfer)
- **Tracking**: none
- [ ] Privacy URL live + linked in app + App Store Connect
- [ ] Privacy nutrition labels filled per above

---

## Screenshots

6.7" iPhone (mandatory) + 5.5" iPhone (still required for older devices). iPad optional unless we declare iPad support.

Per app, 4 locales × 5–6 screens. Sample shot list:

**Auspice (Reference):**
1. Hero — dark watch-face card showing today's 干支 + 月相 + 宜忌
2. CalendarStrip + DayView (the everyday glance)
3. 今日文化 + 文化导览 (drives the cultural depth angle)
4. PersonalCard (对你而言) — the Pro hook
5. 节假日提醒 + 表盘 settings — the CN differentiation

**Kindred (Lifestyle):**
1. Bonds home (the "your people" map)
2. Pair reading hero (合婚)
3. Bonds timeline (the IP)
4. Solo-create flow (the receive surface for Auspice's carry-over)
5. Subscribe — the IAP page

Caption discipline: one short line per screenshot, no marketing fluff. The product reads "useful first."

---

## Reviewer notes (App Store Connect → Review Information)

Template — fill in per app:

```
Test account: (none required — anonymous-first)
To exercise Pro: tap any "Pro" element → "Sign in with Apple/Google" → restore purchases works for re-review.

Auspice (黄历):
- Daily Chinese almanac (干支 / 宜忌 / 节气) — deterministic, no fortune-telling, no health claims.
- Sign-in only at the subscribe step (not gating the daily content).
- 节假日 reminders use the State Council's published 2026 holiday schedule.

Kindred (Kindred):
- Relationship analysis using 八字 (Bazi) — entertainment / cultural reference.
- Sign-in required to record bonds (each is stored under the user's identity).
- No matchmaking / dating features.
```

---

## Submission order

Per ADR-0019: ship the lowest-risk first to build publisher credibility.
1. **Auspice** — Reference category, deterministic utility, plenty of approved precedents (黄历 / LunaCal / Almanac+).
2. **Kindred** — Lifestyle, references 八字; safer once Auspice has shipped under the same publisher.

Submit Auspice → wait for approval → submit Kindred the same day Auspice approves. Don't pile two new apps into review at once from a fresh-ish publisher.

---

## Post-submission

- [ ] Auspice review: clear in 24–48h if metadata is clean. Common reject: deceptive name (Auspice is clear), undisclosed IAP, missing privacy URL.
- [ ] Kindred review: as above; the only Kindred-specific risk is review reading the 八字 reading as "fortune telling" — captions and description should frame as **cultural reference / personality lens**, not predictions.
- [ ] After approval: monitor RC for first conversion, monitor Sentry for crashes, monitor Worker logs for `/calendar/sign` 403s (sign-in flow regressions).
