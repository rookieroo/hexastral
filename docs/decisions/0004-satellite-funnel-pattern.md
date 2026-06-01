# ADR-0004: Satellite Integration & Funnel Pattern

- Status: Accepted
- Date: 2026-05-16
- Supersedes / amends: ADR-0002 (brand matrix), ADR-0003 (Compass placement)
- Amended by:
  - [ADR-0009](0009-two-layer-matrix.md) — §1 brand matrix replaced by the two-layer (flagship vs. funnel) model
  - [ADR-0019](0019-v1-wave-narrowed-cycle-feng-yuan.md) — **V1 wave only**: flagship-anchored funnel temporarily replaced by peer-promote among cycle / feng / yuan v2 (MingPan paused as the top flagship). See §"2026-05-31 footnote" at the end.

## Context

After Phase E shipped, an audit of the matrix surfaced two competing concerns:

1. **The matrix is too wide for a pre-PMF team.** 11 apps (3 flagships + 5
   satellites + 1 web + 2 corporate), 0 real users, fragmented design budget,
   8 App Store reviews to manage. The instinct was to cull.

2. **Each satellite holds ASO real estate.** Killing apps means losing
   App Store keyword surface that competitors will happily occupy. In a
   keyword-driven discovery market, breadth is a moat — _provided_ the
   maintenance cost stays low.

The reconciliation: **keep the breadth, share the infrastructure, enforce a
funnel.** Satellites stop being independent products and become focused
acquisition surfaces, each pointing at a flagship for retention and ARPU.

## Decision

The HexAstral matrix locks the following structure for Phase F and beyond:

### 1. Brand matrix (locked — amended by ADR-0009)

> **Phase K amendment (2026-05-20) — [ADR-0009](0009-two-layer-matrix.md) two-layer matrix.**
> The matrix is now a **monetization** split: only Yuán + Fēng are IAP-producing
> flagships; FaceOracle is a Tier-2 high-cost paid utility; everyone else is a Tier-3
> anonymous funnel. HexAstral (命緣卦道) is **retired** — the new Tier-3 `fate-app`
> (八字 + 紫微) replaces its natal surface. The pre-ADR-0009 block (three flagships incl.
> HexAstral, Face Oracle as a plain satellite) is historical.

```
HexAstral (master / LLC publisher)
├── Flagships (Tier 1 — IAP)
│   ├── Yuán / 緣  — relationships (pairs · bonds · invites)
│   └── Fēng / 風  — feng-shui (sites · 流年 · indoor V2)
├── Tier 2 (high-cost, auth + IAP)
│   └── Face Oracle  — jade + ink-wash (camera-first physiognomy, VLM cost)
└── Tier 3 — anonymous ASO funnels, no IAP, each owns one keyword cluster + brand color
    ├── fate-app (命)   — 八字 + 紫微 (replaces retired HexAstral; ink/charcoal)
    ├── Coin Cast       — amber + wood-grain (the ritual moment)
    ├── Dream Oracle    — indigo + silver (dream interpretation)
    ├── Numerology      — violet + blue (梅花易数 / Eastern numerology, ASO loanword)
    └── Cycle (黄历)     — 黄历/择日 daily utility (ADR-0010, in build); 朱泥 earth-red
```

> Compass (羅) was originally a satellite here; killed 2026-05-20 during Phase K
> matrix simplification (see ADR-0003 reverted). In-app magnetic compass
> survives only as a tab inside feng-app.

No new satellites without amending this ADR.

> **§2 ASO table below is partially stale post-ADR-0009**: Face Oracle's tier is now
> **2** (not 1); fate-app's ASO cluster (八字 / 四柱 / 紫微斗数 / 命盘) is locked in
> [phase-k-plan.md §K.1.6](../phase-k-plan.md) and Cycle's (黄历 / 择日 / 万年历) in
> [cycle-satellite-plan.md §C.6.1](../cycle-satellite-plan.md). Tier semantics: see the
> [ADR-0006](0006-satellite-tiers.md) Phase-K amendment.

### 2. Per-satellite ASO assignment

Each satellite owns a primary App Store keyword cluster. Other apps must not
target the same primary term. This prevents intra-matrix cannibalization.

The `tier` column is the canonical capability level locked in
[ADR-0006](0006-satellite-tiers.md). A satellite cannot ship a feature outside
its tier (e.g., a Tier 3 satellite must not define RC product IDs).

| Satellite | Tier | Primary ASO | Secondary | Market |
|---|---|---|---|---|
| Coin Cast | 1 | "i-ching" + "易经" + "摇卦" | "divination" | CJK + EN curious |
| Face Oracle | 1 | "face reading" + "面相" + "physiognomy" | "face analysis" | CJK + EN viral |
| Dream Oracle | 1 | "dream interpretation" + "解梦" + "周公解梦" | "dream meaning" | CJK + EN broad |
| Numerology | 1 | "numerology" + "plum blossom" + "梅花易数" | "i ching divination", "hexagram cast" | EN primary (loanword) + CJK |

Yuán's EN landing targets **"compatibility test" + "synastry"** as its primary
ASO term — hotter in EN markets than "命理" or "feng shui."

### 3. Outbound funnel — satellites pull users into flagships

Every satellite result screen ends with a flagship CTA:

```
[ Save to HexAstral ]   or   [ View full reading in HexAstral → ]
```

The CTA:
1. Deep-links into hexastral-app if installed (`hexastral://*` URL with
   prefilled context — reading kind, ID, optional birth-data nudge).
2. Falls back to the App Store listing with deferred deep link if not
   installed (so the context survives the install).

Implementation owner: each satellite app at the result-screen level.

### 4. Inbound funnel — HexAstral Explore tab is the satellite directory

`apps/hexastral-app/app/(tabs)/explore.tsx` becomes a satellite hub:

- One card per kept satellite (Compass, Coin Cast, Face Oracle, Dream Oracle,
  Numerology).
- Card shows brand glyph + 1-line value prop + state-aware CTA:
  - "Open in [Satellite]" if installed (universal link).
  - "Install [Satellite]" if not.
- No actual content rendering inside HexAstral for these satellites; they
  remain the owners of their surfaces.

The flagship Yuán → relationships and Fēng → feng-shui CTAs remain on the
Bonds/Sites tabs respectively.

### 5. Portfolio-memory bridge

Satellites that produce readings index those readings into
`portfolio-memory` (the same vector store HexAstral's `/chat` route uses):

- `coincast` — every hexagram cast indexed with `targetApp: 'hexastral'`
- `faceoracle` — every face analysis with `targetApp: 'hexastral'`
- `dreamoracle` — every dream interpretation with `targetApp: 'hexastral'`
- `numerology` — every life-path compute with `targetApp: 'hexastral'`

Effect: HexAstral's daily AI chat can reference satellite readings without
needing to know they came from outside ("Last month you cast 乾卦 about your
job — that's relevant to today's signal..."). This is the value proposition
that makes the satellites worth keeping: they enrich the flagship.

Implementation owner: each satellite's submit/save action calls
`POST /api/portfolio/index` with the canonical `buildHexastralMemoryDocument`.

### 6. Architectural reuse mandate

Keeping 8 apps is justified only by aggressive infrastructure sharing.
Phase F enforces:

| Capability | Owner package / service | Consumers |
|---|---|---|
| UI primitives (Button, Card, Text, etc.) | `@zhop/core-ui` | All 8 apps |
| Design tokens (color, motion, elevation) | `@zhop/hexastral-tokens` | All apps + web |
| Gemini Vision plumbing | `@zhop/ai-vision` (new in F.3) | feng-app, face-oracle-app |
| Yi-Ching hexagram compute | `@zhop/astro-core/yiching` | coin-cast-app, hexastral-app |
| Numerology (梅花) compute | `apps/hexastral-api/src/lib/meihua.ts` (post-Phase K) + `lib/numerology.ts` (web calculator legacy) | numerology-app (meihua), web calculator (Pythagorean — kept for EN web only) |
| LLM prompts | `services/svc-astro/src/prompts/` | All AI-using apps |
| Portfolio memory | `apps/hexastral-api/src/lib/portfolio-memory.ts` | All reading-producing apps |
| HMAC signing | `packages/hexastral-client` (factory) | All RN apps |

Any new app must reuse — not duplicate — these. PR reviewers reject parallel
implementations.

### 7. Per-satellite brand color enforcement

Locked accent palettes live in `packages/hexastral-tokens/src/satellites.ts`.
Each satellite's `lib/theme.ts` is now a 3-line file:

```ts
import { CoreUIProvider } from '@zhop/core-ui'
// in root layout:
<CoreUIProvider brand="coincast" mode="dark">...</CoreUIProvider>
```

App-local palette files (`COMPASS_PALETTE`, `FENG_PALETTE`, etc.) are
deprecated and deleted during Phase F §4.

## Consequences

### Positive

- Matrix breadth preserved (ASO surface, brand presence).
- Maintenance cost capped by shared infrastructure (no parallel Vision
  pipeline, no parallel theme files, no parallel HMAC implementations).
- Each satellite has a clear single-responsibility purpose (one ASO term,
  one brand color, one funnel direction).
- HexAstral becomes more valuable because satellite readings feed its memory.

### Negative

- 8 App Store listings to manage at launch (Apple Developer registrations,
  ASCs, RevenueCat products, designer assets per app).
- More TestFlight cycles before V1.
- Risk that some satellites under-perform; need cohort-analysis discipline
  to decide whether to keep investing or sunset post-launch.

### Sunset criteria (post-launch)

Track per-satellite, 90 days after launch:

| Metric | Threshold to keep | Below threshold → sunset |
|---|---|---|
| Monthly installs (organic) | ≥ 500 | < 100 (kill candidate) |
| Funnel: satellite → HexAstral install | ≥ 5 % | < 2 % (kill candidate) |
| ASO rank for primary keyword | top 20 in primary market | outside top 50 (kill candidate) |

A satellite must hit at least 2/3 to remain in the matrix after Q3 2026.

## References

- [docs/phase-f-plan.md](../phase-f-plan.md) — full Phase F plan
- ADR-0001 — Yuán naming
- ADR-0002 — Brand matrix (this ADR locks the matrix shape)
- ADR-0003 — Compass as a satellite

---

## 2026-05-31 footnote — V1 wave peer-promote override (ADR-0019)

This ADR's core decision — **"each satellite points at a flagship for retention
and ARPU"** — assumes a flagship sits above the funnel. The 2026-05-31 V1
narrowing ([ADR-0019](0019-v1-wave-narrowed-cycle-feng-yuan.md)) pauses
MingPan from the V1 launch wave, leaving the three V1 apps (cycle, feng,
yuan v2) without the top-of-funnel flagship layer this ADR assumed.

**Temporary V1 override**: the three V1 apps cross-promote each other
**by intent**, in Me → Discover (collapsed disclosure, per ADR-0018 §5).
No app is the "top" — each is a peer recommending the others when the
user's stated intent fits the target's domain:

| Source | Recommends | Triggering intent          |
| ------ | ---------- | -------------------------- |
| cycle  | feng       | 入宅 / 动土 / 风水择址     |
| cycle  | yuan       | 嫁娶 / 合婚                |
| feng   | cycle      | 动土 / 入宅 date selection |
| feng   | yuan       | 双人入宅 / couples 风水    |
| yuan   | cycle      | wedding date selection     |
| yuan   | feng       | 新居布局 / 婚后住所         |

**Reversion**: when MingPan's restart triggers fire (ADR-0019 §Restart
triggers), the flagship-anchored model from this ADR's §3-4 reactivates
on top of the peer-promote layer — both coexist. cycle / feng / yuan
still peer-recommend; feng / yuan additionally funnel up to MingPan for
"lifelong chart" depth. cycle does **not** acquire a direct MingPan
funnel (utility → contemplative-depth would skip the intermediate
flagships).

**Why this isn't a full ADR override**: the funnel pattern's *infrastructure*
(shared portfolio backend, signed-request HMAC v2, cross-app discovery
telemetry, universal-link routing) all still applies — only the funnel
*direction graph* changes for V1. The §"Sunset criteria" thresholds also
remain valid; if a paused V1.1 candidate (MingPan / numerology) fails to
clear restart triggers within 12 months, it's a sunset candidate under
those same criteria.
