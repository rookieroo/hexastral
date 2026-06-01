# HexAstral Roadmap — handover document

> **Purpose**: this doc is the single source of truth for what's been built, what's
> queued, and how to continue. A fresh agent or engineer should be able to read
> this once and pick up exactly where the previous session stopped.
>
> **Last updated**: 2026-05-15 — Phase C + Phase D shipped; Phase E still queued.

---

## 0. Where we are right now

PR #1 (commit `e8b8839b`) just landed Phase A1 + A2 + B. Repo state:

```
8 apps:
  1 API       — hexastral-api (Cloudflare Worker + Hono + D1)
  2 web       — hexastral-web (Next.js on CF), useone-tech (LLC corp site)
  2 flagships — hexastral-app (命緣卦道), yuan-app (緣) ← new
  3 satellites — coin-cast-app, dream-oracle-app, face-oracle-app
7 services    — svc-{astro,signal,notify,geocode,mailer,admin-notify,tail}
21 packages   — domain (astro-core, astro-i18n), tokens, clients, scenarios, ui
1 tooling     — typescript-config
```

Brand matrix per [ADR-0002](decisions/0002-brand-matrix.md):

```
HexAstral (master / LLC publisher)
├── Flagships — CJK glyph + Latin transliteration
│   ├── HexAstral  — 命緣卦道 four-tab life navigator
│   ├── Yuán / 緣  — relationship & compatibility (scaffold complete)
│   └── Fēng / 風  — feng-shui (Phase E)
└── Satellites — independent Western names
    ├── Coin Cast, Face Oracle, Dream Oracle
    └── Numerology (Phase D, planned)
```

---

## 1. Pending manual setup (carry-over from PR #1)

These cannot be done from a sandboxed agent — must run on a machine with npm /
CF / Apple Developer access. Do these **before** starting Phase C work.

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

## 4. Phase E — Fēng / 風 (feng-shui flagship V1, Q3+)

Defer until Phase C + D + Yuán B+ are shipped and have data. When starting:

### 4.1 V1 scope (4–6 weeks)

Personal feng-shui only:
- Based on user's birth (already collected) → personal favourable directions,
  annual transit directions, recommended accessories
- No camera input, no floor-plan analysis
- App Store name: `Fēng: Personal Feng Shui` (en) / `風 · 个人风水` (zh)
- Bundle `com.hexastral.feng`

### 4.2 V2 scope (3–6 months, only if V1 sticks)

Living-space feng-shui:
- Floor-plan photo upload
- 八卦 grid overlay
- AI-generated room-by-room advice

### 4.3 SEO seed (do now — costs nothing)

`apps/hexastral-web/app/[locale]/feng-shui/[slug]/page.tsx` already exists. Use
it for content marketing during the 6+ months before V1 ships, so the SEO is
warm at launch.

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

### 6.2 Inline `scenario-bazi` + `scenario-ziwei` back to hexastral-app

After the cull, these packages have only one consumer (hexastral-app). Inline
the source back into `apps/hexastral-app/components/` and delete the packages.
Same migration pattern as 6.1 but reversed.

### 6.3 Unify `portfolio-client` and `hexastral-client`

Today the 3 remaining satellites use `portfolio-client` (custom fetcher + useRequest
hook), while web / hexastral-app / yuan-app use `hexastral-client` (Hono RPC).
Pick one. Recommendation: drop `portfolio-client`; extract its `useRequest`
React hook into a tiny `@zhop/api-hooks` package; satellites consume
`hexastral-client` directly. Saves one package + one type surface.

### 6.4 Schema modularization

`apps/hexastral-api/src/db/schema.ts` is 1,515 lines / 30 tables in one file.
Split into `db/schema/{users,readings,bonds,signals,portfolio,subscription}.ts`
with a `db/schema/index.ts` re-exporting them. `bun db:generate` should diff
to an empty migration after the split — verify before merging.

### 6.5 Delete `@zhop/ui-native` if still empty

Last we checked, `packages/ui-native/` was essentially empty. If still true,
delete it; otherwise document its purpose in its README.

### 6.6 RevenueCat product config externalization

`apps/hexastral-api/src/routes/webhook.ts` hardcodes subscription product
lists (e.g. `COINCAST_SUBSCRIPTION_PRODUCTS`). Move to `src/config/products.ts`
keyed by app slug; webhook reads from config. Reduces churn when adding a new
flagship/satellite.

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
2. **Read the two ADRs**: [0001-yuan-naming](decisions/0001-yuan-naming.md),
   [0002-brand-matrix](decisions/0002-brand-matrix.md).
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
Manual setup (§1) ⏳  before Phase C starts
   ↓
Phase C  ✅  hexastral-app UX polish (form-as-conversation onboarding,
            home hero + 今日金句, chapter sharing) + /chat ↔ portfolio-memory
Phase D  ✅  Numerology satellite (apps/numerology-app), backend
            /api/numerology/compute, hexastral-web /numerology + /calculate,
            backfill /coin-cast, /dream-oracle, /face-oracle landings + try,
            `bun gen satellite` turbo generator
Phase E  🟡  Fēng (feng-shui) flagship — needs further plan discussion
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
