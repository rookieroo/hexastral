# ADR-0015 · HexAstral Product Doctrine v2 (Utility-Anchored)

> **Status**: ACCEPTED · 2026-05-31
> **Supersedes**: ADR-0006 (satellite-tiers), ADR-0007 (fate-refocus), ADR-0012 (matrix-freemium)
> **Author**: assistant + user pair-decision

## Context

Three product reality-checks landed in May 2026:

1. **hexastral-app bundle rejection (ADR-0014)** — Apple cited "saturated category"
   and "abundance of similar apps." Subsequent audit (`docs/anti-spam-positioning.md`)
   identified the real failure mode: bundle contained 5 modes (八字 / 紫微 / 风水 /
   命理 / 易经) which read as a content farm, not a focused product.

2. **Single-shot reading economy is dead for subscription** — yuan v1, feng v1,
   and fate v1 were all "user inputs birth data → one-time output." This forces
   IAP (consumable) pricing, caps ARPU ~$15-30, and has no daily-return surface
   so retention is whatever single session converts.

3. **Apple's "thin app" tolerance is closing** — 2025-2026 reviewer trend pushes
   apps toward "ongoing utility" not "one shot reading." A reviewer in 2026 looking
   at a single-screen 黄历 app or a single-screen pair-chart app sees a thin
   product and applies 4.3(a) "minimum functionality" scrutiny.

These three forces converge on one doctrinal shift: **every HexAstral app must
have a daily-utility layer that delivers real practical value, with the cultural
cosmology as texture (not substance).**

## Decision

### Doctrine v2 (replaces v1 "satellite + flagship" model)

> Every HexAstral app must combine a **daily-utility layer** (calendar / reminder
> / spatial maintenance / decision support) with a **classical-cosmology layer**
> (BaZi / 风水 / 紫微 / 易经 framework as educational + interpretive texture).
> The utility layer justifies subscription. The cosmology layer differentiates
> from generic utility apps.

### The 4-app V1 matrix

| App | Bundle | Daily-utility layer | Classical layer | Tier | Pricing |
|---|---|---|---|---|---|
| **cycle** | `com.hexastral.cycle` | 万年历 + 24 节气 + 8 节日 + 农历家庭事件 | 黄历宜忌 + 28 宿 + 12 神 + 对你而言 | Subscription flagship | Free / $4.99 mo / $39.99 yr |
| **feng** | `com.hexastral.feng` | 多空间维护 + 24 节气提醒 + 月度飞星 | 罗盘 + Ba Gua + 五行 + 古典 site theory | Subscription + single-purchase | Free / $7.99 mo + $9.99 single audit |
| **yuan v2** | `com.hexastral.kindred` | 每日双盘洞察 + 流月 + 多对配对 + 周年追踪 | 八字合盘 + 合冲刑害 + 五行 fit + 古典 pair patterns | Subscription + viral acquisition | Free / $4.99 mo / $39.99 yr |
| **MingPan** | `com.hexastral.fate` (display: MingPan) | (none — pure tool) | 八字盘 + 紫微盘生成 + 古典 reference | One-time IAP | $4.99 lifetime |

### Daily-utility lock-in mechanisms (mandatory per app, except MingPan)

1. **iOS Widget × 3** (Small / Medium / Lock-Screen) — daily visual presence
2. **Apple Watch complication** — recurring exposure on wrist
3. **Push notification cadence** ≤ 0.3-0.5/day (educational + personal value)
4. **Cross-device sync** (sign-in required for Pro)

### Pricing structure

| Product | Free | Pro | One-time | Universe Bundle |
|---|---|---|---|---|
| cycle | ✅ basic | $4.99/mo · $39.99/yr | — | included |
| feng | ✅ 1 space | $7.99/mo · $69.99/yr | $9.99 single space audit | included |
| yuan v2 | ✅ pair input + structure | $4.99/mo · $39.99/yr | — | included |
| MingPan | ✅ basic chart | — | $4.99 lifetime | included (lifetime) |
| **HexAstral Universe** | — | **$9.99/mo · $79.99/yr** | — | = all 3 sub + MingPan lifetime |

Universe bundle math: cycle ($4.99) + feng ($7.99) + yuan ($4.99) + MingPan ($4.99 amortized) = $22.96 + ≈ Universe $9.99 (57% off).

### Kindred v2 specific decisions (reverses yuan v1 deprecation in v2 of this ADR)

Original yuan v1 was a one-shot couples-chart with single $9.99 IAP. v2 reframes:

- **Free tier delivers structural value**: pair input + side-by-side BaZi + structural patterns + 1 free deep read/month + 1-line daily insight
- **Viral mechanism preserved**: invite link, partner fills in own birth, both parties see full structural output, both can upgrade
- **Pro tier delivers daily-return + multi-pair value**: multiple pairs, unlimited deep reads, AI educational chat, family multi-chart, widget/watch, anniversary tracker
- **Anti-spam compliance** at the screenshot + ASO + visual level (no horoscope wheel, no zodiac symbols, no "predict your future" language)
- **Pass odds revised**: 80-85% (was 55-75% under over-restricted v1.5 framing)

### Cross-app discovery (5 mechanisms)

1. **Me tab Discovery card** (existing `SatelliteFlagshipUpsellCard`)
2. **Universal Link deep-jumps** (existing P1-15) — e.g. cycle 节气 page → "Read full classical reference in MingPan"
3. **Push cross-promo** ≤ 10% of pushes — e.g. cycle daily push includes "view in MingPan" deep link
4. **Web hexastral.com hub** — cross-app dashboard at hexastral.com/me
5. **Universe Bundle prompt at first Pro upgrade** (existing RC catalog)

### Web (hexastral.com) role in v2

- **Marketing front + 4 LP pages** (cycle / feng / yuan / MingPan)
- **Wiki / Reference** (~73 articles: 24 节气 + 8 festivals + BaZi/风水/紫微/pair 101 courses) — V1.1 build, V1 only structure
- **Cross-app Dashboard** at /me — Pro users manage family across all apps
- **PWA fallback (SPAM-11)** RESERVED — activate ONLY if W1 cycle rejected 3× consecutively

### Hard rules for 4.3(b) compliance

> **Re-reading the rejection (2026-05-31 user insight)**: Apple's hexastral-app
> rejection language explicitly stated *"these app features may be useful,
> informative or entertaining... may include features or characteristics that
> distinguish it. However, there are **already enough of these apps** on the App
> Store... reconsider the **app concept**."*
>
> **The bar is NOT feature-level**. Compatibility scoring, viral invites, AI
> chat, daily insights — all of these PASS at the feature level. **The bar is
> conceptual uniqueness at the App Store category level.** Reviewer asks: "Does
> this app provide a *unique experience not already found* in the saturated
> cluster?"

#### Conceptual Uniqueness Checklist (the actual 4.3(b) bar)

A reviewer evaluates 6 axes in the first 3 screens + 4 ASO screenshots. **An app
must show 2-3 ✓ to clear the bar.**

| # | Axis | Saturated (✗) | Unique (✓) |
|---|---|---|---|
| 1 | **Novel data input** | Pick your zodiac sign | Full birth (year/month/day/time + location) + family + partner |
| 2 | **Novel output structure** | Single-line daily horoscope | Multi-locale + classical citations + algorithmic visualization + multi-dimensional grid |
| 3 | **Novel UX paradigm** | Daily card flip | Calendar grid + 节气 timeline + multi-person chart + compass + widget/watch |
| 4 | **Novel cultural framing** | Western pop astrology | East Asian classical references + academic citations |
| 5 | **Novel monetization** | Card readings / psychic IAP | Utility subscription + reference IAP |
| 6 | **Novel interactivity** | Solo lookup | Viral partner invite + family multi-account + cross-device |

Per-app scorecard (V1 wave):

| App | Axis 1 | Axis 2 | Axis 3 | Axis 4 | Axis 5 | Axis 6 | Score | Pass odds |
|---|---|---|---|---|---|---|---|---|
| cycle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **6/6** | **95%** |
| feng | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **6/6** | **88%** |
| yuan v2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (viral) | **6/6** | **85%** |
| MingPan (baseline) | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ | ⚠️ | **3.5/6** | **70%** |
| MingPan + 家族盘 + 历史人物 (recommended) | ✓ | ✓ | ✓ | ✓ | ⚠️ | ✓ | **5.5/6** | **85%** |

**MingPan strengthening**: must add either family lineage chart (family-tree
BaZi cross-reference) OR historical figure comparison (compare your chart to
李白 / 苏轼 / 王阳明) to clear axis 3 and axis 6. Without this, MingPan is the
weakest app in the matrix.

#### ❌ Absolute prohibitions (presence = auto-reject)

These violate conceptual uniqueness AND 4.3(b) directly:

1. ASO subtitle / keyword containing: horoscope, zodiac, fortune, lucky, psychic, predict your future
2. Visual assets with Western astrology wheel as primary, moon-phase icon as primary, tarot card, crystal ball, zodiac symbols
3. Daily content that is 100% LLM auto-generated with no deterministic algorithm support
4. Health / medical / fertility / pregnancy predictions (also violates 1.4.1)
5. Multi-modal content farming (mixing 4+ divinatory domains in one app — hexastral-app's lesson)

#### ✅ Must-haves (these are the uniqueness signals)

1. Algorithmic determinism — all scores / patterns / projections must compute from astro-core, not LLM (axis 2 signal)
2. Classical-text anchor verifiable — every pattern label linkable to specific chapters of 三命通会 / 滴天髓 / 子平真诠 / 青囊经 / 葬经 (axis 4 signal)
3. 4-locale presence — `en` / `zh-Hans` / `zh-Hant` / `ja` (axis 2 + axis 4 signal)
4. Privacy by default — birth data stays on-device unless explicit opt-in sync (axis 5 signal — distinguishes from data-harvesting horoscope apps)
5. AI chat (if present) clearly labeled "Educational only. Not medical / legal / financial advice." (axis 4 signal)

#### 🟢 Confirmed-OK features (per Apple precedent — Co-Star, The Pattern, Sanctuary, Truity 16Types)

- **Compatibility scoring** (★★★★☆ or 0-100%) — Co-Star + Pattern + Helio all use this; all pass review
- **Daily insights / 1-line predictions** — every astrology app does this; passes if algorithmically grounded
- **AI conversational chat about classical concepts** — Sanctuary has psychic chat; ours is more constrained (educational only)
- **Invite / viral mechanics** — Truity 16Types has partner invite for MBTI pairing; passes review
- **Family multi-person tracking** — standard utility feature
- **Daily widget + watch complication** — all calendar/astrology apps have widgets

**Translation**: do not over-restrict features out of fear. The Doctrine
v2 hard rules + Conceptual Uniqueness Checklist together are sufficient.

### Launch sequence (revised W1-W4)

| Wave | App | Investment | Pass odds | Notes |
|---|---|---|---|---|
| **W1** | cycle (万年历) | 4-5 weeks | **95%** | 6/6 uniqueness axes — anchors publisher credibility |
| **W2** | feng (scoped) | 5-6 weeks | **88%** | 6/6 uniqueness — drops AI prediction |
| **W3** | yuan v2 (reframed) | 4-5 weeks | **85%** | 6/6 uniqueness — adds daily-utility + viral |
| **W4** | MingPan (strengthened) | 3-4 weeks | **85%** | Add family lineage + historical figures to clear uniqueness bar (axis 3 + 6) |

**Total**: 12-15 weeks if 2 apps parallel, 16-20 weeks if serial. Universe bundle activated when 3 of 4 cleared.

**Pass odds revision rationale**: original Doctrine v2 estimate over-discounted
yuan + feng + MingPan because of feature-level fear. The 2026-05-31 user insight
(re-read rejection language) showed Apple's bar is conceptual uniqueness, not
feature restriction. With 6/6 axes covered, pass odds are higher than initially
estimated.

### Permanently archived (per ADR-0016)

| App | Reason |
|---|---|
| face-oracle | "palm reading" cited in hexastral-app rejection |
| coin-cast | "divination" implied; saturated I-Ching category |
| dream-oracle | "fortune-telling / oracle" implied |

(yuan v1 is REPLACED by yuan v2, not archived; bundle stays active)

## Consequences

### Positive

- **Real subscription products** — each app justifies recurring fee through daily utility
- **Real retention moat** — widget + watch + family data lock-in
- **Apple-friendly framing** — utility category review treatment
- **Cross-app virality** — yuan invite + cross-app discovery + Universe bundle
- **HNW market opening** — polished bilingual product vs ad-laden CN incumbents
- **Reduced doctrine debt** — single unified product principle replaces tier-based confusion

### Negative

- **Longer V1 timeline** — 12-14 weeks (vs 3-4 weeks "ship existing apps")
- **Higher engineering investment** — shared widget-kit + watch-kit infra (3-4 weeks one-time)
- **3 apps archived** — face / coin / dream code becomes dead weight in repo
- **Higher quality bar** — each feature must hit "demo bar" or be cut
- **Designer hire risk** — if we hire ($8-15K) and W1 fails, sunk cost

### Risks + mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| W1 cycle rejected | 8% | Appeal protocol (`docs/launch-sequence.md` §5); if 3× rejection, activate SPAM-11 PWA |
| W2 feng rejected for AI prediction overreach | 15% | Demo-bar gating per feature (this ADR §"Daily-utility lock-in") |
| W3 yuan rejected for compatibility-as-horoscope read | 15-20% | Strict screenshot + ASO discipline; cite Co-Star/Pattern precedent in reviewer notes |
| W4 MingPan rejected as 4.3(a) "minimum functionality" | 15% | Bundle with classical 命理 wiki + chart export — pivot from "calculator" to "educational reference" if needed |
| 12-week timeline blows out | 30% | Sprint plan with weekly checkpoints (per app sprint docs); parallel work for cycle + feng once shared infra lands |
| Auspice 家庭多账户 feature flops | 20% | Iterate per-cycle metric; if dead by V1.5, simplify Pro tier |

### Implementation paths

- See `docs/sprints/cycle-sprint-plan.md` for W1
- See `docs/sprints/feng-yuan-mingpan-sprint-plan.md` for W2-W4
- See `docs/decisions/0016-archive-non-utility-apps.md` for archival
- ASO metadata for all 4 apps to be revised per this doctrine before W1 submission

### Validation criteria (when to revise this ADR)

**Revise if**:
- After 3 months post-W1: cycle Pro conversion < 1.5% (free → paid) — doctrine may not be Apple-friendly enough
- After 6 months: Universe Bundle attach rate < 15% — bundle pricing wrong
- After W2/W3/W4: any app rejected 3+ consecutive times with same reason — doctrine has structural flaw

**Re-confirm if**:
- W1 cycle approved on first submission within 14 days
- Pro subscription LTV/CAC > 3x at month 6
- Cross-app discovery → install rate > 30%

## References

- ADR-0006 (satellite-tiers v1, superseded)
- ADR-0007 (fate-refocus v1, superseded)
- ADR-0012 (matrix-freemium v1, superseded)
- ADR-0014 (hexastral-app bundle retirement)
- ADR-0016 (archive face/coin/dream + yuan v1 deprecation)
- `docs/anti-spam-positioning.md`
- `docs/launch-sequence.md`
- `docs/v1-submission-checklist.md`
