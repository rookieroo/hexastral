# Yuun — launch checklist

**Bundle:** `com.hexastral.auspice` · **Display name:** Yuun · **Directory:** `apps/auspice-app`

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

**Native deferred post-v1:**
- WidgetKit + watchOS — see [widget-watch-scope.md](./widget-watch-scope.md)
- `/display` route hidden from navigation (no Me entry)

---

## Open work (pre-submit)

### Backend
- [ ] `wrangler secret put CYCLE_CALENDAR_SECRET`
- [ ] RevenueCat + `auspice_pro` entitlement live
- [ ] `cd apps/hexastral-api && bun deploy`

### App Store Connect
- [ ] ASC record; **content rating 12+** (matches `aso-metadata.json`)
- [ ] Paste ASO from `apps/auspice-app/aso-metadata.json` (4 locales)
- [ ] Screenshots per [screenshot-direction.md](../../publish/screenshot-direction.md) §1 (6 shots, no S7 widget)
- [ ] `node scripts/aso-charcount.mjs` + `node scripts/aso-code-parity.mjs` before paste

### Build + smoke
- [ ] EAS production: fill `ascAppId` + RevenueCat keys (see `scripts/assert-release-config.mjs`)
- [ ] [pre-submit-smoke.md](./pre-submit-smoke.md) on device

### Post-launch (NOT v1)
- Native Widget + Watch
- Bond-transfer locale polish
- 调休 heads-up for SG/MY/US
