# Phase F — Consolidation Before Scale

> **Status**: **Weeks 1–7 code shipped** (2026-05-16); **Week 8 + human-only ops open**.  
> Matrix triage resolved via ADR-0004 (keep all 8 apps).  
> **Local manual work**: [local-manual-checklist.md](local-manual-checklist.md).  
> **Theme**: stop adding products; finish design system + API normalization before App Store.  
> **Duration**: 6 weeks aggressive; 8 weeks safe.

This phase is **not about new features**. Phases A–E built breadth (3 flagships, 5 satellites, full API). Phase F earns the right to launch by closing three execution gaps that audits exposed:

1. **Matrix is over-engineered** for pre-PMF — 11 apps, no users, finite attention.
2. **Design vision ≠ implementation** — `@zhop/hexastral-tokens` is well-designed but ~40 % of apps ignore it; no shared component library; visual depth absent; web disconnected from mobile.
3. **API surface is inconsistent** — 42 endpoints across 26 files, mixed naming, no shared response envelope, schemas duplicated inline.

Pre-PMF means we can break things. Phase F breaks them now — once, deliberately — instead of carrying the debt into a launch.

---

## 0. TL;DR

- **Keep all 8 apps; codify roles + funnel via ADR-0004.** Each satellite gets a locked ASO term, a distinct brand color, and explicit cross-links to flagships. Shared infra (Vision plumbing, prompts, core-ui) makes the breadth affordable. See §1.
- **Build `@zhop/core-ui`** — Button / Card / Input / Empty / Loading / Error / Skeleton / PageTransition primitives with motion + elevation tokens. Mandatory for every app. See §2.
- **Extract `@zhop/ai-vision`** from svc-feng — shared Gemini Vision client for feng-app + face-oracle (and future vision satellites). See §3.
- **Normalize the API** — shared `{ ok, data, meta }` envelope, ID naming convention, schema registry, collapse onboarding, extract async-job primitive, prompts move to svc-astro. See §3.
- **Visual refactor pass** on all 8 apps + hexastral-web — each gets its distinct brand color and proper motion/elevation. See §4.
- **Pre-launch hardening** — EAS builds, App Store listings, RevenueCat, designer assets, ja review, dev-client smoke tests. See §5.
- **Result**: 8 apps + 1 web ship to production within 8 weeks instead of 8 apps stuck in 70 % polish.

---

## 1. Matrix reposition (Week 1 — no kills, reframe roles)

Initial draft proposed killing 2 + deferring 1; user pushback corrected this to a portfolio view: each app holds ASO real estate and brand surface. Phase F instead **codifies each app's role and integration pattern** via a new ADR-0004 (satellite integration & funnel pattern).

| App | Role | Distinct brand color | Funnel relationships |
|---|---|---|---|
| **hexastral-app** | Flagship — platform anchor (你的命) | ink-black + ivory + gold | Receives from all satellites (portfolio-memory indexing); out-links to Yuán + Fēng. Bonds tab sunsets in favor of Yuán deep link; Explore tab reframed as satellite hub. |
| **yuán-app** | Flagship — relationships (你的緣) | cinnabar #9B2226 + ink-gold | Inbound: web invite URLs (`/yuan/invite/:token`). EN ASO: target "compatibility test" as primary term. |
| **feng-app** | Flagship — feng-shui (你的風) | 墨青 #0F1E26 + copper #B08D5B | Inbound from Compass. Annual 流年 refresh loop for retention. |
| **compass-app** | Satellite — Fēng's free wedge | shares Fēng palette | "Use this bearing for feng-shui" → Fēng deep link. |
| **coin-cast-app** | Satellite — the ritual moment | **amber + wood-grain** | "Save this cast to HexAstral" → indexes into portfolio-memory. Funnel both ways. |
| **face-oracle-app** | Satellite — camera-first physiognomy | **jade green + ink-wash** | "View full physiognomy reference in HexAstral" deep link. |
| **dream-oracle-app** | Satellite — dream interpretation | **indigo + silver** | Indexes dreams into portfolio-memory; HexAstral chat can reference past dreams. |
| **numerology-app** | Satellite — Western-market wedge | **cool blue/violet** | English ASO play; folds "angel numbers" sub-feature ("1111 meaning" etc). Funnels to HexAstral for full chart. |
| **hexastral-web** | SEO + funnel hub | (matches mobile) | Every app gets a landing + deep link; web routes 301 from legacy SEO slugs. |
| **useone-tech** | Corporate/legal | n/a | n/a |

Updated brand matrix:

```
HexAstral (master / LLC publisher)
├── Flagships — CJK glyph + Latin transliteration
│   ├── HexAstral  — 命  the platform anchor (you · daily · AI memory)
│   ├── Yuán / 緣  — 緣  relationships expansion (pairs · bonds · invites)
│   └── Fēng / 風  — 風  feng-shui big-ticket (sites · 流年 · indoor V2)
└── Satellites — focused utility surfaces, each owns ASO + brand color
    ├── Compass / 羅       — Fēng feeder (CJK)
    ├── Coin Cast          — the ritual moment (amber/wood)
    ├── Face Oracle        — camera-first physiognomy (jade)
    ├── Dream Oracle       — dream interpretation (indigo)
    └── Numerology         — Western-market wedge (blue/violet)
```

### 1.1 ADR-0004 — Satellite Integration & Funnel Pattern

New decision doc capturing:

1. **Outbound funnel pattern** — every satellite result screen ends with a "Save to HexAstral" or "Get full reading in HexAstral" CTA. Deep link → if HexAstral installed, opens with prefilled context; else App Store link with deferred deep link.
2. **Inbound funnel pattern** — HexAstral's Explore tab is the **satellite directory**: each kept satellite gets a card with brand glyph + 1-line description + "Open / Install" CTA.
3. **Portfolio-memory bridge** — satellites that produce readings (coin-cast, face-oracle, dream-oracle, numerology) index those readings into `portfolio-memory` with `targetApp: 'hexastral'`. HexAstral's daily chat can then reference past satellite readings.
4. **Per-app brand color** — locked palette per satellite, no two satellites share a color family. Visual differentiation in App Store grid + cross-app navigation.

### 1.2 ASO positioning per satellite

ASO is the entire reason satellites exist. Locked positioning per app:

| App | Primary ASO term | Secondary | Market |
|---|---|---|---|
| coin-cast | "i-ching" + "易经" + "摇卦" | "divination", "yi jing" | CJK + EN curious |
| face-oracle | "face reading" + "面相" + "physiognomy" | "face analysis" | CJK + EN viral |
| dream-oracle | "dream interpretation" + "解梦" + "周公解梦" | "dream meaning" | CJK + EN broad |
| numerology | "numerology" + "life path number" | "angel numbers" (1111, 222, etc.) | EN primary |
| Compass | "compass" + "罗盘" + "magnetic declination" | "feng shui compass" | EN utility + CJK |

Yuán's English ASO target: **"compatibility test" + "synastry"** — these are far hotter than "feng shui" or "命理" in EN markets and Yuán's compatibility analysis is a direct match. Adjust Yuán's English landing copy + App Store keywords in F.5.

### 1.3 Architectural reuse mandate

The cost of keeping all 8 apps is justified only if they share infrastructure aggressively. Phase F enforces:

1. **Gemini Vision plumbing** → extracted from `svc-feng/src/lib/gemini.ts` into a new shared package `@zhop/ai-vision` (or new `services/svc-vision/` worker). Used by feng-app, face-oracle-app, and any future vision-based satellite. Single secret, single R2 cache pattern, single Zod-retry envelope.
2. **Yi-Ching compute** → extracted to `@zhop/astro-core/yiching/` if not already there. Shared by coin-cast and hexastral-app's `/detail/yiching/[id]`.
3. **Prompts** → all satellite prompts move from `apps/hexastral-api/src/lib/prompts/` to `services/svc-astro/src/prompts/` (see §3.6).
4. **`@zhop/core-ui`** → mandatory for every surviving app (no parallel theme files allowed past Phase F).

This is non-negotiable. Without it, 8 apps is a maintenance trap.

---

## 2. Design system foundation — `@zhop/core-ui` (Weeks 1–2, parallel with §1)

The token package is good. The problem is downstream: apps redefine palettes, build their own Button/Card from scratch, hardcode spacing, ship with zero elevation/motion, and the web is a separate visual universe.

### 2.1 New package: `@zhop/core-ui`

Replaces the underused `@zhop/ui-native`. Cross-platform RN primitives that all 4 surviving apps consume. Web parity via a parallel `@zhop/core-ui/web` entry (Tailwind-shaped, same token source).

**Primitives (V1 set, all must ship together):**

| Component | Variants | Notes |
|---|---|---|
| `<Button>` | primary / secondary / ghost / destructive | press-state scale-down (worklet), optional haptic, leading/trailing icon slots, loading state with inline spinner |
| `<Card>` | flat / elevated / outlined | elevation token plus iOS shadow + Android elevation; optional headerSlot / footerSlot |
| `<Input>` | text / multiline / select | focus ring, label, error message, validation state |
| `<EmptyState>` | default + brand-illustration slot | accepts SVG glyph; built-in illustrations for "no data" / "no permission" / "first-time" |
| `<LoadingState>` | skeleton / spinner / shimmer | shimmer worklet; skeleton sizes follow the spacing scale |
| `<ErrorState>` | inline / fullscreen | retry CTA, error code surfaced subtly |
| `<PageTransition>` | slide_from_right / fade / scale | Reanimated v4 layout animations |
| `<Pill>` | accent / mute / status | hairline border, brand-tinted text |
| `<Divider>` | hairline / dotted / inkWash | mirrors token system |

**Brand-specific composition:**

Each app keeps a thin `lib/theme.ts` that re-exports `@zhop/hexastral-tokens` plus brand-specific accent overrides. `<Button>` consumes the theme via context — same component, different accent per app. No more parallel `FENG_PALETTE` / `COMPASS_PALETTE` files.

### 2.2 New motion + elevation tokens

Add to `@zhop/hexastral-tokens/motion.ts`:

```ts
export const motion = {
  duration: { instant: 100, fast: 180, normal: 260, slow: 400, lazy: 600 },
  easing: {
    spring: { damping: 18, stiffness: 220, mass: 1 },       // page transitions
    snap:   { damping: 26, stiffness: 380, mass: 0.8 },     // toggles, taps
    flow:   { damping: 14, stiffness: 120, mass: 1 },       // hero reveals
  },
  curve: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',                 // for CSS web parity
    decel:    'cubic-bezier(0, 0, 0, 1)',
    accel:    'cubic-bezier(0.4, 0, 1, 1)',
  },
}

export const elevation = {
  none: { iosShadow: null,                                   androidElevation: 0 },
  sm:   { iosShadow: { o: 0.06, r: 4,  oy: 1 },              androidElevation: 1 },
  md:   { iosShadow: { o: 0.08, r: 10, oy: 4 },              androidElevation: 3 },
  lg:   { iosShadow: { o: 0.12, r: 22, oy: 10 },             androidElevation: 8 },
}
```

### 2.3 Token enforcement

- **Lint rule** (Biome custom or runtime assertion in dev): any hardcoded color string in app source that isn't `transparent` triggers a warning.
- **Typography**: deprecate inline `fontSize: 26` etc. — all `<Text>` must use `<Text variant="titleLg" />` from core-ui or compose from `TYPOGRAPHY.titleLg`.
- **Spacing**: deprecate inline numeric margins — use `SPACING.lg`. The audit found `feng-app/(report)/[siteId].tsx` lines 42–94 as the canonical offender; pass over all surviving apps.

### 2.4 Cross-app illustrations

Add `packages/core-ui/src/illustrations/` with brand-flavored SVGs:
- `empty-sites.svg`, `empty-bonds.svg`, `empty-dreams.svg`, `empty-readings.svg`
- `loading-seal.svg` (animated ink-wash for hexastral-app)
- `error-mountain.svg` (a stylized 山 for fall-back screens)

Designer task; budget 3 days during Week 2.

---

## 3. API normalization (Weeks 2–3)

Pre-PMF freedom. Make the breaking changes once, in a single sweep, and lock the conventions.

### 3.1 Shared response envelope

New `apps/hexastral-api/src/lib/api-response.ts`:

```ts
export type ApiSuccess<T> = { ok: true; data: T; meta?: { cursor?: string; total?: number } }
export type ApiError      = { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } }
export type ApiResult<T>  = ApiSuccess<T> | ApiError

export function ok<T>(data: T, meta?: ApiSuccess<T>['meta']): ApiSuccess<T> { ... }
export function err(code: string, message: string, details?: ...): ApiError { ... }
```

Every route migrates to this envelope. Hexastral-client regenerates types automatically.

### 3.2 Naming standardization

- **Path params**: always `:id` (no `:siteId` / `:bondId` / `:jobId` mismatches).
- **Payload IDs**: use `siteId` / `bondId` only when an entity references another (compound).
- **Error codes**: kebab-case (`context_hash_mismatch`, `paywall_required`, `quota_exhausted`).
- **Date fields**: `birthSolarDate` (ISO 8601 date), `birthTimeIndex` (0–12 shichen), `createdAt` / `updatedAt` (ISO 8601 datetime). Drop all variants.
- **Pagination**: `?limit=N&cursor=ID` everywhere a list is returned.

### 3.3 Schema registry

New `apps/hexastral-api/src/lib/schemas/` directory:

```
schemas/
├── index.ts          re-exports
├── common.ts         id, pagination, locale, timestamp
├── birth.ts          solarDate, lunarDate, timeIndex, personBirth
├── bonds.ts          bondCreate, bondUpdate, bondStage
├── feng.ts           siteCreate, siteUpdate, analyzeJobInput
├── readings.ts       chartRequest, chapterRequest
└── share.ts          shareCreate, shareRevoke
```

Routes import shared schemas. Inline Zod allowed only for one-off request shapes. `@zhop/scenario-yuan` + `@zhop/scenario-feng` continue exporting TypeScript types; API owns Zod.

### 3.4 Granularity collapse

- **Onboarding**: deprecate `/reveal`, `/convert`, `/chart`, `/static-traits` sub-routes. `/api/onboarding/bootstrap` is the only entry. Optional flags on bootstrap control which sub-steps run.
- **Signal**: merge `/today` + `/history` + `/item/:id` into `GET /api/signal?date=&limit=&cursor=`. Polymorphic response.
- **Bonds**: merge `PATCH /:id` + `PATCH /:id/stage` into single `PATCH /:id` with union payload.

### 3.5 Async-job primitive

Extract Fēng's `analyze → poll` pattern as a reusable lib at `apps/hexastral-api/src/lib/async-job.ts`. Bonds + Pair could adopt this in V2 for long-running synastry generation.

### 3.6 Prompt centralization

Move all prompts from `apps/hexastral-api/src/lib/prompts/` to `services/svc-astro/src/prompts/`. Service that runs the LLM owns the prompt. Hexastral-api becomes orchestration-only.

Future-proof: add `prompt_overrides` D1 table for runtime A/B without redeploy. Wire after Phase F when ≥ 3 experiments are queued (per ROADMAP §7).

### 3.7 Public auth boundary

Split routes into two routers:

```ts
app.route('/api/public',  publicRoutes)   // no auth: share view, by-username, invite-info, pair-preview
app.route('/api',         signedRoutes)   // HMAC or Turnstile
```

Currently `/api/share` accepts both HMAC and Turnstile in one route file (line 245 of index.ts). Split it. Add rate-limiting middleware to the public router only.

### 3.8 hexastral-client regen

Once routes settle, regenerate the hand-written RPC façades (`feng-api.ts`, `yuan-bonds-api.ts`) — Hono's `hc<AppType>` inference still fails past a depth threshold, but with the smaller route tree post-collapse, it may now succeed without manual typing. Worth a re-test.

---

## 4. Visual refactor pass (Weeks 3–5)

For each surviving app, a focused refactor PR that:

1. Replaces inline `theme.ts` palette with `@zhop/hexastral-tokens` consumption.
2. Migrates Button / Card / Input / EmptyState / LoadingState / ErrorState to `@zhop/core-ui`.
3. Replaces hardcoded `fontSize: NN` with `TYPOGRAPHY.{titleLg|title|body|...}`.
4. Replaces hardcoded margins with `SPACING.{xs|sm|md|lg|xl|2xl|3xl}`.
5. Adds elevation to surface hierarchy (cards have `sm`, modals have `lg`).
6. Adds motion to key transitions:
   - Page navigation: spring-from-right with `motion.easing.spring`.
   - List → detail: shared element where Reanimated v4 supports it; else crossfade.
   - Loading → loaded: stagger reveal of children with 80ms delay.
7. Polishes empty / loading / error states with the new illustration assets.

### 4.1 hexastral-app

- Sunset Bonds tab — replace with "Open Yuán" CTA card; if Yuán not installed, App Store link.
- Reframe Explore tab as a satellite showcase: cards for Dream Oracle + Compass + (future satellites), each with brand glyph and "Open / Install" CTA.
- Fate tab: keep the FateHomeHero SVG (it's good). Add elevation to the signal card and reading-list rows. Add shimmer skeleton during signal fetch.
- Tabs `_layout.tsx` line 47–48 — re-enable iOS shadow on the tab bar (currently `shadowOpacity: 0`).

### 4.2 yuán-app

- Replace `(bonds)/[id].tsx` retry CTA at line 65–71 (plain Pressable text) with `<Button variant="secondary">` from core-ui.
- ChapterCard's hairline placeholder area (lines 79–87) — finalize the visual: brand-tinted gradient + Yuán seal watermark.
- "Bond not found" treatment at line 98 — promote to `<EmptyState variant="not-found" />`.
- Share cards: ship `ShareableChapterCard` (off-screen ViewShot capture, 1080×1920). Wire `onShareChapter` in `[id].tsx`.
- Apple Sign In: implement the flow per ROADMAP §5.2.

### 4.3 feng-app

- Migrate `(report)/[siteId].tsx` to new core-ui: title becomes `<Text variant="titleLg">`, chapter cards become `<Card elevation="sm">`, share button already uses cinnabar pattern (keep).
- Add ChapterPager port from scenario-yuan (was deferred from Week 5). Horizontal swipe is appropriate for the 6-chapter format. Vertical scroll falls back on small screens.
- Empty/loading states for the sites home — currently text-only.
- FacingCalibrator polish pass: spring-snap on release with `motion.easing.snap`, hover-state on the gold arrow.
- **Address screen crash investigation** (the smoke-test issue you hit): root cause likely that `expo-sensors` + `react-native-reanimated v4` worklets aren't available in Expo Go SDK 54 dev mode. Fix:
  - Document in `apps/feng-app/README.md`: "must run via `bun dev:device` (dev client), not Expo Go."
  - Add a build script `bun build:dev` that runs `eas build --profile development` to produce a dev client.
  - Investigate the actual crash with `expo-dev-client` once a build is available.

### 4.4 compass-app

- Reuse `<BaguaCompassOverlay>` from scenario-feng (already shared) — no duplication.
- Add `<EmptyState>` for the no-location-permission case.
- Pro paywall (`hexastral_compass_pro_monthly`): use `@zhop/core-ui/<PaywallCard>` if it lands as part of V1 set; otherwise inline.
- Drop `COMPASS_PALETTE` in favor of token-based theme.

### 4.5 hexastral-web

- Refactor `hexastral-web/app/[locale]/page.tsx` (lines 40–98) to drop hardcoded colors and inline padding. Switch to Tailwind utilities driven by tokens (`@zhop/ui` theme generator already exists — wire it up).
- Add web equivalents of motion: framer-motion crossfades on locale-route transitions, hover lift on cards (matches mobile `elevation.md`).
- Landing pages for kept apps only: `/yuan`, `/feng`, `/compass`, `/dream-oracle`, `/numerology` (web calculator). Delete `/coin-cast`, `/face-oracle`.

---

## 5. Pre-launch hardening (Week 6)

### 5.1 Designer deliverables (block at Week 0; complete by end Week 5)

- `apps/hexastral-app/assets/icon.png` + `splash.png` (already exists; refresh if needed)
- `apps/yuan-app/assets/icon.png` + `splash.png` — cinnabar #9B2226 + 緣 seal
- `apps/feng-app/assets/icon.png` + `splash.png` — 墨青 #0F1E26 + 風 seal
- `apps/compass-app/assets/icon.png` + `splash.png` — minimal needle, 羅 mark
- Core-UI illustrations per §2.4

### 5.2 EAS production builds

Order: hexastral-app, yuán-app, compass-app, feng-app, dream-oracle-app.
Each app:
```bash
cd apps/<slug>-app
eas init                        # if not done
eas build --profile production --platform ios
eas submit --profile production
```

### 5.3 App Store Connect

- Register bundle IDs (yuán + feng + compass not yet done — see feng-plan §17 carry-overs).
- Locale-specific listing names per ADR-0001 + brand-matrix decisions.
- Screenshots: 3 per locale per app, taken from the polished V1 surfaces.

### 5.4 RevenueCat

Products per feng-plan §7 + the Yuán SKUs from ROADMAP §1.4. Wire iOS public keys into each app's `.env`.

### 5.5 ja content review

The Feng-shui ja content reviewer (~$2k budget, feng-plan §7 follow-up) is now Phase F.5 blocking. Schedule the hire at Week 0 so the review lands by Week 5.

### 5.6 Smoke tests

Each app gets a TestFlight build + a 5-minute manual flow checklist:
- hexastral-app: birth onboarding → home hero loads → daily golden line renders → share a chapter.
- yuán-app: create a solo bond → see report → invite via URL → web invite page works.
- feng-app: create a site → analyze → 6 real chapters render → share a chapter.
- compass-app: open → see needle → toggle true/magnetic → CTA to Fēng works.
- dream-oracle-app: enter a dream → get interpretation → share.

**Always via dev clients or TestFlight, never Expo Go.** Add this to `CLAUDE.md` if not already there.

---

## 6. Timeline (8 weeks aggressive)

```
Week 1  ┃ §1 ADR-0004 satellite-funnel + §2 core-ui scaffold
Week 2  ┃ §2 core-ui complete + §3 API DTOs + naming + @zhop/ai-vision extract
Week 3  ┃ §3 schema registry + granularity collapse + prompt centralization
Week 4  ┃ §4 hexastral-app + yuán-app refactor (parallel) + §5 designer brief
Week 5  ┃ §4 feng-app + compass-app refactor + §5 web parity begins
Week 6  ┃ §4 coin-cast + face-oracle visual + ritual polish + §5 ja review
Week 7  ┃ §4 dream-oracle + numerology refactor + §5 ASO listings finalized
Week 8  ┃ §5 builds, App Store, RevenueCat, sequenced TestFlight rollouts
```

Beyond Week 8: V1.1 work (indoor Fēng V2 if D30 > 25 %, A/B testing framework per ROADMAP §7, "angel numbers" sub-feature in numerology).

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Core-UI primitive set is wrong / incomplete | Medium | V1 set kept small (9 components); iterate based on actual app migration friction. |
| Token enforcement lint breaks too much code | Low | Land as warning first, promote to error after migration. |
| API breaking changes destabilize web during refactor | Medium | Web is pre-launch; coordinate hexastral-client regen with web deploy. Add a 1-week deprecation shim per route if needed. |
| Designer assets late | High | Brief designer at Week 0, weekly check-ins, parallel scope (icons, illustrations, screenshots). |
| ja reviewer doesn't deliver | High | Hire by Week 1; reviewer has 4 weeks of lead time. |
| 6-week timeline slips into 10 weeks | Medium | Each week has a single primary deliverable; if a week slips, that week's app stays in TestFlight while the next week's app starts. |
| Killing coin-cast / face-oracle removes user options | Low (no users) | We have no users. Confirm decision in §1, then strip cleanly. |

---

## 8. Out of scope (Phase F)

- New app shipments beyond the 4 + 1 web above.
- V2 features (indoor Fēng, ChatGPT-style follow-ups, AR overlays).
- Android (still iOS-only V1, per CLAUDE.md house rules).
- Mainland China launch (deferred per feng-plan §2).
- A/B testing framework build-out (defer until ≥ 3 experiments queued).
- New ADRs beyond the brand-matrix amendment.

---

## 9. Success metrics (end of Phase F)

| Metric | Threshold |
|---|---|
| Apps shipped to App Store | 8 — 3 flagships (hexastral, yuán, feng) + 5 satellites (compass, coin-cast, face-oracle, dream-oracle, numerology) |
| Token consumption | 100 % of apps consume `@zhop/hexastral-tokens` directly; zero parallel palettes; each satellite has a locked distinct brand color |
| Component reuse | `@zhop/core-ui` used by every app for Button/Card/Input/Empty/Loading/Error |
| Vision plumbing | `@zhop/ai-vision` shared between feng-app + face-oracle; single Gemini secret, single R2 cache pattern |
| Cross-app funnel | Every satellite result screen has "save to HexAstral" CTA; HexAstral Explore tab lists all satellites; portfolio-memory bridges in place for coin-cast / face-oracle / dream-oracle / numerology |
| API consistency | 100 % of routes use shared response envelope; 100 % of list routes paginate; zero inline Zod for shared schemas |
| Web parity | hexastral-web typography + spacing + color scale matches mobile flagships; each app has a landing |
| ASO positioning | Each satellite has locked App Store keywords per §1.2; Yuán English landing targets "compatibility test" |
| Smoke tests | Pass on dev-client builds for all 8 apps |

Below these, postpone any Phase G work. Phase F is the foundation — earn it before scaling.

---

## 10. Decisions log

- [x] **2026-05-16 — matrix reposition** — KEEP all 8 apps (per user direction). Build integration ADR-0004 instead of triaging. Each satellite gets locked ASO term + distinct brand color.
- [x] **2026-05-16 — Phase F entry point** — start with §2 `@zhop/core-ui` foundation (highest leverage, parallel-able).
- [x] **2026-05-16 — ADR-0004** drafted and merged (Week 1).
- [x] **2026-05-16 — core-ui V1 primitive set** locked (Week 1): Button / Card / Text / Pill / Divider / EmptyState / LoadingSkeleton / ErrorState + theme provider + motion helpers + useHaptic.
- [x] **2026-05-16 — API breaking-change window opened** (Week 2). Envelope batches 1–5 + bonds batch 4 + global error handler landed (Weeks 2–7). Auth split + remaining onboarding sub-routes deferred to Phase G.
- [x] **2026-05-16 — `@zhop/ai-vision`** — svc-feng + **svc-astro** (physiognomy / face-oracle pipeline). No `svc-vision` worker.
- [x] **2026-05-16 — Yuán bonds API envelope (Week 6 batch 4)** — `routes/bonds.ts` + scenario-yuan `unwrap()`.
- [x] **2026-05-16 — Signal envelope (Week 7 batch 5)** — `routes/signal.ts` + `useSignalQuery` unwrap.
- [x] **2026-05-16 — Designer brief written** (Week 3). Ready to send at start of Week 3 calendar; 5-week lead time.
- [ ] **ja reviewer hire — open action (Week 5 deadline)**.
  - Scope: Fēng V1 ja content review per feng-plan §7 (風水 terminology must be native-quality, not machine translation).
  - Budget: ~$2k one-shot.
  - Deliverable: native-reviewer pass on all `apps/feng-app/lib/i18n.ts` ja strings + the `services/svc-astro/src/prompts/synthesis.ts` ja tone guide.
  - Why Week 5: 4-week reviewer lead time → review lands by Week 8 EAS submission window. Slipping past Week 5 forces a launch delay or English-only initial launch in JP.
  - Action: hire via 日本 freelance network (Upwork / Lancers.jp) OR engage existing Japan-based contributor if relationship exists.
- [ ] **Designer engagement open** (Week 4 trigger). Brief ready at `docs/phase-f-designer-brief.md`. Send when budget envelope confirmed.
- [x] **Yuán bonds API envelope sweep — Week 6 batch 4** (shipped). See ROADMAP Phase F Week 6 + [phase-f-migration-notes.md](phase-f-migration-notes.md) §16.
- [ ] **Week 8 — EAS + App Store** — all 8 apps; see [local-manual-checklist.md](local-manual-checklist.md) §6.
