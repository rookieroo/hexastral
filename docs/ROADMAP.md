# HexAstral Roadmap — handover document

> **Purpose**: this doc is the single source of truth for what's been built, what's
> queued, and how to continue. A fresh agent or engineer should be able to read
> this once and pick up exactly where the previous session stopped.
>
> **Last updated**: 2026-05-21 — Phase J shipped; Numerology→梅花 C-route done; Compass killed; Phase K (two-layer matrix) + Cycle + Chat L2/L3 queued as plan docs. **ADR-0009 direction locked**: hexastral-app omnibus → **retire**, new `fate-app` (命: 八字+紫微) replaces its natal surface — fate-app **K.1.2 built + verified** (apps/fate-app): client-side 八字+紫微 命盘, local birth capture, Me/optional-sign-in, funnel wired to the new **K.2 discovery endpoint** (`/api/discovery/recommendations`, live). K.4 LLM guard deferred to its first consumer. **2026-05-21**: K.2 funnel **telemetry** wired (`cross_app_discovery_tap` on every upsell tap → conversion measurable); **shared local-birth-draft** extracted to `@zhop/satellite-runtime` (de-dup, Cycle will reuse); chat plan **L4 corrected** (natal = recomputed from birth-info, not a stored reading). **2026-05-21**: Phase K **K.0 ADRs landed** — [ADR-0009](decisions/0009-two-layer-matrix.md) (two-layer matrix) created; ADR-0004 §1 brand matrix / ADR-0006 tiers (re-cut on monetization axis) / ADR-0007 (reverted) amended. **K.5 chat transfer shipped** — yuan-app (`pair`) + feng-app (`feng`) chat over core-ui `ReadingChatScreen`; server `chat.ts` gains the `'feng'` reading type; conversations scoped via `X-Target-App`. Chat-context-builder plan now unblocked. (feng paywall not built → non-Pro shows a Pro notice; server gate is source of truth.) **Chat plan server core shipped** — `reading-context-builder.ts` (L1 primary + L2 user brief + L3 cross-reading joins, natal recomputed via astro-core + L4 memory), svc-astro structured prompt (CC.5, primary-type-aware persona), `trimContextBundle` size guard (CC.6) + unit test. **CC.4** added a dedicated `cross_app_memory_enabled` column (migration `0001`, also drops the dead `compass_bearings` table) + `user_id`-indexed cross-target recall + yuan/feng settings toggle. Only CC.7's manual QA matrix remains; deploy svc-astro before hexastral-api.  
> **Local-only work**: [local-manual-checklist.md](local-manual-checklist.md)（EAS / Apple / RevenueCat / CF / 设计师 / 日语审校）。
>
> **2026-05-31 — V1-NARROWED**: V1 launch wave narrowed to **cycle → feng → yuan v2**.
> MingPan, numerology, and the V1.5 trio (Coincast / FaceRead / DreamRead) all
> **deferred** (frozen new dev, code retained, bundle IDs reserved). See
> [ADR-0019](decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md) for restart
> triggers and [ADR-0018](decisions/0018-hexastral-design-language.md) for the
> shared design language all V1 apps must adopt.

---

## Current phase (2026-05-31): V1-NARROWED Launch Wave

This section is the **post-Phase-K authoritative status**. All the historical
phase context below (Phase J / Phase K / Wave 0-4 / Chat plan / etc.) is
preserved as the build record but no longer drives weekly planning — the V1
wave does.

**Active scope** (in build order; ship order = build order):

- **cycle** (Tier-3 satellite, daily 黄历) — Sprint 1 done (no-tab `Stack`
  scaffold + `widget-kit-ios` + shared `SWIPE_TO_ME` contract + ming-pan
  migrated to consume it). Sprint 2 next: Today Free/Pro split + 4 specialized
  择日 drill-ins + Tier-1 features. `docs/sprints/cycle-sprint-plan.md`.
- **feng** (flagship, episodic 风水) — Sprint plan applies ADR-0018 (no tabs,
  `Stack`, gesture-to-Me, no ad slot, Discover disclosure). Greenfield from
  W2. `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Part 1.
- **yuan v2** (flagship, episodic 合婚) — Sprint plan applies ADR-0018 +
  multi-entity adaptation (chart pager for the N-partner model). Greenfield
  from W3. `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Part 2.

**Deferred** (PAUSED, V1.1 candidates — frozen new dev, code retained as
ADR-0018 reference, bundle IDs reserved, ASO metadata kept current):

- **MingPan** (was V1) — completion-highest app; serves as the ADR-0018
  design reference. Bundle ID `com.hexastral.mingpan` retained. Spin-up
  when restart triggers fire: days, not weeks.
- **numerology** (Meihua satellite, Phase K pivot) — Bundle ID retained.
- **Coincast / FaceRead / DreamRead** — already deferred per ADR-0017
  (V1.5 wave).

**Funnel model (temporary V1 override)**: peer-promote between the three
V1 apps (cycle ↔ feng ↔ yuan) in Me → Discover (collapsed). The ADR-0004
flagship-anchored model returns when MingPan resumes.

**Restart triggers + full deferral standard**: see
[ADR-0019](decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md).

---

## Active plans queue (post-Phase-J)

**Reality (2026-05-21): the three foundation plans are essentially code-complete** — Phase K
Waves 0–3 ✅, Cycle C.0–C.6 ✅, Chat code-complete (only CC.7 manual QA left). **The real
remaining work is LAUNCH** (§1 manual checklist: EAS / Apple / RevenueCat / ja) + the
hexastral-app deletion call — *not* new building. (The Naming track is **ON HOLD** — see below.)

- **[phase-k-plan.md](phase-k-plan.md)** (ADR-0009, ~2 weeks) — Two-Layer Matrix Restructure. Only Yuán + Fēng are flagships; FaceOracle Tier 2; the rest are Tier-3 funnels; dynamic discovery endpoint (K.2) + shared LLM guard (K.4); chat transfers to flagships (K.5).
- **[cycle-satellite-plan.md](cycle-satellite-plan.md)** (ADR-0010, ~2 weeks) — New 黄历 satellite. Personalized + AI-explained + reverse择日 + 4-locale + daily push. Engine mostly **reuses `astro-core`**; absorbs hexastral-app's dead personalized-almanac concept.
- **[chat-context-builder-plan.md](chat-context-builder-plan.md)** (~5 days) — Pro chat L2/L3 enrichment. User brief + cross-reading joins + opt-in cross-app memory. Gated **only** on K.5.
- **[naming-plan.md](naming-plan.md)** ([ADR-0011](decisions/0011-naming-product.md)) — 八字起名. **ON HOLD (2026-05-21)**: on reflection the moat is too narrow — a good name is *taste-first* (literary 美学 + 音韵 + 含义), which frontier LLMs commoditize, with 玄学/用神 only a minor seasoning. Kept for the reusable naming-plan §2 用神 analysis, which surfaced a **`geju` 从格/专旺格 用神 bug affecting Cycle's lucky-element** — ✅ **fixed 2026-05-22**: `astro-core/geju.ts` `recommendFavorableElement` now branches on geju type (专旺格 = 顺旺神, 忌官杀; 从格 = 顺所从之神, 忌印绶) instead of the inverted strength-only logic; 8 golden tests. Do not start Phase 1 without re-justifying vs "just ask an LLM."

- **[monetization-and-capabilities-plan.md](monetization-and-capabilities-plan.md)** ([ADR-0012](decisions/0012-matrix-freemium-monetization.md)) — **global monetization + capabilities** model + build roadmap. 3 subscription flagships (**fate / Yuán / Cycle** = Timeline + multi-layer chat); tiered per-use (Fēng high · Face medium · Coin/Dream/Numerology low) + chat everywhere; `universe_pro` bundle. **Server/engine for the 3 subs shipped + verified (2026-05-22)** — timeline engines + explain (fate & yuán) + chat budget mechanism. See the plan's **▶ Current status & handover** for the immediate next (repo typecheck cleanup · client timeline screens + push · IAP/entitlement migration).

### Global execution order (dependency-true)

```
Wave 0  K.0 ✅ ADR-0009 written + ADR-0004/0006/0007 amended (2026-05-21). ADR-0010 (Cycle)
              still pending — it is the Cycle plan's C.0, not part of K.0.
Wave 1  K.2 ✅ SHIPPED+verified — endpoint + hook + fate consumer + cross_app_discovery_tap telemetry.
              (deferred: DISCOVERY_CONFIG KV overlay; wiring the other 4 satellites.)
        K.4 ✅ module built (services/shared/llm-guard.ts) — Conservative-Mode decision contract +
              global budget cap + lifetime peak pass + growth events, unit-tested (6 cases).
              Wires into its first consumer (Cycle /cycle/explain).
Wave 2  K.1 ✅ fate-app K.1.2 BUILT+verified (八字+紫微 client compute, birth capture, Me, dynamic funnel).
        K.5 ✅ chat shipped — yuan-app (pair) + feng-app (feng) wrappers over core-ui ReadingChatScreen;
              chat.ts gains 'feng' type (2026-05-21) → Chat plan unblocked.
        K.3 ✅ DONE — faceoracle_pro wired (config/products + useEntitlements); /linked/faceoracle
              gated (402 unless entitled) + real Gemini Vision only when entitled; app teaser→unlock→full.
              Manual: create faceoracle products + entitlement in App Store Connect + RevenueCat.
Wave 3  Cycle ▣ C.1 ✅ DONE — astro-core 黄历 engine complete (建除十二神 节-based + 二十八宿 [anchor
              1998-03-15=房 verified] + 建除→宜忌 preset + 日冲煞) thin-wrapped at /api/cycle/day + /search;
              548 astro-core + 5 route tests green. C.2 ▣ cycle-app scaffolded (apps/cycle-app: Today/Month/Me
              + day detail + 择日 search + 4-locale; tokens/core-ui typecheck clean; full app tsc gated on bun install).
              C.3 ✅ personalization done (deterministic 对你而言 overlay: astro-core personalAlmanacOverlay + /api/cycle/day?birthDate= + PersonalCard).
              C.4 + C.4.5 ✅ done (svc-astro /cycle/explain + K.4-guarded /api/cycle/explain + GUARD_KV cache + ExplainSheet; 'cycle' share/chat types + context-builder branch).
              C.5 ✅ push done (local notifications: rolling 8am window + retro-check, deterministic, no LLM).
              C.6 ✅ ASO done (aso-metadata 4-locale within limits + privacy appendix live + screenshot brief). **Cycle C.0–C.6 feature-complete → Wave 4 unblocked.**
              Pre-launch follow-ups: C.1.7 ✅ 神煞宜忌 DONE 2026-05-22 (黄道黑道十二神 huangHeiDao + 彭祖百忌 pengZuTaboo in astro-core/almanac.ts, on DailyAlmanac.dayGod/pengZu + surfaced in /api/cycle/day; golden-tested vs 汉程黄历 2026-06-12 玄武黑道) + C.1.8 ✅ 节气精度 DONE 2026-05-22
              (replaced 寿星 ±1-day formula with truncated VSOP87 + 章动 + 光行差 apparent-solar-longitude + Newton crossing in new `astro-core/solar-longitude.ts`; `jieqi.ts` now returns precise instants/UTC+8 days, verified to the minute vs NAO authoritative 2024 table; fixes 大运起运 + 建除月建 day accuracy. note: the 'cycle' readingType/reportType enums are Drizzle text({enum}) = TS-only → NO D1 migration needed)
              · Chat ▣ code complete (CC.1–6 + size-guard test); only CC.7 manual QA matrix remains · K.3 ✅ done (entitlement + VLM gate + app flow; RC/ASC product setup = manual).
Wave 4  hexastral-app deletion ▶ UNBLOCKED — Cycle now covers 黄历 end-to-end (C.0–C.6 done). All
              omnibus surfaces are covered (命→fate ✅ · 緣→Yuán ✅ · 卦→CoinCast ✅ · 面相→FaceOracle ✅ ·
              黄历→Cycle ✅). Final deletion of apps/hexastral-app is a product call — phase-k-plan §0.1.1.
```

Single-thread fallback: `K.0 → K.2 → K.4 → K.5 → Chat → K.1 → K.3 → Cycle → retire hexastral`.

> **hexastral-app decision (open):** its ASO + tabs sell 命/星/六爻/合婚/面相/黄历 at once —
> overlapping Yuán (合婚), Coin Cast (六爻), FaceOracle (面相), and Cycle (黄历) simultaneously,
> and its personalized-almanac is already dead code. **Recommendation: retire it** — let
> `fate-app` be the clean 八字 satellite and redistribute the rest to existing matrix members.
> The omnibus shape contradicts the satellite-funnel matrix (ADR-0004 §2). Final kill is a
> product call — detailed in [phase-k-plan.md](phase-k-plan.md) §0.1.1.

Completed (post-Phase-J):
- ✅ **Numerology → 梅花** (2026-05-20) — engine pivoted from Western Pythagorean to Shao Yong 梅花易数; ASO repositioned as "Eastern numerology" loanword strategy. See git log + numerology-app/aso-metadata.json.
- ✅ **Compass kill** (2026-05-20) — apps/compass-app deleted, /api/compass route + compassBearings table dropped, ADR-0003 reverted, ADR-0004 §1/§2 + ADR-0006 amended.

---

## 0. Where we are right now

PR #1 (commit `e8b8839b`) landed Phase A1 + A2 + B. Phases C + D shipped
2026-05-15. Phase E Weeks 1–5 shipped 2026-05-16 (see §4). Current repo state:

```
Active matrix (post-ADR-0009 two-layer):
  1 API        — hexastral-api (Cloudflare Worker + Hono + D1)
  2 web        — hexastral-web (Next.js on CF), useone-tech (LLC corp site)
  2 flagships  — yuan-app (緣), feng-app (風)                  ← Tier 1, IAP
  1 Tier-2     — face-oracle-app (面相, high-cost VLM, auth + IAP)
  5 Tier-3     — fate-app (命: 八字+紫微) ← NEW, K.1.2 built,
                 coin-cast-app, dream-oracle-app, numerology-app (梅花),
                 cycle-app (黄历 — C.0–C.6 feature-complete: engine + app + personalization + AI-explain + push + ASO; install-gated)
Retiring / stale (not in matrix):
  hexastral-app — 命緣卦道 omnibus; RETIRED by ADR-0009, deleted in Phase K Wave 4
                  once fate-app + Cycle cover its surfaces. Still on disk.
  compass-app   — killed 2026-05-20; directory DELETED (verified gone 2026-05-21).
8 services     — svc-{astro,signal,notify,geocode,mailer,admin-notify,tail,feng}
20 packages    — domain (astro-core inc. feng/, astro-i18n), tokens, clients,
                 scenarios (yuan + feng + dream), ui (core-ui; legacy ui + ui-native pending delete §6.5),
                 satellite-* (runtime + ui), portfolio-* (client + posters),
                 ai-vision, ddl-client, growth-funnel, logger, email,
                 expo-env-loader
1 tooling      — typescript-config
```

Brand matrix — two-layer model ([phase-k-plan.md](phase-k-plan.md); ADR-0009 to be written in
Wave 0, supersedes the 3-flagship model of ADR-0002/0004/0007):

```
HexAstral (master / LLC publisher)
├── Flagships (Tier 1 — IAP)
│   ├── Yuán / 緣  — relationship & compatibility
│   └── Fēng / 風  — feng-shui
├── Tier 2 (high-cost, auth + IAP)
│   └── Face Oracle (面相) — VLM inference, trial-or-paid
└── Tier 3 (anonymous ASO funnels → upsell to Yuán/Fēng; no IAP)
    ├── fate-app (命 — 八字 + 紫微; replaces retired hexastral-app)
    ├── Coin Cast (六爻), Dream Oracle, Numerology (梅花)
    └── Cycle (黄历 — feature-complete C.0–C.6; install-gated)
```

---

## 1. Local manual setup (human-only — still open)

Phases C–F **code** has largely shipped; this section is **not** "before Phase C"
anymore. Use it as a pre-launch checklist on a machine with Bun, Cloudflare, Apple
Developer, and EAS access.

**Canonical list (Chinese TL;DR + tables)**: [local-manual-checklist.md](local-manual-checklist.md).

### 1.1 Install + typecheck

```bash
bun install
bun typecheck           # should be green; fix any issues in scenario-yuan first
bun lint
bun test
bun check-deps
```

### 1.2 D1 database reset

```bash
cd apps/hexastral-api

# 1. Delete + recreate D1
bunx wrangler d1 delete hexastral-db --remote
bunx wrangler d1 create hexastral-db
# Copy new database_id into apps/hexastral-api/wrangler.jsonc

# 2. Generate baseline migration (this fills the empty migrations/ dir)
bun db:generate                # → migrations/0000_baseline.sql
bun db:migrate:prod            # apply to new D1
bun deploy

# 3. Smoke test
curl https://api.hexastral.com/api/health
```

### 1.3 CF dashboard cleanup

In Cloudflare dashboard, delete:

- Worker `svc-fortune`
- Queue `svc-fortune-batch`
- Queue `svc-fortune-batch-dlq`
- KV `FORTUNE_CACHE`

### 1.4 yuan-app provisioning

```bash
cd apps/yuan-app
eas init                       # → fills EAS_PROJECT_ID
# Paste ID into app.json `extra.eas.projectId` + .env
```

Then in external dashboards:

- Apple Developer → Identifiers → register `com.hexastral.yuan`
- App Store Connect → create app with locale-specific listing names (see
  [ADR-0001](decisions/0001-yuan-naming.md))
- RevenueCat → create Yuán app + products:
  - `hexastral_yuan_pro_monthly`
  - `hexastral_yuan_pro_annual`
- Paste iOS public key into yuan-app `.env`

### 1.5 Web routes smoke

```bash
cd apps/hexastral-web && bun dev
# Visit:
#   /en/yuan       → landing
#   /zh/yuan       → landing (zh-Hans)
#   /yuan/invite/<any-token>  → should hit /api/bonds/invite/:token/info
#   /hehun/abc123  → should 301 to /yuan/invite/abc123
```

---

## 2. Phase C — hexastral-app polish + AI memory (3–6 weeks) — ✅ shipped

**Goal**: take the existing 命緣卦道 flagship from "B-end form-heavy" to
"consumer warmth" without a full UX redesign. Three single-point upgrades, then
make the existing `/chat` route actually leverage `portfolio-memory`.

### Done (2026-05-15)

- C.1 — Birth onboarding refactored into a 5-screen swipe-paged flow under
  `apps/hexastral-app/app/(birth)/`: intro (`birth-info`) → date → time
  (shichen grid + skip) → gender → place → review. Stack `_layout` with iOS
  `slide_from_right`, `expo-haptics` light-tap on advance. New
  `lib/birthDraft.ts` accumulates inputs in AsyncStorage; review screen
  preserves the existing PUT `/api/user/:userId/birth-info` payload + calls
  `/api/onboarding/bootstrap` to warm the chart immediately. New
  `components/onboarding/ProgressIndicator.tsx` ports the yuan-app pattern.
  i18n keys in all 9 locales (zh/zh-Hant/ja/en translated; ko/de/es/vi/th
  fall back to English per the i18n hook contract).
- C.2 — Backend: added optional `goldenLine` (≤50 chars CJK / ≤30 words latin)
  to `services/svc-astro/src/schemas/signal-output.ts`, prompt updated with
  rule #8. Mirror in `apps/hexastral-api/src/routes/signal.ts` consumer
  schema + `apps/hexastral-app/lib/hooks/useSignalQuery.ts`.
  Frontend: new `components/fate/FateHomeHero.tsx` — 2:3 photographable area
  with concentric SVG rings (jieqi label, day pillar, lunar phase disc),
  "今日金句" rendered hero-first, reanimated v4 crossfade on `dayKey` rollover.
  Wired into `(tabs)/index.tsx` between masthead and the existing
  `DailySignalCard` (kept below the fold so dense data still scrolls).
- C.3 — `components/sharing/ShareChapterButton.tsx` (cinnabar/gold pill,
  auto-themes) wired into `(tabs)/report/[slug].tsx` (per-chapter),
  `detail/yiching/[id].tsx`, and `detail/stellar/[id].tsx` (replaces the
  inline `Share.share` URL guess with a real `/api/share` snapshot →
  hexastral-web `/report/[shareId]/page.tsx` OG link). i18n keys across all
  9 locales. Server-side share `reportType` enum extended with `'numerology'`
  pre-emptively for D.2.
- C.4 — `apps/hexastral-api/src/routes/chat.ts` now calls
  `searchPortfolioReadingMemory` (target = 'hexastral' for flagship readings,
  inherited from `targetApp` for satellites) when `users.portfolioMemoryEnabled`,
  forwarding `memoryContext` to `services/svc-astro/src/routes/chat.ts` which
  injects it under a `<memory>...</memory>` block. Extended
  `PortfolioMemoryTargetApp` to include `'hexastral'` + added prefix copy +
  added `buildHexastralMemoryDocument` builder for future indexing of
  flagship readings (indexing not wired yet — flagship memory store is
  empty until backfilled). New `apps/hexastral-api/src/lib/portfolio-memory.test.ts`
  verifies `user_target` filter scoping (cross-user safety).
  `apps/hexastral-api/package.json` `test` script broadened to `bun test 'src/**/*.test.ts'`.

### 2.1 Birth onboarding form-as-conversation (2 weeks)

**Where**: `apps/hexastral-app/app/(birth)/`

Refactor the multi-field birth form into a swipe-paged form-as-conversation,
**reusing the pattern from `apps/yuan-app/app/(onboarding)/`**.

Steps:

1. Read `apps/hexastral-app/app/(birth)/` to find current screens.
2. Create one screen per question: name → date → time (skip option) → place →
   gender (if needed).
3. Use the same `ProgressIndicator` pattern (port to hexastral-app's theme).
4. Animations: 300ms spring `slide_from_right`; `expo-haptics` light tap on advance.
5. Validate behaviour matches today's: same backend `POST /api/onboarding/bootstrap`
   payload at the end.

**Acceptance**: A returning user with no birth info goes from app open to chart
in ≤ 90 seconds with no scroll-to-bottom forms.

### 2.2 Home tab `(tabs)/index.tsx` hero + daily golden line (1–2 weeks)

**Where**: `apps/hexastral-app/app/(tabs)/index.tsx`

The 命 Fate tab is the daily-return surface. Today it's information-dense; turn
the top into a single hero visual + one "今日金句" + small data row beneath.

1. Hero visual: a 2:3 area at top showing today's solar term / lunar phase /
   day pillar. Use SVG (not raster) so it scales clean.
2. Today's golden line: 1–2 sentences AI-generated from existing svc-signal
   data. Add to `/api/signal/today` if not already a field.
3. Subtle motion: hero crossfades when day rolls over.
4. Below the fold: the existing dense data continues.

**Acceptance**: home tab opens in < 600ms cold and shows a hero-first layout that
photographs well for App Store screenshots.

### 2.3 Report page chapter sharing (2 weeks)

**Where**: `apps/hexastral-app/app/(tabs)/report/[slug].tsx` and friends

Adopt the `@zhop/scenario-yuan` share pattern across all hexastral-app reports:

1. Add a cinnabar 緣-like share button at the end of each report chapter (per
   reading type — natal, stellar, yiching).
2. Capture single-image PNG via `react-native-view-shot` against a new
   `ShareableChapterCard`-style template per scenario (or extend the existing
   `@zhop/portfolio-posters` package).
3. Push share intent through `expo-sharing`.
4. Server side: hit `POST /api/bonds/:id/share` (already exists) or extend
   `/api/share` for non-pair reports.

**Acceptance**: every report has a one-tap "save card to share" that produces a
9:16 PNG with brand mark + golden line; clipboard URL points to a public
`hexastral.com/report/<id>` page that has OG image.

### 2.4 `/chat` consumes `portfolio-memory` (1–2 weeks)

**Goal**: make "更了解用户" real. Today the `/chat` route gets the user's
recent reading IDs; have it retrieve relevant memory snippets and inject them
into the system prompt.

Steps:

1. Read `apps/hexastral-api/src/routes/chat.ts` and
   `apps/hexastral-api/src/lib/portfolio-memory.ts`.
2. On each chat turn, call `searchPortfolioReadingMemory(userId, userMessage)`
   with match threshold 0.35, max 5 items.
3. Inject the matches into the system prompt under a `<memory>` section.
4. Make sure `userTargetKey` scoping prevents cross-user leakage (test with two
   users + same query).
5. Add a unit/integration test in `apps/hexastral-api/src/lib/portfolio-voice.golden.test.ts`
   covering: "what did I ask about my career last month?" → memory hit injected.

**Acceptance**: in chat, asking "What's my element again?" or "Remember when I
asked about X?" produces an answer that references the right past reading
without the user spelling it out.

---

## 3. Phase D — Numerology satellite + web landing template (3–4 weeks) — ✅ shipped

**Goal**: validate "1–2 weeks to ship a satellite" by building Numerology
end-to-end; produce a turbo generator template so coin-cast / face-oracle /
dream-oracle can be retroactively given web landing pages with the same shape.

### Done (2026-05-15)

- D.1 — `apps/numerology-app/` scaffold: package.json (mirrors coin-cast),
  app.json (`com.hexastral.numerology`), eas.json (PROJECT_ID placeholder),
  app.config.cjs, babel/metro/tsconfig, Stack `_layout`, screens (`index`,
  `compute`, `result`, `settings`), `lib/api.ts` calls
  `POST /api/numerology/compute`, `lib/i18n.ts` English-only at v0.1
  (extension shape ready for zh/ja), `lib/theme.ts`, `lib/growth-config.ts`
  (target `numerology`, RC product IDs `numerology_pro_monthly` /
  `numerology_pro_annual`), `components/NumerologyResultCard.tsx` with
  master-number badge, `assets/README.md` designer brief.
- D.2 — Backend: new `apps/hexastral-api/src/lib/numerology.ts` (deterministic
  Pythagorean compute — Life-Path / Birthday / Expression / Soul-Urge /
  Personality / Personal-Year, master numbers 11/22/33 preserved during
  reduction). `apps/hexastral-api/src/lib/numerology.test.ts` covers the
  reduction edge cases + Steve Jobs / Einstein / sample-name vectors. New
  route `apps/hexastral-api/src/routes/numerology.ts` mounted at
  `/api/numerology/compute` (public — no signin needed; powers the satellite
  *and* the web demo). `'numerology'` added to:
  `conversations.readingType` enum, `sharedReports.reportType` enum, and
  the share route Zod schema.
- D.3 — `apps/hexastral-web/app/[locale]/numerology/page.tsx` landing
  (numeric grid hero) + `apps/hexastral-web/app/[locale]/numerology/calculate/`
  page + client (free in-browser calculator hitting
  `/api/numerology/compute`). en/zh/tw/ja landing copy; en/zh calculator
  copy. No per-id result page yet — calculation is cheap and re-runnable, so
  re-render in place keeps the URL clean for SEO.
- D.4 — Backfill landings + try pages for the existing satellites:
  - `apps/hexastral-web/app/[locale]/coin-cast/{page.tsx, try/page.tsx, try/client.tsx}`
    (try page hits `/api/portfolio` with `target: coincast`).
  - `apps/hexastral-web/app/[locale]/dream-oracle/{page.tsx, try/page.tsx, try/client.tsx}`
    (target `dreamoracle`).
  - `apps/hexastral-web/app/[locale]/face-oracle/{page.tsx, try/page.tsx}`
    (try is informational — web has no on-device photo guarantee, DDL
    handoff to iOS).
  - All three landings share `apps/hexastral-web/app/[locale]/_satellite/SatelliteLanding.tsx`
    (one component to keep them visually consistent).
- D.5 — `bun gen satellite` generator at `turbo/generators/config.ts`.
  Prompts: `slug`, `name`, `bundleSuffix`, `glyph`. Scaffolds the satellite
  app + the matching `hexastral-web/app/[locale]/<slug>/{page,try/page,try/client}`
  routes. End-of-run prints the manual follow-up checklist
  (eas init, Apple bundle ID, RevenueCat products, designer assets).
  Templates under `turbo/generators/templates/{satellite,web}/`.

### 3.1 `apps/numerology-app` (1–2 weeks)

Follow the same shape as `apps/yuan-app` but **as a satellite** (uses
`@zhop/portfolio-client` + `@zhop/satellite-runtime` + `@zhop/satellite-ui`,
not scenario-yuan).

Inputs: birth date (required) + full name (required for name-number calcs).
Output: life-path number, expression number, soul-urge number, personal-year
forecast. Algorithm is deterministic (digit sums) — no LLM needed for v1; AI
polish in v1.5.

**Acceptance**:
- TestFlight build under `com.hexastral.numerology`
- 4-locale support: en / zh / zh-Hant / ja
- IAP: subscription `hexastral_numerology_pro_monthly`

### 3.2 Backend additions to `hexastral-api`

- `apps/hexastral-api/src/routes/numerology.ts` — `POST /api/numerology/compute`
- `apps/hexastral-api/src/lib/prompts/numerology.ts` — only for AI-augmented
  explanations (v1.5)
- Add `'numerology'` to `readingType` enum in `schema.ts`

### 3.3 hexastral-web `/[locale]/numerology/` routes

Mirror the structure under `/[locale]/yuan/`:
- `/numerology` — landing
- `/numerology/calculate` — basic web calculator (no signup)
- `/numerology/result/[id]` — public shareable result

### 3.4 Backfill web landings for existing satellites

For each of coin-cast / face-oracle / dream-oracle, add:
- `apps/hexastral-web/app/[locale]/<slug>/page.tsx` — landing
- `apps/hexastral-web/app/[locale]/<slug>/try/page.tsx` — free demo
- DDL handoff CTA to App Store

### 3.5 Turbo generator (`bun gen satellite`)

**Where**: `turbo/generators/config.ts`

Add a `satellite` generator that scaffolds:
- `apps/<slug>-app/` directory with package.json, app.json, eas.json, lib/, app/
- `apps/hexastral-web/app/[locale]/<slug>/` web routes
- README

**Acceptance**: `bun gen satellite --slug foo --name "Foo Oracle"` produces a
buildable scaffold; running `bun typecheck` succeeds.

---

## 4. Phase E — Fēng / 風 (feng-shui flagship V1)

**Full plan in [docs/feng-plan.md](feng-plan.md).** Roadmap-level summary only here.

- Scope expanded from earlier "personal feng-shui only" to **personal + map-based
  外巒頭 (external landform) analysis** via Mapbox satellite + Gemini Vision.
  6-chapter report through ChapterPager. Premium pricing tier (one-shot $59 +
  pro subscription).
- **Markets V1**: US, Japan, Singapore, Malaysia. Mainland China deferred.
- **Languages V1**: en, zh-Hant, zh, ja. ms in V1.1.
- **Brand-matrix change**: spawn `Compass` as a new satellite (`apps/compass-app`)
  acting as top-of-funnel for Fēng. ADR-0003 written.
- **Timeline**: 6 weeks aggressive, week-by-week in [feng-plan.md §11](feng-plan.md#11-phase-e-timeline-6-weeks-aggressive).
- **Existing SEO seeds** at `apps/hexastral-web/app/[locale]/feng-shui/[slug]/`
  301-redirect to `/feng` on launch — keep them indexed in the meantime.

### Done — Week 1 (2026-05-15)

- [docs/decisions/0003-compass-satellite.md](decisions/0003-compass-satellite.md) —
  Compass enters satellite tier with CJK alias 羅; funnel + pricing locked.
- [docs/feng-plan.md](feng-plan.md) — full 16-section plan; the 5 open
  questions in §13 resolved (Mapbox, Gemini 2.5 Pro Vision, A/B for tone
  post-launch, anonymous Compass, single-shot web preview).
- `packages/astro-core/src/feng/` — deterministic compute primitives
  (mobile-runnable so Compass works offline):
  `twenty-four-mountains.ts` (24山 lookup + 三元龙 + 阴阳 + 洛书),
  `flying-stars.ts` (元运 / 运盘 / 山盘 / 向盘 / 年紫白 / 旺衰),
  `ba-zhai.ts` (命卦 + 东西四命 + lucky/unlucky + fit scoring).
  84 golden tests including 八运子山午向 "双星会向到向首" published case.
- `packages/scenario-feng/` — shared types scaffold (FengSite, FengReport,
  ShaObservation, etc.). Hooks/components placeholders for Week 4-5.

### Done — Week 2 (2026-05-15)

- `apps/compass-app/` — standalone Compass satellite Expo app:
  - `useHeading()` uses `Location.watchHeadingAsync` for native iOS
    true-heading + declination (no JS WMM library required for V1).
  - `CompassDial.tsx` — SVG 24山 ring with rotating dial.
  - 4 locales (en / zh / zh-Hans / ja) via inline `lib/i18n.ts`.
  - Deep-link CTA into Fēng (`feng://new-site?facing=...`) with App Store
    fallback for unverified installs.
- `apps/hexastral-web/app/[locale]/compass/`:
  - `page.tsx` — landing via shared `SatelliteLanding`, glyph 羅
  - `use/` — browser `DeviceOrientation` compass with iOS Safari permission flow
  - `learn/page.tsx` — long-form magnetic-declination SEO explainer (4 locales)
- `services/svc-feng/` — Cloudflare Worker scaffold with Hono:
  - `POST /maps/render` — Mapbox Static Images proxy with R2 cache
    (SHA-1-keyed canonicalized requests, 30-day TTL)
  - `POST /annotate` — pass-through stub (resvg-wasm composition Week 3)
  - `POST /vision/analyze` + `POST /synthesize` — Zod-validated stubs
  - Mapbox isolated in `src/lib/mapbox.ts` (single-file replacement seam)
- Workspace validation: 35/35 typecheck clean, 537/537 astro-core tests pass.

Manual follow-ups blocked outside the sandbox (carry to deploy day):

1. `cd apps/compass-app && eas init`
2. Apple Developer → register `com.hexastral.compass`
3. RevenueCat → `hexastral_compass_pro_monthly` ($1.99) + `hexastral_compass_pro_lifetime` ($19.99)
4. Designer → `apps/compass-app/assets/{icon,splash}.png` (墨青 #0F1E26 + 铜金 #B08D5B + 羅)
5. `wrangler r2 bucket create feng-maps feng-annotated`
6. `wrangler secret put MAPBOX_TOKEN GEMINI_API_KEY` (svc-feng)

### Done — Week 3 (2026-05-15)

- D1 schema additions in `apps/hexastral-api/src/db/schema.ts`:
  `feng_sites` (lat/lng/facing/buildYear ladder + soft-delete),
  `feng_reports` (immutable snapshot of vision + compute + chapters JSON),
  `feng_jobs` (orchestrator state machine, `stage ∈ maps|vision|compute|synthesis|done|failed`),
  `compass_bearings` (pro-tier log). `'feng'` added to
  `conversations.readingType` + `sharedReports.reportType` enums.
- `hexastral-api` route surface live:
  - `POST/GET/PATCH/DELETE /api/feng/sites[/:id]` — CRUD with HMAC auth + per-user scoping
  - `POST /api/feng/sites/:id/analyze` — enqueue async job, returns `{ jobId }` (202)
  - `GET /api/feng/jobs/:id` — polling endpoint returns stage + progress + populated `report` once done
  - `GET /api/feng/declination` — public WMM-2025 grid lookup (V1 markets: US/JP/SG/MY + TW/HK)
  - `POST /api/compass/log` + `GET /api/compass/logs` — pro-tier bearing log
- Orchestrator at `apps/hexastral-api/src/lib/feng-analyze.ts` runs the
  4-stage pipeline inside `c.executionCtx.waitUntil`: renders 3 satellite
  tiles (close/mid/wide) → annotates each → calls `/vision/analyze` →
  computes 玄空飞星 + 八宅 locally via `astro-core/feng` → calls
  `/synthesize` → persists `feng_reports` row. Failures land in
  `feng_jobs.errorMessage` so the client can retry.
- `services/svc-feng` upgrades:
  - `@resvg/resvg-wasm` added; new `src/lib/overlay.ts` builds an SVG that
    embeds the base PNG via data URI + draws the 24山 ring, 8 bagua wedges,
    cardinal markers, and sit/face/door arrows. Rasterized via resvg,
    written to `feng-annotated` R2 bucket. On wasm-init failure the route
    falls back to passthrough so the rest of the pipeline can proceed.
  - `SVC_FENG` service binding wired into `hexastral-api/wrangler.jsonc`
    and `infra-types.ts`.
- Workspace validation: 35/35 typecheck clean, 578/578 tests pass.

Manual follow-ups carried forward (deploy day):

1. `apps/hexastral-api`: `bun db:generate` to capture the new feng + compass
   tables in a migration, then `bun db:migrate:prod`.
2. `services/svc-feng`: `wrangler secret put MAPBOX_TOKEN` + create R2
   buckets `feng-maps` and `feng-annotated` (per Week 2 follow-ups).
3. After Mapbox token is live, smoke test via:
   ```
   curl -X POST https://api.hexastral.com/api/feng/sites \
     -H 'X-Signature: ...' -H 'content-type: application/json' \
     -d '{"name":"自宅","lat":35.6762,"lng":139.6503,
          "formattedAddress":"...","facingDegTrue":180,
          "magneticDeclination":-7.5,"buildYearAccuracy":"unknown"}'
   ```

### Done — Week 4 (2026-05-15)

- `apps/feng-app/` — flagship Expo scaffold (`com.hexastral.feng`):
  - Configs: `package.json` (mirrors yuan-app deps + adds expo-location +
    expo-sensors), `app.json` (bundle id, location/motion plist strings,
    privacy manifests, expo-router + secure-store plugins), `app.config.cjs`
    (registers expo-env-loader), `eas.json`, `babel.config.js`,
    `metro.config.js`, `tsconfig.json` (extends @zhop/typescript-config)
  - Lib: `auth.tsx` (provisions `feng_user_id` via POST /api/user),
    `hmac.ts` (Web Crypto HMAC-SHA-256 with `feng_device_secret`),
    `client.tsx` (`FengClientGate` wrapping `FengClientProvider`),
    `config.ts`, `i18n.ts` (en/zh-Hans/zh-Hant/ja string table),
    `theme.ts` (墨青 + 铜金 palette, light default for report reading,
    `useFengTheme` hook), `siteDraft.ts` (AsyncStorage accumulator with
    `isDraftReady` guard)
  - Screens:
    - `app/_layout.tsx` — root Stack with `GestureHandlerRootView` +
      `AuthProvider` + `FengClientGate` + animated BootSplash glyph
    - `app/index.tsx` — boot redirect to (tabs)
    - `(new-site)/` 4-step stack: address (text + "use current location"
      via expo-location reverseGeocode) → facing → building → review
    - `(tabs)/_layout.tsx` — 4-tab bottom nav with lucide icons
    - `(tabs)/index.tsx` — sites home with empty state + pull-to-refresh
    - `(tabs)/compass.tsx` — in-app compass mirror (ink-teal dark, shared
      `BaguaCompassOverlay`, deep link to Compass satellite)
    - `(tabs)/readings.tsx` — past reports listing
    - `(tabs)/profile.tsx` — birth-info gap + sign out
    - `(report)/[siteId].tsx` — vertical chapter scroller; analyze CTA
      when no report exists
  - `components/ProgressIndicator.tsx` — 4-segment dash with brand accent
  - `assets/README.md` — designer brief (icon + splash specs)
- `packages/scenario-feng/` filled with the real surface:
  - `context.tsx` — `FengClientProvider` + `useFengClient` (mirror of yuan)
  - `lib/feng-api.ts` — hand-typed RPC façade (Hono `hc<AppType>()` depth
    issue same as Yuán's `yuan-bonds-api`; wrappers cover sites + jobs +
    declination + compass log)
  - Hooks: `useFengSiteList`, `useFengSite`, `useCreateSite`,
    `useAnalyzeJob` (handles enqueue + 800ms poll + 5min hard cap +
    cancellation on unmount), `useDeclination`
  - Components: `BaguaCompassOverlay` (24山 ring + 8 bagua wedges, shared
    between Compass + Fēng), `FacingCalibrator` (the hero screen — drags
    via react-native-gesture-handler Pan + Reanimated worklet → angle →
    onChange; magnetometer initial via the parent screen)
  - `types.ts` extended with `FengJobResponse` + `FengSiteWithLatestReport`
- Hero screen — FacingCalibrator (3-day budget per §11 risk table) shipped:
  drag the gold arrow to point at the building's front; the cinnabar 坐
  arrow tracks +180°; tap "Use my compass" to snap to magnetometer reading;
  the bagua + 24山 ring + N/E/S/W markers stay world-locked.
- Workspace validation: 36/36 typecheck clean, 578/578 tests pass.

Manual follow-ups carried forward (deploy day):

1. `cd apps/feng-app && eas init` → fills `EAS_PROJECT_ID` in `app.json`
   + the four slots in `eas.json`
2. Apple Developer → register `com.hexastral.feng`
3. App Store Connect → create Feng app + regional listings (en/zh-Hant/zh/ja)
4. RevenueCat → products per [feng-plan.md §7](feng-plan.md#7-pricing):
   `hexastral_feng_site` ($59), `hexastral_feng_pro_monthly` ($19.99),
   `hexastral_feng_pro_annual` ($149), `hexastral_feng_annual_refresh` ($19)
5. Designer → `apps/feng-app/assets/{icon,splash}.png` (墨青 + seal-script 風)

### Done — Week 5 (2026-05-16)

- Real Gemini 2.5 Pro Vision wired into `services/svc-feng/src/routes/vision.ts`.
  New `src/lib/gemini.ts` (shared Gemini client) + `src/prompts/vision.ts`
  (structured 外巒頭 analysis prompt). Zod validation with retry x2;
  degrades gracefully if vision fails.
- Gemini 2.5 Pro synthesis in `src/routes/synthesize.ts` + `src/prompts/synthesis.ts`.
  Traditional 风水師 voice, 6-chapter structured output. Uses Gemini (not Claude)
  for V1 — single-secret deploy simplicity; Claude swappable via A/B framework.
- Portfolio-memory injection: `feng-analyze.ts` calls
  `searchPortfolioReadingMemory` before synthesis, forwarding context to enrich
  the report with prior-reading continuity.
- Per-chapter share buttons: `ShareFengChapterButton` in feng-app,
  `reportType: 'feng'` added to `/api/share` route. 4-locale i18n.
- Report screen upgraded with CJK chapter labels + share affordance.
- `@google/genai` added to svc-feng. `feng-client.ts` types updated with
  full structured vision/synthesis interfaces.
- See [feng-plan.md §17](feng-plan.md#17-progress-log) for detailed deltas.

### Queued — Phase F (next, supersedes Week 6 feng-plan scope)

After the Week 5 AI pipeline shipped, a deep matrix + API + UI audit produced
a strategic rework — see [docs/phase-f-plan.md](phase-f-plan.md) and
[ADR-0004](decisions/0004-satellite-funnel-pattern.md).

Phase F (8 weeks aggressive) tackles three execution gaps before any launch:

1. **Consolidation, not expansion.** All 8 apps kept; each satellite gets a
   locked ASO term, a distinct brand color, and an explicit funnel into a
   flagship (per ADR-0004). No new apps in Phase F.
2. **Design system actualization.** New `@zhop/core-ui` shared primitive
   package (Button, Card, Text, Pill, EmptyState, LoadingSkeleton, ErrorState)
   plus motion + elevation tokens in `@zhop/hexastral-tokens`. Every app
   consumes these; app-local theme files deprecated.
3. **API normalization.** Shared `{ ok, data, meta }` envelope, ID naming
   sweep, schema registry, granularity collapse (onboarding, signal, bonds),
   prompt centralization to svc-astro, shared `@zhop/ai-vision` package
   extracted from svc-feng.

Phase F shipped deliverables (2026-05-16):
- **Week 1** — strategy + tokens:
  - `packages/hexastral-tokens` extended with `motion.ts`, `elevation.ts`,
    `satellites.ts` (locked palettes for compass / coin-cast / face-oracle /
    dream-oracle / numerology).
  - `packages/core-ui` scaffolded — V1 primitives (Button, Card, Text, Pill,
    Divider, EmptyState, LoadingSkeleton, ErrorState) + theme provider +
    motion helpers (usePressScale, useShimmer) + useHaptic hook.
  - [ADR-0004](decisions/0004-satellite-funnel-pattern.md) — matrix locked
    at 3 flagships + 5 satellites with funnel pattern, ASO assignment, and
    90-day sunset criteria.
- **Week 2** — first migrations + shared backend infra:
  - **yuán-app** is the canonical core-ui migration reference. Root wrapped in
    `<CoreUIProvider brand="yuan" mode="light">`; bond list + report screens
    consume `<Card>` / `<EmptyState>` / `<ErrorState>`. Editorial typography
    (`yuanType`) and gold-underline CTAs (`yuanPresets.ctaText`) intentionally
    preserved.
  - **`@zhop/ai-vision`** extracted from svc-feng. Shared Gemini client +
    R2 cache + `withZodRetry` envelope. svc-feng's vision + synthesize routes
    refactored to consume it; face-oracle's eventual pipeline will share the
    same primitives.
  - **API response envelope primer**:
    `apps/hexastral-api/src/lib/api-response.ts` (`ok` / `err` / `jsonOk` /
    `jsonErr` helpers + `ApiErrorCode` registry) plus
    `apps/hexastral-api/src/lib/schemas/common.ts` (shared Zod schemas for IDs,
    locale, pagination, birth, geo). `GET /api/feng/declination` migrated as
    canonical proof.
  - [`docs/phase-f-migration-notes.md`](phase-f-migration-notes.md) — living
    doc tracking per-app migration decisions, core-ui gaps surfaced, and the
    copy-paste checklist for migrating each remaining app.
- **Week 3** — feng-app + API envelope batch 1 + designer brief:
  - **feng-app** migrated to core-ui. Validated the back-compat-shim pattern
    for apps with substantial existing theme abstractions: `useFengTheme()`
    became a thin adapter over `useTheme()` from core-ui, eliminating call-site
    churn. Sites home / profile / readings tabs + report screen all consume
    `<Card>` / `<EmptyState>` / `<Button>` / `<Pill>` / `<LoadingTextBlock>` /
    `<ErrorState>`. (new-site) flow + compass tab deliberately deferred — see
    phase-f-migration-notes.md §5.
  - **API envelope batch 1** — `/api/share/*` (POST, GET, GET yuan, DELETE)
    and `/api/bonds/invite/:token/info` migrated. Client-side updates needed
    in hexastral-web's `/report/[shareId]` and `/yuan/invite/[token]` pages;
    documented in migration notes §6.
  - [`docs/phase-f-designer-brief.md`](phase-f-designer-brief.md) — ready to
    send. Specifies icon + splash + screenshot deliverables for all 8 apps,
    plus a shared illustration system (EmptyState / ErrorState SVGs) consumed
    by `@zhop/core-ui`. 5-week lead time → assets land by end of Week 8.
- **Week 4** — hexastral-app strategic refactor + feng-family envelope:
  - **Bonds tab sunset** (per ADR-0004 §4). `apps/hexastral-app/app/(tabs)/friends.tsx`
    rewritten from 520 lines of bond cards + radar + leaderboard machinery to
    a clean Yuán install/open CTA card. Deep-links to `yuan://launch` if
    installed, App Store fallback otherwise. Existing bond data on server
    remains shared with Yuán; no data migration.
  - **Void tab adds satellite hub** (per ADR-0004 §4). Hybrid surface — keeps
    the existing oracle question picker as primary value, adds a "More tools"
    section below with 5 satellite cards (Coin Cast / Face Oracle / Dream
    Oracle / Numerology / Compass). Each card uses the locked brand color +
    glyph from `packages/hexastral-tokens/src/satellites.ts` and deep-links to
    the satellite app or App Store.
  - **CoreUIProvider** wrapped at root with `brand="hexastral"` mode tracking
    system color scheme. Existing `useTheme()` in `@/lib/theme` left in place
    (~80 call sites) — feng-app's back-compat shim pattern intentionally not
    applied due to scale; documented in migration notes §7.3.
  - **API envelope batch 2** — feng-family routes (sites: list/create/read/
    patch/delete/analyze + jobs poll) migrated to `{ ok, data, meta }` shape.
    New `unwrap<T>()` helper exported from `packages/scenario-feng/lib/feng-api.ts`
    abstracts the envelope parsing — 5 feng hooks rewritten to use it.
- **Week 5** — all satellites wrapped + compass envelope + Week 6 prep:
  - **5 satellites + Compass** now wrapped in `<CoreUIProvider brand="...">`
    with their locked palettes (compass copper, coincast amber, faceoracle
    jade, dreamoracle indigo, numerology violet). Two distinct patterns:
    direct wrap (face-oracle / dream-oracle, no local theme) vs outer/inner
    split (coin-cast / numerology, local `useAppTheme()` shim consumes
    `useTheme()` from core-ui). Compass-app uses raw palette for root bg to
    sidestep the provider chicken-and-egg.
  - **API envelope batch 3** — compass routes (`/log` + `/logs`) migrated.
  - **Phase F decisions logged**: ja reviewer hire scoped + budgeted in
    `phase-f-plan.md` §10 (Week 5 deadline, ~$2k, 4-week lead time so review
    lands by Week 8 ship). Yuán bonds envelope flagged as Week 6 batch 4 with
    sub-batches 4a (read-side, 4 endpoints) + 4b (mutation-side, 12 endpoints);
    cross-app consumer-update coordination required.
  - Screen-level satellite refactor (Card / Button swaps inside each satellite)
    deferred to Phase F.5/F.6 polish — Week 5 goal was just provider wiring so
    each brand color is now live downstream.
- **Week 6** — Yuán bonds envelope (largest file remaining) + global handler + scenario-yuan:
  - **API envelope batch 4** — all 15 remaining endpoints in `routes/bonds.ts`
    (~1840 lines, the largest single API file) migrated to `{ ok, data, meta }`.
    Read-side: `/credits`, `/invite/:token/teaser`, `/`, `/:id`, `/:id/synastry`,
    `/active-pairs`. Mutation-side: `/solo`, `/invite`, `/invite/:token/respond`,
    `/:id/unlock`, `/:id/gift`, `/:id/share`, `DELETE /:id`.
  - **PATCH merge** — `PATCH /:id` and `PATCH /:id/stage` collapsed into one
    endpoint with union payload `{ targetName?, relationshipLabel?, relationshipStage? }`
    per phase-f-plan §3.2 granularity-collapse. Legacy `/stage` URL removed.
  - **Global Hono error handler** (`apps/hexastral-api/src/index.ts`) now
    emits envelope shape for any `HTTPException`. Status → kebab-case code via
    `codeFromStatus()` lookup. Zod validation errors emit `code: 'validation_failed'`.
    `app.notFound()` also envelope-shaped.
  - **scenario-yuan `unwrap()`** exported from `packages/scenario-yuan/src/lib/yuan-bonds-api.ts`,
    mirroring scenario-feng's pattern. 3 hooks rewritten: `useBondList`,
    `useSynastryReport` (preserves 202-generating-flow check before unwrap),
    `useBondInvitation` (`create()` + `respond()` mutations).
  - **dream-oracle result screen** — proof-of-pattern for satellite screen-level
    core-ui adoption: "Open full detail" link → `<Button variant="secondary">`
    (press-state + haptic + brand-accent indigo). SatelliteResultCard kept; its
    migration is a shared-infra refactor (Week 7 candidate).
- **Week 7** — signal envelope + onboarding bootstrap + 3 satellite result screens:
  - **API envelope batch 5** — `routes/signal.ts` (3 endpoints: today / history /
    item) migrated. Granularity-collapse into `GET /api/signal?date=&limit=`
    deliberately deferred to Phase G — polymorphic responses make TypeScript
    discrimination ugly and the today route's 130-line lazy-generation logic
    doesn't share with simple list handlers. Envelope is the immediate value.
  - **API envelope batch 6 partial** — `routes/onboarding/bootstrap.ts` migrated;
    ad-hoc `{ ok, code, step }` shape replaced with proper envelope plus
    `details.step` for client-side retry routing. `reveal.ts` / `convert.ts` /
    `chart.ts` / `static-traits.ts` deferred — they're slated for deprecation
    per phase-f-plan §3.4 (bootstrap is canonical entry), so migrating-to-
    deprecate is wasted work.
  - **Client coordination** — `apps/hexastral-app/lib/hooks/useSignalQuery.ts`
    updated with inline envelope unwrap (mirrors scenario-feng / scenario-yuan).
  - **3 satellite result screens** → `<Button variant="secondary">` from core-ui:
    coin-cast (amber accent), face-oracle (jade), numerology (violet — also
    upgraded the error state + bottom recompute button to fullWidth).
  - **ja reviewer flagged as launch-blocking**. Week 5 hire deadline passed
    without confirmed status. Migration notes §15 documents two paths:
    accelerated hire (~$3k, 2-week turnaround) or descope JP to V1.1. User
    decision needed before Week 8 EAS submission window.

Carry-overs from Phase E (still in Phase F.5):
ja content review, pricing matrix in App Store Connect / RevenueCat,
Compass + Feng app submissions, hexastral-web `/feng` landing live,
流年 cron in hexastral-api for 立春 rollover.

Updated brand matrix (Phase F snapshot — **SUPERSEDED by ADR-0009's two-layer model in §0**:
HexAstral flagship retired, only Yuán + Fēng are flagships, Compass was killed. Kept for history.)
Tier labels per [ADR-0006](decisions/0006-satellite-tiers.md).

```
HexAstral (master / LLC publisher)
├── Flagships — CJK glyph + Latin transliteration
│   ├── HexAstral  — 命緣卦道
│   ├── Yuán / 緣  — relationship & compatibility
│   └── Fēng / 風  — feng-shui                       ← Phase E
└── Satellites
    ├── Tier 1 — full portfolio satellite (onboarding → tabs → history → paywall)
    │   ├── Coin Cast        — amber + wood-grain
    │   ├── Face Oracle      — jade + ink-wash
    │   ├── Dream Oracle     — indigo + silver
    │   └── Numerology       — violet + blue    ← promoted in Phase G Week 1
    └── Tier 3 — free utility (anonymous, single-screen, deep-link out)
        └── Compass / 羅     — 墨青 + copper   ← Fēng feeder, no IAP
```

---

## 5. Yuán Phase B+ — outstanding follow-ups

Tracked separately from Phase C–E because they're inside the Yuán product
surface, not new products. Pick these up in parallel.

### 5.1 `useSoloBond` hook in `@zhop/scenario-yuan` (3 days)

`apps/yuan-app/app/(onboarding)/fill-other.tsx` currently collects inputs
but doesn't POST. Add `useSoloBond()` that calls `POST /api/bonds/solo`
(already exists in `apps/hexastral-api/src/routes/bonds.ts`).

### 5.2 Apple Sign In (1 week)

`apps/yuan-app/app.json` already declares `usesAppleSignIn: true`. Implement:
- Apple Sign In button on a first-launch screen or settings
- Backend: hit `POST /api/onboarding/apple-link` (verify it exists; if not,
  add it) to attach Apple user_id to the anonymous userId

### 5.3 Share affordance (3 days)

`apps/yuan-app/app/(bonds)/[id].tsx` has a `onShareChapter` callback that
currently just logs. Wire to:
1. Render `<ShareableChapterCard>` off-screen at 1080x1920
2. `react-native-view-shot` → PNG
3. `expo-sharing` → system share sheet
4. Backend: `POST /api/bonds/:id/share` (already exists) → public share URL

### 5.4 RevenueCat paywall (1 week)

Today's bond-invite has `bondInviteCredits` quota (free ≤ 3). Add a paywall
screen that triggers when user tries to create a 4th bond invitation. Use
RevenueCat product IDs from section 1.4 above.

### 5.5 Icon + splash assets (designer-blocked)

`assets/icon.png` + `assets/splash.png` for yuan-app are placeholders.
Design brief: cinnabar #9B2226 ground + seal-script 緣 in ink-gold #C4A882.
Square icon must read at 1024px App Store size.

### 5.6 AI prompt v2 — chapter format

Backend `pairReadings.compatibilityData` is currently a free-form JSON blob.
For chapters to flow through to `ChapterPager`, the prompt + storage need
restructure:

1. `services/svc-astro/src/prompts/` — add a "synastry chapter" prompt that
   asks the model for 6 named chapters per [SynastryChapter type](../packages/scenario-yuan/src/types.ts)
2. Persist as `compatibilityData.chapters: SynastryChapter[]` alongside the
   existing `overview` / `highlights` / `advice` fields
3. The existing `useSynastryReport(bondId).chapters` already handles either
   shape — extractor in [useSynastryReport.ts](../packages/scenario-yuan/src/hooks/useSynastryReport.ts) reads
   `interpretation.chapters` if present, else returns null

---

## 6. Cross-cutting tech debt (do when convenient)

### 6.1 hexastral-app `(bonds)/` → scenario-yuan migration

When Yuán B+ is shipping smoothly, migrate the legacy hexastral-app screens to
consume `@zhop/scenario-yuan` instead of `lib/domain/bonds.ts`. **Detailed
5-step plan in [packages/scenario-yuan/MIGRATION.md](../packages/scenario-yuan/MIGRATION.md)**.

### 6.2 Inline `scenario-bazi` + `scenario-ziwei` back to hexastral-app — ✅ done (2026-05-16)

Inlined into `apps/hexastral-app/components/{bazi,ziwei,bond-radar}/`; packages deleted.
`scenario-bonds` radar chart was hexastral-app-only (Yuán uses `scenario-yuan`).

### 6.3 Unify `portfolio-client` and `hexastral-client` — ❌ decided not to do

Satellites need anonymous DDL + `runAuto`/`runPreview` semantics; flagships use Hono RPC.
Keeping both clients — see [ADR-0005](decisions/0005-package-boundaries.md).

### 6.4 Schema modularization

`apps/hexastral-api/src/db/schema.ts` is 1,515 lines / 30 tables in one file.
Split into `db/schema/{users,readings,bonds,signals,portfolio,subscription}.ts`
with a `db/schema/index.ts` re-exporting them. `bun db:generate` should diff
to an empty migration after the split — verify before merging.

### 6.5 Delete `@zhop/ui-native` — ⏳ safe to delete, not done yet

Zero `from '@zhop/ui-native'` imports remain; `hexastral-app` uses local `components/ui/`.
The `packages/ui-native/` directory can be removed in a follow-up PR (`rm -rf packages/ui-native` + lockfile refresh). See [ADR-0005](decisions/0005-package-boundaries.md).

### 6.6 RevenueCat product config externalization — ✅ done (2026-05-16)

`apps/hexastral-api/src/config/products.ts` is the single source of truth;
`routes/webhook.ts` imports from it. **Dashboard setup** (entitlements + SKUs) is
still human-only — [setup/revenuecat-entitlements.md](setup/revenuecat-entitlements.md).

---

## 7. A/B testing framework (build only when you have ≥3 experiments queued)

Per the architecture review, the **4-atom approach** is the lightweight option:

1. **Experiment registry** — `apps/hexastral-api/src/config/experiments.ts`:
   ```ts
   { 'prompt-v2': { variants: ['control', 'warmer'], split: [0.5, 0.5] } }
   ```

2. **Deterministic assignment** — server-side `hash(userId + experimentKey) % 100`

3. **Prompt injection** — `prompts/*.ts` accept `variant` arg and switch
   system role / few-shot accordingly

4. **Event log** — every reading / share / purchase row gets
   `{ experiment, variant }` columns; D1 query → simple SQL dashboard

Defer PostHog / Statsig until you have > 10 parallel experiments. Until then,
the 4-atom system is enough.

---

## 8. How a new session should use this doc

1. **Read this whole file first.** It's the closest thing to a CLAUDE.md for
   the post-PR-1 world.
2. **Read the current-matrix ADRs**: [0009-two-layer-matrix](decisions/0009-two-layer-matrix.md)
   (current model — **supersedes 0002-brand-matrix**), [0006-satellite-tiers](decisions/0006-satellite-tiers.md),
   [0001-yuan-naming](decisions/0001-yuan-naming.md).
3. **Read `packages/scenario-yuan/README.md`** if working on Yuán.
4. **Pick a phase or follow-up.** Don't start something not on this list
   without explicit ask — there are reasons things are deferred.
5. **Verify before acting.** This doc is a snapshot at end-of-Phase-B; sections
   marked "Phase C/D/E" haven't been built yet. The actual codebase is the
   source of truth.
6. **Update this doc when phases ship.** Move completed items to a `### Done`
   subsection per phase so the roadmap stays accurate.

---

## 9. Working-style reminders for a new agent

These are conventions established during PR #1 — keep them:

- **No bun install / typecheck in this sandbox.** npm registry was offline.
  Every PR ends with a "manual follow-ups" list rather than auto-merging.
- **Real users**: zero as of 2026-05-14. Pre-PMF aggressive changes (D1 reset,
  schema renames, dep version bumps) are safe. Confirm this before continuing.
- **Decision style**: when the user says "你来决定", make a clear opinionated
  choice + state the trade-off + cite evidence. Don't ask back unless there's
  genuine strategic ambiguity.
- **Brevity in user-facing text**: tables and bullet lists over long prose.
  Code blocks for any file path the user might want to open.
- **CI is validation-only.** Don't add deploy steps; deploy is local.
- **Apps deploy via EAS, services + web deploy via local `wrangler`.** See
  [deploy.md](../deploy.md).
- **No emojis in code or commits.** User did not ask for them.
- **`react-native-reanimated` v4 + `expo-haptics`** are the mandatory motion
  stack for any new flagship-tier UX. Don't fall back to `Animated` from RN.

---

## 10. Phase progression visualizer

```
Phase A1 ✅  Repo cleanup, dead-code purge
Phase A2 ✅  scenario-yuan package + web routes + backend endpoints
Phase B  ✅  yuan-app standalone Expo scaffold
   ↓
Local manual (§1 + local-manual-checklist) ⏳  EAS / Apple / RC / designer / ja
   ↓
Phase C  ✅  hexastral-app UX polish (form-as-conversation onboarding,
            home hero + 今日金句, chapter sharing) + /chat ↔ portfolio-memory
Phase D  ✅  Numerology satellite (apps/numerology-app), backend
            /api/numerology/compute, hexastral-web /numerology + /calculate,
            backfill /coin-cast, /dream-oracle, /face-oracle landings + try,
            `bun gen satellite` turbo generator
Phase E  ▣▣▣▣▣□  Fēng + Compass — Weeks 1–5 ✅ code; Week 6 polish + §14 manual ⏳
Phase F  ▣▣▣▣▣▣▣□  Weeks 1–7 ✅ code; Week 8 launch + §1 manual ⏳
            └── phase-f-plan.md · migration-notes §16 · local-manual-checklist.md
Phase G  ▣▣▣  Satellite matrix alignment — Weeks 1–3 ✅ code (Numerology→Tier 1,
            onboarding align, ADR-0006 tiers, Compass→Tier 3)
            └── decisions/0006-satellite-tiers.md
   ↓
Tech debt sweep (§6) ⏳  ongoing, opportunistic
A/B framework (§7) ⏳  build when ≥3 experiments queued
```

### Phase C/D follow-ups (manual / non-sandbox)

After running `bun install` outside the sandbox:

1. `cd apps/numerology-app && eas init`  → fills EAS_PROJECT_ID; paste into
   `app.json` (`extra.eas.projectId`) and the four `EXPO_PUBLIC_EAS_PROJECT_ID`
   slots in `eas.json`.
2. Apple Developer → Identifiers → register `com.hexastral.numerology`.
3. App Store Connect → create app.
4. RevenueCat → create products `numerology_pro_monthly` and
   `numerology_pro_annual`; paste iOS public key into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
5. Designer → `apps/numerology-app/assets/{icon,splash}.png`.
6. `bun typecheck && bun lint && bun test` — should pass.
7. `apps/hexastral-api`: `bun db:generate` to capture the new `numerology`
   enum members in a migration, then `bun db:migrate:prod`.
8. (Optional) Backfill flagship `portfolio-memory` for existing readings —
   `buildHexastralMemoryDocument` is exported but no batch indexer exists
   yet. C.4 search returns empty until this is wired (no harm, no crash).
