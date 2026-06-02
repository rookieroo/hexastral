# Auspice — June 2026 launch checklist

**Bundle:** `com.hexastral.cycle` · **Display name:** Auspice · **Slug stays:** `cycle`

Auspice is the renamed-but-internally-still-cycle 黄历 utility. Free tier = the full almanac; **Pro = 对你而言 personalization + personal calendar feed + 关系 reading + specialized 择日**, gated behind sign-in.

---

## State (early June)

**Code complete:**
- Home: dark watch-face hero · CalendarStrip (i18n weekdays, no CJK in en) · 今日文化 + collapsible 文化导览 · 择日 + 记录亲友生日 actions
- For-you (`PersonalCard`): free verdict + summary, Pro = per-reason explanation
- Calendar feed: free `/calendar.ics` (13-month rolling) · Pro `/calendar/personal.ics` (signed token + server RC check)
- 亲友 (`/people`): name + birthday (solar/lunar) + 时辰 + gender + advance-days · year optional · transfers to Kindred Bonds on sign-in
- Settings (`/me`): birth (collapses on save) · daily push · 节假日 heads-up (CN 调休 2026) · 表盘 (`/display`, dark-only) · 外地时区 (`/remote-tz`) · Apple Calendar subscribe (free + Pro rows) · sign-in is at the paywall
- Sign-in: Apple primary on iOS + Google secondary (cross-platform); RC alias; on success → `transferAuspicePeopleToBonds`
- Notifications: stable per-date IDs, one-time purge of stale ID-scheme cruft, 节假日/调休 heads-up

**Native scaffolded but not shipping in June:**
- WidgetKit (3 sizes, App Group bridge) — see `cycle-widget-build-runbook.md`
- watchOS complications — same runbook
- Skia 月相 lives in-app; widget will use a static moon

---

## June-launch open work

### Backend
- [ ] `wrangler secret put CYCLE_CALENDAR_SECRET` (generate: `openssl rand -hex 32`)
- [ ] Confirm `REVENUECAT_API_KEY` set on the Worker (RC dashboard → API Keys → secret REST key)
- [ ] `cd apps/hexastral-api && bun deploy` — picks up the wider `.ics` window + the signed-token + sign route
- [ ] RC dashboard: `auspice_pro_monthly` + `auspice_pro_annual` products live; entitlement `auspice_pro` mapped

### App Store Connect
- [ ] Create the Auspice App Store Connect record (display name: **Auspice**, subtitle: 黄历 / Chinese Almanac, category: Reference)
- [ ] App Group `group.com.hexastral.cycle` added to the provisioning profile (Developer portal → Identifiers → enable App Groups for the bundle id)
- [ ] Apple Sign In capability live on the bundle id (uses the dormant `usesAppleSignIn` we now actually need)
- [ ] Privacy nutrition labels: collected = Apple/Google email (only on sign-in), Purchases. No tracking.
- [ ] ASO metadata: name + subtitle + 4-locale keywords + description (4 locales: zh-Hans / zh-Hant / ja / en)
- [ ] Screenshots: see `launch-checklist.md` for the per-locale set

### Build + smoke
- [ ] `bun install` to pick up the Google Sign-In plugin (added in app.json)
- [ ] `bun run prebuild` to wire the Google plugin's iOS URL scheme + the App Group entitlement
- [ ] On-device smoke: sign in with Apple → subscribe → personal calendar `webcal://` opens with 对你而言 verdicts → 亲友 transferred to Bonds (`isYuanReady` people only)
- [ ] Reset state for tester runs: `cycle.bonds.transferred` AsyncStorage key + RC user reset

### Polish (known gaps, prioritized for June)
- [ ] **Onboarding entrance** (open): no stickman intro animation, no first-launch flag, top tab heavy with text, birth-info form requires scroll, post-save doesn't route to home. Need a single-pass onboarding redesign — see `app/index.tsx` (currently boots straight in) + the Me birth form section.
- [ ] WatchSettings + `/people` + RelationshipSheet: a few hardcoded zh labels still leak in non-zh locales — i18n sweep.
- [ ] Holiday data table refreshes annually (`lib/cn-holidays.ts`) — covered for 2026; calendar reminder for 2027 announcement (~Nov 2026).

### Post-launch (NOT June)
- Native WidgetKit + watchOS targets (scaffold ready)
- Bond-transfer language to the user's locale
- Sign-in for non-cycle apps (consistent RC alias)
- 调休 heads-up for SG/MY/US
