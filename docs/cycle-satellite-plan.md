# Cycle (黄历 satellite) — plan

> **Status**: C.0 ✅ ([ADR-0010](decisions/0010-cycle-satellite.md)) · **C.1 ✅ DONE + validated** —
> the server 黄历 engine is complete in [astro-core/almanac.ts](../packages/astro-core/src/almanac.ts)
> (`jianChu` 建除十二神 + `twentyEightMansions` 二十八宿 [anchor **verified**, see below] +
> `OFFICER_YIJI` 建除→宜忌 preset + `dayClash` 日冲煞), thin-wrapped at `GET /api/cycle/day` + `/search`
> in [routes/cycle.ts](../apps/hexastral-api/src/routes/cycle.ts). 548 astro-core + 5 route tests green;
> astro-core & hexastral-api both typecheck. · **C.2 ▣ scaffolded** — `apps/cycle-app` (Expo, brand
> `cycle` 朱泥 added to `hexastral-tokens/satellites.ts` + core-ui; Today / Month / Me tabs + day detail +
> 择日 search; 4-locale i18n; consumes `/api/cycle/*` via `lib/api.ts`). Touched shared pkgs typecheck
> clean (hexastral-tokens + core-ui) and biome is clean; **full app `tsc` is gated on `bun install`**
> (sandbox has no registry — same constraint as every other satellite). · **C.3 ✅ DONE + validated** —
> deterministic 对你而言 overlay: astro-core `personalAlmanacOverlay` (日主 五行 relation + 用神 + 个人冲
> → fit + structured reason codes, golden-tested), wired into `/api/cycle/day?birthDate=` (anonymous-safe,
> fills `personalization`), rendered in cycle-app `PersonalCard` (4-locale) off an on-device birth date
> (Me-tab setter; `lib/birth.ts`). 554 astro-core + 6 route tests green. · **C.4 + C.4.5 ✅ DONE + validated** —
> 深度解读 LLM: svc-astro `POST /cycle/explain` (`callWithFallback`, locale-aware) + hexastral-api
> `POST /api/cycle/explain` (**K.4-guarded** via `evaluateLlmGuard`/`recordLlmGuardGrant`, `GUARD_KV` 24h cache,
> deterministic **template fallback** — lazy/on-tap, never in the push) + cycle-app `ExplainSheet` (tap a 宜忌 →
> reading + Share). **C.4.5:** `'cycle'` added to share `reportType` + chat `readingType` (+ a context-builder
> branch that recomputes the day). svc-astro + hexastral-api typecheck clean; 6 route tests green.
> · **C.5 ✅ DONE** — daily push as **local notifications** (Tier-3 anonymous, no token/cron): `lib/push.ts`
> schedules a rolling 5-day 8am window from the server-computed deterministic almanac (**NO LLM**; 节气 folded
> into the body), opt-in via the Me-tab toggle, rescheduled on open; retro-check 7 days after a picked 择日 day.
> expo-notifications@0.32.16 API verified against installed types; biome clean (cycle-app tsc install-gated).
> · **C.6 ✅ DONE** — `aso-metadata.json` (4 locales, all fields within App Store limits) + privacy appendix
> registered (`www.hexastral.com/privacy/cycle` live; hexastral-web tsc clean) + Terms wired + 6×4 screenshot
> brief. **⇒ Cycle C.0–C.6 is feature-complete** — only manual launch steps remain (bun install / eas init /
> D1 enum migration / designer assets / ja review / svc-astro deploy). Handing off to a fresh session.
>
> **二十八宿 anchor (locked):** `1998-03-15 = 房宿` (index 3 in the 角-start 值日 order). Verified three
> ways — the CSDN 二十八宿值日 formula worked example (1998-03-15 → 房), the 七曜↔weekday lock (房 is a
> 日曜 mansion and 1998-03-15 was a Sunday), and a huangli.com cross-check (2026-06-12 → 娄, Friday). A
> permanent test asserts the 七曜↔weekday invariant over a 90-day span, so any future drift fails CI.
>
> **▶ NEXT SESSION STARTS HERE** — read [ROADMAP.md](ROADMAP.md) first, then this file. Pickup:
> 1. **Cycle code is complete (C.0–C.6).** Next is **Wave 4** — retire `apps/hexastral-app` (ADR-0009): its
>    only uncovered surface was 黄历, which Cycle now owns end-to-end (命→fate ✅ · 緣→Yuán ✅ · 卦→CoinCast ✅ ·
>    面相→FaceOracle ✅ · 黄历→Cycle ✅). Deletion is a product call — see [phase-k-plan.md](./phase-k-plan.md) §0.1.1.
> 2. **Manual launch steps (sandbox can't):** `bun install`; `cd apps/cycle-app && eas init`; designer
>    `assets/{icon,splash}.png` + 6×4 screenshots; ja review; **deploy svc-astro (the `/cycle/explain` route)
>    before hexastral-api**. **No D1 migration needed** — the `'cycle'` `readingType`/`reportType` additions are
>    Drizzle `text({enum})`, which is **TS-only** in the SQLite dialect (the column is already `text NOT NULL`
>    with no CHECK — `0000_known_eternity.sql`), so `db:generate` diffs to nothing. Validity is enforced by the
>    Zod `z.enum` in `chat.ts` / `share.ts`.
> 3. **Pre-launch quality (not blocking):** **C.1.7** 神煞宜忌 harvest (cnlunar/lunar MIT) + **C.1.8** 节气精度;
>    client follow-ons (chat screen, full `/api/share` card flow, 用神 refinement, date picker, standalone 节气
>    article push); REMOTE push via svc-notify only if local notifications prove insufficient at scale.
>
> **Architecture lock (user, 2026-05-21; refined 2026-05-21):** two layers, never conflated. (Earlier drafts
> overloaded "对你而言" to mean both — that ambiguity is resolved here.)
> - **对你而言 = deterministic 五行 overlay — FREE, non-LLM.** Pure 天干地支 math: the day's 干支/宜忌/冲
>   read against the user's 日主 五行 → short annotation strings. This is what the **base almanac + the daily
>   push** carry. Computed **client-side in-app** (no PII leaves the device) and **server-side for the push**
>   (behind an explicit push opt-in that stores the 日主). See C.3.
> - **深度解读 = LLM deep reading — PRO, LAZY, NEVER IN THE PUSH.** The long-form paragraph
>   (`/cycle/explain`) is generated **only when the user opens the app and taps a field**. Pre-generating it
>   for a push burns tokens on content nobody may read — the cost is justified only when it is *seen*.
>   K.4-guarded (small free taste → Pro). Because it's seen + Pro-valuable, it **supports share + chat** (C.4.5).
> - ⇒ The push is the deterministic **hook**; opening the app is the **reward** (free 对你而言 + optional Pro
>   深度解读). No hard data blocker: 二十八宿 + 宜忌 are fixed/public-domain/computable.
>
> **Decision records**: ✅ [ADR-0010](decisions/0010-cycle-satellite.md) created; ✅ ADR-0004 §1 Cycle row active.
> **Created**: 2026-05-20.
> **Prerequisite**: Phase K (done) — Cycle is born under the two-layer model; consumes the K.4 guard.

## Why

老黄历 / 万年历 is a huge CJK market (tens of millions of MAU across category)
but every existing app is a UX cesspool: full of ads, "大师免费看" upsells,
1-字标签 explanations, no personalization, no event-search, no国际化.

The thesis: **Cycle is the "Notion of 黄历"** — same daily-utility core, but
personalized to user's bazi, AI-explained, reverse-searchable for event
planning, modernly designed, 4-locale (zh-Hans, zh-Hant, ja, en — the EN
slice targets海外华人 + spiritual-curious Westerners).

8 differentiation wedges (full version in earlier session writeup, summary here):

1. **Personalized 黄历** — annotates standard 宜/忌 with user-specific 用神 / 五行 implications (read user bazi via cross-app memory)
2. **AI deep reading (Pro, lazy)** — 1-paragraph per 宜/忌, not a 1-字 label; on-open only (never in the push); shareable + chattable (C.4.5)
3. **Reverse择日** — input event + window → top-3 days with reasoning
4. **Modern UX** — Apple Calendar / Notion aesthetic; zero ads
5. **Daily push retention** — 8am push: today's 宜/忌 + 对你而言
6. **国际化** — 4 locales; EN positions as "Eastern auspicious-day calendar"
7. **Retro check** — "Did Tuesday go well?" — builds confidence loop
8. **农历 events + 节气 depth** — auto-convert西历 events to农历; 节气短文 + widget

---

## 0. TL;DR — six sub-phases

| Step | What | Days |
|---|---|---|
| **C.0** | ADR foundation (new ADR-0010 + amend ADR-0004 §1) | 0.5 |
| **C.1** | Server-side 黄历 engine (干支 + 节气 + 二十八宿 + 建除 + 宜忌 + 时辰 + 冲煞 + AI personalization layer) | 2-3 |
| **C.2** | Client Cycle-app scaffold (Expo + 4 screens + i18n + push) | 3-4 |
| **C.3** | Cross-app context (read bazi from portfolio memory; "对你而言" layer) | 1 |
| **C.4** | AI long-explanation prompts (svc-astro) | 1-2 |
| **C.5** | Retention infrastructure (daily push, retro check) | 1 |
| **C.6** | ASO + assets + App Store submission package | 1-2 |

Total: **~2 weeks** focused work.

**Dependencies**:
- C.0 → all (ADR locks scope first)
- C.1 → C.2 (client needs server endpoint to consume)
- C.3 → C.1 (cross-app context layer plugs into engine)
- C.4 ← can parallelize with C.2 once C.1 done
- C.5 needs C.2 (push lives in client)
- C.6 can start any time after C.2 scaffolds

---

## 1. C.0 — ADR foundation (0.5 days)

### C.0.1 New: ADR-0010 Cycle (Almanac) satellite

`docs/decisions/0010-cycle-satellite.md`:

- Status: Accepted
- Date: TBD
- Amends: ADR-0004 §1 (adds Cycle to satellite list under Phase K Tier 3)

Sections:
- **Context**: 老黄历 market is huge but red-ocean UX; product wedge exists for personalized + AI-explained + reverse-searchable variant
- **Decision**:
  - Cycle is a Tier 3 satellite (no IAP, anonymous-friendly)
  - Engine: 黄历日历 + 24节气 + 二十八宿 + 建除十二神 + 宜忌 + 时辰 + 冲煞
  - 4 locales out of gate: zh-Hans, zh-Hant, ja, en
  - Funnel direction: cycle → yuan/feng via SatelliteFlagshipUpsellCard (e.g. wedding date picker → yuan; office opening date → feng)
  - Daily push retention
  - No paywall; pure ASO + funnel
- **Consequences**:
  - Positive: matrix gains a daily-utility surface (retention boost across portfolio)
  - Negative: maintaining a 黄历 dataset (宜忌 corpus) is ongoing work; quality depends on source corpus
- **Sunset criteria**: D30 retention < X% after 3 months → kill (rare for daily utility)

### C.0.2 Amend: ADR-0004 §1 brand matrix

Add Cycle row to satellite list:
```
Satellites:
  ├── fate-app (命: 八字+紫微 — replaces retired hexastral)
  ├── Coin Cast
  ├── Face Oracle (Tier 2)
  ├── Dream Oracle
  ├── Numerology(梅花)
  └── Cycle(黄历) — daily utility + reverse择日 + personalized + AI-explained
```

### C.0 acceptance gate

- ADR-0010 landed
- ADR-0004 §1 mentions Cycle

---

## 2. C.1 — Server 黄历 engine (1.5-2 days — most of it already exists)

> **Reuse-first (ADR-0008 "package only what's shared").** An audit found the almanac
> core is **already built in `astro-core`**. Do **not** write a fresh engine in the API
> app. Sequence is: audit → extend the package for the few missing pieces → make
> `/api/cycle/*` a thin wrapper. This is why C.1 is ~1.5-2 days, not 2-3.

> **Status: C.1 ✅ DONE (2026-05-21).** The full deterministic engine lives in
> [astro-core/almanac.ts](../packages/astro-core/src/almanac.ts): `jianChu` (建除十二神, now driven by the
> 节-based 月建 via `getMonthByJie` — not the Gregorian month, which is wrong near 节 boundaries) +
> `twentyEightMansions` (二十八宿, fixed 28-day cycle off the verified `1998-03-15 = 房` anchor) +
> `OFFICER_YIJI` (建除→宜忌 preset, 12 rows) + `dayClash` (日冲生肖 + 三煞方位 — this was **NOT**
> pre-existing; the earlier audit conflated it with the personal-chart 神煞 engine). `DailyAlmanac` was
> widened with `mansion / goodFor / avoid / clash / evilDirection`, thin-wrapped at `GET /api/cycle/day`
> + `/search` ([routes/cycle.ts](../apps/hexastral-api/src/routes/cycle.ts)). The free daily push + base
> almanac run entirely on this deterministic stack; the LLM stays the Pro-only `/cycle/explain` layer
> (C.4). The full per-神煞 宜忌 corpus (C.1.7) remains *optional* later enrichment — the 建除 preset is
> the base.

### C.1.1 What already exists (audit before writing anything)

| Need | Status | Location |
|---|---|---|
| 干支 (四柱/日柱) | ✅ exists | [packages/astro-core/src/ganzhi.ts](../packages/astro-core/src/ganzhi.ts) |
| 二十四节气 | ✅ exists | [packages/astro-core/src/jieqi.ts](../packages/astro-core/src/jieqi.ts) |
| 十二时辰 | ✅ exists | [packages/astro-core/src/shichen.ts](../packages/astro-core/src/shichen.ts) |
| 冲煞 / 神煞 | ✅ exists | `packages/astro-core/src/shensha.ts` |
| 黄历日 base — `DailyAlmanac` + `calculateDailyAlmanac()` | ✅ exists | [packages/astro-core/src/almanac.ts](../packages/astro-core/src/almanac.ts) |
| Almanac i18n templates | ✅ exists | [packages/astro-i18n/src/almanac/computeAlmanac.ts](../packages/astro-i18n/src/almanac/computeAlmanac.ts) |
| 二十八宿 | ✅ done | `twentyEightMansions()` — fixed 28-day cycle off the verified `1998-03-15=房` anchor |
| 建除十二神 | ✅ done | `jianChu()` — 节-based 月建 (`getMonthByJie`) + 日支 |
| 建除→宜忌 base | ✅ done | `OFFICER_YIJI` 12-row preset; full per-神煞 corpus (C.1.7) optional later |
| 日冲煞 (日冲生肖 + 三煞方位) | ✅ done | `dayClash()` — was NOT pre-existing (audit conflated it with personal 神煞) |

So the genuinely new compute is only **二十八宿 + 建除十二神 + 宜忌 corpus** — not a from-scratch
engine. There are already **two** almanac implementations in the monorepo (astro-core +
astro-i18n); a third in the API app would be the third copy and would violate ADR-0008.

### C.1.2 Extend the package, then thin-wrap in the API

1. **Extend `astro-core`** (the shared home for compute): add `twentyEightMansions(date)` +
   `jianChu(monthBranch, dayBranch)`, and widen the existing `DailyAlmanac` shape in
   [almanac.ts](../packages/astro-core/src/almanac.ts) to carry 二十八宿 / 建除 / 宜忌 /
   喜财福神方位 / 12 时辰吉凶 if it does not already. Reuse `ganzhi` / `jieqi` / `shichen` /
   `shensha` rather than recomputing.
2. **API stays thin.** The endpoint imports `calculateDailyAlmanac` from `@zhop/astro-core`; it
   does **not** re-implement compute. `apps/hexastral-api/src/lib/almanac.ts`, if it exists at
   all, is only a request→package adapter (parse query, call the package, attach personalization).

> **Harvest hexastral-app's dead almanac.**
> [apps/hexastral-app/app/(explore)/almanac.tsx](../apps/hexastral-app/app/\(explore\)/almanac.tsx)
> is a **disabled** "Pro AI 个性化黄历" (5-domain career/wealth/love/health + per-bond daily
> insight; its backend svc-fortune was deleted, so it renders a locked stub). Its payload shape
> (`AlmanacPersonal` / `AlmanacBondInsight`), UI, and i18n keys are directly reusable for Cycle's
> personalization (C.3) and should be **lifted into Cycle** rather than rebuilt elsewhere —
> this is part of why hexastral-app is recommended for retirement
> ([phase-k-plan.md](./phase-k-plan.md) §0.1.1). The "per-bond daily insight" idea is also a
> natural Cycle→Yuán funnel hook.

### C.1.3 Endpoint: `GET /api/cycle/day`

Anonymous (no HMAC); IP rate-limited.
Query: `date=YYYY-MM-DD&lat=&lng=&userId=`

Behavior:
1. Compute `AlmanacDay` deterministically
2. If `userId` provided AND user has birthInfo, add `personalization` block (see C.3)
3. Return JSON

Response (when personalization absent):
```json
{
  "day": { ...AlmanacDay... },
  "personalization": null,
  "explanation": null   // populated only if /api/cycle/explain hit separately
}
```

### C.1.4 Endpoint: `GET /api/cycle/search`

Reverse择日 for events.

Query: `event=wedding|business|move|signing|travel|burial|move-in&from=YYYY-MM-DD&to=YYYY-MM-DD&userId=`

Behavior:
1. For each day in range:
   - Compute `AlmanacDay`
   - Compute fitness score for event (table-based: wedding wants 嫁娶 in goodFor, etc.)
   - If userId + birthInfo, multiply by personal-fit score from bazi
2. Return top-3 ranked days with reasoning

Response:
```json
{
  "event": "wedding",
  "range": { "from": "...", "to": "..." },
  "top": [
    {
      "date": "2026-06-12",
      "score": 0.91,
      "reasoning": "甲申日 · 嫁娶 in goodFor · personal fit: 庚日主 + 申金扶身",
      "day": { ...AlmanacDay... }
    }
  ]
}
```

### C.1.5 Endpoint: `POST /api/cycle/explain`

AI long-explanation. Pro-only? — TBD (could be free for first N per day, then paywall — but cycle is Tier 3 with no IAP, so probably just unlimited free with rate limiting).

Body: `{ date, fields: ['goodFor.动土', 'chong'], userId? }`

Response: per-field 80-200字 explanation, locale-aware. Implementation via svc-astro `/cycle/explain` prompt.

### C.1.6 Optional D1 cache

If solar-term/二十八宿/建除 compute is slow, cache `almanac_days` in D1:
- Primary key: `date`
- Compute once per day worldwide; cache hits forever
- New migration: `apps/hexastral-api/migrations/00NN_almanac_days.sql`

Decision: skip D1 cache in v1, add only if measurement shows latency issue.

### C.1.7 宜忌 corpus — harvest 神煞-driven 宜忌 from cnlunar / lunar (both MIT)

The 12-row `OFFICER_YIJI` 建除 preset shipped in C.1 is the **base**. The real 老黄历 宜忌 is
**神煞-driven** (per-day 神煞 → 宜/忌), not 建除-coarse. Rather than re-derive from 古籍, **port a proven
MIT implementation** (2026-05-21 OSS survey):

- **[OPN48/cnlunar](https://github.com/OPN48/cnlunar)** (803★, MIT) — translated 《钦定协纪辨方书》卷九–十一
  into 神煞→宜忌 logic (`angelDemon`, `get_today12DayOfficer`, `get_the28Stars`). The faithful reference.
- **[6tail/lunar](https://github.com/6tail/lunar-javascript)** (js 1.5k★ / java 943★, MIT) — `LunarUtil`
  神煞 + 宜忌 data tables; same family across 8 languages.

Cross-check (2026-05-21) confirmed our 建除 (`getZhiXing` formula) and 二十八宿 (七曜值日) **already match
lunar exactly**, so a 宜忌 port slots onto the same primitives. Plan:
- Port the 神煞→宜忌 tables/logic into **`astro-core`** (per ADR-0008 — compute lives in the package, not the
  API app), e.g. `packages/astro-core/src/almanac-yiji.ts`, widening `DailyAlmanac.goodFor/avoid` from the
  preset to the 神煞-accurate set.
- Keep `OFFICER_YIJI` as the fallback when the 神煞 corpus has no entry.
- License: both MIT — vendor with attribution (NOTICE / source comment); no CC0 hunt needed.

### C.1.8 节气精度 — replace the 寿星 ±1-day formula (correctness; land before launch)

`astro-core` [jieqi.ts](../packages/astro-core/src/jieqi.ts) computes 节气 via the **寿星天文历 simplified
formula (±1 day)**. This is a real 择日 correctness bug: `建除` (and thus 宜忌) keys off the **节-based 月建**
(`getMonthByJie`), so a 节气 that is off by one day flips the 月建 → wrong 建除/宜忌 for days within ±1 of a
节 (up to ~24 edge days/year). cnlunar **explicitly rejected the 寿星 formula for this reason** and uses
**香港天文台 tabulated 节气 (1901–2100)**; lunar uses precise astronomy.

Task:
- Replace/augment `getJieQiDay` with a **tabulated precise 节气 source** (HK Observatory 1901–2100, or port
  lunar / sxtwl astronomical 节气). Keep the API + `DailyAlmanac` shape unchanged — pure internal accuracy fix.
- Add golden tests pinning 节气 dates against the table for a sample of years incl. boundary cases.
- **Not in the C.1 gate** (C.1 ships on the current formula), but **should land before Cycle's public launch**.

### C.1 acceptance gate ✅

- ✅ `GET /api/cycle/day?date=2026-06-12` returns a valid AlmanacDay (干支 丁巳 · 娄宿 · 闭日 · 冲猪煞东 · 12 时辰 · 节气)
- ✅ `GET /api/cycle/search?event=wedding&from=&to=` returns top-3 ranked days with reasoning
- ✅ Unit tests: 干支 vs huangli.com, 二十八宿 28-day cycle + 七曜↔weekday lock, 建除 节-based 月建, 宜忌 lookup, 日冲煞
- ✅ No regressions — 548 astro-core tests pass; both packages typecheck

---

## 3. C.2 — Client Cycle-app scaffold (3-4 days)

### C.2.1 New Expo app

Bootstrap from `apps/coin-cast-app/` or `apps/numerology-app/` as template.

`apps/cycle-app/`:
- Bundle ID: `com.hexastral.cycle` (already in AASA-precedent)
- Brand color: ⚠ to decide (orange/amber? evergreen? — pick something not used by yuan/feng — maybe **terra · 朱泥** earth-red, evoking 黄历 paper)
- URL scheme: `cycle://`
- Adopt `@zhop/satellite-runtime` from day 0

### C.2.2 Screen list

| Screen | Path | Purpose |
|---|---|---|
| Today | `app/(tabs)/index.tsx` | Today's card: 干支 / 宜忌 / 时辰 / 对你而言 / push reminder option |
| Month | `app/(tabs)/month.tsx` | Calendar grid with color-coded宜忌 density per day |
| Detail | `app/day/[date].tsx` | Tap a date → full almanac + AI explanation buttons per field |
| Event-Search | `app/event.tsx` | Reverse择日: pick event type + window → top-3 with reasoning |
| Settings | `app/(tabs)/me.tsx` | Push toggle, locale, sign-in (Apple), birth info import (from fate-app / portfolio) |
| Onboarding | `app/(auth)/onboarding.tsx` | First-launch wizard: explain Cycle's wedge + ask for birth info (optional for personalization) |
| Paywall | (none — Tier 3) | N/A |

### C.2.3 Tabs

3 tabs: `today (今) · month (月) · me (我)`. Detail and Event-Search are pushed from today/month.

### C.2.4 Components

- `<TodayHeroCard>` — today's date + ganzhi + 节气 + 宜忌
- `<HourScrubber>` — 12 时辰 horizontal scrub with fortune indicator
- `<MonthGrid>` — month view; each cell shows单字宜/忌 emoji-equivalent
- `<EventDayCard>` — used in event-search top-3 list
- `<ExplainSheet>` — bottom sheet that fetches `/api/cycle/explain` for a tapped field
- `<FlagshipUpsellInsert>` — at the end of relevant flows: wedding event → yuan card; business event → feng card

### C.2.5 i18n (4 locales)

Strings:
- Today / month / me / event labels
- 12 节气 names
- 28 宿 names
- 12 建除 names
- 宜忌 vocabulary (~80 verbs: 动土 / 嫁娶 / 出行 / ...)
- Personalization annotations: "对你而言" / "适合你" / "慎对你"
- Event types (wedding / business / signing / move / travel / burial / move-in / launch / negotiation)

Pattern: same as feng-app — `Strings` interface + per-locale objects + `useStrings(locale)` hook.

### C.2.6 Anonymous-first flow

Per ADR-0009 Tier 3:
- App launches into Today without sign-in
- Apple Sign-In is optional, only required for: history sync, push, personalization (which needs birth info — but birth info can be entered locally without sign-in too)
- Use `usePortfolioSatelliteBootstrap({ storagePrefix: 'cycle', targetApp: 'cycle' })`

### C.2 acceptance gate — ▣ scaffolded (2026-05-21)

Built in `apps/cycle-app` (mirrors numerology-app template). Status:

- ✅ App boots anonymous into Today; `lib/api.ts` fetches `/api/cycle/day` → `DayView` (hero 干支 +
  宜忌 + 12 时辰 + 节气). Components: `TodayHeroCard` / `YiJiBlock` / `HourScrubber` / `DayView` / `FlagshipUpsellInsert`.
- ✅ Event-search (`app/event.tsx`) returns top-3 days with reasoning; intent → flagship (wedding→Yuán, else Fēng).
- ✅ 4-locale UI switch (Me tab) without restart (`lib/i18n.ts` + `i18n-context.tsx`; persisted to AsyncStorage).
- ✅ `brand="cycle"` 朱泥 palette added to `hexastral-tokens/satellites.ts` (+ core-ui union) — both typecheck clean.
- ▣ Month grid (`app/(tabs)/month.tsx`) renders a tappable calendar + today marker. **Deferred:** per-day
  宜忌 density coloring — needs a batch `GET /api/cycle/month` (30 single fetches are wasteful; compute is
  deterministic so the batch endpoint is cheap). Tracked here.
- ⏸ AI explanation sheet (`<ExplainSheet>` + `/cycle/explain`) → **C.4** (not built; deterministic core ships first).
- ⏸ Onboarding wizard skipped (anonymous-first); optional birth-info capture lands with **C.3** personalization.
- **Manual (sandbox can't):** `bun install` (full app `tsc`), `eas init`, designer `assets/{icon,splash}.png`.
  No RC/ASC product setup — Tier 3, no IAP.

---

## 4. C.3 — Cross-app context (1 day)

The "对你而言" wedge is a **deterministic, free** overlay (NOT the LLM — that is C.4's 深度解读). It needs the user's 日主, derivable from birth-info captured locally in Cycle (default) or read from **fate-app** via portfolio memory (cross-app opt-in).

> **Cycle is where the 命理 line's daily-active lives.** fate-app captures the chart once (pure
> funnel, no DAU — see [phase-k-plan.md](./phase-k-plan.md) §0.1.1); Cycle renders the daily
> personalized almanac (黄历 + 对你而言) off it. The two are separate ASO beachheads (命盘 vs
> 黄历/择日) on **one data flow**, not competitors.

### C.3.1 Birth-info read

Two paths:
- **A**: Cycle-app collects birth-info itself in onboarding (skippable). Stored in MMKV.
- **B**: Cycle-app reads the chart fate-app stored in portfolio memory (cross-app). Requires Apple Sign-In + cross-app memory opt-in.

Recommend: **A is default + B is enhancement**. Local birth-info is sufficient for personalization; server-side cross-app gives "you" recognition across satellites if user opts in.

### C.3.2 Personalization compute — deterministic, two homes

The overlay is pure math (a 五行 relation lookup), so it runs wherever the data already is:

- **In-app (primary): client-side.** The app has the day's 干支/宜忌 五行 from `/api/cycle/day` and the
  user's 日主 from local birth-info → compute the annotation on-device. **No PII leaves the device** (matches
  the privacy opt-in principle). Derive 日主 via `@zhop/astro-core/ganzhi` (mobile-runnable).
- **Push: server-side.** The 8am push is generated by the server cron, which therefore needs the 日主.
  Storing it server-side is **gated behind an explicit daily-push opt-in** (a dedicated consent flag, not a
  reused one). The cron computes the same deterministic overlay and bakes it into the push text.

Either way it is **free** and **non-LLM**.

### C.3.3 `personalization` block (deterministic)

`/api/cycle/day` returns a `personalization` block (already a `null` placeholder in the route +
cycle-app `CycleDayPayload`). Fill it when the 日主 is known — **from birth params the client passes**
(anonymous-safe; the endpoint is no-HMAC) or from a push-opted-in stored 日主. Do **not** trust a raw
`userId` lookup on this anonymous endpoint.

```json
{
  "personalization": {
    "dayMaster": "庚",
    "annotations": [
      { "field": "goodFor.动土", "note": "对你而言: 子水生你的木财，今日特别助财" },
      { "field": "chong", "note": "冲你的酉时, 慎过西方" }
    ]
  }
}
```

### C.3 acceptance gate — ✅ deterministic overlay shipped (2026-05-21)

- ✅ Engine: astro-core `personalAlmanacOverlay(subject, day)` — 日主 五行 relation (生我/克我/…) → fit
  (吉/平/凶), with 用神/忌神 override + personal 六冲; returns **structured reason codes** (locale-free); golden-tested.
- ✅ Server: `GET /api/cycle/day?birthDate=` derives 日主 + 生肖 and fills `personalization` (anonymous-safe, no LLM, no userId lookup).
- ✅ Client: `PersonalCard` renders 对你而言 (fit badge + localized reasons, 4 locales) off an on-device birth
  date (`lib/birth.ts` + Me-tab setter); Today + detail pass it. No PII egress beyond the one query param.
- ⏳ Follow-ups: (a) **用神/忌神 refinement** — route v1 uses only the raw 日主 relation; feed a signed-in
  user's stored favorable/unfavorable element for a stronger signal. (b) **Cross-app path B** — read the
  fate-app chart from portfolio memory (opt-in) vs local entry. (c) a real **date picker** (Me-tab is a
  plain text field). (d) the **push path** (server-computed overlay) lands with C.5.

---

## 5. C.4 — 深度解读 (LLM deep reading) — Pro, lazy, never in the push (1-2 days)

**Layer:** this is the *only* LLM in Cycle. It is **Pro** (K.4 free-taste → paywall), **lazy** (generated
only on app-open + field-tap — never pre-generated, never sent in a push), and its output is a **durable
artifact**: shareable + chattable (C.4.5).

### C.4.1 svc-astro prompt

New file `services/svc-astro/src/prompts/cycle.ts`:
- Input: `{ date, field, dayMaster?, locale }`
- Output: 80-200字 explanation paragraph

Prompt skeleton:
```
You are a classical Chinese almanac (黄历) interpreter.

Today's date: {date}
干支: {ganzhi}
Field requested: {field} (e.g. "宜动土", "冲鸡")
User's 日主: {dayMaster or "未知"}

Explain why {field} is the case today in 80-200 words {locale}.
- Reference 二十八宿 / 建除 / 节气 / 五行
- If 日主 provided, weave in a personalized 日主 angle (expands the deterministic 对你而言 overlay)
- Avoid sweeping fatalistic claims; frame as 趋势 not 命运
```

### C.4.2 svc-astro `/cycle/explain` endpoint

POST. Same Gemini path as existing chat endpoint. Cached per (date, field, dayMaster) in KV for 24 hours.

### C.4.3 Cost control

- **Shared satellite LLM guard policy (not Cycle-only):**
  - Same guard framework should apply to coin-cast, dream-oracle, numerology,
    fate-app, and cycle-app.
  - face-oracle remains a separate auth + IAP path due to higher inference cost.
- **Model stack (v1)**:
  - Free/default: `Gemini 3.1 Flash-lite` (fallback `Gemini 3.1 Flash`)
  - Subscription/deep: `Gemini 3.1 Flash` (fallback `Gemini 3.1 Pro`, then `Claude Sonnet 4.6`)
  - `Claude Opus 4.7` is not part of default routing (manual/rare premium escalation only).
- Use short output envelopes (80-200 words) and strict max tokens.
- Cache key: `(date, field, locale, dayMasterBucket)` with 24h TTL minimum.
- **Layer split (must keep):**
  - Deterministic engine computes facts (`day/search`, 干支/建除/宜忌/时辰).
  - LLM is explanation layer only (`/cycle/explain`), never source of truth for core almanac facts.

### C.4.4 Budget guard — consume Phase K · K.4, do not re-spec

The LLM cost guard is a **shared platform capability built once in
[phase-k-plan.md](./phase-k-plan.md) K.4** — the full mechanism (guard-decision contract
`allow_llm`/`allow_cached`/`allow_template`/`soft_gate`/`hard_gate`, identity priority
`userId` > HMAC `deviceId` > `ipHash`, global budget cap with cache/template fallback,
standardized funnel events `llm_guard_decision` / `lifetime_peak_pass_consumed` /
`llm_fallback_type` / `upsell_exposed_after_exhaust`) lives there. **Cycle consumes that
guard package; it does not re-implement the mechanism** (earlier drafts duplicated it here).

Cycle supplies only its **config**:

- budget key: `budget:cycle:YYYY-MM-DD`
- `daily_limit_anon = 1`, `daily_limit_signed = 3`, `lifetime_peak_pass = 1`
- `no_rollover = true`, `no_periodic_refill = true`
- explanation cache key: `(date, field, locale, dayMasterBucket)`, ≥ 24h TTL

If K.4 has not landed when Cycle starts, that is a sequencing error — per the global order in
[ROADMAP.md](./ROADMAP.md), K.4 is a Wave-1 foundation built **before** Cycle.

### C.4.5 Share + chat (the deep reading is a durable artifact)

Because the deep reading is *seen* and Pro-valuable, it gets the two affordances that turn a one-shot read
into engagement + a growth loop — **reuse existing infra, do not build new**:

- **Share** — snapshot the reading to a card + public page via the existing **`/api/share`** route (add
  `'cycle'` to its `reportType` enum + the share Zod schema), producing an OG link like other reports.
- **Chat** — "continue asking" opens the K.5 **`ReadingChatScreen`** (`@zhop/core-ui`). Add a `'cycle'`
  conversation reading type to [`routes/chat.ts`](../apps/hexastral-api/src/routes/chat.ts) (mirror how K.5
  added `'feng'`), seeding the conversation with the day's 黄历 + the user's question. Pro-gated.

### C.4 acceptance gate — ✅ DONE (server + ExplainSheet; 2026-05-21)

- ✅ Tap a 宜忌 chip → `ExplainSheet` calls `POST /api/cycle/explain` (on-tap only, never pre-fetched).
- ✅ Never in the push / never pre-generated — the push (C.5) is deterministic.
- ✅ Weaves in the 日主 angle when `dayMaster` is known (passed from the day's `personalization`).
- ✅ 24h `GUARD_KV` cache keyed by `(date, field, locale, dayMasterBucket=五行)` — repeat taps don't re-spend.
- ✅ K.4 guard: subject `deviceId > ipHash` (anonymous endpoint — no trusted userId); `cycle` config
  (anon 1 / signed 3 / lifetime peak 1 / global 5000); degrades `allow_cached`/`allow_template` → deterministic
  template + `upsell`; never hard-blocks.
- ▣ Share: v1 uses RN `Share.share` of the text; the full `/api/share` card+OG flow is server-ready
  (`reportType: 'cycle'`) but needs the app's auth/HMAC — client follow-on.
- ▣ Chat: server-ready (`'cycle'` chat `readingType` + context-builder branch); the cycle-app chat screen
  (ReadingChatScreen + auth) is a client follow-on.

---

## 6. C.5 — Retention infrastructure (1 day)

### C.5.1 Daily 8am push — 100% deterministic (no LLM)

- expo-notifications; one push/day at 08:00 user-local.
- Content = deterministic only: `今日干支 · 宜 X · 忌 Y · 对你而言: <deterministic 五行 overlay>`.
  **No LLM in the push** — the LLM 深度解读 (C.4) is on-open only. The push is the hook; opening the app is
  where the (Pro) deep reading is earned.
- Opt-in: a dedicated consent prompt; opting in also authorizes storing the 日主 server-side for the
  personalized line (C.3 push path).

### C.5.2 Retro-check push (week after planned event)

If user uses Event-Search and picks a date:
- Schedule a single push 7 days after the picked date
- Content: "上周三签约那天，感觉如何？" → tap → in-app rating (1-5 stars)
- Builds trust over time ("Cycle 推的日子真的更顺")

### C.5.3 节气 push (24 per year)

On day of节气 (立春, 雨水, ...):
- Push at 8am: short article on this节气 + seasonal 养生 tip
- Drives daily-feel into seasonal-feel

### C.5 acceptance gate — ✅ DONE (local notifications; 2026-05-21)

- ✅ Opt-in (Me-tab toggle) → permission request → rolling 5-day 8am window scheduled, rescheduled on each
  app open (`refreshDailyPush`). Body = server-computed deterministic almanac (干支 + 宜/忌 + 对你而言 fit) —
  **no LLM**; 节气 folded into the body on 节气 days (C.5.3 light).
- ✅ Event-Search → tap a recommended day → `scheduleRetroCheck` fires 7 days later.
- ✅ Local timezone respected (scheduled at device-local 8am).
- **Model note:** Cycle uses **local** scheduled notifications (`lib/push.ts`; no push token, no server cron) —
  the right choice for Tier-3 anonymous. The flagship-style REMOTE push (svc-notify + Expo tokens) is the
  scale option, not needed for v1.
- Follow-ons: a dedicated 节气 **article** push (full C.5.3) + the retro-check's in-app rating UI. Needs a
  device build to verify (cycle-app tsc + expo-notifications are install-gated in this sandbox).

---

## 7. C.6 — ASO + assets + submission (1-2 days)

### C.6.1 aso-metadata.json (4 locales)

```json
{
  "bundleId": "com.hexastral.cycle",
  "appName": "Cycle",
  "primaryCategory": "LIFESTYLE",
  "locales": {
    "en-US": {
      "subtitle": "Eastern Almanac · Auspicious Days",
      "keywords": "almanac,auspicious days,lucky days,chinese calendar,lunar,fengshui,date picker,wedding date,i ching,divination",
      "promotionalText": "An ancient Chinese almanac, made for today. Find auspicious dates for any event — personalized to your birth chart.",
      "description": "..."
    },
    "zh-Hans": {
      "subtitle": "黄历 · 择吉日",
      "keywords": "黄历,万年历,黄道吉日,择日,老黄历,二十八宿,建除,二十四节气,通胜,老皇历",
      "promotionalText": "千年黄历，为今日而生。AI 解读每日宜忌，结合你的八字定制方位时辰。",
      "description": "..."
    },
    "zh-Hant": { ... },
    "ja": {
      "subtitle": "暦 · 吉日選び",
      "keywords": "暦,大安,仏滅,六曜,二十八宿,択日,結婚 日取り,引越し 吉日,本命卦",
      ...
    }
  }
}
```

### C.6.2 App icon + screenshots

- Icon: 朱泥-red square + 干支 character in 笔触 style (designer brief separate)
- 6 screenshots per locale × 4 locales = 24 assets
- App-preview video optional (15-30 sec)

### C.6.3 Privacy policy + Terms

Point to `hexastral.com/legal/cycle/{privacy,terms}` (same shared infrastructure as other apps).

### C.6 acceptance gate — ▣ metadata done; assets + submission are manual

- ✅ `aso-metadata.json` populated — 4 locales (en / zh-Hans / zh-Hant / ja); subtitle ≤30 / keywords ≤100 /
  promo ≤170 **verified within limits**; almanac-positioned with the differentiation wedges.
- ✅ Privacy appendix live at `www.hexastral.com/privacy/cycle` (registered in hexastral-web
  `satellite-privacy-appendices.ts`; tsc clean); Terms at `www.hexastral.com/terms`; both wired in `config.ts`.
- ✅ Screenshot brief (6 shots × 4 locales) in `assets/README.md`.
- ⏳ Icon design approved · TestFlight build uploaded · first App Store reviewer pass — manual (designer + EAS + ASC).

---

## 8. Validation gates (apply throughout)

- `bun typecheck` for cycle-app + hexastral-api
- Manual: 7-day push fires correctly (test with simulated time advance)
- Manual: 4-locale switch end-to-end (today / month / event-search / explain)
- Manual: signed-in vs anonymous personalization difference visible
- Manual: cross-app context (Cycle reads fate-app's bazi via memory) when enabled

---

## 9. Risk register

| Risk | Mitigation |
|---|---|
| 宜忌 corpus quality / accuracy | Source from established public-domain 黄历; cross-check 10+ random days against 3 mainstream apps |
| 28宿/建除 算法 mistakes | Unit tests covering known historical 黄历 dates; verify against 天文台数据 |
| Push permission low opt-in | Best-practice pre-permission modal explaining value; show 1-2 daily nudges in-app first before asking |
| AI explanation hallucination | Prompt limits to known fields + 日主; refuse if context unclear |
| Cost: AI explanations cheap but compound | Subject-key limits (userId > HMAC deviceId > ipHash fallback) + KV cache by (date, field, dayMaster) for 24h |
| Festival-day push spam (e.g. spring festival = many events) | Cap to 1 push/day in user-facing config; bundle multiple events in one notification |
| Personalization requires birth info entry friction | Optional onboarding step; standard 黄历 works without |

---

## 10. Open questions

1. **Corpus license** — find a public-domain 黄历 dataset; verify CC0 / 古籍公版
2. **节气 precision** — two layers: (a) the ±1-day **formula** error → see **C.1.8** (replace the 寿星 formula
   with a tabulated/precise source); (b) solar-term times vary by location — 北京时间 baseline or per-user GPS?
   (a) is launch-blocking (it corrupts 建除/宜忌 on boundary days); (b) is a v1.1 refinement.
3. **D1 caching** — measure first; only cache if `/api/cycle/day` p95 > 200ms
4. **Personalization opt-in flow** — onboarding 1 screen or skippable?
5. **Brand color** — confirm 朱泥-red (or alternative) doesn't collide with FaceOracle (jade) or DreamOracle (indigo)
6. **App icon glyph** — single 干支 character (e.g. 甲) or 节气 (e.g. 春) or paper texture?
7. **Reverse择日 event taxonomy** — finalize the 10-12 event types (wedding / business / signing / etc.)
8. **GBV / age-appropriate** — 黄历 has some traditional content about 安葬 (burial); confirm 4+ rating OK or needs 9+
9. **Retro-check UX** — 1-5 stars too coarse? Free text? In-app modal vs deep-link to a survey?

---

## 11. What this plan does NOT do

- Pivot Cycle into an IAP product (it's intentionally Tier 3 / no paywall)
- Replace existing 节气 / 干支 compute in astro-core (reuse)
- Build a multi-day forecast 流年 view (could come post-launch as v1.1)
- Cover 阴宅 / 安葬 specialist features (separate from daily 择日; potential v2)
- Compete with fate-app — Cycle is the **sole** 黄历/calendar home; fate-app deliberately has no almanac (it captures the 命盘, Cycle renders the daily view)
