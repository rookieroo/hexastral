# Yuun — launch checklist

**Bundle:** `com.hexastral.yuun` · **Display name:** Yuun · **Directory:** `apps/auspice-app`

Yuun is a Chinese almanac (中华黄历) with Today-first navigation. Free tier = full yi/ji almanac; **Pro = 对你而言 personalization + personal 八字/紫微 命书 deep-read + personal calendar feed + specialized 择日 + timeline reminders**, gated behind sign-in.

> **ASO / review note (2026-07):** Store copy matches Today-first IA — no 4-tab / widget / Watch claims. Personal 命书 disclosed mid-description + screenshot S6. See [aso-code-audit-matrix.md](./aso-code-audit-matrix.md) and [pre-submit-smoke.md](./pre-submit-smoke.md).

---

## State (July 2026)

**Code complete (Today-first IA):**
- **Today** (`/(tabs)/`): WeekStrip + yi/ji + For you; swipe right → Calendar, left → Settings; bottom text hints
- **Calendar** (`/calendar`): full month grid secondary; left-swipe back to Today
- **Settings** (`/(tabs)/me`): modular groups — Profile, Library, Notifications, Calendars, Legal
- For-you (`PersonalCard`): free verdict + summary, Pro = per-reason explanation
- Calendar feed: free `/calendar.ics` · Pro `/calendar/personal.ics` (signed token)
- 亲友 (`/people`): lunar/solar birthdays; Free cap 3 reminders; Pro unlimited
- Notifications: daily + evening push; timeline node reminders (Pro); **no** CN 调休 holiday toggle in Settings UI
- Sign-in at paywall: Apple + Google; RC restore across devices

**Native deferred post-v1 (code may exist; do not claim in ASO until shipped):**
- WidgetKit + watchOS full companion — see [widget-watch-scope.md](./widget-watch-scope.md) + [widget-build-runbook.md](./widget-build-runbook.md). Requires EAS/Xcode Watch install + D1 `watch_credentials` in prod.
- `/display` route hidden from navigation (no Me entry)

---

## Open work (pre-submit)

### Backend
- [x] Production `ALLOW_DEV_PRO=0` + push HMAC exemptions (shared API)
- [x] Server-side Pro for LLM explain / makeif / monthly / timeline explain
- [ ] Confirm Worker secrets: `CYCLE_CALENDAR_SECRET`, `REVENUECAT_API_KEY`, webhook secret
- [ ] RevenueCat + `auspice_pro` entitlement live in ASC/RC dashboards
- [ ] Spot-check: `cd apps/hexastral-api && bun deploy` after any uncommitted Yuun API diffs

### App Store Connect
- [ ] ASC record; **content rating 12+** (matches `aso-metadata.json`)
- [ ] Paste ASO from `apps/auspice-app/aso-metadata.json` (4 locales)
- [ ] Screenshots per [screenshot-direction.md](../../publish/screenshot-direction.md) §1 (6 shots, no S7 widget)
- [ ] `node scripts/aso-charcount.mjs` + `node scripts/aso-code-parity.mjs` before paste
- [ ] Fill `eas.json` `ascAppId` + production `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- [ ] Device smoke: [pre-submit-smoke.md](./pre-submit-smoke.md)

### Build + smoke
- [ ] EAS production: fill `ascAppId` + RevenueCat keys (see `scripts/assert-release-config.mjs`)
- [ ] [pre-submit-smoke.md](./pre-submit-smoke.md) on device

### Post-launch (NOT v1)
- Native Widget + Watch companion milestone (RootLayout sync, Watch bootstrap Bearer, Today/Browse/Settings) — separate from June ASO cut
- Bond-transfer locale polish
- 调休 heads-up for SG/MY/US
