# Phase F Migration Notes — Living Reference

> **Status**: living doc, updated as each app migrates.
> **Last updated**: 2026-05-16 (Week 7 — signal envelope + bootstrap envelope + 3 satellite result-screen migrations; ja reviewer flagged as launch-blocking).

This doc captures decisions, deltas, and learnings from migrating Phase F's foundational packages into real apps. Future app migrations follow the same pattern.

---

## 1. Yuán app — selective adoption

Yuán was the first migration target precisely because it's the most mature flagship and has the strongest brand identity. The migration validated a **selective adoption** philosophy:

- Use `@zhop/core-ui` for **generic infrastructure** (Card elevation, EmptyState shape, ErrorState structure, useHaptic, motion helpers).
- Keep **brand-identity expressions** in the app's own files (`yuanType` editorial typography, `yuanPresets.ctaText` gold-underline CTA, `YuanSeal` breathing component, `yuanSpacing.screenH` edge padding).

The mental rule: **core-ui owns the structure, the brand owns the voice.**

### Files changed

- `apps/yuan-app/package.json` — added `"@zhop/core-ui": "workspace:*"`.
- `apps/yuan-app/app/_layout.tsx` — wrapped root in `<CoreUIProvider brand="yuan" mode="light">`. Sits between `SafeAreaProvider` and `AuthProvider`.
- `apps/yuan-app/app/(bonds)/index.tsx` — BondListItem uses `<Card variant="outlined" padding="lg">`; empty state uses `<EmptyState>` with `customAction` slot for the gold-underline CTA; error uses `<ErrorState>` with `customAction` for the gold-underline retry.
- `apps/yuan-app/app/(bonds)/[id].tsx` — error state uses `<ErrorState variant="fullscreen">` with `customAction` slot.

### Files intentionally NOT migrated

- `apps/yuan-app/app/(onboarding)/welcome.tsx` — pure brand expression (YuanSeal + 2 lines + tap hint). Nothing for core-ui to add value to.
- Other onboarding screens — sweep these in a later pass once we know the per-screen patterns. They mostly compose `yuanType` text + simple Pressables; can migrate to `<Card>` + `<Button variant="ghost">` if visual layering is wanted, but the editorial restraint may argue against it.

---

## 2. Core-UI V1 gaps surfaced

The Yuán migration revealed two gaps in the V1 primitive set. Both fixed during the migration.

### 2.1 EmptyState / ErrorState needed a `customAction` slot

**Problem**: Both components had a built-in `<Button>` rendering for the action CTA. Yuán's brand is "gold-underline text instead of boxed buttons" — forcing a Button would damage brand identity, but external action footers (a `<View>` after the EmptyState block) broke the visual unity.

**Fix**: added `customAction?: ReactNode` slot to both. When provided, fully replaces the built-in Button rendering.

```tsx
<EmptyState
  illustration={<YuanSeal mode="static" size={96} />}
  title={t(locale, 'bondList.empty.title')}
  customAction={
    <Pressable onPress={...}>
      <Text style={yuanPresets.ctaText}>Begin →</Text>
    </Pressable>
  }
/>
```

This is the right pattern for all apps that have strong brand-identity CTAs (not just Yuán).

### 2.2 Typography variants tension

**Tension**: core-ui's `<Text variant="body">` resolves to the master `TYPOGRAPHY.body` scale (15px/22px). Yuán's `yuanType.body` is 16px/28px — more breathing room, editorial feel.

**Decision for V1**: Yuán does **not** use core-ui `<Text>` variants in body content. It keeps using `yuanType` directly. Core-ui Text is reserved for cases where typography consistency matters more than brand voice (system error messages, settings panels, etc.).

**V2 future work**: extend `CoreUIProvider` to accept a per-brand `typographyOverrides` prop. Then `useTheme().typography.body` returns the right scale per brand, and apps can use `<Text variant="body">` without losing brand voice. Not in scope for V1.

---

## 3. AI-Vision extraction

Per phase-f-plan §3 + ADR-0004 §6, the Gemini Vision plumbing in `services/svc-feng/src/lib/gemini.ts` plus the R2 cache lib in `lib/cache.ts` are now a shared package.

### Package layout

```
packages/ai-vision/
├── package.json          # peer deps: @google/genai, zod
├── tsconfig.json
└── src/
    ├── index.ts          # barrel
    ├── gemini.ts         # callGeminiVisionStructured + callGeminiText
    ├── cache.ts          # cacheKey, readCache, writeCache, fetchR2AsBase64
    └── retry.ts          # withZodRetry envelope
```

### What changed in svc-feng

- `package.json` adds `"@zhop/ai-vision": "workspace:*"`.
- `src/lib/gemini.ts` becomes a thin re-export shim (kept temporarily for back-compat; remove in a later cleanup).
- `src/lib/cache.ts` becomes a thin re-export shim.
- `src/routes/vision.ts` and `src/routes/synthesize.ts` import from `@zhop/ai-vision` directly. The retry logic (previously a 15-line for-loop in each route) collapses into a single `withZodRetry({ label, schema, call, degraded })` call.

### What this unlocks

- face-oracle's eventual vision pipeline (`services/svc-vision/` or extension of svc-feng) consumes the same primitives — no copy-paste of the Gemini call shape, R2 cache, or retry envelope.
- A single secret rotation (`GEMINI_API_KEY`) covers all vision-using workers.
- Future model upgrades (Gemini 3.2 etc.) only touch `packages/ai-vision/src/gemini.ts`, not N route files.

### Follow-ups

- After 1–2 weeks of soak time on svc-feng, delete the shim files in `svc-feng/src/lib/{gemini,cache}.ts` and update route imports to come directly from `@zhop/ai-vision`.
- Write face-oracle's vision pipeline (Phase F.4) consuming the same package — proves the abstraction works for two consumers.

---

## 4. API response envelope primer

Per phase-f-plan §3.1, all routes will migrate to a uniform `{ ok, data, meta }` / `{ ok: false, error }` envelope. Foundation landed:

- `apps/hexastral-api/src/lib/api-response.ts` — types (`ApiSuccess<T>`, `ApiError`, `ApiResult<T>`), constructors (`ok()`, `err()`), Hono helpers (`jsonOk()`, `jsonErr()`), error-code registry (`ApiErrorCode`).
- `apps/hexastral-api/src/lib/schemas/common.ts` — shared Zod schemas (IDs, dates, pagination, locale, birth, geo).
- `apps/hexastral-api/src/lib/schemas/index.ts` — registry barrel; per-domain modules added as routes migrate.

### Canonical migration — `GET /api/feng/declination`

Picked as the canonical proof because it's the simplest route (public, GET, single Zod schema). The migration shows:

1. Replace `c.json({...})` with `jsonOk(c, {...})`.
2. Replace `throw new HTTPException(400, ...)` with `return jsonErr(c, 400, ApiErrorCode.invalid_input, message, details)`.
3. Use kebab-case error codes from `ApiErrorCode` registry.
4. Surface Zod issues in the `details` field for client-side debugging.

Before:
```ts
if (!parsed.success) throw new HTTPException(400, { message: parsed.error.message })
return c.json({ declination: decl, source: ..., epoch: '2026.0' })
```

After:
```ts
if (!parsed.success) {
  return jsonErr(c, 400, ApiErrorCode.invalid_input, 'lat and lng query params are required', {
    issues: parsed.error.issues,
  })
}
return jsonOk(c, { declination: decl, source: ..., epoch: '2026.0' })
```

The hexastral-client now consistently sees `{ ok: true, data }` or `{ ok: false, error }`. No more per-route shape sniffing.

### Migration order (proposed sequence)

Apply the envelope in this order so each batch is small:

1. **Public routes** — declination ✓, share GET, pair-preview, by-username, invite-info
2. **Feng routes** — sites, jobs, declination ✓
3. **Bonds routes** — credits, solo, invite, respond, CRUD, synastry
4. **Numerology route** — compute
5. **Yi-Ching route** — divination
6. **Onboarding routes** — bootstrap, reveal, convert, chart, static-traits (collapse during sweep per §3.4)
7. **Signal routes** — merge today + history + item into `GET /api/signal?...` per §3.4
8. **Share routes** — create, get, delete; split public from private per §3.7
9. **Remaining routes** — chat, media, purchase, quota, life-events, contacts, geocode, notify, glossary, growth-events, health, dev, webhooks

Each batch updates the corresponding hexastral-client types and any consuming app.

### Naming convention enforced during sweep

- **Path params**: always `:id` (no `:siteId` / `:bondId` / `:jobId`).
- **Payload IDs**: use `siteId` / `bondId` only when compound (entity references another).
- **Error codes**: kebab-case from `ApiErrorCode` registry.
- **Pagination**: `?limit=&cursor=` everywhere a list is returned.

---

## 5. Feng app — flagship-with-defined-mode migration (Week 3)

Feng was the second app migrated, validating that the **back-compat-shim pattern** works for apps with a substantial existing theme system (vs. Yuán which used token sub-paths directly).

### Key delta vs Yuán

Feng had a local `lib/theme.ts` defining `FENG_PALETTE`, `FengColors`, and a `useFengTheme()` hook returning a custom color shape. The migration could have:
- (A) Replaced every `useFengTheme()` call site (touches ~10 files) with `useTheme()` from core-ui
- (B) Kept `useFengTheme()` and made it internally consume `useTheme()` (1-file change, zero call-site churn)

**Chose (B)** — `useFengTheme()` is now a thin shim that maps core-ui's `useTheme()` onto the legacy `FengColors` shape. Existing screens that destructure `{ colors }` keep working unmodified; their colors now come from `CoreUIProvider brand="feng"` instead of the hardcoded `FENG_PALETTE`.

This pattern is recommended for any app that has accumulated a theme abstraction layer. Cost: tiny back-compat shim. Benefit: zero call-site churn, single source of truth, gradual migration to direct `useTheme()` calls when convenient.

Specific brand-fixed values kept in `FENG_PALETTE`:
- `arrowFace` / `arrowSit` colors used by `BaguaCompassOverlay` SVG. These are **visualization semantics** (gold = face direction, cinnabar = sit direction), not theme chrome — they don't change with light/dark mode. Kept as raw palette constants.
- `inkTeal` constant used by `BootSplash` (which renders before CoreUIProvider is mounted).

### Files migrated

- `apps/feng-app/package.json` — added `"@zhop/core-ui": "workspace:*"`.
- `apps/feng-app/app/_layout.tsx` — wrapped root in `<CoreUIProvider brand="feng" mode={system}>` (tracks system color scheme via `useColorScheme()`).
- `apps/feng-app/lib/theme.ts` — `useFengTheme()` rewritten as adapter over `useTheme()`. `FENG_PALETTE` + `spacing` constants retained.
- `apps/feng-app/app/(tabs)/index.tsx` — sites home: add-site button is now `<Button variant="primary" size="sm" leadingIcon={...}>` (haptic + press-scale); site cards are `<Card variant="elevated">`; empty state is `<EmptyState>`.
- `apps/feng-app/app/(tabs)/profile.tsx` — sections use `<Card>`; "fill birth info" CTA is `<Button variant="secondary">`. Sign-out keeps the destructive-text-link pattern (no boxed button — matches the brand's editorial restraint).
- `apps/feng-app/app/(tabs)/readings.tsx` — list rows are `<Card>`; empty state is `<EmptyState>`.
- `apps/feng-app/app/(report)/[siteId].tsx` — chapter cards are `<Card variant="elevated">`; chapter kind label is now `<Pill variant="accent">` (replaces the previous text-only marker); loading state uses `<LoadingTextBlock>` skeleton (replaces ActivityIndicator); analyze CTA uses `<Button loading={analyze.isRunning}>` (replaces hand-rolled disabled Pressable); errors use `<ErrorState>`.

### Files intentionally not migrated

- `apps/feng-app/app/(new-site)/*` — 4-screen onboarding flow. Not visited this pass — these are working V1 scaffolds and migrate them in a follow-up.
- `apps/feng-app/app/(tabs)/compass.tsx` — entirely visualization (BaguaCompassOverlay rendering, sensor-driven needle). No card surfaces or CTA chrome to migrate.
- BootSplash inside `_layout.tsx` — must render before CoreUIProvider is mounted (chicken-and-egg). Reads `FENG_PALETTE` directly — intentional.

### New core-ui usage discovered

- `<Pill variant="accent">` proved useful for chapter-kind labels in the feng report. The yuán migration didn't surface this need — feng's report screen has more metadata per chapter (idx + kind + title + golden line + body), so the Pill compresses the kind label into a tight chip vs an inline uppercased Text.
- `<LoadingTextBlock>` is the right loading state for content-heavy screens like report views — better than ActivityIndicator which gives no spatial hint.

### V1 gaps still present (deferred to V2)

- `<Card>` doesn't have an `onPress` prop — apps still wrap in `<Pressable>`. Considered adding but mixing concerns; keep them separate.
- No standard "section header" component — feng-app's profile and readings tabs hand-roll `<Text style={{ fontSize: 28, fontWeight: '700' }}>{title}</Text>`. Adding `<SectionTitle>` is a V2 candidate.
- No `<Section>` primitive for grouped Card lists with a header — feng-app would benefit but Yuán doesn't need it. Defer until a third app would use it.

---

## 6. API envelope sweep — historical log (Weeks 2–7)

> **Status (2026-05-16)**: Batches 1–5 + bonds batch 4 + global error handler are **shipped**.  
> For **current** open work use **§16** (code) and **[local-manual-checklist.md](local-manual-checklist.md)** (human-only).  
> The table below is a Week 3 snapshot — some rows marked pending here were completed in later weeks.

Per phase-f-plan §3.1, every route migrates to the `{ ok, data, meta }` / `{ ok: false, error }` envelope. Batch 1 (public routes) progress:

| Route | File | Status | Notes |
|---|---|---|---|
| `GET /api/feng/declination` | `routes/feng/declination.ts` | ✓ Week 2 | Canonical proof |
| `POST /api/share` | `routes/share.ts` | ✓ Week 3 | Returns `{ ok: true, data: { shareId, url } }` |
| `GET /api/share/:shareId` | `routes/share.ts` | ✓ Week 3 | Was `{ data }` (partial envelope) → now `{ ok: true, data }` |
| `GET /api/share/yuan/:shareId` | `routes/share.ts` | ✓ Week 3 | Same pattern |
| `DELETE /api/share/:shareId` | `routes/share.ts` | ✓ Week 3 | Returns `{ ok: true, data: { revoked: true } }` |
| `GET /api/bonds/invite/:token/info` | `routes/bonds.ts` | ✓ Week 3 | Was `{ data }` → now `{ ok: true, data }`; 410 for expired |
| `GET /api/bonds/invite/:token/teaser` | `routes/bonds.ts` | ⏳ pending | Same pattern; do next |
| `GET /api/user/by-username/:username` | `routes/user.ts` | ⏳ pending | Larger surface; coordinate with chartPublic |
| `POST /api/hehun/preview` | `routes/hehun/preview.ts` | ⏳ pending | Pair-preview entry |

### Client-side coordination required

The envelope migration is a breaking change for response consumers. **Same-PR updates needed** before deploy:

1. **hexastral-web**:
   - `app/[locale]/report/[shareId]/page.tsx` — was `result.data` → now `result.ok && result.data`
   - `app/[locale]/yuan/report/[shareId]/page.tsx` — same
   - `app/[locale]/yuan/invite/[token]/page.tsx` — same for invite-info
2. **hexastral-client RPC types** — once routes settle, regen the typed RPC façades. Note: Hono's `hc<AppType>` inference may now succeed after the schema-registry sweep reduces tree depth (worth re-testing per phase-f-plan §3.8).
3. **scenario-yuan**'s `useSynastryShare` (if it consumes the share endpoints) — update return-type expectations.
4. **scenario-feng**'s share helpers — `apps/feng-app/lib/share.ts` already handles the envelope shape (uses raw fetch + manual JSON parse); will need a small adjustment when sweep continues.

### Remaining sweep batches (proposed)

Per phase-f-migration-notes §4:

- **Batch 2 — Feng family** (sites + jobs): higher complexity, has list pagination + state machine
- **Batch 3 — Bonds CRUD + synastry**: largest single file (~16 endpoints); break into sub-batches
- **Batch 4 — Numerology + Yi-Ching + onboarding**: medium complexity each
- **Batch 5 — Signal merge** (collapse `/today` + `/history` + `/item/:id` per §3.4)
- **Batch 6 — Auth boundary split** (`/api/public/*` vs `/api/*` per §3.7)

Each batch is one focused PR with the client-side update inline.

---

## 7. Hexastral-app strategic refactor (Week 4)

Per ADR-0004 §4, hexastral-app re-frames as the **platform anchor**, not a content-everything flagship. Two strategic tab refactors landed this week.

### 7.1 Bonds tab → Yuán install/open CTA

`apps/hexastral-app/app/(tabs)/friends.tsx` previously rendered ~520 lines of bond cards, radar charts, leaderboard teasers, and share-poster machinery. Phase F sunsets all of that to a clean Yuán pitch:

```
緣 (cinnabar hero glyph)
"Bonds live in Yuán"
"Yuán is our dedicated relationship-reading app..."
[Open Yuán →]
"Don't have Yuán yet? Get it on the App Store"
```

Behavior:
- `yuan://launch` deep link if Yuán is installed (Linking.canOpenURL check).
- App Store fallback otherwise.
- If the user has existing bonds, an italic line surfaces: "Your N bonds will appear in Yuán once you sign in there" — the data on `userBonds` is shared across both apps, so this isn't a lie.

What was removed:
- BondCard / BondSharePoster / aggregate radar chart / leaderboard teaser — all dead code from this surface.
- ~480 lines of imports + state + handlers.

What stays:
- The bond detail screens (`(bonds)/bond-detail.tsx`) remain functional for push-notification deep-links and shared-link landings.
- Server-side `userBonds` + `bondInvitations` tables unchanged.

This is the most aggressive ADR-0004 implementation point: the flagship explicitly DOES NOT own relationship UX anymore. The flagship is the daily-driver / AI-memory / birth-anchor surface; Yuán handles relationships.

### 7.2 Void tab → divination + satellite hub hybrid

`apps/hexastral-app/app/(tabs)/void.tsx` previously was a single-purpose oracle question picker (self / love / work / mood × 3 questions each). Phase F keeps the question picker as the primary surface but adds a "More tools" section below with the 5 satellite cards:

| Slug | Glyph | Blurb | Brand color |
|---|---|---|---|
| coincast | 卦 | Cast three coins, read the I-Ching | amber #B8741F |
| faceoracle | 面 | Snap a photo, read your face | jade #3F7B5C |
| dreamoracle | 夢 | Describe last night, find its meaning | indigo #3C3E76 |
| numerology | 1 | Calculate your life-path number | violet #5B3F8A |
| compass | 羅 | Magnetic compass with 24-mountain ring | copper #B08D5B |

Each card:
- Renders the brand glyph in a tinted square (background = accent at 10% alpha).
- Deep-links to `<slug>://launch` if the satellite is installed, App Store otherwise.
- Uses `<Card variant="elevated">` from core-ui for consistent surface treatment.

Strategic reason for the hybrid (not a separate tab): the divination questions and satellite tools share the same mental model ("ask a quick question, get an answer"). Splitting them into two tabs would dilute both. Combining surfaces both routes to user value without growing the tab bar past 4 slots.

### 7.3 Root layout wrapping

`apps/hexastral-app/app/_layout.tsx` adds `<CoreUIProvider brand="hexastral" mode={...}>` between `ThemeProvider` (react-navigation's) and `GestureHandlerRootView`. The existing `useTheme()` hook in `@/lib/theme` is **not** rewritten as a shim this time — hexastral-app has the largest call-site footprint (~80 files import from `@/lib/theme`), and the existing hook returns a different shape (`{ background, surface, ... }`) than core-ui's. Migration approach instead:
- Two theme systems coexist temporarily.
- New code in tabs/friends and tabs/void uses `useTheme()` from core-ui aliased as `useCoreTheme()` where the local hook is also imported.
- Existing 80+ files keep using `@/lib/theme`'s `useTheme()` unchanged.
- A future pass (V2 / Phase G) can rewrite the local hook as a shim.

This is a deliberate departure from feng-app's back-compat shim pattern — driven by the call-site count. Documented here so future agents don't try to "fix" the duplication prematurely.

### 7.4 What was NOT migrated in Week 4 (hexastral-app follow-ups)

- `(tabs)/index.tsx` (Fate home) — already polished; FateHomeHero SVG is brand identity and works well. Minor refactor pass deferred.
- `(tabs)/you.tsx` (profile/settings) — uses the local theme heavily; clean migration deferred.
- `(birth)/*` — 5-screen onboarding flow; works well, no urgency.
- `(reading)/*` — full report screens; ChapterPager is from scenario-yuan and already core-ui-adjacent.
- `(commerce)/*` — paywall surfaces; functional, deferred.
- `(settings)/*` — utility screens; deferred.

These migrate in Phase F.5 once the Phase F skeleton is fully in place.

---

## 8. API envelope sweep — Week 4 batch 2 (feng family)

Routes migrated to the shared `{ ok, data, meta }` envelope:

| Route | Status | Notes |
|---|---|---|
| `GET /api/feng/sites` | ✓ | `{ data: { sites: [...] }, meta: { total: N } }` |
| `POST /api/feng/sites` | ✓ | 201 with `{ data: { site } }` |
| `GET /api/feng/sites/:id` | ✓ | `{ data: { site, latestReport } }` |
| `PATCH /api/feng/sites/:id` | ✓ | `{ data: { site } }` |
| `DELETE /api/feng/sites/:id` | ✓ | `{ data: { deleted: true } }` |
| `POST /api/feng/sites/:id/analyze` | ✓ | 202 with `{ data: { jobId, siteId, stage, progress } }` |
| `GET /api/feng/jobs/:id` | ✓ | `{ data: { ...job, report } }` |

### 8.1 New helper: `unwrap()` in scenario-feng

To avoid touching every `res.json()` consumer with the same boilerplate, `packages/scenario-feng/src/lib/feng-api.ts` exports a shared `unwrap<T>(res)` helper that:

1. Parses the response body as `ApiResult<T>`.
2. If `ok: false`, throws an `Error` whose `code` property is the server's `error.code` (kebab-case) — clients can `catch` and switch on that.
3. Otherwise returns `result.data`.

Pattern:

```ts
import { unwrap } from '@zhop/scenario-feng/lib/feng-api'

const data = await unwrap<SitesListResponse>(await fengSites(client).$get())
setSites(data.sites)
```

This replaces the previous boilerplate:

```ts
const res = await fengSites(client).$get()
if (!res.ok) throw new Error(`feng_sites_list_failed (${res.status})`)
const json = (await res.json()) as SitesListResponse
setSites(json.sites)
```

5 hooks migrated to `unwrap()`: useFengSiteList, useFengSite, useCreateSite, useAnalyzeJob (both enqueue + poll), useDeclination (caught up from Week 2 backlog).

The pattern generalizes — when API envelope sweeps other route batches (bonds, share, signal), each scenario package can ship its own `unwrap()` (or we hoist a shared one into hexastral-client).

### 8.2 Remaining sweep batches (proposed)

- **Batch 3 — Compass routes** (`/api/compass/log`, `/api/compass/logs`) — small batch; pair with compass-app migration
- **Batch 4 — Yuán bonds** (~16 endpoints in `routes/bonds.ts`) — coordinate with yuán-app + scenario-yuan hooks
- **Batch 5 — Signal merge** (collapse `/today` + `/history` + `/item/:id`) per phase-f-plan §3.4
- **Batch 6 — Onboarding collapse** (deprecate `/reveal`, `/convert`, `/chart`, `/static-traits` sub-routes) per phase-f-plan §3.4
- **Batch 7 — Auth boundary split** (`/api/public/*` vs `/api/*`) per phase-f-plan §3.7

---

## 9. Satellite + Compass migrations (Week 5)

All 5 satellites + Compass now wrapped in `<CoreUIProvider brand="...">`. Per ADR-0004 §1 the brand keys map to locked palettes in `packages/hexastral-tokens/src/satellites.ts`:

| App | brand | Mode default | Pattern |
|---|---|---|---|
| compass-app | `compass` | dark | shim (`useAppTheme` reads core-ui) + raw `COMPASS_PALETTE` for SVG ticks |
| coin-cast-app | `coincast` | dark | shim (`useAppTheme`) + outer/inner split (provider above consumer) |
| face-oracle-app | `faceoracle` | dark | direct wrap (no local theme to shim) |
| dream-oracle-app | `dreamoracle` | dark | direct wrap (no local theme to shim) |
| numerology-app | `numerology` | **light** | shim (`useAppTheme`) + outer/inner split. Light default is intentional — Western-market accessible aesthetic. |

### 9.1 Chicken-and-egg gotcha

Apps with a back-compat-shim `useAppTheme()` hit a subtle ordering issue: the shim consumes `useTheme()` from core-ui which requires `<CoreUIProvider>` to be an ancestor. But the original root layout called `useAppTheme()` **at the same component level** that mounted the provider:

```tsx
// Broken — shim called outside provider:
export default function RootLayout() {
  const { colors } = useAppTheme()  // ← needs CoreUIProvider in tree, not yet mounted
  return (
    <CoreUIProvider brand="coincast" mode="dark">
      <Stack contentStyle={{ backgroundColor: colors.bg }} />
    </CoreUIProvider>
  )
}
```

**Fix pattern** (applied to coin-cast + numerology): split the root into an outer scaffold that mounts the provider and an inner `RootLayoutInner` that consumes it:

```tsx
export default function RootLayout() {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light'
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <CoreUIProvider brand="coincast" mode={mode}>
          <RootLayoutInner />
        </CoreUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function RootLayoutInner() {
  const { colors, isDark } = useAppTheme()  // ← safe — provider is above
  return <Stack contentStyle={{ backgroundColor: colors.bg }} />
}
```

Apps that don't have a local `useAppTheme()` (face-oracle, dream-oracle) escape this gotcha by either using raw palette constants directly (e.g., `darkTokens.bg`) or calling `getTokens(isDark)` before the provider is mounted (which is fine — `getTokens` is a pure function, not context-aware).

Compass-app avoided the issue similarly by using raw `COMPASS_PALETTE.inkTeal` in its root before the provider mounts.

### 9.2 Per-app deps + theme files touched

| App | package.json | _layout.tsx | lib/theme.ts |
|---|---|---|---|
| compass-app | add `@zhop/core-ui` | wrap + use raw palette for bg | refactor to shim |
| coin-cast-app | add `@zhop/core-ui` | outer/inner split | refactor to shim |
| face-oracle-app | add `@zhop/core-ui` | wrap | (no file) |
| dream-oracle-app | add `@zhop/core-ui` | wrap | (no file) |
| numerology-app | add `@zhop/core-ui` | outer/inner split | refactor to shim |

No screen-level migration was attempted this week — the goal was just to install the provider so each satellite gets its locked brand accent from `useTheme()` consumers down the tree. Screen-level migration (replacing inline View/Pressable with `<Card>` / `<Button>`) is Phase F.5/F.6 polish work.

---

## 10. API envelope sweep — Week 5 batch 3 (compass)

Compass routes migrated to the shared envelope:

| Route | Status | Notes |
|---|---|---|
| `POST /api/compass/log` | ✓ | 201 with `{ ok: true, data: { bearing } }` |
| `GET /api/compass/logs` | ✓ | `{ ok: true, data: { bearings }, meta: { total } }` |

Client coordination: compass-app and scenario-feng both reference compass logging via `compass(client)` in `packages/scenario-feng/src/lib/feng-api.ts`. The pro-tier bearing log isn't wired into any active hook yet, so no consumer-side change required this week — when the pro-tier UI lands, those callers will use `unwrap()` like the feng hooks.

### 10.1 Remaining sweep batches (revised)

- **Batch 4 — Yuán bonds** (Week 6). Split into 4a (read-side: 4 endpoints) + 4b (mutation-side: 12 endpoints). Largest single file remaining; deliberately deferred past Week 5 — see phase-f-plan §10 decisions log.
- **Batch 5 — Signal merge** (Week 7). Collapse `/today` + `/history` + `/item/:id` into `GET /api/signal?...` per phase-f-plan §3.4.
- **Batch 6 — Onboarding collapse** (Week 7). Deprecate `/reveal`, `/convert`, `/chart`, `/static-traits` sub-routes per phase-f-plan §3.4.
- **Batch 7 — Auth boundary split** (Week 8). Move public routes to `/api/public/*` router per phase-f-plan §3.7.

### 10.2 Open questions for Yuán bonds (Week 6)

Before starting batch 4, settle:
- Should `PATCH /bonds/:id` and `PATCH /bonds/:id/stage` merge per phase-f-plan §3.2 (granularity collapse), or stay split?
- Should `/bonds/leaderboard` (currently in hexastral-app's friends.tsx — now sunset) move to yuán-app's API surface, or be deleted entirely with the Bonds tab sunset?
- scenario-yuan's `useBondList` returns `{ bonds: [...] }` directly today. Adding `unwrap()` is straightforward, but the type-export chain in hexastral-client may need a parallel update.

---

## 11. Yuán bonds envelope sweep — Week 6 batch 4

The largest single API file (`apps/hexastral-api/src/routes/bonds.ts`, ~1840 lines, 16 endpoints) migrated to the shared `{ ok, data, meta }` envelope.

### 11.1 Endpoints migrated

| Endpoint | Sub-batch | Notes |
|---|---|---|
| `GET /api/bonds/credits` | 4a (read) | Quota status; flat `{ ok: true, data: credits }` |
| `GET /api/bonds/invite/:token/teaser` | 4a (read) | Public; B's post-respond teaser; flattened from `{ data: {...} }` legacy |
| `GET /api/bonds` | 4a (read) | List with `meta: { total }` |
| `GET /api/bonds/:id` | 4a (read) | Detail; flattened |
| `GET /api/bonds/:id/synastry` | 4a (read) | Daily synastry compute; flattened; Pro-gate now uses `subscription_required` error code |
| `GET /api/bonds/active-pairs` | 4a (read) | Internal-key-protected; cursor pagination via `meta: { cursor }` |
| `PATCH /api/bonds/:id` | 4b (mutation) | **MERGED** with the former `PATCH /:id/stage` — single endpoint with union payload `{ targetName?, relationshipLabel?, relationshipStage? }`, at least one required (see §11.2) |
| ~~`PATCH /api/bonds/:id/stage`~~ | 4b (mutation) | **REMOVED** — collapsed into `PATCH /:id` |
| `POST /api/bonds/solo` | 4b (mutation) | Solo bond creation; paywall path uses `paywall_required` code |
| `POST /api/bonds/invite` | 4b (mutation) | Resonance invite; mailer failure → `upstream_unavailable` |
| `POST /api/bonds/invite/:token/respond` | 4b (mutation) | B's accept/decline |
| `POST /api/bonds/:id/unlock` | 4b (mutation) | B's $5 unlock; flow uses `conflict` for "already unlocked" |
| `POST /api/bonds/:id/gift` | 4b (mutation) | A gifts to B |
| `POST /api/bonds/:id/share` | 4b (mutation) | Generates share link |
| `DELETE /api/bonds/:id` | 4b (mutation) | Soft delete + refund |
| `GET /api/bonds/invite/:token/info` | (Week 3) | Already migrated in batch 1 |

### 11.2 PATCH merge — granularity collapse

Per phase-f-plan §3.2, the historically split `PATCH /:id` (label/name) and `PATCH /:id/stage` (stage) became one endpoint:

```ts
const updateBondSchema = z
  .object({
    targetName: z.string().min(1).max(50).optional(),
    relationshipLabel: z.string().min(1).max(30).optional(),
    relationshipStage: z.enum([...]).optional(),
  })
  .refine(v => v.targetName !== undefined || v.relationshipLabel !== undefined || v.relationshipStage !== undefined, {
    message: 'At least one field must be provided'
  })
```

Clients pass any subset. The route updates only the fields present. This eliminates one route file, one inline Zod schema, and one client-side decision tree.

The legacy `PATCH /:id/stage` URL is removed (not 301-redirected) since no real users exist pre-PMF. The hexastral-app's "old" PATCH stage callers were sunset along with the Bonds tab (Week 4).

### 11.3 Global error handler — envelope by default

`apps/hexastral-api/src/index.ts onError()` now emits the envelope shape (`{ ok: false, error: { code, message } }`) for any `HTTPException` thrown from helpers — not just from route handlers. This means:

- The `checkBondLimit()` helper still throws (unchanged) but its 404 → `{ ok: false, error: { code: 'not_found', message: 'User not found' } }`.
- `notFound()` for unmatched routes emits envelope.
- Zod validation errors emit `code: 'validation_failed'` with `details.zod`.
- Unhandled errors emit `code: 'internal_error'`.

The `codeFromStatus()` lookup translates HTTP status → kebab-case error code (400→`invalid_input`, 401→`unauthorized`, 403→`forbidden`, 404→`not_found`, 409→`conflict`, 410→`gone`, 429→`quota_exhausted`, 502→`upstream_unavailable`, etc.). New error codes added to `ApiErrorCode` registry as needed (e.g., `subscription_required` for the daily-synastry Pro gate).

### 11.4 scenario-yuan `unwrap()` + hook updates

Mirroring scenario-feng's pattern, `packages/scenario-yuan/src/lib/yuan-bonds-api.ts` now exports `unwrap<T>(res)`. Three hooks updated:

- `useBondList` — `data.bonds` after unwrap
- `useSynastryReport` — preserves the 202 generating-in-progress special case (checked before `unwrap`) since that's not an envelope error, it's a flow signal
- `useBondInvitation` — `create()` and `respond()` return `unwrap`'ed data directly

The 202 handling in `useSynastryReport` is the only place where a non-envelope response coexists. Documented inline.

---

## 12. Dream Oracle screen-level adoption (Week 6 start)

Started the satellite screen-level core-ui adoption (deferred from Weeks 4-5 per phase-f-plan §4.5). Proof-of-pattern: `apps/dream-oracle-app/app/result.tsx` "Open full detail" link upgraded from a plain `<Link>` to a `<Button variant="secondary">` from core-ui. Effect: press-state animation + haptic + brand-accent (indigo per ADR-0004 §1) styling all come for free.

Note that `<SatelliteResultCard>` from `@zhop/satellite-ui` is kept — it's shared infrastructure across all satellites, and migrating it would affect coin-cast / face-oracle / numerology simultaneously. That migration is a follow-up: lift the SatelliteResultCard pattern into core-ui's component set or refactor the existing component to internally consume `useTheme()` from core-ui.

Remaining satellite screen polish queued for Week 7:
- coin-cast result.tsx + history.tsx + paywall.tsx
- face-oracle capture.tsx (camera flow) + result.tsx
- numerology compute.tsx + result.tsx
- compass index.tsx (the dial — primarily SVG visualization, low core-ui leverage)

---

## 13. API envelope sweep — Week 7 batches 5+6 (signal + onboarding bootstrap)

### 13.1 Signal routes (batch 5)

`apps/hexastral-api/src/routes/signal.ts` — 3 routers (today / history / item) migrated to the envelope without collapsing the URL structure:

| Route | Status | Notes |
|---|---|---|
| `GET /api/signal/today` | ✓ | `{ ok: true, data: SignalResponse }`. Lazy-generation flow unchanged inside `withEdgeCache`. |
| `GET /api/signal/history?days=N` | ✓ | `{ ok: true, data: { days, proCapped, items: [...] }, meta: { total } }`. Pro-cap warning surfaces via `data.proCapped`, not via envelope. |
| `GET /api/signal/item/:signalId` | ✓ | `{ ok: true, data: SignalResponse }` |
| `DELETE /api/signal/item/:signalId` | ✓ | `{ ok: true, data: { deleted: true } }` — was `{ ok: true }` which collided with envelope shape |

**Granularity-collapse deferred to Phase G.** The phase-f-plan §3.4 polymorphic-response design (`GET /api/signal?date=&limit=&cursor=` returning either a single signal or a list) is genuinely a different change — the polymorphism makes TypeScript discrimination ugly, and the today route's 130-line lazy-generation logic doesn't share well with simple list handlers. The envelope migration is the immediate value; the URL collapse is a cosmetic follow-up. Recommend revisiting only after a third route benefits from the same pattern.

**Client coordination**: `apps/hexastral-app/lib/hooks/useSignalQuery.ts` updated with inline `ApiSuccess<T> | ApiError` types + envelope unwrap (mirrors scenario-feng / scenario-yuan `unwrap()` pattern — we'd hoist these into `@zhop/hexastral-client` if a 4th consumer appears).

### 13.2 Onboarding bootstrap (batch 6 — partial)

`apps/hexastral-api/src/routes/onboarding/bootstrap.ts` migrated. The route previously used an ad-hoc `{ ok: boolean, code, step }` envelope (not the new shared shape). Now:

- Validation failure (no birth info) → `jsonErr(400, missing_required, ..., { step: 'validate' })`
- Chart skeleton failure → `jsonErr(502, upstream_unavailable, ..., { step: 'chart' })`
- Signal generation failure → `jsonErr(502, generation_failed, ..., { step: 'signal', traits: skeleton })` — partial-success path preserved via `details.traits`
- Success → `jsonOk({ traits, signal })`

**Other onboarding sub-routes deferred**: `reveal.ts`, `convert.ts`, `chart.ts`, `static-traits.ts` — these are slated for deprecation per phase-f-plan §3.4 (bootstrap becomes the canonical entry). Migrating them only to immediately deprecate is wasted work; will fold the deprecation into the same Phase G cleanup pass.

---

## 14. Satellite screen-level sweep (Week 7)

Three more satellite result screens upgraded from inline `<Link>` / `<Pressable>` to core-ui `<Button>` (press-state + haptic + brand accent):

| App | Screen | Change |
|---|---|---|
| dream-oracle-app | `app/result.tsx` (Week 6) | `<Button variant="secondary">` for "Open full detail" |
| coin-cast-app | `app/result.tsx` | `<Button variant="secondary">` for "Open detail" (amber accent from brand="coincast") |
| face-oracle-app | `app/result.tsx` | `<Button variant="secondary">` for "Open full detail" (jade accent) |
| numerology-app | `app/result.tsx` | `<Button variant="secondary">` for recompute CTA (violet accent); error state also upgraded; loose Pressable→Button replacement at the bottom (fullWidth) |

Each migration also imports `useTheme()` from core-ui to source `spacing` — replacing hardcoded `24`, `8`, `12`, `16` pixel literals with token references (`spacing.xl`, `spacing.sm`, `spacing.md`, `spacing.lg`).

**SatelliteResultCard kept** across all 3 apps. It's shared infra from `@zhop/satellite-ui`; refactoring it would simultaneously affect 4 apps. Defer to Phase G — either lift into core-ui or refactor internally to consume `useTheme()`.

---

## 15. ja reviewer status — flagged as launch-blocking

Per phase-f-plan §10, the ja content reviewer hire deadline was **Week 5**. As of Week 7 documentation, the hire status is unknown. Action items:

- **If hired**: confirm review delivery by end of Week 8 (4-week lead time was the budget assumption); track in phase-f-plan §10 decisions log.
- **If not hired**: two paths —
  1. **Accelerated hire** (Upwork / Lancers.jp) targeting 2-week turnaround instead of 4. Higher cost (~$3k vs $2k budgeted) but preserves Week 8 launch.
  2. **Descope JP launch** — ship en/zh-Hant/zh first, mark Fēng/Yuán/HexAstral JP listings as "Coming soon" in App Store Connect. Reuse the reviewer in Phase G for ja localization V1.1.

Recommended call (mine): if the hire didn't happen by Week 5 EOW, descope to en/zh-only for V1 launch and treat ja as a fast-follow V1.1. Pre-PMF, validating the core funnel in 2 locales is more valuable than launching simultaneously in 3 with one mistranslated.

User decision needed — flagged here so it surfaces in Week 8 planning.

---

## 16. What's still queued

> **Human-only launch tasks** (EAS, Apple, RevenueCat, designer, ja review): **[local-manual-checklist.md](local-manual-checklist.md)**.

Of the §6 timeline in `phase-f-plan.md`, after Week 7 (code in repo):

- ✓ `@zhop/core-ui` foundation (Week 1)
- ✓ `@zhop/ai-vision` extraction (Week 2)
- ✓ API envelope + schemas primer (Week 2)
- ✓ yuán-app + feng-app migrations (Week 2-3)
- ✓ Designer brief written → ready to send (Week 3)
- ✓ hexastral-app strategic ADR-0004 refactor (Week 4)
- ✓ All 5 satellites + Compass wrapped in CoreUIProvider (Week 5)
- ✓ API envelope batches 1-3 (public + feng family + compass) (Week 2-5)
- ✓ API envelope batch 4 (Yuán bonds — 15 endpoints + PATCH merge) (Week 6)
- ✓ Global error handler emits envelope (Week 6)
- ✓ scenario-yuan hooks consume `unwrap()` (Week 6)
- ✓ API envelope batch 5 (signal — 3 endpoints + useSignalQuery update) (Week 7)
- ✓ API envelope batch 6 partial (onboarding bootstrap; reveal/convert/chart/static-traits deferred) (Week 7)
- ✓ 4 satellite result screens use `<Button>` from core-ui (Week 6-7)
- ⏳ ja content review status — **launch-blocking; user decision needed** (see §15)
- ⏳ EAS production builds + App Store listings (Week 8)
- ⏳ Auth boundary split (`/api/public/*` vs `/api/*`) — Phase G candidate
- ⏳ Remaining onboarding sub-route deprecation — Phase G
- ⏳ SatelliteResultCard refactor — Phase G

The smoke-test failure (Expo Go crash on feng-app facing screen) is documented at `phase-f-plan.md` §4.3 — fix is to ship a dev-client build via `eas build --profile development` since `expo-sensors` + Reanimated v4 worklets aren't fully supported in Expo Go SDK 54.

---

## 17. Other apps — migration checklist (copy-paste pattern)

When migrating the next app (recommend order: hexastral-app, compass-app, then satellites in any order):

1. Add `"@zhop/core-ui": "workspace:*"` to `apps/<app>/package.json`.
2. Wrap root in `<CoreUIProvider brand="..." mode="...">` between SafeAreaProvider and any app providers. Use `useColorScheme()` for mode if the app supports both.
3. **If the app has a local `theme.ts` returning a custom color shape** (like feng-app's `useFengTheme()`):
   - Rewrite the hook to internally consume `useTheme()` from core-ui and map to the legacy shape. Existing call sites keep working.
   - Document this as a back-compat shim with a `@deprecated` marker.
   - Plan a separate gradual migration to call `useTheme()` directly when convenient.
4. **If the app uses tokens directly** (like yuán-app):
   - Existing `yuanLight` / `yuanType` / `yuanPresets` imports remain — they're brand identity.
   - Only the *root provider* needs to change.
5. Identify all `<Pressable>` + custom-styled cards → migrate to `<Card>`. Wrap in `<Pressable>` for tap target.
6. Identify all "empty data" inline blocks → migrate to `<EmptyState>` (with `customAction` if brand needs).
7. Identify all "error + retry" inline blocks → migrate to `<ErrorState>` (with `customAction` if brand needs).
8. Identify loading states — for content views use `<LoadingTextBlock>` / `<LoadingSkeleton>`. For brand moments (Yuán's breathing seal) keep the custom component.
9. Identify hand-rolled disabled-Pressable buttons → migrate to `<Button loading={...}>`.
10. Identify status-marker text labels (`CHAPTER N · KIND`) → consider `<Pill variant="accent">` for the marker portion.
11. Document any brand-identity expression that DIDN'T migrate in this doc under the app's section.

---

## 18. Open questions / V2 candidates

- **Brand typography overrides** — CoreUIProvider should accept per-brand typography (Yuán editorial scale, Fēng technical scale, satellite ASO-appropriate scales) so `<Text variant="body">` works for everyone. Defer to V2 of core-ui.
- **PageTransition primitive** — not in V1 set. Add once we see 3+ apps wanting consistent navigation animations.
- **Web parity primitives** — `@zhop/core-ui` is RN-only. For hexastral-web, either ship a `core-ui/web` entry (Tailwind theme generator) or accept that web has its own implementation. Decision in phase-f-plan §5.
- **Lint rule for hardcoded colors** — phase-f-plan §2.3 mentioned this as a token-enforcement mechanism. Biome custom rules are not trivial; defer until we see actual drift post-migration.
- **`<SectionTitle>` primitive** — every app has hand-rolled section headers (28px bold). Add when migrating hexastral-app since it has many.
- **`<Section>` primitive** — grouped Card list with header. Add when a third app would use it.
- **`<Card onPress>` prop** — currently apps wrap Card in Pressable. Mixing concerns; defer unless ergonomic cost becomes painful.
