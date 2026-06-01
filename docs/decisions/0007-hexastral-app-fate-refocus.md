# ADR-0007: hexastral-app refocus to Personal Fate flagship

- Status: **Reverted by [ADR-0009](0009-two-layer-matrix.md)** (2026-05-20) — the omnibus hexastral-app is **retired**; a clean Tier-3 `fate-app` (八字 + 紫微) replaces its natal surface
- Date: 2026-05-19
- Amends: ADR-0002 (brand matrix), ADR-0004 (Satellite Integration & Funnel Pattern), ADR-0006 (Satellite Tiers)
- Amended by: [ADR-0008](0008-three-layer-architecture.md) — the §2 ownership matrix now applies the three-layer rule (per-scenario UI lives in the owning app, not in scenario-* packages)
- Companion: [phase-j-plan.md](../phase-j-plan.md), [phase-k-plan.md](../phase-k-plan.md)

> **Reverted (2026-05-20) — see [ADR-0009](0009-two-layer-matrix.md).** The Phase K audit
> found the problem was not that hexastral.fate is a *weak* flagship, but that the
> **omnibus shape itself** (命 / 星 / 六爻 / 合婚 / 面相 / 黄历 in one app) contradicts the
> satellite-funnel matrix and cannibalizes its own satellites. Resolution: **retire**
> hexastral-app rather than refocus it; a clean Tier-3 `fate-app` (八字 + 紫微) replaces only
> its natal surface, and the other surfaces go to their owning apps (合婚→Yuán, 六爻→Coin
> Cast, 面相→Face Oracle, 黄历→Cycle).
>
> **What stays valid as history**: the §1/§2 *ownership* reasoning — that each scenario
> has exactly one owning app and that functional duplication triggers iOS §4.3 — is the
> same logic ADR-0009 acts on. The "delete duplicated routes" analysis below still holds;
> only the "hexastral-app *is* the surviving Fate flagship" premise is reverted (it is
> retired; fate-app is the surviving natal surface, as a Tier-3 funnel, not a flagship).

## Context

hexastral-app was originally built as the "kitchen-sink flagship": a single
app that surfaced every scenario in the suite (bonds / face / palm / dream
/ I-Ching / meihua / natal / reports / fate signals). Over Phases C–G the
matrix expanded to three flagships + five satellites, and three of the
scenarios in hexastral-app now have dedicated satellite apps with
overlapping flows:

| Scenario | hexastral-app location | Satellite |
|---|---|---|
| Bonds / 双人合盘 | `(bonds)/*` + `(tabs)/friends` + 1500-LOC `BondsStarfieldImpl` + `lib/domain/bonds.ts` | yuan-app |
| Face / Palm | `(explore)/palmface*` (thin wrapper around `scenario-palmface`) | face-oracle-app |
| Dream | `(explore)/dream*` (thin wrapper around `scenario-dream`) | dream-oracle-app |

In addition, hexastral-app holds two divination modes that have no
canonical home anywhere:

| Scenario | hexastral-app location | Natural satellite home |
|---|---|---|
| 梅花 (meihua) casting | `lib/domain/meihua.ts` + `useShakeDivination` consumer | numerology-app (algorithmic divination) |
| 摇卦 (I-Ching shake) | `(tabs)/yiching/*` + `useShakeDivination` + `YaoHexagramDisplay` | coin-cast-app (shake = alternate method for the same 6-line hexagram coin-cast already produces) |

This creates three concrete problems:

1. **iOS § 4.3 spam risk.** Apple has repeatedly rejected umbrella-plus-satellite
   matrices where the umbrella replicates a satellite's primary use case.
   "Bonds / 合盘" appearing as a complete flow inside both hexastral-app
   *and* yuan-app is the obvious red flag.

2. **Duplicated code ownership.** `lib/domain/bonds.ts` semantics, query
   hooks, and the starfield visualization exist in hexastral-app but the
   types/API used by yuan-app live in `scenario-yuan`. Every bonds change
   requires editing two surfaces.

3. **Diluted ASO + positioning.** Each App Store listing should advance one
   clear value prop. "HexAstral: everything astrology" loses to focused
   competitors. "HexAstral: your lifelong birth chart" wins its category.

## Decision

### 1. hexastral-app's locked responsibility

hexastral-app is the **Personal Fate (个人命理)** flagship. It owns
everything tied to a single user's lifelong chart:

- 八字 natal chart (pillars / 十神 / 格局)
- 紫微斗数 (via `@zhop/scenario-ziwei`)
- 大运 + 流年 timeline
- 虚星 (stellar transits)
- 日日命理 (daily fate signal)
- 多章宿命报告 (chapter-based destiny report)
- 人生大事档案 (life event log keyed to the chart)
- Profile + IAP for the above

Everything else — bonds, face/palm, dream, meihua, I-Ching shake — is
**moved out**. Where a satellite already owns the flow, hexastral-app
deep-links to the satellite from a discovery card on the Fate home.

### 2. Scenario ownership matrix (locked)

Each scenario has exactly one owning app. Per ADR-0008, per-scenario UI
**lives in the owning app's `components/` directory**, not in a shared
package. The "shared package" column below shows where types / API client
/ pure helpers live — only when 2+ surfaces (mobile + web, mobile + api,
or 2 mobile apps) genuinely share them.

| Scenario | Owner app | Shared package (types/API only) |
|---|---|---|
| 个人命理 (八字 / 紫微 / 大运 / 流年 / 日签 / 命书) | **hexastral-app** | none needed for now (single mobile consumer); `astro-core` already holds compute |
| 双人合盘 / Bonds | **yuan-app** | `scenario-yuan` trimmed to types + bonds-api + facing-deg |
| 面相 / 手相 | **face-oracle-app** | `scenario-palmface` trimmed to types or absorbed into `core-ui/CapturePipeline` |
| 梦境 | **dream-oracle-app** | `scenario-dream` trimmed similarly |
| 六爻 + 摇卦 (hexagram divination, any input method) | **coin-cast-app** | shared types only if web /coin-cast renders interactively; otherwise app-local |
| Pythagorean + 梅花 (number-driven divination) | **numerology-app** | similar — app-local unless web shares |
| 风水 | **feng-app** | `scenario-feng` stays (compass-app is the second consumer) |
| 罗盘 | **compass-app** | `scenario-feng` (shared with feng-app) |

Cross-cutting flows (birth-info form, capture pipeline, paywall modal,
discovery card, AI chat shell) live in `core-ui` per ADR-0008 — see
phase-j-plan.md §1.

### 3. Cross-app linking

Each satellite-bound feature in hexastral-app's Fate home is replaced
with a "discovery card" that:
- Renders a one-line teaser ("看你和 TA 的缘 →")
- On tap: tries the satellite's universal link via `Linking.openURL`
- On install miss: falls back to App Store with a `via=hexastral` query
  param so we can attribute funnel conversions

AASA universal-link manifests get bidirectional entries so that satellite
result screens can deep-link *back* into the user's hexastral-app
profile / chart when relevant.

### 4. App Store positioning copy

Each app's marketing title + subtitle commits to one thing:

| App | Title | Subtitle / pitch |
|---|---|---|
| hexastral-app | HexAstral | 你的命盘 · 大运 · 日签 — Lifelong birth chart |
| yuan-app | 缘 Yuán | 双人合盘 · Synastry & relationship reading |
| face-oracle-app | Face Oracle | 面相手相 AI 解读 |
| dream-oracle-app | Dream Oracle | 周公解梦 · Dream interpretation |
| coin-cast-app | Coin Cast | 六爻占卜 · I-Ching divination (coins + shake) |
| numerology-app | Numerology | Pythagorean + 梅花数术 |
| feng-app | 风 Fēng | 风水报告 · Feng-shui audit |
| compass-app | 罗 Compass | 24山罗盘 · Compass utility |

### 5. iOS review story

When the App Store reviewer asks "why do you have so many apps?", the
answer is:

> Each app serves a single, distinct scenario in East-Asian metaphysics.
> They share infrastructure (auth, payment, content) but the primary
> user task is different in each: lifelong chart (HexAstral), couple
> compatibility (Yuán), face reading (Face Oracle), dream interpretation
> (Dream Oracle), I-Ching (Coin Cast), numerology (Numerology),
> feng-shui (Fēng), compass utility (Compass).

This sentence has to be *true* — which it isn't today, because
hexastral-app contains complete bonds + face + dream + I-Ching flows.
Phase J makes it true.

## Consequences

### Positive

- Single-purpose App Store listings → better keyword ranking
- iOS § 4.3 risk eliminated (no functional duplication)
- Code ownership unambiguous: each scenario lives in exactly one
  `@zhop/scenario-*` package, consumed by exactly one flagship/satellite
- New scenarios can be added without bloating hexastral-app
- Each app becomes independently shippable + reviewable

### Negative

- Existing kitchen-sink users (low count per CLAUDE.md "no real users yet")
  have to install additional apps for non-Fate features. Mitigated by
  smooth universal-link hand-offs and the satellite funnel discount
  policy from ADR-0004 §3
- ~2000 LOC of code movement; ~3 weeks of focused effort
- More EAS builds + App Store submissions to coordinate (already true
  per the matrix; no new burden)

### Out of scope for Phase J

- compass-app changes (already Tier 3, untouched by this refocus)
- feng-app changes (already independent, untouched)
- Web (hexastral-web) — separate refactor; web has different SEO
  considerations than App Store and can stay broader
- useone-tech corporate site — unrelated

## Alternatives considered

**B. Keep hexastral-app as master + lite previews.**
Lighter refactor, but doesn't resolve the iOS § 4.3 risk and leaves the
duplicated bonds/face/dream code paths intact. Rejected per the
"functional duplication, not visual duplication, is what triggers 4.3"
reading of recent reject patterns.

**C. Collapse satellites back into hexastral-app, kill the matrix.**
Loses the ASO real estate that ADR-0004 §2 explicitly bought into.
Rejected.

**D. Per-feature toggles inside hexastral-app, decided remotely.**
Adds a maintenance dimension (feature flags), doesn't reduce code, and
still presents a duplicated surface to Apple. Rejected.

## Sequencing

See [phase-j-plan.md](../phase-j-plan.md) for the four-step execution
plan (J.1 extract → J.2 satellite adoption → J.3 hexastral-app strip
→ J.4 cross-app polish). Execution deferred to a later session;
this ADR is the decision record only.
