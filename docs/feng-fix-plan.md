# Feng (風) — Fix & Polish Plan

Status snapshot: **2026-06-30**. Supersedes the stale references in
`apps/feng-app/README.md` (`docs/feng-plan.md`) and ADR-0019's
`docs/sprints/feng-*.md` — neither of those files exists anymore. Code is the
source of truth; this doc reconciles the plan to it.

## Where Feng actually stands

Feng is an **active V1 flagship** (cycle / feng / yuan trio, ADR-0019), not a
scaffold. Verified by direct reading + 84/84 passing theory tests:

- **风水计算** (`packages/astro-core/src/feng/`) — production-grade, textbook
  沈氏玄空 + 八宅明镜 + 外峦头, golden-tested against a published 双星会向 chart.
- **AI pipeline** (`services/svc-feng/`) — REAL, not stubbed: Gemini Vision
  外峦头 + CF Workers AI (Kimi→Qwen→GLM) synthesis, Zod-retry, graceful degrade.
- **Maps** — real Mapbox Static Images + R2 30-day cache.
- **Async jobs** — Queue + D1 state machine (maps→vision→compute→synthesis→done).
- **Pro gate** — enforced before enqueue.

The gap is last-mile: a few production blockers + UI/A11y polish. **No
architectural refactor required.**

---

## App Store compliance — ✅ DONE (2026-06-30)

Two hard rejection-cause fixes (typecheck + biome clean):
- **Account deletion (Apple 5.1.1(v))** — none existed repo-wide. Added
  `DELETE /api/user/:userId` (self-only): purges feng content + erases all PII +
  unlinks Apple/Google (FK-safe anonymize, since 23/30 child tables don't
  cascade). Client `lib/account.ts` + profile "Delete account" entry (confirm →
  delete → sign out). **Follow-up before kindred/auspice/fate ship**: extend the
  content purge to their user-owned tables.
- **Mapbox attribution (ToS)** — images render clean (`attribution=false`) but
  the UI now shows `© Mapbox © Maxar © OpenStreetMap` under the report swiper +
  facing tile (`MAP_ATTRIBUTION`).

Other review risks (AI-chat moderation/report, Street-View ToS for Wave 4,
fortune-telling framing, App Privacy disclosures) tracked in the chat discussion;
not yet actioned.

## Wave 1 — Production blockers — ✅ DONE (2026-06-30)

All four shipped; `bun typecheck` + biome clean. Deploy-gated (CI does not
deploy — run `cd apps/hexastral-api && bun deploy`).

- 1.1 ✅ `loadUserContext` + `resolveReportLocale` (`feng-analyze.ts`) — report
  locale now follows `users.locale`.
- 1.2 ✅ `pruneStaleFengJobs` (`feng-annual-cron.ts`) wired into the daily cron
  (`index.ts`).
- 1.3 ✅ Single purchase consumed on success — `purchaseId` threaded through the
  queue message → consumed in `runAnalyzeJob` after the report persists
  (idempotent via `status='purchased'` guard).
- 1.4 ✅ README + stale comments updated.

Original detail retained below for reference.

## Wave 1 — Production blockers (must-fix before V1 submission)

### 1.1 — Report locale hard-coded to `'zh'`  🔴

- **Where**: `apps/hexastral-api/src/lib/feng-analyze.ts:250`
  (`const locale: ... = 'zh' // TODO: persist per-user pref`)
- **Problem**: every non-Chinese user receives a Chinese-only report. Direct
  blocker for the en/ja App Store submission.
- **Data already exists**: `users.locale` column (`db/schema.ts:149`,
  default `'zh'`).
- **Change**:
  1. Extend `loadUserProfile()` (`feng-analyze.ts:78-88`) to also select
     `users.locale`, returning it alongside `birthDate`/`gender`.
  2. Map the stored BCP-47 value → the pipeline's
     `'en' | 'zh' | 'zh-Hant' | 'ja'` union (fallback `'zh'` if null/unknown).
  3. Thread it into both `visionAnalyze({ locale })` (line 251) and
     `synthesizeReport({ userProfile: { locale } })` (line 327).
  4. Persist the chosen locale onto the `feng_reports` row so a re-render is
     reproducible (optional but cheap — add `locale` column or fold into
     `dataQuality` JSON).
- **Decision point**: the user may have a non-`zh` UI locale but want a `zh`
  report (or vice versa). For V1 use `users.locale` directly; revisit a
  per-site override later. Mirror whatever `auspice`/`kindred` do
  (`searchPortfolioReadingMemory` already takes a `locale` — reuse the same
  resolution helper if one exists).
- **Verify**: enqueue analyze for an `en` user → chapters return English; job
  log `synthesize.done` shows `locale: 'en'`.
- **Effort**: ~S (half day).

### 1.2 — `feng_jobs` rows never pruned  🔴

- **Where**: `apps/hexastral-api/src/routes/feng/jobs.ts:9-10` comment promises
  a weekly cron; it does not exist. `feng-annual-cron.ts` only *inserts* jobs.
- **Problem**: job rows accumulate forever; `runAnnualFengRefresh` and the
  `(userId, stage)` index queries degrade over 12-24 months.
- **Change**:
  1. Add `pruneStaleFengJobs(db)` deleting `feng_jobs` where
     `stage IN ('done','failed')` AND `finishedAt < now - 30d`.
  2. Wire it into the existing scheduled handler (find the `scheduled()` /
     cron entry in `apps/hexastral-api/src/index.ts` that already calls
     `runAnnualFengRefresh`; add a weekly branch or fold into the daily cron
     with a day-of-week guard).
  3. Confirm `wrangler.jsonc` cron triggers cover it (the annual/daily cron is
     already declared; reuse it rather than adding a new trigger).
- **Verify**: seed an old terminal job row, run cron locally
  (`wrangler dev` + scheduled trigger), confirm deletion; in-flight
  (`maps`/`vision`/...) rows are untouched.
- **Effort**: ~S.

### 1.3 — Single purchase entitlement checked but never consumed  🟠

- **Where**: `apps/hexastral-api/src/routes/feng/sites.ts:285-313`. `/analyze`
  calls `checkReadingAccess(db, userId, 'feng_analysis')` then enqueues. No
  `consume` call anywhere in the feng routes or `feng-analyze.ts`.
- **Problem**: a `single_purchase` (`hexastral_feng_single`, $4.99) entitlement
  is verified but not decremented → a user who bought one analysis can analyze
  unlimited sites. Revenue leak.
- **First confirm the intended model** (don't assume): check how `kindred` /
  `auspice` single-purchases are consumed — there may be a shared
  `consumeReading` / `markPurchaseConsumed` helper next to `checkReadingAccess`
  in `lib/access-check.ts`. Match that pattern exactly.
- **Change** (once pattern confirmed): after the job **succeeds** (report row
  written, `feng-analyze.ts:363` `setStage('done')`), consume the purchase the
  access check resolved. Consuming on *enqueue* is wrong — a failed job would
  burn the purchase. So thread `access.via` / `purchaseId` from the route into
  the job (store on `feng_jobs`), and consume in the queue consumer on success.
- **Decision point**: consume-on-success requires carrying `purchaseId`
  through the queue. Alternative: consume at report **first view**. Pick the
  one matching the sibling apps.
- **Verify**: non-Pro user with one purchase analyzes site A (succeeds) → second
  analyze of site B returns 403 paywall. A *failed* analysis does NOT consume.
- **Effort**: ~M (needs sibling-app pattern check first).

### 1.4 — Update stale README / docs  🟡

- **Where**: `apps/feng-app/README.md` ("Phase E Week 4 scaffold; real Mapbox,
  Gemini Vision, Claude synthesis land Weeks 5-6"), and the dead
  `docs/feng-plan.md` link.
- **Change**: rewrite status to reflect reality (pipeline live; synthesis runs
  on CF Workers AI flagship tier, not Claude); point the doc link here.
- **Effort**: ~XS.

---

## Wave 2 — Theory moat — ✅ 2.1 DONE (2026-06-30)

替卦 shipped in `packages/astro-core/src/feng/flying-stars.ts`; full astro-core
suite green (738/738), typecheck + biome clean across astro-core, hexastral-api,
scenario-feng, feng-app.

- **替星 table** (`REPLACEMENT_STAR`) — 沈氏玄空學 "每星三山", sourced from
  楊筠松《青囊奧語》+ 沈氏 expansion, cross-checked against two independent
  references (note: 沈氏 puts 子→1贪狼 / 癸→3祿存, the "每星三山" table — NOT the
  alternate 子癸both→1 verse reading).
- **Algorithm** — 替卦 = 下卦 with the center replaced by `替星(proxyMountain)`;
  same proxy + 顺逆 the existing `flyDirection` derives. Verified against the
  published 七运 子山午向 兼壬丙 worked example (阐微堂). 5黄无替 handled
  ("用替不能替").
- **Driver** — `computeFlyingStars` now returns the 替卦 charts as the effective
  `mountainChart`/`facingChart`/`combined` when 兼向, plus raw `…XiaGua` 下卦 for
  transparency, plus a `chartMethod: '下卦' | '替卦'` flag.
- **Tests** — table (verse anchors + full 24山), the worked example, a 能替 case
  (七运 壬山丙向), 5黄无替, and driver wiring (compound vs non-compound).
- **Note / possible Wave 3 follow-up**: the 兼向 trigger threshold is the
  pre-existing `isCompoundFacing` (within 2.5° of a 山 boundary). Traditional
  practice varies (~3° from center); revisit if QA wants a different cutoff. The
  client could also surface `chartMethod` + 替卦 explanation in the report UI.

Original detail retained below.

## Wave 2 — Theory moat (differentiation)

### 2.1 — 替卦 (compound-facing / 兼向) charts  🟠

- **Where**: `packages/astro-core/src/feng/twenty-four-mountains.ts` already has
  `isCompoundFacing(deg, 2.5)`; `flying-stars.ts` only computes 下卦 and the
  result merely flags `isCompoundFacing: true` to warn the user.
- **Problem**: for facings within ~±2.5° of a 山 boundary (兼向), the 下卦 chart
  is *wrong* — traditional practice substitutes the 替卦 (替星) chart. This is
  the **only scenario where Feng currently produces an incorrect plate**, so
  it's the highest-value theory upgrade.
- **Change**:
  1. Add the 替星 substitution table (the 60 甲子 / 三元龙 → 替星 mapping; the
     standard 沈氏 替卦 rule: each 山 maps to a replacement star used at center
     when 兼向).
  2. New `mountainChartReplaced` / `facingChartReplaced` that fly the 替星
     instead of the period number at center.
  3. In `computeFlyingStars`, when `isCompoundFacing`, return the 替卦 charts
     (and keep a flag so the report can say "兼向, 替卦盘").
  4. Golden tests: pick a published 替卦 example (e.g. a documented 兼向 case)
     and assert the plate — same rigor as the existing 双星会向 test.
- **Decision point**: 替卦 has flavor variations across 玄空 lineages. Commit to
  沈氏 (the lineage the rest of the code already follows) and cite the source
  in the module header, as `flying-stars.ts` already does.
- **Verify**: `bun test packages/astro-core/src/__tests__/feng/` green incl.
  new 替卦 fixtures.
- **Effort**: ~M-L (correctness-critical; needs a vetted reference chart).

### 2.2 — (Optional, lower priority) richer 旺衰 + 月紫白

- `classifyStar` (`flying-stars.ts:332`) is simplified (no 进气 / future-生气
  distinction); 月紫白 not implemented. Both are explicitly "V1-sufficient".
  Defer unless the report's depth needs it. Not a blocker.

---

## Wave 3 — UI/UX polish — 🟡 PARTIAL (2026-06-30)

feng-app typecheck + biome clean (one pre-existing `useExhaustiveDependencies`
warning in profile.tsx left untouched). All changes are RN/Expo — **need
on-device / simulator QA** (can't be browser-verified).

**Done:**
- **A11y + haptics** on the primary interactive surfaces (using the shared
  `useHaptic()` + `accessibilityRole/Label/State`): report back-button, sites-list
  cards, readings rows, building accuracy chips, address buttons, profile
  sign-out + cross-app Switch label. Note: shared `Button` already sets
  `accessibilityRole='button'` and auto-fires haptics, so the raw `Pressable`
  CTAs in building/address were converted to `Button` (free a11y + haptics).
- **Report entrance motion** — chapter cards now `FadeInDown` staggered by index
  (3.4). (`LoadingTextBlock` already shimmers — the "no shimmer" item was a false
  alarm.)
- **替卦 surfaced in UI** (Wave 2 follow-up) — report shows a "兼向 · 替卦盘" note
  under the 飞星 grid when `flyingStars.isCompoundFacing`.
- **i18n loose ends** (3.6) — localized: `CHAPTER_LABELS` (was hardcoded zh),
  "Move-in year", address "Name"/"Address"/"Use current location", readings
  "Updated {date}", + a `nav_back` key. All across en / zh-Hans / zh-Hant / ja.
- **3.2 stopgap** — address subtitle no longer promises a (non-existent) map;
  copy now matches the type-or-current-location flow.

**Remaining (need a simulator / designer pass):**
- 3.1 A11y on the heavier screens not yet swept: facing.tsx (door toggle, nudge
  buttons, calibrator), birth-info grid, compass, sign-in, chat. Plus a
  `FENG_PALETTE` contrast audit (copper on light) and VoiceOver device test
  against the MingPan reference.
- 3.2 full — interactive `MapView` drop-a-pin on the address step (only the copy
  was fixed).
- 3.4 — skeletons for map tiles / chapter cards during analysis (entrance motion
  done; LoadingTextBlock already shimmers).
- 3.5 — onboarding expectation-setting intro + accuracy "why it matters" help.

## Wave 3 — UI/UX polish (align to ADR-0018 design language)

### 3.1 — Accessibility (A11y)  🔴

- **State**: 1 `accessibilityRole` across 37 files. Likely fails WCAG AA.
- **Template exists**: MingPan already completed VoiceOver per ADR-0019 — copy
  its patterns.
- **Change**: `accessibilityLabel` / `accessibilityHint` on every Pressable /
  Button / TextInput / Switch / icon-only button; `accessibilityLiveRegion`
  on job-progress + geocode status; verify tab labels; run a contrast pass on
  `FENG_PALETTE` (copper `#B08D5B` on light surfaces is the risk).
- **Effort**: ~M (systematic, plus device VoiceOver test).

### 3.2 — Address step missing the promised map  🟠

- **Where**: `apps/feng-app/app/(new-site)/address.tsx` — subtitle says
  "long-press the map to drop a pin" but only renders text inputs.
- **Change**: either add a MapView (drop/long-press pin → reverse geocode) or
  fix the copy to match a search-only flow. A map is the better UX and the
  facing step already loads satellite tiles, so the dependency is in place.
- **Effort**: ~M (map) / ~XS (copy-only stopgap).

### 3.3 — Haptics coverage  🟠

- Sparse today (only facing capture/nudge, birth-info save, share). Add
  `useHaptic('light')` to confirm buttons, tab switches, geocode success,
  card taps. Low effort, high perceived-quality ROI.
- **Effort**: ~S.

### 3.4 — Report payoff motion + skeletons  🟡

- Report chapters render static (no entrance). Async loads show plain text, no
  shimmer. Add Reanimated `FadeInDown` staggered by chapter index; use the
  core-ui `useShimmer()` for map-tile + chapter skeletons. Match kindred's
  ChapterPager polish.
- **Effort**: ~S-M.

### 3.5 — Onboarding expectation-setting  🟡

- No "~2 min, prepare address / facing / build year" preflight; accuracy enum
  (exact/decade/moveIn) lacks "why it matters" help. Add a light intro + a `?`
  affordance on the building step.
- **Effort**: ~S.

### 3.6 — i18n loose ends  🟡

- One hardcoded "Move-in year" label (`building.tsx:~171`); `CHAPTER_LABELS`
  in `(report)/[siteId].tsx:38-45` are hardcoded zh — route them through
  `lib/i18n.ts`.
- **Effort**: ~XS.

---

## Suggested sequencing

1. **Wave 1** in full (unblocks submission; ~2-3 days).
2. **2.1 替卦** (the one correctness gap; the theory differentiator).
3. **3.1 A11y + 3.3 haptics + 3.2 address map** (the polish that moves the
   ADR-0018 quality bar most).
4. Remaining 3.x as time permits.

## Pre-work checklist (do before coding)

- [ ] Confirm sibling-app single-purchase **consume** pattern in
      `lib/access-check.ts` (gates 1.3 design).
- [ ] Confirm where the daily/annual feng cron is registered in
      `apps/hexastral-api/src/index.ts` (gates 1.2 wiring).
- [ ] Source a vetted 替卦 reference chart for the 2.1 golden test.
- [ ] Confirm `users.locale` BCP-47 values in production map cleanly to the
      4-locale union (gates 1.1).
