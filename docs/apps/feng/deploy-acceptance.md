# Feng (風) — Deploy & Acceptance Checklist

Everything that must happen by hand to take Feng (incl. the D1–D4 pro-grade work)
from "code-complete + typecheck/test green" to "live + validated". CI does NOT
deploy (house rule) — these run locally via `wrangler` / EAS.

Companion to [fix-plan.md](./fix-plan.md) (Waves 1-3) and [pro-grade-plan.md](./pro-grade-plan.md)
(四维 D1-D4). Last updated **2026-07-08**.

---

## 0. Pre-flight (verify locally)

- [ ] `bun typecheck` green across astro-core, scenario-feng, hexastral-api,
      svc-feng, feng-app.
- [ ] `cd packages/astro-core && bun test` green (feng suites: flying-stars,
      patterns, combinations/extras, ba-zhai, ba-zhai-d2, form-li).
- [ ] `bun lint` clean for the touched workspaces.

## 1. Backend infra (one-time)

- [ ] R2 buckets exist: `wrangler r2 bucket create feng-maps` /
      `feng-annotated` (svc-feng dir).
- [ ] Queue exists: `bunx wrangler queues create feng-analyze` (hexastral-api).
- [ ] D1 migrations applied. Confirm `feng_sites / feng_reports / feng_jobs` tables present.
      Apply `0020_outgoing_dracula.sql` (`residence_type` column) before premium tier goes live.
- [ ] Apply `0021_soft_metal_master.sql` (`input_meta` column) before input-quality gates go live.

## 2. Secrets (svc-feng) — `cd services/svc-feng`

- [ ] `wrangler secret put MAPBOX_TOKEN` — public token, default scopes, NO URL
      restriction (server-side). See `.env.example`.
- [ ] `wrangler secret put GEMINI_API_KEY` — VLM (vision + street).
- [ ] `wrangler secret list` shows both.
- [ ] (Optional, gated) `wrangler secret put MAPILLARY_TOKEN` — ONLY after the
      legal + attribution gate in §6. Unset = street 形煞 off (safe).

## 3. Deploy

**Order** (premium tier): `svc-feng` → `hexastral-api` (incl. D1 `0020`) → `feng-app` EAS.

- [ ] `cd services/svc-feng && bun deploy` — ships `/prefetch`, `/terrain/profile`
      (DEM), `/street/sha` (Mapillary), `/maps`, `/annotate`, `/vision`,
      `/synthesize`.
- [ ] `cd apps/hexastral-api && bun deploy` — ships `DELETE /api/user/:id`,
      feng routes, the daily cron (annual refresh + `pruneStaleFengJobs`), and
      the enriched analyze pipeline (patterns / combinations / formLi / DEM /
      street / 月紫白 / single-purchase consume).
- [ ] Hit `https://<svc-feng>/health` → `secrets.mapboxToken/geminiKey: true`.

## 4. Mobile build (dev / TestFlight)

Feng uses custom native modules (purchases, google-signin, reanimated worklets,
secure-store) → **Expo Go won't work; a dev build is required**.

- [ ] `cd apps/feng-app && bun ios` (simulator dev build) or `bun ios:device`.
      App defaults to `https://api.hexastral.com` (deployed) — no config needed.
- [ ] EAS prod: `eas build --profile production --platform ios` (needs `eas init`
      projectId in app.json/eas.json; Apple `com.hexastral.feng`; RevenueCat
      products — see `docs/publish/README.md`).
- [ ] **Premium SKU (human)**: App Store Connect + RevenueCat create
      `hexastral_feng_premium` ($39.99 consumable); link to `feng_analysis_premium`
      entitlement; then flip `PREMIUM_SKU_PROVISIONED = true` in
      `apps/hexastral-api/src/lib/feng-pricing.ts` AND
      `apps/feng-app/lib/feng-pricing-client.ts`; redeploy API + ship new EAS build.

## 5. Smoke tests (after deploy — generate a NEW report; old reports lack the new fields)

Pick a real address **near terrain** (hills/coast) so DEM/砂 fires.

- [ ] Add site → **locate** (address + facing, 4-step flow) → building (pick residence type) →
      floorplan → review → Generate. Job completes (poll reaches `done`).
- [ ] **Premium tier**: flat/villa review shows ~$39.99 quote + street badge; apartment $9.99 + 1 floor plan max.
- [ ] **兼向**: review warns when facing near 24-mountain boundary; flying stars use 替卦.
- [ ] Report renders: 6 chapters, FlyingStarsGrid, 格局 chips, BaZhaiWheel.
- [ ] **D1**: 飞星 chapter shows 格局 (旺山旺向/双星会向…) + per-宫 form-li lines.
- [ ] **D1.4 月紫白**: annual_directions chapter text references this month's
      sectors (流月), not just 流年.
- [ ] **D2**: 命卦 chapter shows 宅命合参 verdict + 床/灶/门/书桌 placement.
- [ ] **D3 DEM**: server log `job.stage`/`terrain.profile.done` shows a `laiLong`;
      砂-side form-li verdicts present for a hilly site. Flat site → degraded (ok).
- [ ] **D4**: form-li 旺丁/旺财/破财 verdicts + 零正 + 格局救应 lines render.
- [ ] **Mapbox attribution** visible under report map swiper + facing tile.
- [ ] **Account deletion**: Profile → Delete account → confirm → signed out;
      re-login creates a fresh account; birth info / sites gone.
- [ ] **Single purchase**: non-Pro buys one analysis at the correct tier SKU
      (`feng_analysis` apartment / `feng_analysis_premium` flat·villa when provisioned) →
      succeeds → second site at higher tier is paywalled if under-tier purchase.
- [ ] **locale**: an `en` user gets an English report (not zh).

## 6. Mapillary street 形煞 — LEGAL GATE (before setting MAPILLARY_TOKEN)

- [ ] Legal sign-off that deriving 形煞 findings from Mapillary imagery complies
      with CC-BY-SA (share-alike + attribution).
- [ ] UI shows the attribution string (`compute.streetAttribution`: footer,
      external_landform chapter inline, share PNG) wherever Mapillary imagery was used.
- [ ] App Privacy declares **third-party imagery sent to Gemini** for street 形煞 (premium).
- [ ] Only then: `wrangler secret put MAPILLARY_TOKEN` + redeploy svc-feng.
- [ ] Smoke: urban site → street 形煞 appears as `near` 形煞 in 化解 chapter +
      formLi 化煞 verdict; attribution line shows.

## 7. App Store review gates

- [ ] Account deletion (§5) — Apple 5.1.1(v). ✅ implemented.
- [ ] Mapbox + (if on) Mapillary attribution shown — ToS.
- [ ] AI chat: content filtering + report mechanism (UGC/AI) — **not yet done**.
- [ ] "Not fortune-telling" framing consistent in-app (ASO already does it);
      no guaranteed-outcome / medical / financial claims in report copy.
- [ ] App Privacy: declare birth data + location collection.
- [ ] Permission strings present (NSLocation/NSMotion/NSPhotoLibrary) ✅;
      add NSCamera when AR/RoomPlan (V1.5) lands.

## 8. Deterministic acceptance — golden harness + staging smoke

**No external 风水师 gate** (locked in [closeout-plan.md](./closeout-plan.md) W1).
Correctness rests on沈氏 algorithms + [acceptance-standard.md](./acceptance-standard.md)
red-flags + CI golden tests; staging validates full vision/synthesis on device.

- [ ] `cd apps/hexastral-api && bun test src/lib/feng-golden.integration.test.ts` green
      (fixtures in `feng-golden-sites.ts`: 兼向/替卦, unknown build year, no floorplan, 煞组合 phase rules).
- [ ] `cd packages/astro-core && bun test` green (feng suites).
- [ ] Optional: `cd packages/astro-core && bun feng:samples` → spot-check MD against acceptance-standard.
- [ ] **录入铁闸 (staging)**: three floor-plan fixtures — (a) facing not confirmed →
      review blocked; (b) floor plan uploaded but north not dialed → blocked;
      (c) north vs facing >30° → blocked; direct POST without `facingConfirmed: true` → 400.
- [ ] **录入铁闸**: edit address without re-geocode → confirm step forces new coords;
      absurd pin offset (>2km) → API 400.
- [ ] Staging: apartment / flat / villa each one full report (vision + synthesis).

## What is NOT done (tracked in feng-pro-grade-plan.md)

- RoomPlan / 户型立极 (interior star placement) — V1.5.
- Draw-outline floor plan capture — V1.1 (not implemented; V1 = album upload only).
- Indoor room photography / `NSCamera` — out of V1 scope.
