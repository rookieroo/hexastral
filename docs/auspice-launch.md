# Auspice — June 2026 launch checklist

**Bundle:** `com.hexastral.cycle` · **Display name:** Auspice · **Slug stays:** `cycle`

Auspice is the renamed-but-internally-still-cycle 黄历 utility. Free tier = the full almanac; **Pro = 对你而言 personalization + personal 八字/紫微 命书 deep-read (chaptered report + 划词 ask-AI) + personal calendar feed + 关系 reading + specialized 择日**, gated behind sign-in.

> **ASO / review note (2026-06, Yuel/Yuun split):** the personal 命书 deep-read is now a primary Pro surface, so the store listing must **disclose** it (Guideline 2.3.1) without **leading** with it (Guideline 4.3(b)). Done via: `aso-metadata.json` descriptions + Pro lines (8 locales — 命理 kept in the classical register: 八字/紫微/命盘/大运/流年, never 算命/运势/预测) and a mid-deck screenshot (S6, "a study, not a prediction"). The calendar stays the headline; 命理 is the disclosed second act. th/ms wording is draft — native-review before submit.

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

### Timeline node push (流月/流年/大运 — the #1 Pro hook) — deploy-gated
Code-complete + typecheck-clean (4 workspaces) as of 2026-06-10; CANNOT be verified in-sandbox (needs D1 + cron). Full detail + rationale in `timeline-deep-read-plan.md` (§7).
- [ ] `cd apps/hexastral-api && bun run db:migrate:prod` — applies migration `0012_petite_tana_nile` (creates `timeline_readings` 落库 table + `auspice_push_subs.timeline_remind_on`)
- [ ] Deploy the three workers in order (targets before the cron): `services/svc-astro` → `apps/hexastral-api` → `services/svc-notify`, each `bun deploy`
- [ ] Tune the svc-astro `/timeline/explain` prompt — marked DRAFT; sanity-check 流月/流年 wording (reflection-not-prediction register, the reason→flag mapping) against a few real charts
- [ ] On-device verify (Pro + birth set + `timelineRemindToggle` on): open a 流月 node → rich read swaps in over the deterministic summary; re-open instant (落库 hit); navigate to a further year → "generating" → persists; evening daily push shows the 对你而言 fit line; on the 1st of a month confirm EXACTLY ONE node push (~09:00 local, server) and no duplicate local one (defer guard)
- [ ] Watch `llm-guard` `timeline-explain` cost — 落库 (generate-once) should flatten the curve fast

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
