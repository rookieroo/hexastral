# Phase K — Two-Layer Matrix Restructure

> **Status**: in execution — K.0 ADRs + K.1 (fate-app) + K.2 (discovery) + **K.5 (chat → yuan/feng) done (2026-05-21)**; K.3 + K.4 open.
> **Decision records**:
> - ✅ Created: [ADR-0009](decisions/0009-two-layer-matrix.md) (Two-Layer Matrix) — 2026-05-21
> - ✅ Amended: ADR-0004 §1 (matrix), ADR-0006 (tiers re-cut on monetization axis), ADR-0007 (reverted)
> **Created**: 2026-05-20.
> **Prerequisite**: Numerology → 梅花 (done), Compass kill (done).
> **Update (2026-05-20 conversation)**:
> - Adopt **fate-app-first**: build the new Tier-3 `fate-app` satellite first, then **retire** `hexastral-app` (Wave 4) — do not refactor it in place.
> - Auth model lock:
>   - **No-auth MVP satellites**: coin-cast, dream-oracle, numerology, cycle, fate-app.
>   - **Special high-cost exception**: face-oracle uses auth + IAP (trial-or-paid).
> - LLM strategy lock: no naive "first 3 days Pro output". Use **Conservative Mode v1** (non-periodic hard limits + optional one-time lifetime peak pass + graceful fallback).
>
> **ADR numbering**: this phase = **ADR-0009** (latest existing is 0008); the Cycle plan = ADR-0010. Phase K executes first, so it takes the lower number.
>
> **Naming note**: "two-layer" names the funnel-top **monetization** split (flagship vs. funnel) — a different axis from [ADR-0008](decisions/0008-three-layer-architecture.md) ("three-layer" = package-sharing layers). The tier model below is still **3 tiers** (flagship / Tier-2 high-cost / Tier-3 funnel). ADR-0009 must state this so it doesn't read as colliding with ADR-0008.

## Why

ADR-0007 refocused hexastral-app as the "personal-fate flagship" but the matrix
audit (and user instinct) revealed hexastral.fate cannot carry flagship
expectations. The corrected architecture is:

- **Only two flagships** (Tier 1, IAP-producing): Yuán + Fēng.
- **Everything else is funnel** (Tier 3 satellites): fate-app (八字+紫微 — replaces
  retired hexastral-app; see §0.1.1), Coin Cast, Dream Oracle, Numerology(梅花), Cycle(黄历).
- **Special case** (Tier 2 high-cost): FaceOracle — can't be free anonymous
  (VLM inference cost) but isn't a flagship either; needs trial-or-paid model.

Implications (these omnibus problems are what drove the **retire** decision in §0.1.1 — fate-app is built clean rather than refactoring hexastral in place):
- hexastral-app's `DiscoverSatellitesSection` was flagship/hub behavior — wrong for a funnel.
  A Tier-3 funnel satellite (fate-app) has outbound `SatelliteFlagshipUpsellCard`
  pointing at the actual flagships (Yuán + Fēng), not a hub-style central
  rail.
- hexastral-app's Pro tier is wrong — satellites don't have IAP. Chat moves
  to Yuán + Fēng (which have Pro).
- The cross-app discovery mapping should be **server-side configurable**
  (KV-based), not hardcoded in each app, so business can adjust without
  shipping new builds.
- LLM cost/quality funnel should be **shared across all satellites**, not
  implemented app-by-app.

---

## 0. TL;DR — updated sub-phases

| Step | What | Risk | Days |
|---|---|---|---|
| **K.0** ✅ | ADR foundation — ADR-0009 written + 0004/0006/0007 amended (done 2026-05-21) | Low | 0.5 |
| **K.1** | `fate-app` creation (Tier 3, no-auth MVP) + dynamic flagship upsell insertion | Medium | 3-4 |
| **K.2** | Dynamic discovery endpoint — `/api/discovery/recommendations` + KV config + client hook **(shared foundation — Cycle + Chat consume this)** | Medium | 2-3 |
| **K.3** | FaceOracle billing decision — paid one-shot vs trial+paywall (auth + IAP) | Low-Medium (+ product call) | 1-2 |
| **K.4** | Shared LLM funnel guard (Conservative Mode + budget guard) — built once as a package **(shared foundation — Cycle + Chat consume this)** | Medium | 2-3 |
| **K.5** ✅ | Chat transfer — yuan-app + feng-app chat over core-ui ReadingChatScreen + server 'feng' type (done 2026-05-21) | Low-Medium | 2 |

Total: ~2-3 weeks of focused work.

**Dependencies**:
- K.0 → everything (ADR locks direction first)
- **K.2 + K.4 are shared foundations** — consumed by the Cycle plan AND the Chat plan, not just Phase K. Build them right after K.0, as a reusable endpoint/package, **before** the downstream plans (see [ROADMAP.md](./ROADMAP.md) global order). Do not let Cycle re-implement the guard.
- K.1 (fate-app) can parallelize with K.2
- K.3 standalone
- K.4 can start once the K.2 endpoint contract is stable
- K.5 depends only on K.1 *direction* locked (do not block on any hexastral refactor); K.5 in turn **unblocks the entire Chat plan**

---

## 0.1 Scope correction from conversation

### 0.1.1 `hexastral-app` handling — RETIRE (decided 2026-05-20)

`hexastral-app` is an omnibus "命緣卦道" app whose ASO + tabs sell 命/星/六爻/合婚/面相/黄历
all at once — i.e. it overlaps **four** matrix members simultaneously: Yuán (合婚/synastry),
Coin Cast (六爻/yiching), FaceOracle (面相), and the planned Cycle (黄历). Several of those
surfaces are already rotting — its personalized almanac
([app/(explore)/almanac.tsx](../apps/hexastral-app/app/(explore)/almanac.tsx)) is **disabled
dead code** since svc-fortune was deleted. An omnibus app cannibalizes the very funnel the
matrix is built on (ADR-0004 §2 anti-cannibalization) and ranks for nothing specific in ASO.
This is the deeper reason the "flagship" framing of ADR-0007 failed — not that hexastral.fate
is a weak flagship, but that the omnibus shape itself contradicts the satellite-funnel matrix.

**Decision (2026-05-20): RETIRE.** `hexastral-app` will be deleted. A new clean Tier-3 satellite
`fate-app` (pure 八字 + 紫微 personal-fate reading) replaces its only non-overlapping surface; the
rest already have homes: 合婚→Yuán, 六爻→Coin Cast, 面相→FaceOracle, 黄历→Cycle. Execution: build
`fate-app` first (K.1), then delete `hexastral-app` once fate-app + Cycle cover its surfaces
(Wave 4). Narrow/demote alternatives are rejected — narrowing just yields `fate-app` with legacy
baggage; in-place demotion (legacy draft, old §2, now replaced by the K.1 below) is highest-churn
lowest-value.

**fate-app positioning — pure funnel, no DAU.** 八字/紫微 is one-time深度 consumption; do **not**
chase daily retention on fate-app. Its job is acquisition + birth-chart capture + funnel. The
命理 line's daily-active is served by **Cycle** (黄历 + 对你而言), which reads the chart fate-app
captured. The matrix is one data flow, not three rival apps:

```
fate-app (capture 命盘) → portfolio memory → Cycle (daily 对你而言) + Yuán (合婚) + Fēng (命卦)
```

fate-app KPIs = ASO installs (八字/紫微/命盘 keywords) · birth-info capture rate · funnel CTR to
Yuán/Fēng · downstream personalization seed count — **not** D7/D30. Re-engagement, if any, is
low-frequency milestone push only (大运/流年 transitions), never daily 运势 (that re-creates the
Cycle overlap we just removed).

### 0.1.2 Satellite auth split

Lock per-app auth/IAP model:

| App | Model |
|---|---|
| coin-cast / dream-oracle / numerology / cycle / fate-app | anonymous-first, no-auth MVP |
| face-oracle | auth + IAP (high VLM cost exception) |

### 0.1.3 LLM conversion/cost model (v1)

Do not use time-based freebies like "first 3 days Pro output".

Use **Conservative Mode** first:

- no periodic rewards, no streak minting, no refill loops.
- hard daily limits + global budget cap + cache/template fallback.
- optional one-time lifetime peak pass (non-renewing) for first wow moment.
- keep output difference explicit when deep route is used ("Deep/Pro-level").

---

## 1. K.0 — ADR foundation (0.5 days)

> **Status (2026-05-21): DONE.** [ADR-0009](decisions/0009-two-layer-matrix.md) written;
> ADR-0004 §1 brand matrix replaced with the two-layer model; ADR-0006 tiers re-cut on a
> monetization axis (face-oracle→Tier 2, rest→Tier 3) with the old capability checklist kept
> as the Tier-3 build contract; ADR-0007 marked Reverted. ADR-0010 (Cycle) is **not** part of
> K.0 — it belongs to the Cycle plan's C.0.

### K.0.1 New: ADR-0009 Two-Layer Matrix

Create `docs/decisions/0009-two-layer-matrix.md`. Outline:
- Status: Accepted
- Date: 2026-05-20
- Supersedes: ADR-0007 (hexastral refocus) in part

Sections:
- **Context**: ADR-0007 positioned hexastral.fate as flagship; the Phase K audit
  found not just that it is a weak flagship, but that the **omnibus shape itself**
  (命/星/六爻/合婚/面相/黄历 in one app) contradicts the satellite-funnel matrix and
  cannibalizes its own satellites. Resolution: **retire hexastral-app**; a clean
  Tier-3 `fate-app` (八字 + 紫微) replaces its natal surface.
- **Decision**:
  - Tier 1 (flagships, IAP-producing): Yuán + Fēng — only these two.
  - Tier 2 (high-cost limited): FaceOracle.
  - Tier 3 (anonymous satellite funnels): fate-app (八字+紫微, replaces retired
    hexastral.fate), Coin Cast, Dream Oracle, Numerology(梅花), Cycle(黄历).
  - All Tier 3 surfaces end on a SatelliteFlagshipUpsellCard pointing
    server-config-driven flagship target.
  - Cross-app discovery routing is server-side configurable (see K.2).
- **Consequences**:
  - Positive: cheaper top-of-funnel (no need to make hexastral a strong product
    on its own); cleaner billing model; matrix simplification.
  - Negative: hexastral-app is retired/deleted (its Pro features go away); fate-app
    replaces only the natal surface. Pre-PMF, no real users, low cost.

### K.0.2 Amend: ADR-0004 §1 brand matrix

Replace current 3-flagship / 5-satellite breakdown with:
```
Flagships:  Yuán (緣), Fēng (風)
Tier 2:     FaceOracle (jade, high-cost VLM)
Satellites: fate-app (命: 八字+紫微 — replaces retired hexastral-app), Coin Cast,
            Dream Oracle, Numerology(梅花), Cycle(黄历)
```

### K.0.3 Amend: ADR-0006 satellite tiers

Update tier definitions:
- Tier 1 = flagship (full reading product + Pro IAP). Members: yuan, feng.
- Tier 2 = limited paid product (high inference cost). Members: face-oracle.
- Tier 3 = anonymous funnel (no IAP, ASO target). Members: fate-app (replaces
  retired hexastral-app), coin-cast, dream-oracle, numerology, cycle.

### K.0.4 Amend: ADR-0007 hexastral refocus

Mark as **reverted / retired**. Keep historical reasoning but lead with
"Status: Reverted by ADR-0009 — the omnibus hexastral-app is **retired**; a clean
Tier-3 `fate-app` (八字 + 紫微) replaces its natal surface as of 2026-05-20."

### K.0 acceptance gate

- ✅ All 4 ADR docs land (0009 created; 0004/0006/0007 amended)
- ✅ No code change yet — just decision lockdown

---

## 2. K.1 — Build `fate-app` (pure 八字+紫微 funnel) + retire `hexastral-app` (3-4 days)

> Replaces the legacy "hexastral demotion" draft. Per §0.1.1, hexastral-app is **retired**, not
> refactored in place: build a clean Tier-3 satellite `fate-app`, harvest hexastral's natal +
> stellar surfaces, drop the rest, then delete hexastral in Wave 4.

> **Status (2026-05-20): `fate-app` built + verified** (`bun --filter @zhop/fate-app typecheck` green).
> Shipped: scaffold (`usePortfolioSatelliteBootstrap`, no auth/IAP) · client-side 八字 命盘
> ([lib/natal.ts](../apps/fate-app/lib/natal.ts) over astro-core) · local birth-info capture (core-ui
> `BirthInfoForm`) · 紫微 12-palace ([lib/ziwei.ts](../apps/fate-app/lib/ziwei.ts) over `iztro`) · Me tab
> (optional Apple sign-in + portfolio birth-sync) · funnel upsell wired to K.2 (dynamic + offline
> fallback). Tabs: 八字 / 紫微 / 我. Icon/splash temporarily reused from hexastral-app.
> **Deferred**: AI 命盘解读 (needs K.4 + svc-astro); chapter report; true-solar-time + 南半球 correction
> (v1 uses representative hour); hexastral-app deletion (Wave 4). Assets/EAS projectId = local-manual.
>
> **Update 2026-05-21**: funnel now emits `cross_app_discovery_tap` on upsell tap (K.2 telemetry);
> local birth-draft extracted to `@zhop/satellite-runtime` `local-birth-draft` (shared, Cycle will
> reuse) — fate's index/stellar in-app duplication removed via a `lib/use-birth-draft` hook.

### K.1.1 New Expo app `apps/fate-app/`

- Bundle ID: `com.hexastral.fate` (reuse the retired app's — same ASO lineage + 八字 positioning)
- URL scheme: `fate://`; brand color: inherit hexastral's 命 ink/charcoal (don't collide with yuan/feng/cycle)
- `@zhop/satellite-runtime` from day 0: `usePortfolioSatelliteBootstrap({ storagePrefix: 'fate', targetApp: 'fate' })`
- **No auth, no IAP** (Tier-3 per §0.1.2). Apple Sign-In optional (history sync / cross-app).
- Bootstrap from `coin-cast-app` / `numerology-app` template, then port content (K.1.2).

### K.1.2 Harvest from retired hexastral-app (reuse, don't rewrite)

| Surface | Source in hexastral-app | Notes |
|---|---|---|
| 八字 四柱 + 十年大运 | `app/(tabs)/natal.tsx` | core reading |
| 紫微 12宫 | `app/(tabs)/stellar.tsx` | "合紫薇" — second natal system |
| Report chapters | `app/(tabs)/report/[slug].tsx` + `report/index.tsx` | deep scrollable reading |
| Birth input | `app/(birth)/birth-form.tsx` + `birth-info.tsx` | feeds portfolio capture |
| Identity UI | `components/profile-page/{HeroIdentity,FateSignature}.tsx`, `reading/GlossaryExpander.tsx` | reuse as-is |
| Compute | `@zhop/astro-core` (ganzhi/紫微) + `@zhop/astro-i18n` | already shared (ADR-0008) |

fate-app is a thin client over the shared compute packages — no engine code in the app.

### K.1.3 Explicitly DROP (these belong to other matrix members)

| Dropped surface | Goes to |
|---|---|
| `(tabs)/synastry.tsx` (合婚) | **Yuán** |
| `detail/yiching/*` (六爻/梅花) | **Coin Cast** / Numerology |
| `(explore)/almanac.tsx` (黄历 — already dead code) | **Cycle** (harvest its payload shape, cycle-plan C.1.2) |
| `(commerce)/paywall.tsx`, `lib/domain/subscription.ts`, `lib/sku-catalog.ts`, `getIsPro`, `useQuota` | nothing — Tier-3 has no IAP |
| `detail/chat/*` | **Yuán + Fēng** (K.5) |

### K.1.4 Funnel surfaces (the satellite's real job)

- `SatelliteFlagshipUpsellCard` (`@zhop/satellite-ui`) at the end of the natal report + stellar screens.
- `SatelliteQuestionTypePicker` → intent routing: 姻缘/感情→Yuán, 财运/事业/居住→Fēng (pattern from numerology/face-oracle result screens).
- Flagship target **dynamic via K.2**: `useDiscoveryRecommendations(source='fate', intent, locale)`; offline fallback yuan(relationship)/feng(home·career).
- **Birth-info capture is the strategic payload**: on first reading, persist the 命盘 to portfolio memory so Cycle / Yuán / Fēng / Chat can personalize. This is fate-app's highest-value output.
- **Re-engagement — low-frequency only**: 大运/流年 milestone push ("你今年进入 X 大运" / "本月桃花星动") → deep-link → flagship upsell. **No daily 运势** — that is Cycle's territory.

### K.1.5 Positioning + KPIs

fate-app is a **pure Tier-3 ASO funnel + the matrix's birth-chart capture / identity anchor**. Do
not hold it to DAU — 命盘 is one-time深度 consumption. The 命理 daily-active is served by **Cycle**
(黄历 + 对你而言), fed by the chart fate-app captures. KPIs: ASO installs (八字/紫微/命盘 keywords) ·
birth-info capture rate · funnel CTR to Yuán/Fēng · downstream seed count — **not** D7/D30.

### K.1.6 ASO

`apps/fate-app/aso-metadata.json` (new): subtitle "八字 · 紫微命盘 / Natal + Stellar". Keyword
beachhead = 八字/四柱/紫微斗数/命盘/natal chart — **distinct from Cycle's 黄历/择日** so the two
satellites don't cannibalize (ADR-0004 §2). Mention Yuán + Fēng as deeper companions.

### K.1.7 Retire hexastral-app (Wave 4 — gated on fate-app + Cycle shipping)

Deletion checklist (do NOT run until fate-app ships AND Cycle covers 黄历):
- Delete `apps/hexastral-app/` (and stale `apps/compass-app/` if still on disk — ROADMAP §0 lists it as killed).
- App Store: pull the omnibus listing, or repurpose it for fate-app (same bundle id) — product call.
- Server: `/api/chat` stays (yuan/feng use it). Hexastral-only conversation rows: let rot (pre-PMF, §9 Q2).
- Discovery/bootstrap enums: remove `hexastral` source/target, add `fate`.
- Update ADR-0002/0004 §1, ROADMAP app counts, README.

### K.1 acceptance gate

- `fate-app` boots anonymous, uses `usePortfolioSatelliteBootstrap`; no auth/IAP/chat code present.
- 八字 + 紫微 reading renders from `@zhop/astro-core`; birth info persists to portfolio memory.
- `SatelliteFlagshipUpsellCard` + intent routing resolve via K.2 (offline fallback works).
- No 黄历/合婚/六爻/面相 surface in fate-app; ASO keywords distinct from Cycle.
- `bun typecheck` passes for fate-app.
- hexastral-app deletion is a separate Wave-4 step, gated on Cycle shipping.

---

## 3. K.2 — Dynamic discovery endpoint (2-3 days)

Server-side config for "where should this satellite recommend the user go next?"

> **Status (2026-05-20): shipped + verified.** `GET /api/discovery/recommendations`
> ([discovery.ts](../apps/hexastral-api/src/routes/discovery.ts), baked-in default mapping incl.
> `source='fate'`, anonymous + IP rate-limited), `useDiscoveryRecommendations` hook in
> satellite-runtime, consumed by fate-app's funnel (dynamic + offline fallback).
> **Deferred**: `DISCOVERY_CONFIG` KV overlay (needs `wrangler kv namespace create`; worker uses
> baked defaults until then); wiring the other satellites (numerology/dream/coincast/faceoracle).
>
> **Update 2026-05-21**: funnel **telemetry** shipped — `emitCrossAppDiscoveryTap` in
> satellite-runtime ([use-discovery.ts](../packages/satellite-runtime/src/use-discovery.ts)), wired
> to fate's upsell `onUpgrade` → emits `cross_app_discovery_tap` (source/target/action). Routing
> conversion is now measurable. Other satellites still pass through offline `routeQuestionToFlagship`.

### K.2.1 Endpoint spec

`GET /api/discovery/recommendations`

Query params:
- `source` (required): satellite name — `'fate' | 'numerology' | 'coincast' | 'dreamoracle' | 'faceoracle' | 'cycle'`
- `intent` (optional): question type signal — `'relationship' | 'home_office' | 'career_wealth' | 'self_daily' | null`
- `locale` (optional): for copy localization

Response:
```json
{
  "recommendations": [
    {
      "target": "yuan",
      "scheme": "yuan://onboard?from=numerology",
      "appStoreId": "id000...",
      "weight": 1.0,
      "copy": {
        "title": "看你和 TA 的缘",
        "subtitle": "Yuán · 双盘合婚",
        "cta": "打开 Yuán"
      }
    }
  ],
  "configVersion": "v3"
}
```

Anonymous (no HMAC required, per pattern of `/api/growth/events`).
IP rate-limited.

### K.2.2 Config storage

Cloudflare KV namespace `DISCOVERY_CONFIG`:
- Key pattern: `cfg:{source}:{intent}` (e.g. `cfg:fate:relationship`)
- Value: JSON of `recommendations[]`
- Fallback chain: specific intent → wildcard intent (`cfg:fate:*`) → hardcoded default in worker

Default config baked into worker for cold-deploy safety. KV overlay only adjusts weights/copy at runtime.

### K.2.3 Initial default mapping

Defaults baked into worker (KV overrides):

```
fate:relationship   → yuan
fate:home_office    → feng
fate:career_wealth  → yuan (synastry for career partners)
fate:self_daily     → null (loop back into fate-app itself, no upsell)
fate:*              → [yuan, feng] (default both)

numerology:relationship  → yuan
numerology:home_office   → feng
numerology:*             → [yuan, feng]

coincast:*               → [yuan, feng] (weak both — surface card but don't aggressively push)

dreamoracle:relationship → yuan
dreamoracle:*            → [yuan]

faceoracle:*             → [yuan, feng]

cycle:*                  → [yuan, feng] (depending on event type — wedding → yuan, business → feng)
```

### K.2.4 Client hook

New in runtime/client layer (prefer `@zhop/satellite-runtime` or a dedicated discovery client package; avoid placing network hooks in UI packages):

```ts
useDiscoveryRecommendations(
  source: string,
  intent: QuestionType | null,
  locale: string
): { recommendations: Recommendation[]; loading: boolean }
```

Cached in-memory per session.

### K.2.5 Wire consumers

- numerology-app result screen: replace hardcoded `routeQuestionToFlagship` with `useDiscoveryRecommendations`
- dream-oracle-app result: same
- coin-cast-app result: same
- face-oracle-app result: same
- fate-app natal report + stellar: same (delivered via K.1.4)

### K.2.6 Admin update path

Document in `apps/hexastral-api/README.md`:
```bash
# Set new recommendation for fate:relationship
wrangler kv:key put --binding=DISCOVERY_CONFIG \
  cfg:fate:relationship \
  '{"target":"yuan","scheme":"yuan://onboard?from=fate","copy":{...}}'
```

### K.2 acceptance gate

- Endpoint returns valid response for all (source, intent) pairs
- KV override changes take effect on next client cold-start
- 5 satellites + fate-app consume the endpoint instead of hardcoded routing
- Fallback chain works when KV is empty or missing

---

## 4. K.3 — FaceOracle billing decision (1-2 days + product call)

> **Status (2026-05-21): DONE (K.3a + K.3b + K.3c).** Product call made: **auth + IAP gates the full
> VLM report; the free teaser stays cheap (preset / cheap-LLM, no vision)** — this supersedes the
> §K.3.1 "3-free-then-paywall" recommendation below. Pricing = the existing `faceoracle_pro`
> **subscription** entitlement (per-reading credits pack deferred).
>
> **Scope correction (bigger than this section implied):** the FaceOracle *satellite* never ran the
> real VLM — its reading is a cheap generic LLM on **hardcoded** features
> ([portfolio.ts](../apps/hexastral-api/src/routes/portfolio.ts) `case 'faceoracle'`), and the
> `faceoracle_pro_*` RC products were **orphan** (absent from `config/products.ts`, granting nothing).
> The real VLM (`/api/physiognomy/face-features/from-base64`) already exists but isn't wired to the
> satellite or to a faceoracle entitlement.
>
> **K.3a:** `faceoracle_pro` wired end-to-end — `config/products.ts` (+ webhook grant) and
> `satellite-runtime` `useEntitlements`. **K.3b:** `/api/portfolio/linked/faceoracle` returns
> `402 faceoracle_pro_required` unless entitled, and the pipeline runs the real Gemini Vision
> extraction (`/physiognomy/extract-features`) **only** when entitled — the anonymous `/preview`
> path stays a cheap canned teaser (no VLM spend). **K.3c:** face-oracle-app split into
> `runFaceTeaser` (preview) + `runFaceFull` (linked); `result.tsx` shows the teaser + a
> `faceoracle_pro`-gated "Unlock / Reveal full reading" CTA (→ paywall when not entitled, → real VLM
> when entitled). Typechecks across api / satellite-runtime / portfolio-client / face-oracle-app;
> 24 api tests pass; new code Biome-clean.
> **Manual follow-ups (human-only):** create the `faceoracle_pro_monthly/annual` products +
> `faceoracle_pro` entitlement in App Store Connect + RevenueCat (see
> setup/revenuecat-entitlements.md); runtime verification needs a device + deploy.

User stated: FaceOracle 撑不起 flagship 但成本高（VLM inference）不能做匿名免费 satellite。

### K.3.1 Three options to choose between

| Option | UX | Revenue | Friction |
|---|---|---|---|
| **A** · Single $0.99 per reading | User picks "Cast" → tiny IAP → see result | Predictable per-use | Medium (paywall on first action) |
| **B** · 3 free trial + paywall | First 3 readings free, then $4.99/mo or single-tier IAP | High retention if trial converts | Low first-encounter friction |
| **C** · Free with ads + Pro-removes-ads | Show banner ads in trial; pay $2.99 lifetime to remove | Low ARPU but high reach | Annoyance from ads |

**Recommendation**: **B (3 free + paywall)**. Reasons:
- Face/palm reading is curiosity-driven — first one needs to be free to hook
- 3 free is sticky enough to evaluate
- Single-tier IAP simpler than monthly sub
- Aligns with face-oracle-app being a "Tier 2 limited" not "Tier 1 flagship"

### K.3.2 Implementation

- RC product: `com.hexastral.faceoracle.unlimited` (one-time $4.99)
- `face-oracle-app/lib/api.ts`: track free-readings-used in MMKV
- `face-oracle-app/app/capture.tsx`: gate at 3rd reading with paywall
- `face-oracle-app/app/paywall.tsx`: rewrite for one-time IAP (not monthly sub)
- Server side: validate purchase token on each VLM call (lightweight)

### K.3 acceptance gate (revised — auth+IAP unlock model, supersedes the 3-free draft)

- ✅ Anonymous capture shows the free teaser (cheap canned features, no VLM spend)
- ✅ Non-entitled "Unlock full reading" routes to the paywall (`/linked/faceoracle` → 402)
- ✅ Entitled "Reveal full reading" runs the real Gemini Vision report (server-gated on `faceoracle_pro`)
- ⏳ RC/App Store Connect product + entitlement setup, restore-purchases, and device runtime verification are manual follow-ups

---

## 5. K.4 — Shared LLM funnel guard (2-3 days)

> **Status (2026-05-21): DONE — module built** (per the "K.4 first, as Cycle's prerequisite" call).
> [`services/shared/llm-guard.ts`](../apps/hexastral-api/src/services/shared/llm-guard.ts) — sibling
> to `divination-guard`. Pure `computeLlmGuardDecision` (allow_llm / allow_cached / allow_template +
> default/deep tier; unit-tested, 6 cases) + KV-backed `evaluateLlmGuard` / `recordLlmGuardGrant` over
> `GUARD_KV` + `resolveLlmGuardSubject` (userId > deviceId > ipHash) + growth-event descriptors.
> Conservative Mode: per-subject daily limits (keys expire, never refilled), global daily budget cap
> → cache/template fallback, one-time lifetime peak pass (deep tier). Typechecks; 30 api tests pass;
> Biome-clean. **Pending**: wiring into the first consumer (Cycle `/cycle/explain`) — the module is
> ready to consume; the `tier` hint maps to svc-astro's existing model routing.

Apply one shared guard model across all low-cost satellites:
coin-cast, dream-oracle, numerology, cycle, fate-app.

Core rules:
- No naive "first 3 days Pro output" reward.
- In v1, prefer **Conservative Mode**: no periodic rewards, no streak minting,
  no refill loops.
- Use non-periodic limits + optional one-time lifetime peak pass.
- Keep deterministic fallback always available when budget/limits are hit.
- Identity priority for quotas: `userId` > HMAC-backed `deviceId` > `ipHash`.

Model routing baseline:
- Free/default: `Gemini 3.1 Flash-lite` (fallback `Gemini 3.1 Flash`)
- Subscription deep: `Gemini 3.1 Flash` (fallback `Gemini 3.1 Pro` then `Claude Sonnet 4.6`)
- `Claude Opus 4.7` is explicit premium escalation only, not default route.

Scope split:
- Deterministic core (fate/day/oracle compute) stays non-LLM.
- LLM layer is explanation/chat generation; guard applies to this layer only.

This is a platform capability; avoid app-by-app policy forks.

Acceptance gate:
- ✅ Guard decision contract implemented (`computeLlmGuardDecision`); ⏳ reuse by ≥2 satellites pending (no satellite LLM surface yet — wires in with Cycle + the next consumer)
- ✅ Conservative non-periodic limits active (daily keys expire; no streak/refill logic)
- ✅ Global budget cap degrades to cache/template, never blank error-only
- ✅ Growth-funnel event descriptors returned for decision / peak-pass / fallback / upsell paths (caller emits)

---

## 6. K.5 — Chat transfer to yuan-app + feng-app (2 days)

After K.0/K.1 direction lock, install chat in the two flagships (independent of the fate-app build / hexastral retirement).

> **Status (2026-05-21): DONE.** Server: `chat.ts` `ReadingType` + `sendMessageSchema` gain `'feng'`;
> `getReadingContext('feng')` joins `fengReports.chapters`. yuan-app: `lib/chat.ts` HMAC adapter +
> `app/(bonds)/chat.tsx` over core-ui `ReadingChatScreen` + "Ask about this synastry" CTA in
> `(bonds)/[id].tsx` + 4-locale strings. feng-app: same shape via `app/(report)/chat.tsx` +
> "Ask about this report" CTA in `(report)/[siteId].tsx`. All three workspaces typecheck clean.
>
> **Deviations from the draft below (intentional):**
> - Routes are **sibling** files (`(bonds)/chat.tsx`, `(report)/chat.tsx`) navigated with params, not
>   nested `[id]/chat.tsx` — avoids an expo-router file/folder coexistence risk; behavior is identical.
> - **`'pair'` readingId = `bond.hehunReadingId`** (the `pairReadings.id`), NOT the bond id — the server
>   keys `'pair'` context on `pairReadings.id`. The CTA only shows once a reading exists.
> - Conversations are scoped server-side via `X-Target-App: yuan|feng`.
> - **feng has no paywall screen yet** — a non-Pro `402 pro_required` surfaces a Pro notice (Alert), not a
>   purchase flow. Building feng IAP/paywall is out of K.5 scope; the server Pro gate is the single source
>   of truth, so chat is live for any Pro feng user and forward-compatible once feng IAP lands.

### K.5.1 yuan-app chat

| File | Action |
|---|---|
| `package.json` | Already has `@zhop/core-ui` — uses `ReadingChatScreen` |
| `app/(bonds)/[id]/chat.tsx` (new) | Route — adapter pattern (like hexastral-app's wrapper was) |
| `app/(bonds)/[id].tsx` | Add "Ask about this synastry" CTA → push to chat |
| `lib/i18n.ts` | Add chat strings (4 locales × ~10 strings) |
| `lib/api.ts` or `lib/chat.ts` (new) | HMAC-signed wrapper around `/api/chat` with reading type `'pair'` |

### K.5.2 feng-app chat

| File | Action |
|---|---|
| `app/(report)/[siteId]/chat.tsx` (new) | Same adapter pattern |
| `app/(report)/[siteId].tsx` | Add "Ask about this report" CTA |
| `lib/i18n.ts` | Add chat strings (4 locales) |
| `lib/chat.ts` (new) | HMAC wrapper around `/api/chat` |

### K.5.3 Server side adjustments

- `apps/hexastral-api/src/routes/chat.ts`:
  - `ReadingType` union currently has `'natal' | 'stellar' | 'yiching' | 'pair' | 'physiognomy' | 'report'`
  - Add `'feng'` for feng-app's report chat
  - `getReadingContext()` adds case for `'feng'` → join `fengReports.contentJson`
- Pro gate stays as-is — yuan + feng users with Pro can chat

### K.5 acceptance gate

- ✅ yuan-app bond detail → chat wired (HMAC signed, Pro-gated server-side, replies stream) — device run still needed to confirm UX
- ✅ feng-app report → chat wired (Pro-gated; non-Pro shows a Pro notice until feng IAP lands)
- ✅ fate-app has no chat route (chat is flagship-only — Yuán/Fēng)
- ✅ Server `/api/chat` accepts `'feng'` reading type without 422 (typecheck-verified; runtime confirm on deploy)

> Per the repo's working style (§9: no bun install / iOS sim in this sandbox), "works" = wired +
> `bun typecheck` green across hexastral-api / yuan-app / feng-app. Simulator + deploy verification is a
> manual follow-up.

---

## 7. Validation gates (apply to every K.x)

- `bun typecheck` — passes for all changed workspaces
- `bun lint` — zero net new failures
- Manual: each affected app on iOS Simulator — entry flow works, no broken navigation
- Manual: cross-app deep-link round-trip (fate → yuan; numerology → yuan/feng)

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Retiring hexastral-app strips features (no real users yet) | Pre-PMF protected; fate-app + existing matrix members cover every surface (合婚→Yuán, 六爻→CoinCast, 面相→FaceOracle, 黄历→Cycle); ADR-0009 documents trajectory |
| fate-app has no daily-active loop | By design — it's a funnel/capture anchor, not a retention product; 命理 daily-active lives in Cycle (fed by fate's captured chart). KPI is install/capture/funnel-CTR, not DAU |
| K.2 KV config drift between satellites | Bake versioned defaults into worker; client sees configVersion in response |
| K.3 paywall conversion lower than expected | Track via growth-funnel events; iterate trial count or price |
| K.5 chat in flagship duplicates infra Pro check | Chat.ts server-side Pro gate is single source of truth |
| Satellite-runtime adoption issues in fate-app | Greenfield app (no legacy migration to break) — lower risk; deploy preview first |
| RC product ID change for face-oracle | One-time IAP is simpler than subscription; lower risk |

---

## 9. Open questions to resolve before starting

1. K.0.4 — ~~Should ADR-0007 be Reverted entirely or Partially?~~ **Resolved (2026-05-20): Reverted — hexastral-app is retired and `fate-app` (八字+紫微) replaces its natal surface (§0.1.1). The "delete duplicated routes" reasoning stays valid as history.**
2. K.1.4 — Does removing chat from hexastral-app leave dead D1 conversation rows? They belong to users; let them rot (or add a cleanup migration during K.5).
3. K.2.3 — Default weights when an intent matches BOTH yuan and feng (e.g. `numerology:relationship` is clearly yuan, but `numerology:home_office` for a synastry-positive user). Single best vs both?
4. K.2.4 — Should the client hook also report attribution events back to growth-funnel? (Cleaner data → yes; complexity → handle in v1.1)
5. K.3 — Confirm $4.99 vs $9.99 one-time. Survey existing CJK face-reading apps for pricing baseline.
6. K.5 — feng-app's `feng` reading type needs `chat.ts` schema support. Verify feng-app's `report.contentJson` shape is interpretable as context (or summarize first).

---

## 10. What this plan does NOT do

- Cycle satellite (黄历) — separate plan: [cycle-satellite-plan.md](./cycle-satellite-plan.md)
- Chat L2/L3 context enrichment — separate plan: [chat-context-builder-plan.md](./chat-context-builder-plan.md)
- Touch yuan-app + feng-app's core feature sets (only add chat surface in K.5)
- Touch the satellite-runtime/satellite-ui packages structurally (just consume)
- Migrate D1 schema beyond dropping conversations no longer needed

---

## 11. Suggested execution order

Foundations before surfaces (K.2 + K.4 are consumed by the Cycle + Chat plans too):

1. K.0 — ADRs + hexastral-app retire decision (§0.1.1)
2. K.2 — discovery endpoint  ┐ shared foundations, build once as endpoint/package
3. K.4 — shared LLM guard     ┘ (parallelizable with each other)
4. K.5 — chat transfer to yuan/feng (**unblocks the entire Chat plan**)
5. K.1 — create fate-app Tier 3 no-auth MVP
6. K.3 — face-oracle auth + IAP (standalone, slot anywhere after K.0)

If parallelism available: K.0 → (K.2 + K.4) → (K.5 + K.1 + K.3) → downstream plans.
This is Phase K's slice of the cross-plan order in [ROADMAP.md](./ROADMAP.md): K.2/K.4 are
Wave-1 foundations and K.5 is the Wave-2 gate that the Chat plan waits on.
