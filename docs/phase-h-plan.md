# Phase H — Feng-app 打磨 + 视觉资产 + 罗盘升级

> **Status**: Week 1 ✅ shipped; F4 ✅ 2026-05-19; Y1/Y2/Y4/Y5 ✅ 2026-05-19;
> **F1 dropped** (Compass red-ocean, low ARPU overseas);
> **VLM-IAP gate + photo-quality T&C ✅ 2026-05-19**; F3 Bucket B
> (FlyingStarsGrid + BaZhaiWheel) ✅ 2026-05-19; F3 Bucket A (12 形煞 icons) =
> design spec only — see [feng-visual-assets-spec.md](feng-visual-assets-spec.md).
> **Owner doc**: this file. Created 2026-05-18.
> Background context: agreed plan from session 2026-05-18 — see also
> [feng-plan.md](feng-plan.md), [ADR-0004](decisions/0004-satellite-funnel-pattern.md).

Phase H translates the strategic conversation into 6 work items split across
~6 weeks. Priorities are anchored by the user's call: **feng-app first**
(highest ARPU, highest potential), Yuán fixes in parallel, satellite ASO
strategy deferred to ADRs.

---

## 0. TL;DR — what each item delivers

| ID | Title | Why | Status |
|---|---|---|---|
| **F1** | ~~ProCompassDial — pro 罗盘~~ | **Dropped 2026-05-19.** Compass is a red-ocean keyword overseas with low transitional ARPU; doesn't move the needle for feng-app paying users. Existing 2-layer overlay stays. | ✗ dropped |
| **F2** | Mapbox VLM prefetch (Tilequery) | Skip Gemini Vision work on flat-urban sites where 砂/水/朝案 are confirmed-empty by vector tiles. ~60 % token savings on SG/TOK/SF users. | ✅ Week 1 |
| **F3** | 数字资产产线 — feng visual assets | Bucket B (compute-driven: FlyingStarsGrid + BaZhaiWheel) shipped 2026-05-19. Bucket A (12 形煞 icon SVGs) is design work, spec'd in [feng-visual-assets-spec.md](feng-visual-assets-spec.md). | partial (code ✅ / 12 icons need design) |
| **G1** | VLM-IAP gate on `/api/feng/sites/:id/analyze` | Cost-leak fix: feng was the only Vision-using scenario without a paywall check before kicking off Gemini Vision on satellite tiles. Mirrors face/palm pattern. New SKU `hexastral_feng_single` ($4.99) or Pro. | ✅ 2026-05-19 |
| **G2** | Photo-quality + AI-processing T&C in face/palm/feng | Pre-upload UX showed no sharpness/lighting/angle guidance and no AI-processing disclaimer. Added to PalmfaceCaptureScreen (face + palm) and feng review screen. | ✅ 2026-05-19 |
| **F4** | 报告视觉化 — annotated map swiper + chapter-inline visuals | Surface the already-generated annotated satellite tiles + render per-chapter visual cards. Highest-ROI low-risk surface work. | ✅ map swiper shipped (chapter-inline visuals deferred to F3) |
| **Y1** | Apple email auto-capture for viral first-reading | invite-mode 双方免费 mechanic needs an email to bind; Apple Sign-In provides one and we were ignoring it. | ✅ 2026-05-19 |
| **Y2** | First-reading IAP semantics (solo paywalls / invite credits) | Verified existing server-side gate: `bonds/solo` forces paywall, `bonds/invite/respond` grants one `bond_invite_credit` per side. Matches user spec; no code change. | ✅ verified 2026-05-19 |
| **Y3** | CityPicker in core-ui | 4 onboarding flows had naked TextInputs ignoring svc-geocode. | ✅ Week 1 |
| **Y4** | Shared shichen picker | yuan-app's hour-spinner + `hourToTimeIndex(0..12)` had a 12-out-of-range bug; hexastral-app has a proper 12-cell 时辰 grid (0..11). Extract → core-ui, adopt in yuan-app. | ✅ 2026-05-19 |
| **Y5** | Curved 红线 animation | Existing 5 strokes were stiff Bézier in gold. Replace with cinnabar threads on golden-ratio (1/φ, 1/φ²) control points and a continuous sin-driven waft. | ✅ 2026-05-19 |

---

## 1. Shipped — Week 1 (2026-05-18)

### F2 · Mapbox Tilequery prefetch

Backend cost optimization before Vision pipeline:

- New `services/svc-feng/src/lib/prefetch.ts` — `prefetchTerrainSignals()` does
  parallel Tilequery on `mapbox.mapbox-streets-v8` (water + waterway) and
  `mapbox.mapbox-terrain-v2` (contour). Returns `recommendedTiles` (`['close']`
  or `['close', 'mid']` or `['close', 'mid', 'wide']`) + `expectedFeatures`.
- New `services/svc-feng/src/routes/prefetch.ts` — `POST /prefetch`.
- [feng-analyze.ts](../apps/hexastral-api/src/lib/feng-analyze.ts) — calls
  prefetch first; only renders + annotates the recommended tiles; passes
  `expectedFeatures` + `terrainSummary` to vision call.
- Vision route + prompt: `annotatedKeys` schema loosened from `.length(3)` to
  `.min(1).max(3)`. New `expectedFeatures` field instructs model to return
  empty arrays for skipped categories ("trust the Mapbox signal").
- Synthesis prompt: new "if `terrain.flat_urban=true`" rule — empty 砂/水 are
  ground truth, not Vision degradation.
- `feng-client.ts`: `prefetchTerrain()` + `TerrainSignals` + `AdaptiveTile`.

Fail-open: if Mapbox is down, `degraded=true` and pipeline runs full 3 tiles.

### Y3 · CityPicker

- New `packages/core-ui/src/components/CityPicker.tsx` — presentational
  search-input + debounced suggestion list. Accepts `search` callback +
  optional `topCities`. Lifted from hexastral-app's pre-existing
  `(birth)/city-picker.tsx`.
- New `apps/yuan-app/lib/geocode.ts` — thin fetch wrapper around
  `/api/geocode/search`.
- Wired into [yuan-app/birth-place.tsx](../apps/yuan-app/app/(onboarding)/birth-place.tsx),
  [yuan-app/fill-other.tsx](../apps/yuan-app/app/(onboarding)/fill-other.tsx),
  [hexastral-app/city-picker.tsx](../apps/hexastral-app/app/(birth)/city-picker.tsx).
- Yuan onboarding draft now persists `selfBirthLat/Lng/Timezone` +
  `otherBirthLat/Lng/Timezone` alongside the city name — backend can use
  precise coords for 真太阳时 correction without re-geocoding.

feng-app `(new-site)/address.tsx` deliberately NOT migrated — that's
address-level (Mapbox Geocoding API), not city-level.

---

## 2. Shipped — F4 报告视觉化 hero swiper (2026-05-19)

### F4.1 ✅ Schema — annotatedMapKeys column

[apps/hexastral-api/src/db/schema.ts](../apps/hexastral-api/src/db/schema.ts)
`feng_reports.annotatedMapKeys` text column added. JSON-encoded shape:
`{ close?: string, mid?: string, wide?: string }`. Nullable for legacy rows.

**Manual follow-up (deploy day)**: `bun db:generate` → review migration →
`bun db:migrate:prod`.

### F4.2 ✅ Pipeline persistence

[feng-analyze.ts](../apps/hexastral-api/src/lib/feng-analyze.ts) records the
annotated R2 key keyed by tile name (`annotatedByTile`) during the annotate
stage, then `JSON.stringify`s it into `annotatedMapKeys` when persisting the
report row.

### F4.3 ✅ R2 image serving (ownership-checked)

- svc-feng: new `GET /maps/image/:bucket/:key` in
  [routes/maps.ts](../services/svc-feng/src/routes/maps.ts). Internal-only
  (Service Binding wall). `bucket = 'raw' | 'annotated'`.
- hexastral-api: new route file
  [routes/feng/reports.ts](../apps/hexastral-api/src/routes/feng/reports.ts) at
  `GET /api/feng/reports/:reportId/maps/:tile`. HMAC-protected, verifies
  `report.userId === HMAC user`, returns base64 PNG inside the standard
  envelope (mirrors `/api/feng/maps/preview` pattern).
- jobs.ts + sites.ts updated to surface `annotatedTiles: ('close'|'mid'|'wide')[]`
  in the report payload (clients know which tiles to load).

### F4.4 ✅ scenario-feng types + hook

- `types.ts`: `FengAnnotatedTile`, `FengAnnotatedMapResponse`.
  `FengJobResponse.report.annotatedTiles: FengAnnotatedTile[]` propagates
  through `FengSiteWithLatestReport.latestReport` (same type alias).
- `lib/feng-api.ts`: new `fengReports(client)` RPC wrapper plus
  `loadReportMap(client, reportId, tile)` helper. Both reuse `unwrap()` and
  the existing Hono RPC façade pattern.
- New `hooks/useReportMap.ts` — `{ dataUri, isLoading, error }`; backed by a
  module-level `Map` cache keyed on `${reportId}::${tile}` so the swiper
  doesn't re-download tiles on navigation/tab-switch. Exported from the
  hooks barrel.
- Reports route mounted in `apps/hexastral-api/src/routes/index.ts` via the
  shared barrel (matches the rest of the `feng/*` exports).

### F4.5 ✅ Hero map swiper + report screen

- New `apps/feng-app/components/AnnotatedMapSwiper.tsx`: horizontal pageable
  `ScrollView` (`pagingEnabled` + `snapToInterval`), one tile per page driven
  by `useReportMap`. Pager dots double as close/mid/wide labels in copper.
  Skeleton text shows `report_map_loading` while fetching, `report_map_failed`
  on error (dev-mode also prints `error.message`).
- [feng-app/(report)/[siteId].tsx](../apps/feng-app/app/(report)/[siteId].tsx)
  reads `annotatedTiles` from either `latestReport` or the live job, and
  renders `<AnnotatedMapSwiper>` between the address header and the chapter
  cards. Server-driven: empty `annotatedTiles` ⇒ renders nothing (legacy or
  prefetch-skipped reports stay text-only).
- New i18n strings: `report_map_{close,mid,wide,loading,failed}` in all 4
  locales (en / zh / zh-Hant / ja).

---

## 2b. Shipped — Y1 / Y2 / Y4 / Y5 (2026-05-19)

Polish pass driven by the user's "viral 双人合盘 first-reading" framing.

### Y1 · Apple Sign-In email capture

[apps/hexastral-api/src/routes/onboarding/apple-link.ts](../apps/hexastral-api/src/routes/onboarding/apple-link.ts)
now reads the `email` claim from Apple's verified JWT and persists it onto
the linked user (`users.email`) in both the "linked" and "recovered" branches.
Doesn't clobber an explicit email the user already typed; treats Apple's
private-relay address as a normal email.

Why this matters: the existing `/api/bonds/invite` route requires
`user.email` to be set before A can send a 邀请 (otherwise it returns
`Link your email in Settings`). Apple was already gathering an email
during sign-in, we just weren't storing it. Now Apple Sign-In is a
single-tap path to "I'm bindable" → unlocks the viral free-full-report
mechanic without a verification round-trip.

### Y2 · First-reading IAP semantics — verified, no change

Spec checked against current server-side logic:

- 默念 / fill mode → `POST /api/bonds/solo` calls
  `checkReadingAccess(..., { allowBondInviteCredit: false })`
  ([bonds.ts:237](../apps/hexastral-api/src/routes/bonds.ts#L237)).
  Forces paywall for non-Pro users. ✅ matches spec.
- 邀请 / invite mode → `POST /api/bonds/invite/:token/respond` grants
  one `bond_invite_credit` per side
  ([bonds.ts:986](../apps/hexastral-api/src/routes/bonds.ts#L986)) and
  then runs `checkReadingAccess(..., { allowBondInviteCredit: true })`.
  Both inviter and respondent get one free synastry on successful accept.
- If respondent never accepts, A's report is never generated (no free).

No code change needed for the gating itself.

### Y4 · Shared shichen picker (`@zhop/core-ui/ShichenPicker`)

- New
  [packages/core-ui/src/components/ShichenPicker.tsx](../packages/core-ui/src/components/ShichenPicker.tsx)
  presentational 12-cell 时辰 grid. `value: ShichenIndex | null` (0–11);
  active background defaults to `theme.colors.text` but accepts an
  `accentColor` override so Yuán can use cinnabar, hexastral-app can use
  iOS text-color, etc. Optional `onSelect` callback for haptics.
- [apps/yuan-app/app/(onboarding)/birth-time.tsx](../apps/yuan-app/app/(onboarding)/birth-time.tsx)
  and [fill-other.tsx](../apps/yuan-app/app/(onboarding)/fill-other.tsx)
  now use `ShichenPicker` directly. Kills the previous
  `hourToTimeIndex` helper that produced index `12` for hours 23:xx —
  the backend's `birthTimeIndex` schema is 0–11, so the legacy code
  could silently corrupt 真太阳时 correction.
- hexastral-app's inline grid in `(birth)/birth-time.tsx` is unchanged
  for now; can adopt the shared component later (1-line swap).

### Y5 · Cinnabar 红线 with golden-ratio waft

[packages/scenario-yuan/src/components/RevealMoment.tsx](../packages/scenario-yuan/src/components/RevealMoment.tsx):

- Replaced 5 hand-tuned gold paths with a worklet-driven cubic Bézier
  generator. Control points sit at `1/φ` and `1/φ²` along the A→B
  segment, displaced perpendicular by a sin wave per strand.
- Each strand has its own phase + amplitude; the bundle reads as a
  woven group rather than five parallel curves.
- After the initial draw-in (existing stroke-dashoffset), a
  `withRepeat(withTiming(2π, 5200ms, linear), -1)` `waftPhase`
  SharedValue keeps the threads drifting indefinitely on the UI thread
  via `useAnimatedProps` recomputing `d`.
- Color changed from `ink.gold` to `cinnabar.seal` (the actual 红线).

---

## 2c. Shipped — G1 VLM-IAP gate + G2 photo-quality T&C (2026-05-19)

### G1 · Feng VLM-IAP gate

[apps/hexastral-api/src/routes/feng/sites.ts](../apps/hexastral-api/src/routes/feng/sites.ts)
now calls `checkReadingAccess(db, userId, 'feng_analysis')` *before*
enqueuing a feng analyze job. Previously a free user could trigger Gemini
Vision on satellite tiles indefinitely — this was the only Vision-using
scenario without a paywall check.

- New `'feng_analysis'` SKU in
  [access-check.ts](../apps/hexastral-api/src/lib/access-check.ts) →
  product `hexastral_feng_single` ($4.99 fallback) or Pro quota (uses the
  shared pair-quota bucket so Pro feels generous without duplicating
  plumbing).
- `single_purchases.skuId` enum extended to include `'feng_analysis'`
  ([schema.ts](../apps/hexastral-api/src/db/schema.ts)).
- Denial response: 403 `paywall_required` with a user-facing message
  ("A feng-shui report requires Pro or a one-time purchase ($4.99).")
  + `iapProductId` + `price` + `reason` in the details payload so
  feng-app can wire the existing paywall pattern.

### G2 · Photo-quality + AI-processing disclaimers

Face / palm — extended `PalmfaceCaptureStrings` with five new keys:
`qualityTitle`, `qualityFocus`, `qualityLight`, `qualityFraming`,
`aiDisclaimer`. All four locales filled (en / zh / zh-Hant / ja) in
[satellite-strings.ts](../packages/scenario-palmface/src/satellite-strings.ts).
[PalmfaceCaptureScreen.tsx](../packages/scenario-palmface/src/PalmfaceCaptureScreen.tsx)
renders the disclaimer + 3 bullet guidance ("sharp focus / even light /
centered framing") above the Open-Camera CTA.

Feng — two new strings in [feng-app/lib/i18n.ts](../apps/feng-app/lib/i18n.ts):
`new_site_review_ai_disclaimer` (one-time satellite/AI processing notice)
and `new_site_review_iap_note` (one-report-per-site + Pro/IAP framing).
[(new-site)/review.tsx](../apps/feng-app/app/(new-site)/review.tsx) renders
both above the Generate-Report button.

---

## 2d. Shipped — F3 Bucket B compute-driven visuals (2026-05-19)

Two pure-SVG presentational components in scenario-feng, both consume the
already-persisted `FengReport.compute` subtree.

### FlyingStarsGrid

[packages/scenario-feng/src/components/FlyingStarsGrid.tsx](../packages/scenario-feng/src/components/FlyingStarsGrid.tsx).
3×3 洛书 palace plate. Each cell renders mountain/facing/annual stars as
stacked numerals (ink / cinnabar / copper). Per-palace background tint
driven by `classifyStar(facing, currentYuanYun)` — 当令 reads warm copper,
死气 reads cool ink, 煞气 reads cinnabar. Centered 中宫 is treated
specially (no classification). Legend strip below the grid.

### BaZhaiWheel

[packages/scenario-feng/src/components/BaZhaiWheel.tsx](../packages/scenario-feng/src/components/BaZhaiWheel.tsx).
8-direction wheel (45° wedges, 0° = N convention matching `BaguaCompassOverlay`).
Lucky directions read copper, unlucky read muted ink. 命卦 trigram + 东四
/西四 group in the center disc. If `result.fit` is present (sit + door
palaces provided), hairline arcs on the outer edge mark the 坐山
(cinnabar) and 大门 (blue) palaces so the user sees fit at a glance.

### Wiring

- Server now surfaces `compute` in the trimmed report payload from both
  `/api/feng/sites/:id` ([sites.ts](../apps/hexastral-api/src/routes/feng/sites.ts))
  and `/api/feng/jobs/:id` ([jobs.ts](../apps/hexastral-api/src/routes/feng/jobs.ts)).
  Previously the polling payload trimmed compute alongside the heavy
  vision JSON — but compute is tiny (~2 KB) and needed for these visuals.
- `FengJobResponse.report.compute: FengComputeJson` added to
  [scenario-feng/src/types.ts](../packages/scenario-feng/src/types.ts).
- [(report)/[siteId].tsx](../apps/feng-app/app/(report)/[siteId].tsx)
  inlines `<FlyingStarsGrid>` in the `flying_stars` chapter card and
  `<BaZhaiWheel>` in the `personal_fit` chapter card.

### Bucket A — design spec only

12 形煞 sticker components are design work, not code. Full hand-off spec
lives in [feng-visual-assets-spec.md](feng-visual-assets-spec.md):
viewBox, stroke convention, copper accent rules, the 12 visual hooks, and
the eventual `getFormShaIcon()` lookup helper that wires them into the
`remediation` chapter.

---

## 3. Original F3 plan (superseded by 2d above)

### F3.1 New package: `packages/feng-visual-assets/`

Scaffold mirroring `@zhop/core-ui` minimal structure: `package.json` + peer-deps
on `react-native-svg`, `src/index.ts` barrel. Consumed by scenario-feng +
feng-app for chapter-inline visuals.

### F3.2 Forms-of-harm sticker set (12 SVG components)

One TSX component per harm type. Style: ink-wash monoline + copper accent,
single `<Svg viewBox="0 0 64 64">`, fillable via `currentColor`.

Targets (matching the type strings in vision.ts schema):
- `LuChongIcon` — 路冲 (road rush, straight road → building)
- `FanGongIcon` — 反弓 (reverse bow road curving away)
- `JianJiaoIcon` — 尖角 (sharp building corner aimed at site)
- `TianZhanIcon` — 天斩 (sky-cut gap between buildings)
- `GuFengIcon` — 孤峰 (isolated tall structure)
- `DianTaIcon` — 电塔 (power pylon)
- `QiaoShaIcon` — 桥煞 (overpass cutting)
- `JianDaoIcon` — 剪刀煞 (scissor junction)
- `FanShuiIcon` — 反水 (water flowing away)
- `GeJiaoIcon` — 割脚 (water cutting base)
- `YuDaiIcon` — 玉带 (embracing water)
- `MingTangIcon` — 明堂 (open hall in front)

Export a lookup helper `getFormShaIcon(type: string)` returning the right
component, with a fallback ink-dot placeholder for unrecognized strings.

### F3.3 Compute-driven inline components (FlyingStarsGrid + BaZhaiWheel)

- `<FlyingStarsGrid>` — 3×3 SVG palace plate. Props: `{ mountainStars[9],
  waterStars[9], annualStars[9] }`. Renders 9 cells with stacked colored dots
  (mountain / water / annual) + 旺/退/死 tinting per palace.
- `<BaZhaiWheel>` — 8-direction wheel. Props: `{ mingGua, lucky[4], unlucky[4] }`.
  Each sector wedge colored copper (lucky) or muted gray (unlucky), with the
  trigram label.

Both pull data from `FengReport.compute` which the report screen already has.

### F3.4 Chapter-kind → visual mapping

In the report renderer:
- `kind === 'external_landform'` → first 1–3 annotated map tiles (from F4 swiper)
- `kind === 'flying_stars'` → `<FlyingStarsGrid>` from compute
- `kind === 'personal_fit'` → `<BaZhaiWheel>` from compute
- `kind === 'remediation'` → inline stickers based on vision JSON
  `形煞[].type` strings via `getFormShaIcon`
- Other chapters: text-only (no inline visual yet)

---

## 4. Pending — F1 ProCompassDial

### F1.1 Component build (in scenario-feng)

New `packages/scenario-feng/src/components/ProCompassDial.tsx`. SVG-based,
4 stacked layers (less is more per user direction — skip 64卦 / 28宿 / 60龙):

1. **天池** (compass needle, center) — reuse current needle
2. **后天八卦卦象环** — 8 visual trigram glyphs (☰☱☲☳☴☵☶☷)
3. **24山盘** — existing 24-mountain ring
4. **周天360°刻度环** — outermost, fine-grained degree ticks every 1° with
   labeled major ticks every 10°
5. **立极尺 mode** (toggle) — overlays a red crosshair at center, with the
   device pitch/roll readout shown alongside facing degree

Plus a "header strip" component:
- Left: 坐 (sit) / 向 (face) palace names + degrees
- Center: real-time live facing degree
- Right: 横 (pitch) ° / 竖 (roll) °

Reads device pitch/roll via `expo-sensors` `DeviceMotion.addListener` at 30 Hz.

### F1.2 Wire into feng-app + compass-app

- `feng-app/(tabs)/compass.tsx`: replace existing `BaguaCompassOverlay` import
  with `<ProCompassDial>`.
- `compass-app/(tabs)/index.tsx` (the satellite): same swap.

The simple `BaguaCompassOverlay` stays in scenario-feng exports for the
calibrator inline use case but the dedicated compass screens both upgrade.

---

## 5. Out of scope (defer, write ADRs only)

- **P2 Compass red-ocean**: Terrain Reader / Sundial candidate satellites.
  ADR draft only — no code until F1 + F3 land.
- **Yuán Name/Zodiac Match satellite** (filling the missing Yuán wedge).
  ADR draft only.
- **feng-app户型图 V2 (indoor analysis)** — keep on V2 trigger (≥500 paying or
  D30 ≥25 %). Phase H gets the report to "high-level master" tier for the
  external 巒頭 dimension; indoor is a separate ~3-month effort.

---

## 6. Validation gates per work item

- `bun typecheck` — 34/34 must remain green
- `bun test` — 578/578 (astro-core 537 + others) must remain green; new logic
  in `prefetch.ts` should get unit tests once we have a Mapbox sandbox
- `bun lint` — accept the 8 pre-existing failing packages (`ai-vision`,
  `feng-app`, `hexastral-api/app/web`, `scenario-feng/yuan`, `yuan-app`); new
  code must add zero net new lint failures

---

## 7. Manual / deploy-only follow-ups carried over from Phase F

These remain blocked outside the sandbox; track separately:

1. `wrangler r2 bucket create feng-maps feng-annotated`
2. `wrangler secret put MAPBOX_TOKEN GEMINI_API_KEY` (svc-feng)
3. Apple Developer bundle registrations: `com.hexastral.feng`,
   `com.hexastral.compass`
4. `eas init` for feng-app + compass-app
5. RevenueCat products per [feng-plan.md §7](feng-plan.md#7-pricing)
6. Designer assets: feng-app/compass-app icon+splash (墨青 #0F1E26 + 铜金 #B08D5B)
7. ja content reviewer ($2k budget)
8. **New for Phase H**: after F4.1 lands in main, run
   `cd apps/hexastral-api && bun db:generate` to capture
   `annotatedMapKeys` column, then `bun db:migrate:prod`
