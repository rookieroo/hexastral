# Yuun ASO ↔ Code Audit Matrix

**Last audited:** 2026-07-29 (public-almanac-free + birth→For you; widgets/Watch claimed as free).  
**SSOT:** Code routes/gates win; [`proBenefits`](../../../apps/auspice-app/lib/i18n.ts) is the Free/Pro copy source.

Legend: **PASS** = claim matches shipped code · **FIX ASO** = store copy wrong · **FIX CODE** = app wrong · **DEFER** = post-v1

---

## Navigation / IA

| ASO / screenshot claim | Code evidence | Status |
|------------------------|---------------|--------|
| 4 tab (Today / Calendar / Festivals / Me) | `app/(tabs)/_layout.tsx` — stack only (Today + Me); Calendar = inline expand on Today (`CalendarExpandPanel`, chevron under week strip); Settings = swipe left → `/(tabs)/me`; festivals = Settings → Library → `/glossary` | **FIX ASO** → rewritten |
| S1 header Calendar + Settings icons | `app/(tabs)/index.tsx` — title only; header Settings icon drill-in | **FIX ASO** → screenshot-direction updated |
| S3「节庆 tab」 | `/glossary` via `components/settings/LibrarySection.tsx` | **FIX ASO** |
| Subtitle Almanac / Good·Avoid · 宜忌 | `aso-metadata.json` subtitle; home `suitable`/`avoid` | **PASS** (2026-07-29) |
| Calendar expands inline on Today; swipe left → Settings | `index.tsx` — `CalendarExpandPanel` chevron expand; `SWIPE_TO_ME` gesture preserved; swipe right intentionally inert (no 负一屏) | **PASS** |

---

## Free / Pro gates

| Claim | Code evidence | Status |
|-------|---------------|--------|
| Free Home / Lock / Watch (public 黄历) | `widget-bridge` + Watch targets; same public card for all | **PASS** (2026-07-29 ASO) |
| For you on widgets after birth (not Pro) | `includeFit` when personalization exists | **PASS** |
| iCloud cross-device sync (Pro) | `signInBenefit` = RevenueCat restore, not iCloud | **FIX ASO** — sign-in restore wording |
| Free basic 黄历 vs Pro full 黄历 | `DayView` — yi/ji full for all; Pro = For you reasons, timeline, reading, event range | **PASS** — ASO Free/Pro matches `proBenefits` |
| Free 4 festival pushes | Holiday toggle removed from Settings; daily/evening push remain | **FIX ASO** — daily/evening + birthday |
| Free 1 birth profile | `lib/birth.ts` | **PASS** |
| Free ≤3 family birthday reminders | `FREE_BIRTHDAY_LIMIT = 3` in `lib/push.ts` | **PASS** |
| Pro unlimited family | `lib/push.ts` + paywall | **PASS** |
| Pro timeline + what-if | `/timeline`, `/makeif` Pro gate | **PASS** |
| Pro 命书 deep-read | `/reading` | **PASS** |
| Pro custom date range | `app/event.tsx` `FREE_WINDOW_DAYS = 30` | **PASS** |
| Pro personal calendar feed | `lib/calendar-feed.ts` (needs prod secret) | **PASS** (code); prod verify **DEFER** |
| Pro timeline node push | `pushRegistry` id `timeline`; `refreshTimelineReminders` | **PASS** |

---

## Feature depth (description bullets)

| Claim | UI surface | Status |
|-------|------------|--------|
| Daily yi/ji | `DayView` + `YiJiBlock` | **PASS** |
| 24 solar terms depth | `/glossary`, `/festival/[id]` | **PASS** |
| 8 festivals | glossary + festival routes | **PASS** |
| 28 mansions / 建除 / 十二时辰 | `ExplainSheet`, glossary — not home hero | **PASS** (disclosed as library/explain) |
| 六曜 (ja) | `DayView` RokuyoStrip when `locale === 'ja'` | **PASS** |
| Apple Calendar almanac feed | Settings → Calendars free webcal | **PASS** |

---

## Compliance / metadata

| Item | Evidence | Status |
|------|----------|--------|
| Privacy/Terms URLs | `lib/config.ts`; ASO About section | **PASS** (format); prod 200 **DEFER** |
| `legalDisclaimerShort` | Settings Legal + Paywall | **PASS** |
| contentRating 12+ | User decision 2026-07 | **FIX ASO** |
| en title almanac-led; zh title 黄历 (not 万年历) | `Yuun: Chinese Almanac` / `Yuun 中华黄历` | **PASS** |
| Keywords `widget` | Allowed — Home/Lock/Watch ship; free public almanac | **PASS** |

---

## In-app parity (post-rewrite)

| Surface | Must match ASO Pro list | Status |
|---------|-------------------------|--------|
| `AuspicePaywallSheet` → `t.proBenefits` | 4 bullets × 4 locales | **PASS** |
| `welcome.tsx` intro | Almanac register | **PASS** |
| `FlagshipUpsellInsert` | No「Kindred Kindred」typo | **PASS** |

---

## Automated checks

```bash
node scripts/aso-charcount.mjs apps/auspice-app/aso-metadata.json
node scripts/aso-code-parity.mjs apps/auspice-app/aso-metadata.json
```
