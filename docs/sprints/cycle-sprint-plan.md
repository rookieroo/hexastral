# Cycle Sprint Plan · 万年历 V2 Build-Out (W1)

> **Status**: ACTIVE · Sprint 0+1 done, Sprint 2 next · 2026-05-31
> **Implements**: ADR-0015 Doctrine v2 §"cycle" + §"Daily-utility lock-in"
> **Sprint cadence**: 1 week each · **6 sprints total** (was 5; Tier 1 audit +1) · target TestFlight end of Sprint 6
> **Then**: ~2-3 weeks ASC review

## Tier 1 audit additions (2026-05-31)

Sprint 2 + Sprint 4 expanded to add 10 Tier-1 features identified in user audit:

| # | Feature | Sprint |
|---|---|---|
| 1 | 忌日追踪 (death anniversary push) | Sprint 4 |
| 2 | 闰月处理 (leap month) | Sprint 2 + 4 |
| 3 | 60-/80-/90-大寿 milestone push | Sprint 4 |
| 4 | 嫁娶/入宅/开市/出行 专用择日 (4 specialized flows) | Sprint 2 |
| 5 | 生肖年 + 生肖 conflict | Sprint 2 |
| 6 | 真太阳时 + 12 时辰 GPS correction | Sprint 2 |
| 7 | 节气精确时刻 (second-level) | Sprint 2 |
| 8 | 农历初一/十五 push + visual highlight | Sprint 2 + 4 |
| 9 | 海外双时区显示 | Sprint 2 |
| 10 | 本命年文化标注 | Sprint 2 |

Effort impact: ~+5-7 person-days = +1 sprint added between Sprint 2 and Sprint 3 (Sprint 2 expanded; original Sprint 3 content unchanged).

## Design language pivot (2026-05-31, post Sprint 1)

User mandate during Sprint 1 wrap-up established **ADR-0018 HexAstral Design Language**
as matrix-wide law: no bottom tab bar, single `Stack` + gesture-to-Me on every home,
no ad slots on funnel/flagship surfaces, sparse minimalist composition. cycle became
the second consumer of the shared `SWIPE_TO_ME` contract (MingPan was the first); the
4-tab IA originally scheduled for Sprint 1 was dismantled in the same change.

Sprint 2 + Sprint 3 IA below is rewritten to the drill-in route model:

- **Today** is home (sparse 黄历; gesture-to-Me + ⋯ button)
- **`/month`** is a drill-in (slide-in route, back affordance)
- **`/event`** is a drill-in (reverse 择日; already existed)
- **`/festivals`** is a drill-in (Sprint 3 build-out)
- **Me** is a drill-in (back affordance, Discover disclosure as the lone flagship entry)

See `docs/decisions/0018-hexastral-design-language.md` for the full rule set + PR
compliance checklist.

## Overview

Transform `apps/cycle-app` from "single-screen 黄历 daily" into "Chinese Calendar Pro" — a sparse utility-first product (Today as home; Month / 择日 / 节庆 / Me reached via swipe + drill-in routes per ADR-0018) anchored by widget × 3 + Apple Watch complication + family 农历 birthday push.

**Definition of Done for W1 submission**:
- Today (home) + Month + 择日 + 节庆 + Me surfaces implemented with Free + Pro feature parity per ADR-0015 (Today as home; the rest as drill-in routes per ADR-0018)
- Widget × 3 (Small / Medium / Lock-Screen) shipping native
- Apple Watch complication (modular small) shipping native
- 24 节气 educational pages × 4 locales
- 8 major festivals × 4 locales
- Family multi-account (1 self Free, unlimited Pro) wired through portfolio API
- 农历 birthday push scheduling working end-to-end
- TestFlight smoke test passes on iPhone 13 + Apple Watch SE
- ASC ASO metadata aligned to Doctrine v2 anti-spam rules

---

## Pre-Sprint Setup (Sprint 0 — current week)

| Item | Owner | Done? |
|---|---|---|
| ADR-0015 + ADR-0016 written | claude | ✅ |
| Cycle sprint plan written (this doc) | claude | ✅ |
| Existing cycle-app + cycle.ts route audit | claude | ⏳ |
| `apps/cycle-app/aso-metadata.json` revised per Doctrine v2 | claude | ⏳ |
| Designer brief decision (DIY vs hire) | user | ⏳ |
| EAS `projectId` + `ascAppId` filled for cycle | user | ⏳ |

---

## Sprint 1 (W1.1) · Shared Widget-Kit infra + IA scaffold

**Goal**: lay foundation for all 3 widget sizes + watch complication; restructure cycle's home group per ADR-0018 (no-tab `Stack` scaffold, gesture-to-Me, drill-in routes).

### Deliverables

1. `packages/widget-kit-ios/` — new workspace package
   - Expo config plugin generating `WidgetExtension` target in ios/ on prebuild
   - SwiftUI base widget templates: Small, Medium, Lock-Screen
   - TimelineProvider abstraction that reads from shared App Group (`group.com.hexastral.shared`)
   - Data bridge: React Native → AsyncStorage → App Group → Widget (write-through)
   - Helper hook `useWidgetSync(payload)` for React Native side
2. `packages/watch-kit-ios/` — new workspace package
   - Expo config plugin generating WatchKit target
   - ClockKit complication template (modular small only for V1)
   - Same App Group bridge pattern
3. **Shared design-language module**: `packages/satellite-ui/src/swipe-nav.ts`
   - `SWIPE_TO_ME` contract (Pan thresholds + commit predicate + hint delay)
   - Pure data — zero new peerDeps on `react-native-gesture-handler` / `reanimated`
   - `apps/ming-pan-app` migrated to consume the contract (proves the abstraction)
4. `apps/cycle-app/app/(tabs)/_layout.tsx` — no-tab `Stack` scaffold per ADR-0018:
   - `Stack.Screen` for `index` (Today, home), `month` (drill-in, `slide_from_right`), `me` (drill-in, `slide_from_right`)
   - No `SatelliteTabLayout`, no bottom tabs, no persistent chrome
5. `apps/cycle-app/app/(tabs)/index.tsx` — Today rewritten sparse: gesture-to-Me + ⋯ button, `DayView` as primary content, compact drill-in row (`月历` / 择日), no flagship ad slot, no redundant h1 title
6. `apps/cycle-app/app/(tabs)/me.tsx` — back affordance + Discover collapsed disclosure (flagship discovery moved here off Today)
7. `apps/cycle-app/app/(tabs)/month.tsx` — back affordance added (drill-in, not tab)
8. Locale strings `openMonth` + `discover` added across 4 locales

### Acceptance criteria

- `bun typecheck` green on widget-kit-ios + watch-kit-ios + cycle-app + satellite-ui + ming-pan-app
- `expo prebuild --clean` on cycle-app generates WidgetExtension + WatchExtension targets
- No bottom tab bar on cycle; Today opens to 黄历, left-swipe (or ⋯) → Me, `月历` row → `/month` drill-in, 择日 row → `/event` drill-in
- `apps/ming-pan-app` continues to behave identically (no regression from `SWIPE_TO_ME` migration)
- Empty widget shows hardcoded "干支 / 农历 / 节气" placeholder
- Empty watch complication shows hardcoded text
- App Group entitlement wired in Info.plist

### Effort

~6-8 person-days. Heavy native Swift glue work. Once landed, reused by feng + yuan in W2 + W3.

### Risk

- WidgetKit + Expo prebuild config plugin is non-trivial. If blocked > 2 days, fall back to: ship cycle without widget in Sprint 1, treat widget as Sprint 5 polish.

---

## Sprint 2 (W1.2) · 今日 home + Month / 择日 drill-ins

**Goal**: Today (home) Free + Pro split; `/month` drill-in month grid + day drill-in; the 4 specialized 择日 drill-ins (per Tier 1 audit #4). IA per ADR-0018 (no tabs).

### Deliverables

1. `apps/cycle-app/app/(tabs)/index.tsx` (Today, home) rebuild on the Sprint-1 sparse shell:
   - Hero card: 公历日期 + 农历日期 + 干支 + **生肖年标注** + 距下个节气 N 天 + **next 节气 精确时刻**（立春 04:58:39）
   - 12 时辰 row with **真太阳时** correction (GPS-based) + current 时辰 highlighted (Tier 1 audit #6 + #7)
   - 黄历 today block:
     - 宜 / 忌 (Free: top 3, Pro: full)
     - 28-mansion 值日 + 七曜 (Pro)
     - 12 神 (Pro)
   - 对你而言 card (Pro, only shown if user has birth profile):
     - Personal 五行 fit verdict (吉 / 平 / 凶)
     - Day Master interaction with today's 干支
     - **生肖 conflict with today**: e.g. "今日午冲鼠—本日属鼠者宜避大决" (Tier 1 audit #5)
     - **本命年 cultural note**: "2026 is your 本命年 (Year-of-Rat for Rat-borns)" (Tier 1 audit #10)
   - "Plan a date" CTA → `/event` reverse-date-planning drill-in (Pro)
   - Streak badge (existing P1-18 logic, retained)
   - Anti-stacking discipline (ADR-0018 §4): the drill-in nav row stays a single grouped list; no new banners / cards above or below `DayView`.
2. `apps/cycle-app/app/(tabs)/month.tsx` (Month, drill-in from Today's `月历` row):
   - Month grid with 公历 + 农历 + **闰月 indicator** + 节气/节日 marks (Tier 1 audit #2)
   - Year + month navigation (any year ±10,000)
   - Tap any day → drill-in (reuses 今日 layout for that day)
   - **农历 月初一/十五 visual highlight** in grid (Tier 1 audit #8)
   - "Plan a date" entry — choose activity (婚/移/开张/葬/...), then back-end POST /api/cycle/search
   - Month view styles: month name + lunar month name header (with 闰 prefix on leap months)
3. **Specialized 择日 flows (Pro, Tier 1 audit #4)** — separate from generic Plan-a-Date:
   - **嫁娶择日**: emphasizes 阴阳合婚 + 三合 + 六合 + 天德/月德 + avoids 月破 / 红沙 / 杨公忌
   - **入宅择日**: emphasizes 入宅 + 安床 + 天月二德 + avoids 月厌 / 大耗
   - **开市择日**: emphasizes 财日 + 天财 + 六合 + avoids 月空 / 财绝
   - **出行择日**: emphasizes 驿马 + 天乙 + avoids 月厌 / 受死 / 往亡
   - Each: dedicated screen + activity-tuned scoring + classical reference per criterion
   - Optional Pro: **双人合并择日** (couples wedding) — considers both partners' 八字 if both birth dates provided
4. **Dual-timezone display (Tier 1 audit #9, Pro)**:
   - User can set "home" + "remote" timezone (e.g. user in NYC, parents in BJ)
   - Today tab shows both dates simultaneously when applicable (Chinese New Year)
5. Server-side: existing `cycle.ts` route already serves `/day` + `/search` — extend with:
   - 4 specialized search modes: `/api/cycle/wedding`, `/cycle/move-in`, `/cycle/business`, `/cycle/travel`
   - Solar-term exact-timestamp output (already in astro-core; just expose)
6. Locale strings (4 locales) for new UI

### Acceptance criteria

- 今日 tab renders Free + Pro split correctly (Pro features behind paywall sheet)
- 真太阳时 corrects 12 时辰 by user GPS (test at extreme longitudes)
- 节气 hero shows exact second-level timestamp
- 生肖年 + 本命年 cultural labels render correctly
- 日历 tab grid renders for current + last 12 months smoothly with leap-month indicator
- Tap day → drill-in works; back navigation intuitive
- 4 specialized 择日 flows return distinct ranked-date lists per criterion
- Dual-timezone display toggles cleanly
- 4 locales all render without truncation

### Effort

~8-10 person-days (was 5-7; Tier 1 audit additions add ~3 days).

### Risk

- Date arithmetic across 4 locales + timezone edge cases. Mitigate by extensive unit tests on `astro-core/cycle/almanac` boundary.

---

## Sprint 3 (W1.3) · 节庆 drill-in + 24 节气 educational content

**Goal**: `/festivals` drill-in (reached from Today's drill-in nav row, alongside `月历` and 择日) fully populated with 24 节气 + 8 festivals + family events. IA per ADR-0018 (no tabs).

### Deliverables

0. **Wire entry**: add a 3rd row to Today's drill-in grouped list (`月历` / 择日 / `节庆`) and register `<Stack.Screen name='festivals' />` in the home group `_layout` (slide-in from right, with back affordance). One compact grouped card with 3 rows stays within the anti-stacking discipline (ADR-0018 §4).
1. `apps/cycle-app/app/festivals.tsx` (drill-in route at root, sibling to `event` and `day/[date]`):
   - Year timeline of 24 节气 (horizontal scroll, current 节气 anchored)
   - 8 major festivals card list (春节/元宵/清明/端午/七夕/中秋/重阳/冬至)
   - Family events block (Pro only): list of family members + 农历 birthdays + 公历 anniversaries
   - Empty state for family events: "Add a family member" CTA
2. `apps/cycle-app/app/festival/[id].tsx` — detail page (each festival OR 节气):
   - Hero with name + 公历 date + 农历 date
   - Sections: 食 / 农 / 诗 / 养生 / 民俗 (per 节气) OR 历史 / 习俗 / 食 / 诗 / 现代庆祝 (per festival)
   - Each section ~150-200 word per locale (Pro depth) vs ~50-word Free preview
3. Content authoring:
   - `apps/cycle-app/data/festivals/` — JSON per festival × 4 locales (8 × 4 = 32 files)
   - `apps/cycle-app/data/jieqi/` — JSON per 节气 × 4 locales (24 × 4 = 96 files)
   - Initial drafts: AI-assisted authoring, human-reviewed (≥1 hour per 节气 × 4 locales)
4. Web sync (V1.1 prep): export same JSON to `apps/hexastral-web/data/wiki/`

### Acceptance criteria

- 24 节气 educational pages all render with at least Free preview
- 8 festivals all render with full content
- 节庆 tab feels rich, not empty
- Family events Pro block works (existing portfolio multi-account API)

### Effort

~6-8 person-days. **Most content-writing-heavy sprint.**

### Risk

- Content quality + cultural accuracy. Mitigate by: AI draft + native speaker review + classical reference citations per article.

---

## Sprint 4 (W1.4) · Family events + push scheduler (expanded per Tier 1 audit 2026-05-31)

**Goal**: deliver the Pro-tier family-events anchor — covering birthdays AND death anniversaries (忌日, the single biggest overseas-Chinese pain point) + all push surfaces.

### Deliverables

1. **Family event schema** (covers birthdays, death anniversaries, custom):
   - Server-side: new `familyEvents` table with `kind: 'birthday' | 'deathAnniversary' | 'anniversary' | 'custom'`
   - Per event: name + person relationship + calendar type (`solar` / `lunar`) + date + leap-month flag for lunar
   - **闰月 handling**: when source lunar date is leap month, recurrence rule = "if target year has same leap month → that date; else → nearest non-leap equivalent"
   - **60-甲子 milestone detection**: birthdays at 60 / 80 / 90 years trigger extra push 30 days ahead

2. **Push scheduler with 4 event surfaces** (`apps/hexastral-api/src/services/lunar-event-scheduler.ts`):
   - Family birthday: 7 days before + 1 day before + day-of (3 push/year per member)
   - Family **忌日** (death anniversary): 7 days before + day-of (2 push/year per ancestor)
   - 60-/80-/90-大寿: 30 days before + 7 days before + 1 day before + day-of (4 push)
   - Anniversary (结婚/工作): 1 day before + day-of (2 push/year)
   - Free: 1 self profile, 0 family events
   - Pro: unlimited family + unlimited events

3. Family member CRUD:
   - `apps/cycle-app/app/(tabs)/me.tsx` extended:
     - Family members section + per-member event list
     - Add member: name + 阳历 / 阴历 / 闰月 input + relationship (配偶/父母/祖父母/外祖父母/兄弟姐妹/子女/其他)
     - Add event: 类型 (birthday/忌日/anniversary/custom) + date + leap-month flag
     - Per-member privacy consent prompt ("I have permission to enter this person's data")

4. Cross-device sync:
   - User signs in (Apple Sign-In or Google Sign-In, existing)
   - Family + events sync via hexastral-api
   - Conflict resolution: last-write-wins (pre-PMF)
   - Optional: family-sharing mode (invite sibling/spouse to see shared family events)

5. Universe Bundle prompt:
   - When user activates cycle Pro: prompt "Get HexAstral Universe for $9.99/mo (save 57%)"
   - Existing RC bundle catalog (per ADR-0016 §"Universe Bundle SKU recomposition")

### Effort

~7-8 person-days (was 7-9; refactored).

### Risk

- **Lunar leap month edge case** — 2025 闰六月 / 2028 闰五月 etc. Mitigate with golden-test fixtures (per-year leap-month table from astro-core).
- **Privacy concern** — adding deceased family members (忌日) is sensitive. Mitigate with explicit consent dialog noting "for personal remembrance, never shared without your action."
- **Push fatigue** — Pro user with 10 family members + 5 ancestors = ~50 push/year. Mitigate with per-event-type opt-in (user can disable 忌日 push if culturally not their style).

### Acceptance criteria

- Adding a family member with 农历 birthday → push received on correct day (test via simulator + manual date scrub)
- Pro paywall correctly blocks > 1 family member on Free
- Sign-in flow + cross-device sync verified on 2 devices
- Universe upsell renders on Pro upgrade

### Effort

~7-9 person-days. **Most monetization-critical sprint.**

### Risk

- 农历 birthday recurrence math: lunar year ≠ solar year; 闰月 cases; nominal 二月三十 doesn't exist some years. Need rigorous unit tests.
- Push permission flow already built (P1-12), but combined with family-member opt-in needs UX polish.

---

## Sprint 5 (W1.5) · Widgets + Watch + ASO + TestFlight

**Goal**: ship complete widget + watch experience, polish ASO, send to TestFlight.

### Deliverables

1. Widget × 3 with real data:
   - Small: today's 干支 + 农历 + 距节气 N 天
   - Medium: above + 今日宜 (top 1) + 月相 icon (Pro)
   - Lock-Screen rectangular: 今日 1 line + 下个家庭事件倒计时
2. Widget refresh policy:
   - Timeline: 1 entry per 4-hour interval
   - On 节气 day: extra entry at 00:00 + 12:00
3. Apple Watch complication:
   - Modular Small: today's 干支 character + next 节气 days
   - Refresh every 1 hour
4. ASO finalization:
   - `apps/cycle-app/aso-metadata.json` aligned to Doctrine v2 hard rules
   - 4 locales × subtitle / keywords / promotionalText / description
   - Anti-spam vocabulary scrub pass
   - Reviewer notes drafted per Doctrine v2 (cite 经典 references)
5. Screenshots (DIY or designer):
   - 5 screens × 4 locales × 6.7" + 5.5" = 240 screenshots
   - Show: month grid + 节气 timeline + family member tab + widget + watch
   - **No** moon-phase icon dominant, no zodiac wheel, no horoscope language
6. TestFlight build:
   - `eas build --profile production --platform ios`
   - Upload to TestFlight
   - Internal smoke test: 24h soak on test device, verify push fires, widget refreshes

### Acceptance criteria

- All 3 widget sizes render with live data after add-to-home
- Watch complication shows correctly on Apple Watch SE simulator
- TestFlight build installs successfully on test device
- 5 smoke tests pass: (a) add family member + push fires; (b) widget refreshes overnight; (c) Pro paywall triggers correctly; (d) Universe upsell shows; (e) cross-device sync within 60s
- ASO metadata + reviewer notes ready for ASC submission

### Effort

~7-9 person-days.

### Risk

- WidgetKit timeline refresh quirks (iOS throttles aggressive refresh). Mitigate by sticking to 4h timeline interval; widget shows "next refresh at HH:MM" tooltip if needed.
- Watch complication on physical device may differ from simulator. Verify on actual hardware before submit.

---

## Cross-sprint dependencies

| Item | Blocks | Mitigation |
|---|---|---|
| `packages/widget-kit-ios` from Sprint 1 | Sprint 5 widget delivery | Build in S1; iterate in S5 |
| `packages/watch-kit-ios` from Sprint 1 | Sprint 5 watch | Same |
| 24 节气 + 8 festivals content (S3) | S5 节庆 tab full functionality | AI-assisted; can parallelize per article |
| Family member schema (S4) | S5 widget medium "next family event" data | Wire schema in S4 first |

---

## Sprint 5+ → ASC submission timeline

```
End of Sprint 5: TestFlight build live
Week 6: ASC submission + reviewer notes
Week 6-8: Apple review (typical 24-72h, but 4.3(b) re-checks add 1-2 cycles)
Week 9: Live on App Store (target)
```

If rejected:
- Read rejection carefully → which 4.3(b) clause cited?
- Cross-reference Doctrine v2 §"Hard rules"
- Appeal protocol per `docs/launch-sequence.md` §5
- 2nd submission within 1 week (appeal-corrected metadata + screenshots)

---

## Parallel work for W2 feng

When cycle Sprint 5 lands (TestFlight in review), the `widget-kit-ios` + `watch-kit-ios` packages are unblocked. **Start feng Sprint 1 immediately** (don't wait for cycle review result). This is the parallel-work opportunity.

See `docs/sprints/feng-yuan-mingpan-sprint-plan.md` for W2-W4 details.

---

## Risk register

| Risk | P | Impact | Mitigation |
|---|---|---|---|
| WidgetKit native infra blocks Sprint 1 | 25% | Push widget to Sprint 5 only | Fallback path defined |
| Content authoring takes > Sprint 3 | 40% | Delays Sprint 4 family + sync | AI-assisted drafts; review-only for native speakers |
| 农历 birthday push edge cases (闰月) | 30% | Wrong-day push damages trust | Rigorous unit tests + edge case JSON fixtures |
| W1 cycle rejected on first submission | 8% | Loses 2-3 weeks | Appeal protocol; reviewer notes pre-drafted |
| Designer hire decision blocks ASO | 20% | Sprint 5 ASO slips | DIY screenshots in S4 in parallel |
| Bundle SKU configuration in RC errors | 15% | Pro purchase fails | Test on TestFlight before submission |
