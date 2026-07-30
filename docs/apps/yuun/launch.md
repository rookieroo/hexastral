# Yuun — launch checklist

**Bundle:** `com.hexastral.yuun` · **Display name:** Yuun · **Directory:** `apps/auspice-app` · **Marketing version:** `1.0.0`

Yuun is a Chinese almanac (中华黄历) with Today-first navigation and a three-tier ladder:

| Tier | Identity | For you | Push | Widget / Watch |
|---|---|---|---|---|
| Anonymous Free | local `deviceId` | conclusion summary (on-device birth) | public 黄历 | public 黄历 + optional Fit via WatchConnectivity |
| Signed-in Free | Apple/Google | same + restore | personal conclusion | + Watch credential for independent refresh |
| Pro (`auspice_pro`) | + RC entitlement | full reasons | conclusion + deterministic tips | full explanation stays in-app; LLM only on tap |

> **ASO / review note (2026-07-30):** Store copy matches Today-first IA + three-tier privacy. Widget / Lock Screen / Watch may be claimed **only after** production archive + device evidence (see [widget-watch-scope.md](./widget-watch-scope.md)). System requirements: App iOS 15.1+, widgets iOS 17.0+, watchOS 10+.

---

## State (July 2026)

**Code complete (Today-first IA + launch harden):**
- **Today** (`/(tabs)/`): WeekStrip + yi/ji + For you; swipe right → Calendar, left → Settings
- **Calendar** / **Settings** modular groups
- For-you: free verdict + summary; Pro = per-reason
- Anonymous local birth preview + sign-in CTA; sync when multi-device on
- Calendar feed: free `/calendar.ics` · Pro `/calendar/personal.ics`
- 亲友: Free cap 3; Pro unlimited
- Notifications: server Expo push (anonymous = public; signed-in = personal; Pro = tips); timeline node (Pro)
- Sign-in at paywall: Apple + Google; RC restore; real prices / Restore / legal
- Root `AuspiceErrorBoundary`; `supportsTablet: false`; marketing `1.0.0`

**Native Widget + Watch (v1 capability — evidence-gated):**
- Targets in repo: `targets/widget`, `targets/watch`, `targets/watch-widget`
- **Go only if** production archive includes all three + TestFlight device matrix passes (see [widget-build-runbook.md](./widget-build-runbook.md)). If any target missing or path fails → strip ASO/screenshot claims before submit.

---

## Open work (pre-submit)

### Backend (human secrets / deploy)
- [ ] Confirm Worker secrets: `CYCLE_CALENDAR_SECRET`, `REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`
- [ ] `ALLOW_DEV_PRO=0` on production vars
- [ ] RevenueCat + ASC: `auspice_pro_monthly` / `auspice_pro_annual` / entitlement `auspice_pro` / offering `auspice_default` / webhook
- [ ] Spot-check: deploy API after Yuun API diffs (`cd apps/hexastral-api && bun deploy`) — **needs explicit approval**
- [ ] Confirm birthCity nullish schema live; retest three save paths on device

### App Store Connect
- [ ] ASC record; **content rating 12+**
- [ ] Paste ASO from `apps/auspice-app/aso-metadata.json` (4 locales)
- [ ] Screenshots per [screenshot-direction.md](../../publish/screenshot-direction.md); Widget/Watch shots only if archive evidence exists
- [ ] `node scripts/aso-charcount.mjs` + `node scripts/aso-code-parity.mjs`
- [ ] Fill `eas.json` `ascAppId` + production RevenueCat keys (EAS Secrets)
- [ ] Nutrition Labels match privacy manifest collected types
- [ ] Device smoke: [pre-submit-smoke.md](./pre-submit-smoke.md)

### Build + evidence
- [ ] `AUSPICE_REQUIRE_PROD_KEYS=1 node scripts/assert-release-config.mjs` green
- [ ] EAS production archive: confirm widget / watch / watch-widget embedded
- [ ] TestFlight: iPhone + Watch matrix (first install, phone unreachable, midnight, locale/yiji mode, birth update, delete account, Lock/Home families, complications)

### CI
- [ ] Root `bun typecheck && bun lint && bun test && bun check-deps` green

### Deploy legal pages
- [ ] Deploy `hexastral-web` so `/en|/zh|/tw|/ja/privacy/yuun` return localized appendix (HTTP 200) — **needs approval**

---

## Go / No-Go

Any P0 open → **No-Go**. See plan todos: paywall, value ladder, birth/delete, privacy/ASO, release config, Widget/Watch evidence, CI/docs.
