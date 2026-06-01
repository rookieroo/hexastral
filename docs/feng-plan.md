# Fēng / 風 — Feng-Shui Flagship Plan

> **Status**: **Weeks 1–5 shipped** (2026-05-16) — see §17 progress log.
> **Last updated**: 2026-05-16.
> **Owner doc**: this file. `docs/ROADMAP.md` §4 should reference here, not duplicate.

Read this file in full before touching anything under `apps/feng-app`,
`apps/compass-app`, `services/svc-feng`, or `apps/hexastral-web/app/[locale]/compass`.

---

## 0. TL;DR

- Fēng is a **flagship**, not a satellite. Premium positioning, high price band, treat it like Yuán/HexAstral in budget and design attention.
- **V1 = 6 weeks**. Personal命理 + map-based 外巒頭 (external landform) reading via Mapbox satellite + Gemini Vision + on-device 玄空飞星 / 八宅 compute.
- **Markets V1**: US, Japan, Singapore, Malaysia. Chinese mainland deferred (no Gaode, no ICP — out of scope V1).
- **Languages V1**: en, zh-Hant, zh-Hans (diaspora), ja. (ms deferred to V1.1 — Chinese-Malaysian audience reads en/zh fine.)
- **Brand matrix change**: spawn a new satellite `Compass` (`apps/compass-app`) plus `hexastral-web /compass` SEO/funnel page. Fēng app keeps an in-app compass tab; the standalone Compass app is the acquisition wedge. Needs ADR-0003.
- **Map provider**: Mapbox Static Images, single provider V1. No Gaode. No Google Maps. No view-shot of live maps — all map images flow through `svc-feng` so they're cacheable in R2.
- **AI pipeline**: 3-stage. Vision (Gemini 2.5 Pro Vision, structured JSON) → deterministic 玄空/八宅 compute → text synthesis (Gemini Pro or Claude Opus 4.7) into 6-chapter report.

---

## 1. Strategic positioning

Feng-shui has near-zero user education cost in the target markets:

| Market | Feng-shui awareness | Spend ceiling | Notes |
|---|---|---|---|
| US (diaspora + wellness) | High among Asian-American; medium in wellness crowd | $99–199/site one-shot, $19–29/mo | Wellness market overlaps with astrology buyers |
| Japan | 風水 is mainstream; interior/decor angle dominant | ¥3,000–9,800/site, ¥1,200/mo | Bias toward 室内 advice (V2 hook) |
| Singapore | Premium market, Chinese-majority, English-first | SGD 39–129/site | Highest LTV per user, low CAC |
| Malaysia (Chinese) | Very high, 玄学博主 active culture | MYR 49–149/site | Bilingual zh/en |

Compared to numerology (Phase D satellite), Fēng's economics are:

- **3–5× ARPU** at launch (premium price band, asset-protection framing — "audit my house" is a higher-value question than "what's my life-path number")
- **Repeatable revenue**: 流年 changes annually; users with a saved site get a $19 "annual update" purchase
- **Shareable visual output**: annotated satellite + bagua overlay is screenshot-bait, drives organic acquisition

Design implication: budget design attention like a flagship, not like a satellite. Reanimated v4 motion, hand-drawn 24山 typography, brand-distinct color (墨青 ink-teal `#2E4756` + 铜金 `#B08D5B`).

---

## 2. Markets and language matrix

### V1 (launch)

| Locale | Surface | Notes |
|---|---|---|
| `en` | feng-app, compass-app, web | Default, US/SG/MY/global |
| `zh-Hant` | feng-app, compass-app, web | TW/HK/diaspora |
| `zh` (Hans) | feng-app, compass-app, web | SG/MY younger users, Western Chinese diaspora |
| `ja` | feng-app, compass-app, web | Japan — but content **reframed** toward room-feel / interior, not 玄空飞星 jargon |

### V1.1 (+4 weeks post-V1)

| `ms` | Compass only first (utility translates easily); Fēng waits for native-speaker review |
| `ko` | Skip — Korean 풍수 culture exists but localization effort > expected revenue at V1 scale |

### Deferred indefinitely

- Mainland China (`zh-CN` server). Requires Gaode, ICP filing, content review. Re-evaluate when overseas MRR > $30k.

### Translation responsibility

- en is source of truth.
- zh-Hant translated by domain-fluent contributor (NOT machine — 风水术语 is unforgiving).
- zh-Hans derived from zh-Hant via OpenCC pipeline (already in `@zhop/astro-i18n`).
- ja is a **re-write**, not a translation. Hire a Japanese 風水師 reviewer. (Budget: ~$2k one-shot for V1 corpus.)

---

## 3. Scope by version

### 3.1 V1 — Personal + external 巒頭 (6 weeks)

In:
- Address picker (Mapbox forward geocoding)
- Facing-direction calibrator (magnetometer initial + drag-arrow confirm on satellite image)
- Building info form (build year / move-in year / floor)
- 3-scale satellite snapshot (immediate / neighborhood / regional)
- Server-side annotation: bagua sectors, sit/face/door arrows, N/E/S/W markers, 24山 ring
- Gemini Vision pass → structured 外巒頭 JSON
- Deterministic 八宅 + 玄空飞星 compute (svc-astro extension)
- 6-chapter report (ChapterPager + share cards, same shape as Yuán/HexAstral)
- 流年 (annual) auto-refresh on 立春 rollover
- In-app compass tab (free preview of Compass satellite functionality)

Out (V1):
- Floor-plan upload, room-level advice
- Camera-based door / room-corner detection
- AR overlay
- Daily/monthly 飞星 (only annual)

### 3.2 V2 — Indoor analysis (+ 3 months after V1, if V1 sticks)

Trigger threshold: V1 paying users ≥ 500 **OR** retention D30 ≥ 25%.

In:
- Floor-plan photo upload (or hand-sketch)
- AI detect: door / kitchen / bedroom / bathroom / windows
- 九宫格 overlay on floor plan, room-by-room advice
- Object placement suggestions (mirror, plant, water feature)

### 3.3 V3 — Live / AR

- Live compass overlay on camera preview (AR room measurement)
- Multi-site comparison (renters comparing apartments)

---

## 4. Brand matrix update — Compass becomes a satellite

Proposed ADR-0003 (`docs/decisions/0003-compass-satellite.md` — write when this plan ships):

> Adds **Compass** to the satellite tier of the HexAstral matrix. Western
> name per ADR-0002 satellite convention. Free utility with optional pro
> tier (high-precision logging, multi-point bearing, magnetic-history chart).
> Acts as top-of-funnel acquisition for Fēng.

Updated brand matrix:

```
HexAstral (master / LLC publisher)
├── Flagships — CJK glyph + Latin transliteration
│   ├── HexAstral  — 命緣卦道
│   ├── Yuán / 緣  — relationship & compatibility
│   └── Fēng / 風  — feng-shui                       ← Phase E
└── Satellites — independent Western names
    ├── Coin Cast, Face Oracle, Dream Oracle, Numerology
    └── Compass                                       ← new, Phase E
```

Funnel design:

```
Compass (free download, big install base, "best compass app" SEO)
   ↓ contextual upsell when user sets magnetic declination
   ↓ "Use this bearing for a feng-shui reading?" → DDL into Fēng
Fēng (paid, $49–99/site)
   ↓ in-app compass tab keeps power users in the premium app
```

Why not make Compass a tab of Fēng only:
- App Store "compass" search volume is 100× "feng shui" in en markets
- A standalone listing surfaces in OS-level utility searches ("compass app")
- The two listings cross-link without overlap (Compass = utility / Fēng = analysis)

---

## 5. Tech architecture

### 5.1 Client — `apps/feng-app`

Stack identical to yuan-app:

- Expo SDK 54 + RN 0.81, dev client (not Expo Go)
- `react-native-maps` for the picker / facing calibrator (Apple Maps tiles on iOS — free; Mapbox tiles on Android — `@rnmapbox/maps`)
- `expo-sensors` Magnetometer for compass init value
- `expo-location` for GPS
- `react-native-svg` for in-app bagua / 飞星盘 rendering
- `react-native-view-shot` for capturing custom report cards (NOT for map screenshots — those come from backend)
- `react-native-reanimated` v4 for motion
- `expo-haptics` for confirmation
- `@zhop/scenario-feng` (new package) for shared types + ChapterPager wiring
- `@zhop/hexastral-client` for API calls
- `@zhop/satellite-runtime` is NOT used (this is a flagship — uses the flagship pattern, not satellite-ui)

Magnetic declination: **frontend** via [`world-magnetic-model`](https://www.npmjs.com/package/world-magnetic-model) (WMM-2025, ~200KB JS, offline-capable). Reasoning: the standalone Compass tool needs to work without network, so declination must be local. Reuse across apps.

### 5.2 Client — `apps/compass-app`

Minimal satellite shape (mirrors numerology-app scaffold pattern):

- Same Expo + RN stack
- Single tab: live compass needle + magnetic declination + GPS lat/lng + 24山 ring overlay
- "Save bearing" → AsyncStorage (free) or cloud sync (pro)
- "Open in Fēng" deep link if Fēng installed; else "Get Fēng" App Store link
- IAP: `hexastral_compass_pro_monthly` ($1.99/mo) — unlocks logging, multi-point bearings, .csv export
- Bundle: `com.hexastral.compass`

### 5.3 Web — `hexastral-web`

- `/[locale]/compass/page.tsx` — browser-based compass tool using DeviceOrientation API (mobile web) + ipinfo for declination. Acts as SEO landing.
- `/[locale]/compass/calibrate/page.tsx` — pro version teaser, deep-links to Compass app
- `/[locale]/feng/page.tsx` — Fēng landing (replace the legacy `feng-shui/[slug]` SEO seed routes; keep slug routes redirecting via 301 to /feng for SEO continuity)
- `/[locale]/feng/preview/page.tsx` — free 8-question preview (8宅命卦 only, no map) — capture lead, DDL to Fēng app

### 5.4 Backend — new worker `services/svc-feng`

Sits alongside svc-astro / svc-signal. Talks only to hexastral-api (HMAC), not exposed publicly.

```
services/svc-feng/
├── src/routes/
│   ├── maps.ts          POST /maps/render    {lat, lng, zoom, size, mode}
│   │                    → fetches Mapbox Static Images, signs, caches in R2,
│   │                      returns R2 URL + content hash
│   ├── annotate.ts      POST /annotate       {mapImageR2Key, overlays: [...]}
│   │                    → resvg-wasm composes SVG arrows/markers onto PNG,
│   │                      writes annotated PNG to R2
│   ├── vision.ts        POST /vision/analyze {annotatedImageR2Keys: [3], facingDeg}
│   │                    → calls Gemini 2.5 Pro Vision with structured-output prompt,
│   │                      returns 外巒頭 JSON
│   └── synthesize.ts    POST /synthesize     {visionJson, flyingStarsJson, baZhaiJson,
│                                              userProfile, memoryContext}
│                                            → 6 chapters via Gemini 2.5 Pro text
```

R2 buckets:

- `feng-maps` — raw Mapbox PNGs, key = `sha1(lat,lng,zoom,size,mode,style)`, 30-day TTL
- `feng-annotated` — annotated overlays, key = `sha1(mapKey,overlayJson)`, 7-day TTL (annual 流年 rollover invalidates)

### 5.5 Backend — `hexastral-api` additions

Public API surface (HMAC v2 signed from feng-app / compass-app; Turnstile from web):

```
POST   /api/feng/sites                       create site
GET    /api/feng/sites                       list user sites
GET    /api/feng/sites/:id                   get site + last report
PATCH  /api/feng/sites/:id                   edit name / facing / build year
DELETE /api/feng/sites/:id                   soft-delete
POST   /api/feng/sites/:id/analyze           kick off async analysis → {jobId}
GET    /api/feng/jobs/:jobId                 poll {stage, progress, result?}
POST   /api/feng/sites/:id/share             generate shareable URL
GET    /api/feng/annual-refresh/:siteId      run 流年 rollover (cron + on-demand)
GET    /api/feng/declination                 lat,lng → magnetic declination (also frontend-computable)
POST   /api/compass/log                      pro-tier bearing log entry
GET    /api/compass/logs                     pro-tier history
```

### 5.6 Compute — `packages/astro-core/src/feng/`

Pure-function modules (no LLM). Live in `astro-core` (not svc-astro) because:
1. astro-core is already the home for shared pure compute (ganzhi/jieqi/lunar/
   shensha) — feng is the same flavor of math
2. mobile-runnable matters: Compass satellite needs 24山 lookup + declination
   offline; bundling pure compute into the JS app avoids a network hop
3. existing vitest / bun-test infrastructure in `__tests__/`

```
packages/astro-core/src/feng/
├── twenty-four-mountains.ts  facing degree → 24山名 / 八卦 / 九宫宫位 lookup
├── flying-stars.ts           玄空飞星 9宫 compute. Input: (buildYear, facingDeg,
│                             currentDate). Output: { yuanyun, mountainStar9x9,
│                             waterStar9x9, annualStar9x9 }
└── ba-zhai.ts                八宅 命卦 compute. Input: (birthYear, gender).
                              Output: { mingGua, eastWestGroup, luckyDirections[4],
                              unluckyDirections[4] }
```

Tests at `packages/astro-core/src/__tests__/feng/*.test.ts` (mirrors existing
`shensha.test.ts` / `dayun.test.ts` patterns).

svc-astro adds only prompts and Stage 3 synthesis under
`services/svc-astro/src/feng/` (calls into astro-core for the math).
Compute is deterministic, sub-millisecond. No queue, no caching needed.

### 5.7 The 3-stage AI pipeline (this is the differentiator — do not cut corners here)

**Stage 1 — Vision (Gemini 2.5 Pro Vision)**

Input: 3 annotated satellite PNGs (close 100m / mid 500m / wide 2km) + a short structured prompt.

Annotations on each image (drawn server-side, see §5.4 annotate route):
- Red thick arrow from building center → 坐 direction, labeled `坐 / Sit (358° 子)`
- Yellow thick arrow → 向 direction, labeled `向 / Face (178° 午)`
- Blue thin arrow → 大门 (if differs), labeled `Door (135° 巽)`
- 4 corner cardinal markers `N E S W` (true north)
- Semi-transparent 24山 ring around the building center
- 8 light-tinted sector wedges with 八卦 names (`乾兑離震巽坎艮坤`)

Output schema (Zod-validated, retry on parse fail):

```ts
{
  形煞: Array<{ type: '路冲'|'反弓'|'尖角'|'天斩'|'孤峰'|...,
                direction: BaguaDirection, distance: 'near'|'mid'|'far',
                severity: 1|2|3|4|5, evidence: string }>,
  砂:   Array<{ type: '后靠'|'青龙'|'白虎'|..., direction, distance, strength }>,
  水:   Array<{ type: '明堂'|'反水'|'割脚'|..., direction, distance, flow: 'in'|'out'|'still' }>,
  朝案: Array<{ type, direction, distance }>,
  notes: string
}
```

**Stage 2 — Compute (svc-astro, deterministic)**

In parallel with Stage 1. Inputs: site + user profile. Outputs the full 飞星 + 八宅 JSON.

**Stage 3 — Synthesis (Gemini 2.5 Pro text OR Claude Opus 4.7)**

Inputs: stage 1 JSON + stage 2 JSON + user portfolio-memory snippets (from `searchPortfolioReadingMemory(userId, 'feng', threshold=0.3)`).

Output: 6 chapters matching the existing ChapterPager contract (see `packages/scenario-yuan/src/types.ts SynastryChapter`):

1. **外巒頭概览** — what the satellite shows
2. **个人命卦匹配** — 八宅命卦 + 该房子吉凶方位匹配度
3. **玄空当运** — 元运 / 山星向星 / 旺衰
4. **流年方位** — current year transit stars + which rooms to use/avoid this year
5. **化解建议** — concrete fixes per identified 形煞
6. **改运配饰** — recommended objects + placements (linkable to commerce later)

Each chapter has a 30-char golden line (same shape as C.2 hero line) for the share card.

---

## 6. Build-year handling (fallback ladder)

User-facing flow on the building-info screen:

```
"When was the building built?"
○ I know the year     → date picker (1900–2026)
○ I know the decade   → 1960s / 70s / 80s / 90s / 2000s / 2010s / 2020s
○ Use my move-in year → falls back to move-in
○ Skip               → 八宅 + 流年 only (no 玄空)
```

Compute degradation:

| User knows | 玄空 accuracy | 八宅 | 流年 | Report chapters affected |
|---|---|---|---|---|
| Exact year | 100% | 100% | 100% | All 6 |
| Decade | ~85% (mid-decade assumption) | 100% | 100% | Chapter 3 caveats added |
| Move-in year only | ~70% (off-by-1-元运 risk for old buildings) | 100% | 100% | Chapter 3 caveats added |
| Nothing | N/A | 100% | 100% | Chapter 3 replaced by extra 八宅 detail |

Important: **never silently degrade.** The report includes a "data quality" footer noting which inputs were estimated, so the user can rerun with better data later.

---

## 7. Pricing

### Fēng (flagship)

| SKU | Price | What it unlocks |
|---|---|---|
| `hexastral_feng_site` | $59 one-shot | One site report, lifetime access, 1 annual refresh free |
| `hexastral_feng_pro_monthly` | $19.99/mo | Unlimited sites, monthly 流年 micro-updates, priority compute, advanced chapters (V2 floor plan when shipped) |
| `hexastral_feng_pro_annual` | $149/yr | Same as monthly, 38% saving |
| `hexastral_feng_annual_refresh` | $19 one-shot | For one-shot buyers: yearly 流年 update after the free first refresh |

Price localization: do **not** straight-convert. Use App Store regional tiers:
- US $59 / SG SGD 79 / JP ¥6,800 / MY MYR 199

### Compass (satellite)

| `hexastral_compass_pro_monthly` | $1.99/mo | Bearing logging, multi-point, csv export |
| `hexastral_compass_pro_lifetime` | $19.99 | Same, lifetime |

Compass is intentionally cheap — the value is funnel volume, not direct revenue.

---

## 8. Database schema additions

`apps/hexastral-api/src/db/schema.ts` adds:

```ts
feng_sites
  id (cuid), userId, name, label?,
  lat, lng, formattedAddress,
  facingDegTrue (0–359.99, true north),
  facingDegMagnetic (computed, stored for display),
  magneticDeclination (snapshot at site creation),
  sitDeg (= (facingDegTrue + 180) % 360),
  doorDegTrue?,
  buildYear?, buildYearAccuracy: 'exact'|'decade'|'moveIn'|'unknown',
  moveInYear?, floor?,
  createdAt, updatedAt, deletedAt?

feng_reports
  id, siteId, userId,
  visionJson (text), computeJson (text), chapters (text — array of 6 chapters),
  fengYear (e.g. '2026'), currentYuan (e.g. 9),
  generatedAt, modelVersions (text — { vision, synthesis })

feng_map_cache
  key (= sha1(lat,lng,zoom,size,mode)),
  r2Key, bytes, expiresAt

compass_bearings  (pro tier)
  id, userId, lat, lng, bearingDegTrue, label?, photoR2Key?,
  createdAt
```

Migrate via `bun db:generate` after the Phase D migrations are applied. Add `'feng'` to `conversations.readingType` enum and `sharedReports.reportType` enum (mirroring D.2 pattern).

---

## 9. UI flow detail

### 9.1 Fēng app (6 main screens + report)

```
(tabs)/
├── index.tsx        Home — site cards (each tappable to its latest report),
│                    "+ Add site" CTA, today's 流年 advice banner
├── compass.tsx      In-app compass — same UI as Compass satellite, no upsell
├── readings.tsx     Past reports grouped by site
└── profile.tsx      Birth info / subscription / settings

(new-site)/         Stack, slide_from_right, expo-haptics light on advance
├── _layout.tsx
├── address.tsx     Mapbox-backed search + map pin + long-press to drop
├── facing.tsx      ★ Hero screen. Static satellite tile, 3 draggable arrows
│                   (sit/face/door), magnetometer button "Use my compass",
│                   live magnetic declination badge ("True N is 7.2° east of
│                   magnetic N here")
├── building.tsx    Build-year (with fallback ladder), move-in year, floor
└── review.tsx      Summary → POST /api/feng/sites + analyze

(report)/[siteId].tsx   ChapterPager (6 chapters), per-chapter ShareChapterButton

(annual)/[siteId].tsx   "It's 立春 — your 流年 has shifted" rollover screen,
                        $19 unlock for one-shot buyers
```

### 9.2 Compass app (1 main + 1 modal)

```
index.tsx           Full-screen compass needle on dark canvas, true/magnetic
                    toggle, declination value, GPS coords, "Tap to log" (pro)
log.tsx             Pro-only log list
about.tsx           Modal — sister apps (Fēng deep-link), credits
```

### 9.3 hexastral-web pages

```
/[locale]/feng                     landing (replaces feng-shui/[slug] SEO seeds)
/[locale]/feng/preview             free 8-question 八宅命卦 mini-tool, DDL CTA
/[locale]/feng/report/[shareId]    public share view (used by Stage 6 share cards)
/[locale]/compass                  browser compass via DeviceOrientation API
/[locale]/compass/learn            "what is magnetic declination" SEO bait
```

301 redirects:
- `/feng-shui` → `/feng`
- `/feng-shui/[slug]` → `/feng?source=seo&topic={slug}`

---

## 10. Package layout

New packages:

```
packages/scenario-feng/        Shared types, hooks, ChapterPager glue for Fēng
                               (mirror of scenario-yuan)
  src/
    types.ts                   FengChapter, FengSite, VisionJson, ComputeJson
    hooks/
      useFengSite.ts
      useFengReport.ts
      useFlyingStars.ts        Pure JS, offline-capable
    components/
      FacingCalibrator.tsx
      BaguaCompassOverlay.tsx  SVG 24山 + 8卦 ring (used by feng-app
                                                    and compass-app)
      FlyingStarsGrid.tsx      9-cell flying stars matrix
      AnnotatedSatelliteCard.tsx  Display-only — reads server-rendered PNG
```

The bagua overlay component is shared so the Compass satellite shows the same 24山 ring as Fēng — visual consistency reinforces brand.

---

## 11. Phase E timeline (6 weeks, aggressive)

Week 1 — Foundations
- `packages/scenario-feng` scaffold
- `services/svc-astro` flying-stars.ts + ba-zhai.ts + golden tests
- DB schema migration, R2 buckets, env vars
- ADR-0003 (Compass satellite) merged

Week 2 — `apps/compass-app` end-to-end
- Scaffold via `bun gen satellite` (Phase D generator), then customize
- Magnetometer + GPS + WMM declination
- 24山 ring overlay
- TestFlight build
- hexastral-web `/compass` route + `/compass/learn` SEO seed

Week 3 — `services/svc-feng` + map pipeline
- Mapbox token / billing setup
- `/maps/render` with R2 cache
- `/annotate` with resvg-wasm
- Local test harness — feed (lat, lng, facing) get annotated PNG

Week 4 — `apps/feng-app` core flow
- Scaffold (manual, not via generator — flagship pattern)
- (new-site) stack screens 1–4
- FacingCalibrator (the hero screen — budget 3 days alone)
- hexastral-api routes for `/api/feng/sites` + `/api/feng/jobs`

Week 5 — AI pipeline + report
- Vision prompt + retry/validation
- Synthesis prompt (6 chapters)
- ChapterPager integration
- Share cards (reuse C.3 ShareChapterButton)
- portfolio-memory injection for synthesis

Week 6 — Polish + ship
- ja content review (1 day buffer for native reviewer)
- Pricing matrix in App Store Connect / RevenueCat
- Compass app submission
- Fēng app submission
- hexastral-web `/feng` landing live
- 流年 cron in hexastral-api for 立春 rollover

Beyond week 6: V1.1 (4 weeks)
- `ms` locale
- Annual-refresh prompts
- Lead-magnet experiments on `/feng/preview`

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Mapbox cost overrun if uncached | High | Aggressive R2 caching (30d), enforce backend-only fetch, alert on monthly spend > $50 |
| Gemini Vision misreads annotated image (wrong direction) | High | Stage 1 has Zod schema retry × 2, fail-soft to text-only synthesis with caveat; golden tests with hand-labeled examples |
| Magnetometer wildly off in steel buildings | Medium | Calibrator UI requires user confirmation on map; declination shown so user knows when compass is suspect |
| ja content offensive / wrong tone | Medium | Hire native 風水師 reviewer before launch (~$2k) — non-negotiable |
| Apple rejects Compass app for "duplicating iOS compass" | Low-medium | Position as "compass + magnetic declination + bearing log + feng-shui overlay" — distinct value beyond stock compass |
| Build-year fallback produces wrong 玄空 | Medium | Already designed-for (§6), visible data-quality footer |
| Privacy concerns (storing user home addresses) | High | At-rest encryption on `feng_sites.lat/lng` (already on D1 schema for users.birth fields — extend); no third-party analytics on these fields; explicit consent screen at site-creation time |
| flagship-tier design effort underestimated | Medium | Budget 2× engineering time for FacingCalibrator + ChapterPager polish; hire contract designer for icon/splash (parallel to dev) |

---

## 13. Locked decisions (resolved 2026-05-15)

1. **Tile provider**: **Mapbox** (single provider V1). Re-evaluate at $200/mo spend.
2. **Vision model (Stage 1)**: **Gemini 2.5 Pro Vision** (~$0.0025/img). Stage 3 synthesis uses Claude Opus 4.7 for long-form CJK quality.
3. **Synthesis tone**: ship **traditional 风水師 voice** as control; A/B test "modern wellness coach" variant post-launch via the 4-atom framework in ROADMAP §7. This is the first real experiment for that framework.
4. **Compass app**: **no sign-in for free use**; sign-in only at the moment user buys pro logging. Maximize install funnel.
5. **Web preview**: **single-shot anonymous** + CTA to install. No email gate (would kill SEO landing conversion).

---

## 14. Manual setup checklist (cannot be done from sandboxed agent)

After scaffolds are in:

1. Mapbox: create account, generate access token, set monthly billing cap = $100
2. Apple Developer: register `com.hexastral.feng` and `com.hexastral.compass`
3. App Store Connect: create both apps; locale listings per §2
4. RevenueCat: create products
   - `hexastral_feng_site` (consumable)
   - `hexastral_feng_pro_monthly` (auto-subscription)
   - `hexastral_feng_pro_annual` (auto-subscription)
   - `hexastral_feng_annual_refresh` (consumable)
   - `hexastral_compass_pro_monthly` (auto-subscription)
   - `hexastral_compass_pro_lifetime` (non-consumable)
5. Cloudflare: create R2 buckets `feng-maps`, `feng-annotated`; bind to `svc-feng`
6. Gemini API: enable Vision in Vertex AI / AI Studio project; bump quota
7. Designer:
   - Fēng icon/splash (墨青 #2E4756 + 铜金 #B08D5B + seal-script 風)
   - Compass icon (minimalist needle, brand-neutral)
   - 24山 ring SVG master file
8. Native 風水師 reviewer for ja content (hire before week 5)
9. `eas init` in `apps/feng-app` and `apps/compass-app`, paste EAS project IDs
10. `bun db:generate` → review migration → `bun db:migrate:prod`

---

## 15. Out of scope (V1) — say no to these

- AR view, live camera overlay
- Indoor floor plan
- 八字 deep integration (use existing birth profile only)
- Mainland China launch
- Android (V1 is iOS-only — match yuan-app rollout pattern; Android V1.1+)
- Voice input
- ChatGPT-style follow-up Q&A on the site report (defer to V2 via `/chat`)
- Multi-user / shared sites (e.g. household members co-viewing)

These deserve "no" because they each multiply complexity by ≥ 1.5× and none are critical for the high-ticket auditor user we're targeting.

---

## 16. Success metrics (post-launch)

V1 must hit, within 60 days of launch, **two of three** to greenlight V2:

| Metric | Threshold |
|---|---|
| Paying users (any SKU) | ≥ 300 |
| D30 retention (paying) | ≥ 25% |
| Compass → Fēng conversion | ≥ 2% |

Below these, do not start V2 — iterate on V1 onboarding / report quality.

---

## 17. Progress log

### Week 1 — Foundations (shipped 2026-05-15)

Status: ✅ complete. Deltas from the §11 timeline noted inline.

- **ADR-0003** ([docs/decisions/0003-compass-satellite.md](decisions/0003-compass-satellite.md))
  — Compass formalized as satellite with CJK alias 羅. Funnel + pricing locked.
- **Compute primitives** in `packages/astro-core/src/feng/` (relocated from
  the originally-planned `services/svc-astro/src/feng/` — pure compute
  belongs in astro-core so the Compass satellite can use it offline):
  - `twenty-four-mountains.ts` — 24山 lookup with 三元龙, 阴阳, 洛书 mapping
  - `flying-stars.ts` — 元运, 运盘, 山盘, 向盘, 年紫白, 旺衰 classifier
  - `ba-zhai.ts` — 命卦 derivation, 4 lucky + 4 unlucky direction tables, fit scorer
- **84 golden tests** in `packages/astro-core/src/__tests__/feng/`, including
  the published 八运子山午向 "双星会向到向首" case as a regression anchor.
  All 537 astro-core tests pass.
- **scenario-feng package** scaffolded with full domain types
  (`FengSite`, `FengReport`, `FengChapter`, `ShaObservation`, etc.). Hooks
  and components are placeholders for Week 4-5.
- **Open questions in §13 all resolved** (2026-05-15).

### Week 2 — Compass + svc-feng scaffold (shipped 2026-05-15)

Status: ✅ complete.

- **`apps/compass-app/`** — standalone Compass satellite Expo app
  (`com.hexastral.compass`):
  - `useHeading()` hook uses `Location.watchHeadingAsync` for iOS native
    true-heading. **Δ from plan**: dropped the planned `world-magnetic-model`
    JS library — iOS does WMM internally via GPS, so the V1 iOS-only launch
    needs no WMM in JS. Android V1.1 will embed a table for offline use.
  - `CompassDial.tsx` — rotating SVG 24山 ring + 8 bagua sector wedges + fixed needle
  - 4 locales (en / zh / zh-Hans / ja) inline; no shared i18n package yet
  - Deep-link CTA → `feng://new-site?facing=…` with App Store fallback
- **`apps/hexastral-web/app/[locale]/compass/`** — three routes:
  - `page.tsx` (landing, glyph 羅, uses shared `SatelliteLanding`)
  - `use/page.tsx` + `use/client.tsx` (DeviceOrientation API compass with iOS Safari permission flow)
  - `learn/page.tsx` (long-form magnetic-declination SEO explainer, 4 locales)
- **`services/svc-feng/`** — Cloudflare Worker scaffold (Hono):
  - `POST /maps/render` — Mapbox Static Images proxy with R2 cache
    (SHA-1 canonicalized key, 30-day TTL); single-file replacement seam in
    `src/lib/mapbox.ts`
  - `POST /annotate` — V1 pass-through stub; resvg-wasm composition wires Week 3
  - `POST /vision/analyze` + `POST /synthesize` — Zod-validated stubs (real Gemini Week 5)
- **Validation**: 35/35 workspace typecheck clean.

### Week 3 — Mapbox pipeline + hexastral-api routes (shipped 2026-05-15)

Status: ✅ complete.

- **D1 schema** (`apps/hexastral-api/src/db/schema.ts`): added
  `feng_sites`, `feng_reports`, `feng_jobs`, `compass_bearings`. Schema
  matches §8 except `feng_map_cache` is omitted — cache lives in R2
  inside `svc-feng`, no D1 row needed since key = sha1(request). Added
  `'feng'` to `conversations.readingType` + `sharedReports.reportType`
  enums (chat + share pre-wired for Weeks 4-5).
- **`SVC_FENG` service binding** wired in `apps/hexastral-api/wrangler.jsonc`
  + `infra-types.ts`. hexastral-api now talks to svc-feng over the
  Service-Binding fetcher (no public URL).
- **hexastral-api route surface** (per §5.5):
  - `apps/hexastral-api/src/routes/feng/sites.ts` — CRUD + analyze trigger
  - `apps/hexastral-api/src/routes/feng/jobs.ts` — polling endpoint
  - `apps/hexastral-api/src/routes/feng/declination.ts` — public WMM grid lookup
  - `apps/hexastral-api/src/routes/compass.ts` — pro-tier bearing log
- **Orchestrator** at `apps/hexastral-api/src/lib/feng-analyze.ts`. Runs
  inside `c.executionCtx.waitUntil` so the client gets `202 { jobId }`
  immediately and polls. Stages: `maps` → `vision` → `compute` →
  `synthesis` → `done` (or `failed` with errorMessage). Compute is
  in-process via `@zhop/astro-core/feng` so no extra hop. Magnetic
  declination snapshot stored at site creation so legacy lat/lng pairs
  remain interpretable if WMM epoch advances.
- **resvg-wasm overlay composition** in `services/svc-feng`:
  - `src/lib/overlay.ts` builds an SVG embedding the base PNG via
    `data:image/png;base64,...` then layers 24山 ring + bagua wedges +
    cardinal markers + sit/face/door arrows. Rasterized via
    `@resvg/resvg-wasm` (static import, wasm init amortized per isolate).
  - `src/routes/annotate.ts` rewritten to use it; on wasm-init failure
    falls back to passthrough (vision still works, just without arrows).
  - `.wasm` module declaration in `src/wasm.d.ts` so TypeScript strict mode
    accepts the static import.
- **Validation**: 35/35 workspace typecheck clean, 578/578 tests pass.

Δ from plan:
- `feng_map_cache` table dropped — cache key is already content-addressed
  in R2; D1 row would only duplicate the existence-check. Reintroduce if
  we ever need cross-isolate lookup metadata.
- Vision + Synthesis stages still talk to stub responses from svc-feng;
  real Gemini Vision + Claude/Gemini Pro wiring lands Week 5 per §11.
- `feng-app` client scaffold and FacingCalibrator are Week 4 (per §11) —
  not in scope for Week 3.

### Week 4 — feng-app core flow (shipped 2026-05-15)

Status: ✅ complete.

- **`apps/feng-app/`** — flagship Expo SDK 54 app (`com.hexastral.feng`).
  Mirrors `apps/yuan-app/` shape; ~20 source files across `app/`, `lib/`,
  `components/`, `assets/README.md`. iOS-only V1 per §15. Boot →
  `AuthProvider` → `FengClientGate` → `(tabs)`.
- **(new-site) 4-step stack** (per §9.1):
  - `address.tsx` — text input + `expo-location` reverseGeocode for "use
    current location"; persists `lat`, `lng`, `formattedAddress` to draft
  - `facing.tsx` — the hero. Renders `FacingCalibrator` (shared with
    Compass), subscribes to `Location.watchHeadingAsync` for magnetic +
    true heading, computes declination as `magHeading - trueHeading`,
    auto-fills draft on every gesture release
  - `building.tsx` — implements the fallback ladder from §6
    (exact / decade / moveIn / unknown) + optional floor
  - `review.tsx` — summary → `useCreateSite()` → `useAnalyzeJob.start()` →
    poll until done → `router.replace('/(report)/[siteId]')`
- **(tabs) — 4 tabs** (per §9.1):
  - `index` sites home (empty state, pull-to-refresh, `+ Add site` CTA)
  - `compass` in-app compass on ink-teal canvas with rotating
    `BaguaCompassOverlay` + true/magnetic/declination triplet
  - `readings` past reports list
  - `profile` birth-info CTA (deep-links to hexastral-app) + sign out
- **(report)/[siteId]** vertical chapter scroller. Each chapter card:
  CHAPTER N · KIND label, title (19pt 700), golden line (accent italic),
  body (15pt 22-leading). Data-quality footer at bottom per §6.
- **`packages/scenario-feng/` filled out**:
  - `context.tsx` — `FengClientProvider` + `useFengClient`
  - `lib/feng-api.ts` — hand-typed RPC façade (same workaround as Yuán's
    `yuan-bonds-api.ts`; the Hono RPC inference depth-limit bites once
    the route tree is large enough)
  - 5 hooks: `useFengSiteList`, `useFengSite`, `useCreateSite`,
    `useAnalyzeJob` (poll-based with 800ms interval, 5-min hard cap,
    unmount cancellation), `useDeclination`
  - 2 components: `BaguaCompassOverlay` (shared 24山 + 8 wedges visual,
    used by Fēng compass tab + Compass satellite via re-export when Week
    5 ports compass-app to it), `FacingCalibrator` (Pan gesture via
    react-native-gesture-handler → Reanimated worklet → onChange callback;
    direct manipulation, no relative deltas)
- **FacingCalibrator hero screen** budget: 3 days per §11 risk table.
  Shipped on the budget. Pan converts (x,y) to feng-shui degree (0=N,
  clockwise) by `atan2(dy, dx) + 90`; arrow rotates via
  `transform: [{ rotate: `${deg}deg` }]` so it directly tracks the touch.
  Spring-snaps to integer on release; haptic on grab.
- **Validation**: 36/36 workspace typecheck clean, 578/578 tests pass.

Δ from plan:
- Address screen V1 uses text input + expo-location reverseGeocode rather
  than the Mapbox forward-geocoding picker outlined in §5.4. Reason: the
  geocode worker doesn't expose forward search publicly yet; adding the
  proxy through `/api/geocode` is a Week 5 task. The flow still works:
  the user types or auto-fills coordinates and the next-screen calibrator
  draws against any lat/lng.
- The (facing) screen renders the calibrator against a stock backdrop
  rather than a fetched Mapbox satellite tile. Reason: Mapbox token isn't
  wired in the sandbox (Week 3 follow-up). All overlay geometry is
  correct against any image source; swapping `satelliteSource` is a
  one-line change once the token is set.

### Week 5 — Real AI pipeline + share cards (shipped 2026-05-16)

Status: done.

- **Gemini 2.5 Pro Vision** wired into `services/svc-feng/src/routes/vision.ts`.
  New `src/lib/gemini.ts` (shared client for vision + text) and
  `src/prompts/vision.ts` (system + user prompt, response schema). The
  route fetches all 3 annotated PNGs from R2, base64-encodes them, and
  sends to Gemini with a structured output schema. Zod validation with
  retry x2; degrades to empty observations on failure so synthesis can
  still proceed.
- **Gemini 2.5 Pro synthesis** wired into `src/routes/synthesize.ts`.
  New `src/prompts/synthesis.ts` with traditional-voice system prompt
  defining the 6-chapter structure (per feng-plan.md section 5.7). Structured
  JSON response schema. Retry x2 with locale-aware fallback chapters.
  **Delta from plan**: uses Gemini for synthesis (not Claude Opus 4.7) because
  the existing infra only has `GEMINI_API_KEY`. Claude can be added later
  as an A/B variant via the §7 experiment framework.
- **Portfolio-memory injection**: `feng-analyze.ts` orchestrator now calls
  `searchPortfolioReadingMemory(userId, 'hexastral', ...)` before synthesis
  and passes the context string into the synthesis prompt. Memory context
  enriches the report with continuity from past readings.
- **`dataQuality` forwarding**: the orchestrator now passes build-year
  confidence metadata into the synthesis prompt so the model can add
  appropriate caveats to the flying-stars chapter.
- **Per-chapter share buttons**: new `ShareFengChapterButton` component in
  `apps/feng-app/components/` (cinnabar-pill pattern from C.3). Calls
  `POST /api/share` with `reportType: 'feng'` (enum added to share route).
  Each chapter card in the report screen includes a share button.
  4-locale share strings added to `apps/feng-app/lib/i18n.ts`.
- **Report screen upgraded** (`apps/feng-app/app/(report)/[siteId].tsx`):
  CJK chapter labels (外巒頭/命卦/飛星/流年/化解/改運) replace raw
  `kind.toUpperCase()`. Share buttons per chapter.
- **`@google/genai` ^1.44.0** added to `services/svc-feng/package.json`.
- **`feng-client.ts`** types updated: `VisionAnalyzeResult.砂/.水/.朝案`
  now carry full structured fields instead of `unknown[]`; `SynthesizeInput`
  gains optional `dataQuality`.
- **Validation**: not run (sandbox); manually verify post-install.

Delta from plan:
- ChapterPager (horizontal swipe) deferred to Week 6 polish — the vertical
  scroll is ship-ready and horizontal paging adds gesture-handler complexity
  on the report's already-dense layout. Can revisit if user feedback requests it.
- Gemini used for synthesis instead of Claude — single-secret infra simplifies
  deploy. Swappable via A/B framework post-launch per §13 decision #3.

### Week 6 — Polish + ship (queued — code partial, manual ops open)

**Code still open**: hexastral-web `/feng` landing (not only `feng-shui/[slug]`),
立春 流年 cron job in hexastral-api, optional ChapterPager horizontal swipe.

**Human-only** (see [local-manual-checklist.md](local-manual-checklist.md) §2):
ja content review, App Store Connect / RevenueCat products, EAS + bundle IDs
for Compass + Feng, designer icon/splash, svc-feng R2/secrets, feng D1 migrate + deploy.

### Manual follow-ups carried forward

These cannot run inside the sandbox; track separately for deploy day:

1. `cd apps/compass-app && eas init` → fills `EAS_PROJECT_ID` in `app.json` and `eas.json`
2. `cd apps/feng-app && eas init` → fills `EAS_PROJECT_ID` placeholders in `app.json` + `eas.json`
3. Apple Developer → register bundles `com.hexastral.compass` + `com.hexastral.feng`
4. App Store Connect → create Compass + Feng app listings (4 locales each)
5. RevenueCat — products per §7:
   - Compass: `hexastral_compass_pro_monthly` ($1.99/mo) + `hexastral_compass_pro_lifetime` ($19.99)
   - Feng: `hexastral_feng_site` ($59), `hexastral_feng_pro_monthly` ($19.99),
     `hexastral_feng_pro_annual` ($149), `hexastral_feng_annual_refresh` ($19)
6. Designer assets:
   - `apps/compass-app/assets/{icon,splash}.png` (墨青 #0F1E26 + 铜金 #B08D5B + 羅)
   - `apps/feng-app/assets/{icon,splash}.png` (墨青 #0F1E26 + 铜金 #B08D5B + 風) —
     brief in `apps/feng-app/assets/README.md`
7. `wrangler r2 bucket create feng-maps` + `wrangler r2 bucket create feng-annotated`
8. `wrangler secret put MAPBOX_TOKEN` + `wrangler secret put GEMINI_API_KEY` (svc-feng)
9. ja content reviewer hire for Fēng (Week 5 blocker, ~$2k budget)
10. `cd apps/hexastral-api && bun db:generate` → review the new feng + compass migration → `bun db:migrate:prod`
11. Deploy order: svc-feng first (`cd services/svc-feng && bun deploy`), then
    hexastral-api (so the SVC_FENG binding resolves). End-to-end smoke per Week 3 checklist.
