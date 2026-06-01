# Feng / Yuan v2 / MingPan Sprint Plan · W2-W4

> **Status**: feng + yuan v2 ACTIVE · **MingPan PAUSED** (V1.1 candidate per ADR-0019) · 2026-05-31
> **V1 launch wave (per ADR-0019)**: cycle → feng → yuan v2 ship in V1; MingPan part is **PAUSED until restart triggers fire**
> **Implements**: ADR-0015 Doctrine v2 §"feng" / §"yuan v2" / §"MingPan" + **ADR-0018** design language + **ADR-0019** V1 wave commitment
> **Prerequisite**: cycle Sprint 1 (`packages/widget-kit-ios` + `packages/watch-kit-ios` + `SWIPE_TO_ME` shared contract) landed → unblocks feng + yuan

## ADR-0018 application (matrix-wide constraints, applied to BOTH feng and yuan v2)

Both apps adopt the design language wholesale (greenfield on the new pattern → zero migration cost):

- **No bottom tab bar** — single `Stack` home group: `index` (home) + drill-in screens + `me` (slide_from_right). **NO `SatelliteTabLayout`.** Existing sprint deliverables that mention `(tabs)/*.tsx` keep the folder path but the `_layout` is a `Stack`, not a tab navigator.
- **Left-swipe-to-Me + ⋯ button** — wire `SWIPE_TO_ME` from `@zhop/satellite-ui` exactly as ming-pan and cycle do.
- **Sparse home** — primary content leads; no marketing inserts; no flagship-upsell cards on home.
- **In-place reveal pattern** — both apps' primary moment (feng reading reveal, yuan pair-chart reveal) uses the ming-pan `ReadingOverlay` pattern, NOT router navigation.
- **Discover disclosure in Me** — collapsed, peer-promote only (no MingPan target during V1 — see ADR-0019 funnel section).
- **Magic-move splash via `@zhop/core-ui/motion`** — both are episodic / low-frequency, so the full ~1500ms ming-pan-style splash is appropriate (cf. cycle which is high-frequency and deferred the splash).
- **No ad slots anywhere** — including no `SatelliteFlagshipUpsellCard` / `SatellitePromoCard` on home, paywall, or reading surfaces.
- **Per-app palette kept** — feng paper-leaning (lit-environment site work); yuan suggested contemplative-warm (not dark) to differentiate from ming-pan's dark FLIP aesthetic.

## Overview

| App | Wave | Sprints | Investment | Pass odds | Tier | V1 status |
|---|---|---|---|---|---|---|
| feng | W2 | 6 sprints (6 weeks) | 5-6 wk | 80-85% | Sub + single | **V1 ACTIVE** |
| yuan v2 | W3 | 5 sprints (5 weeks) | 4-5 wk | 80-85% | Sub + viral | **V1 ACTIVE** |
| MingPan | W4 | 3 sprints (3 weeks) | 2-3 wk | 80-85% | One-time IAP | **PAUSED · V1.1 candidate** (see Part 3 banner + ADR-0019) |

**Parallel opportunity (V1 wave)**: when cycle Sprint 5 lands, start feng Sprint 1 (yuan starts after feng Sprint 2). **MingPan Sprint 1 is held until restart triggers in ADR-0019 fire — do not begin in V1.**

---

# Part 1 · Feng (W2)

## Scope (per ADR-0015 §"feng")

Reframe feng from "single-shot site analysis" to "Space Companion" subscription
with monthly maintenance + 节气 reminders + multi-space + widgets.

**Drops** (per SPAM-19 cuts): AI photo prediction, AI seasonal advice generation.
**Keeps**: compass + Ba Gua overlay, structured single-space analysis, multi-space,
flying stars (annual + monthly), 节气 maintenance push, widget × 3, watch.

## Design language + V1 wave commitment (2026-05-31)

- **ADR-0018 applied wholesale** (see top-of-doc constraints). feng is greenfield
  on the new pattern, so the cost is zero — write home as a no-tab `Stack` from
  day one with `SWIPE_TO_ME` swipe + ⋯ button, splash → V15Moon → 罗盘 hero,
  and `ReadingOverlay` for the reading reveal. The existing `spaces.tsx` "list
  view + switcher" (Sprint F.1 deliverable 3) is a **drill-in route** reached
  from a Today entry, not a tab.
- **V1 funnel = peer-promote only** (ADR-0019). In Me → Discover (collapsed):
  - feng → cycle for 动土 / 入宅 actual date selection
  - feng → yuan for 双人入宅 / couples 风水
  - **No MingPan target** during V1 (paused). When MingPan returns post-V1,
    add an "open this site's 命盘 in MingPan" deep-link from the chart-data
    appendix — flagship-anchored upgrade path, out of scope for V1.
- All Sprint F.1–F.6 deliverables below pre-existed this design pivot and
  are **structurally compatible**; the only re-mapping is "tab → drill-in"
  on `spaces.tsx` (annotated above).

## Sprint F.1 · Multi-space schema + Pro upgrade

**Goal**: extend feng-app to support multiple Space records per user, gate behind Pro.

### Deliverables

1. `apps/hexastral-api/src/db/schema.ts`: extend or add `fengSpaces` table
   - Already exists per Phase E; review + extend with multi-space FK to userId
2. `apps/hexastral-api/src/routes/feng/site.ts`: list / create / delete Space
3. `apps/feng-app/app/(tabs)/spaces.tsx`: list view + switcher
4. Free tier: max 1 space; Pro: unlimited (gate via `users.entitlement` check)
5. Pro paywall sheet (reuse cycle's; satellite-runtime PaywallSheet)

### Effort: ~4-5 person-days

### Risk: schema migration if pre-existing schema doesn't support multi-space; low (pre-PMF, can iterate)

---

## Sprint F.2 · Annual + Monthly Flying Stars

**Goal**: implement 三元九运 (1864-2043) annual + monthly 9-star math + 9-grid UI overlay on space.

### Deliverables

1. `packages/astro-core/src/feng/flying-stars.ts`:
   - Function: `annualFlyingStars(year: number): NineStarGrid`
   - Function: `monthlyFlyingStars(year: number, month: number, annualCenter: NineStar): NineStarGrid`
   - Reference: 三元九运 algorithm + 紫白飞星 sequence
2. `apps/feng-app/components/FlyingStarsOverlay.tsx`:
   - 3x3 grid overlay on user's space (rendered above Ba Gua)
   - Year ↔ Month toggle
   - Tap any star → drill-in (古典 reference + ASO-safe English label)
3. ASO-safe English labels:
   - Replace "Lucky 1 White / Killing 5 Yellow" → "Sector 1 (creative resonance) / Sector 5 (energetic conflict)"
   - Keep Chinese: 一白贪狼 / 五黄关煞 etc. for zh-Hans/zh-Hant/ja
4. Tests: golden test for 2026 stars vs published almanacs

### Effort: ~5-6 person-days. Math-heavy.

### Risk: 三元九运 boundary off-by-one is common error. Mitigate with reference data.

---

## Sprint F.3 · 节气 maintenance push + 24 节气 fixed content

**Goal**: 24 节气 maintenance reminders + per-节气 fixed educational checklist.

### Deliverables

1. `apps/feng-app/data/jieqi-maintenance/` — JSON per 节气 × 4 locales
   - Each: name, date formula reference, maintenance_checklist (3-5 items),
     classical_note (1-2 sentence per locale), reference_text (古籍 ref)
   - Authors: AI draft + native speaker review (~30 min per 节气 × 4 locales)
2. Server: `apps/hexastral-api/src/services/feng-jieqi-push.ts`:
   - Schedule 24 reminders per year per user (no per-space; user-wide)
   - Push body: 节气 name + maintenance highlight + deep-link to space
3. Push permission: P1-12 expo-notifications integration (existing)

### Effort: ~5-6 person-days (content + push wiring)

### Risk: content quality. Mitigate same as cycle (AI + review).

---

## Sprint F.4 · Single-Space Audit IAP ($9.99) + AI educational chat

**Goal**: single-space deep audit one-time purchase + AI conversational chat (educational, not predictive).

### Deliverables

1. Single Space Audit IAP:
   - Product ID: `hexastral_feng_audit_single`
   - $9.99 one-time
   - Triggers: deep structured analysis → exportable PDF (10-15 sections, 2000+ words per locale)
   - Hexastral-api: existing `feng/report.ts` route extended
2. AI educational chat:
   - Reuse satellite-runtime SatelliteChat
   - System prompt: "You are an educational assistant explaining classical Chinese site theory (堪舆). Cite 青囊经 / 葬经 / 天玉经 where relevant. Do NOT predict outcomes. Do NOT give specific actions ('move your bed') — describe classical principles instead."
   - Conversation persistence in `apps/hexastral-api/src/routes/chat.ts` (existing)
3. ChatGPT 4.7 Sonnet for chat (fast, cheap, classical knowledge sufficient)

### Effort: ~5-6 person-days

### Risk: AI hallucination → bad customer experience. Mitigate with strict system prompt + temperature 0.3 + fallback canned responses.

---

## Sprint F.5 · Widget × 3 + Watch complication

**Goal**: widget + watch leveraging `packages/widget-kit-ios` from cycle Sprint 1.

### Deliverables

1. Small widget: this month's flying-star center + key avoid
2. Medium widget: 3x3 stars mini grid + tap into space
3. Lock-Screen rectangular: next 节气 N days + maintenance note
4. Watch complication (modular small): next 节气 countdown

### Effort: ~4-5 person-days

### Risk: app group bridge from feng → widget. Reuse cycle's pattern.

---

## Sprint F.6 · ASO + TestFlight

**Goal**: ASO finalization + reviewer notes + TestFlight build.

### Deliverables

1. `apps/feng-app/aso-metadata.json` revised per Doctrine v2
2. Screenshots × 4 locales × 6.7" + 5.5" — 240 screenshots
   - Hero: compass + Ba Gua overlay
   - Multi-space switch
   - Flying stars 9-grid
   - 节气 maintenance card
   - Widget + watch
   - **No** crystal ball, no zodiac, no horoscope
3. Reviewer notes draft (cite 青囊经 / 葬经)
4. EAS build + TestFlight upload

### Effort: ~4-5 person-days

---

# Part 2 · Yuan v2 (W3)

## Scope (per ADR-0015 §"yuan v2", post-recalibration)

Yuan v2 is **subscription + viral**. Reverses the over-restrictive "no rating / no
verdict / no viral" framing from earlier doctrine drafts. Per real Apple precedent
(Co-Star, The Pattern, Sanctuary), compatibility scoring + daily insights + invite
mechanics all pass review when framed with classical anchor + algorithmic
determinism + utility texture.

## Design language + V1 wave commitment (2026-05-31)

- **ADR-0018 applied wholesale** with a **multi-entity adaptation**: yuan's home
  isn't single-self (you + N partners), so the sparse ming-pan hero pattern needs
  a "current active pair" affordance. **Suggested**: a slim horizontal pager at
  the top of Today showing thumbnails of each saved pair (≤4 fits comfortably;
  tap to switch active; long-press to manage; "+" tile at the end to add a new
  pair). The pager replaces a tab bar for inter-pair switching while remaining
  minimal — it's a single horizontal row, not persistent chrome.
- **No bottom tab bar** otherwise. `Stack(index, pair-input, me)` with `pair-input`
  as a drill-in reached from the pager's "+" tile. Existing Sprint Y.1 deliverable
  `apps/yuan-app/app/(tabs)/pair-input.tsx` keeps its file path but is registered
  as a `Stack.Screen` with `animation: 'slide_from_right'`, NOT a tab.
- **`SWIPE_TO_ME` + ⋯ button** wired per the shared contract.
- **ReadingOverlay for compatibility-report reveal** — yuan's natural primary
  moment. V15Moon → two-moon-overlap (eclipse) is the suggested splash → hero
  anchor (palette-positive: distinguishes yuan from ming-pan visually).
- **V1 funnel = peer-promote only** (ADR-0019). In Me → Discover (collapsed):
  - yuan → cycle for wedding date selection (嫁娶择日)
  - yuan → feng for 新居布局 / 婚后住所
  - **No MingPan target** during V1. When MingPan returns: add per-partner
    "open this person's chart in MingPan" deep-links from the per-pillar
    educational popups — out of scope for V1.
- **No ad slots** anywhere. The viral invite mechanism (Sprint Y.1) is a
  user-initiated share, not an ad — it stays. The daily insight panel (Y.2)
  is content, not an ad — it stays. Both already align with ADR-0018.

## Sprint Y.1 · Free flow + viral invite

**Goal**: pair input → side-by-side BaZi chart → invite link → partner inputs own
data → both see structural output.

### Deliverables

1. `apps/yuan-app/app/(tabs)/pair-input.tsx`:
   - Single screen: 你的 birth + TA birth (or "invite TA" button)
2. `apps/yuan-app/components/PairChartView.tsx`:
   - Side-by-side BaZi (4 pillars each side) using `packages/scenario-yuan`
   - 五行 balance bar charts
   - Day Master interaction label (相生 / 相克 / 相同)
3. Pattern labels:
   - 合冲刑害 patterns visible per pillar pairing
   - Tap label → educational popup (古典 ref + 现代 explanation)
4. Fit rating (★★★★☆ + 0-100% derived from algorithmic 五行 fit, NOT LLM):
   - Algorithm: `packages/scenario-yuan/src/fit/algorithmic-rating.ts`
   - Deterministic, golden-test verifiable
5. Invite mechanism:
   - Deep link: `https://hexastral.com/yuan/invite/{token}` → opens yuan if installed
   - Partner sees invite preview + fills own birth → both parties see full chart
   - Existing P1-15 universal links

### Effort: ~5-6 person-days. Mostly UI + invite wiring.

### Risk: invite link conversion + cross-device flow. Mitigate with detailed test plan.

---

## Sprint Y.2 · Daily insights + Pro features

**Goal**: Pro tier daily-utility layer (今日 1 行 free, 完整 Pro), pattern deep
reads, AI educational chat, anniversary tracker.

### Deliverables

1. Daily insight panel (今日):
   - Algorithm: `packages/scenario-yuan/src/daily/pair-daily.ts` — today's 干支 + pair
     patterns → structured 1-line (Free) or 5-line (Pro) insight
   - Pure compute, deterministic
2. Pattern deep reads (Pro):
   - 12-20 classical pair patterns (三合 / 六合 / 六冲 / 三刑 / 六害 / 元辰 / 桃花
     / 红鸾 / 天德 / 月德 / 天乙贵人 / etc.)
   - Each has: 古典 source, 释义, 现代 reflection (~300-500 words per locale)
   - 1 free deep read per month per pair
3. AI educational chat:
   - System prompt: "Educational only. Explain classical pair-chart patterns. Cite
     《滴天髓》《三命通会》. Do NOT predict outcomes. Do NOT give relationship advice."
4. Anniversary + special date tracker:
   - 公历 + 农历 anniversaries
   - Push: 7 days before + 1 day before + day-of
5. Multiple pairs (Pro): switch between different pair configurations

### Effort: ~6-7 person-days. Content-heavy.

### Risk: AI tone drift. Mitigate with strict prompt + canned fallbacks.

---

## Sprint Y.3 · Family multi-chart + family events

**Goal**: Pro family chart (you + spouse + parents + kids — 6+ persons), family
event tracking.

### Deliverables

1. `apps/yuan-app/components/FamilyChartView.tsx`:
   - Up to 6 charts visualized (compact grid)
   - Cross-pair fit table (e.g. 配偶 × 父母 fit, 你 × 子女 fit)
2. Family members schema (reuse cycle Sprint 4 family schema)
3. Cross-app family sync: yuan family list = cycle family list = feng household
   (single source of truth at hexastral-api)

### Effort: ~5-6 person-days

### Risk: UI density. Mitigate with progressive disclosure (default 2-person view,
expand to 6 on tap).

---

## Sprint Y.4 · Widget × 3 + Watch + Pair-specific UX polish

**Goal**: widget + watch leveraging shared infra.

### Deliverables

1. Small widget: today's pair fit + 1-line insight
2. Medium widget: next anniversary countdown + today's fit
3. Lock-Screen rectangular: anniversary countdown
4. Watch complication: anniversary countdown (modular small)
5. UX polish: animation between charts, screenshot share

### Effort: ~4-5 person-days

---

## Sprint Y.5 · ASO + TestFlight

**Goal**: same as feng F.6.

### Deliverables

1. `apps/yuan-app/aso-metadata.json` revised:
   - Subtitle: "Pair Chart · BaZi · AI Educator" (or similar)
   - Keywords: bazi, four pillars, couples, pair chart, classical, AI, study
   - Description leads with utility ("Daily pair insights" + "Multiple pairs" +
     "Family chart") not "compatibility prediction"
2. Screenshots × 4 locales:
   - Hero: side-by-side BaZi chart, fit rating visible BUT structurally grounded
   - Daily insight (today)
   - Pattern deep read (classical citation visible)
   - Family chart (6-person grid)
   - Widget + watch
   - **No** horoscope wheel, no zodiac, no "你们会幸福" or "destined to be"
3. Reviewer notes:
   - Cite Co-Star + The Pattern as established precedent
   - Cite 《三命通会》《滴天髓》 classical foundation
   - Highlight: algorithmic determinism, multi-locale, multi-pair (anti-spam differentiation)
4. EAS build + TestFlight

### Effort: ~4-5 person-days

---

# Part 3 · MingPan (W4) — PAUSED (V1.1 candidate)

> ## PAUSED · 2026-05-31
>
> MingPan is deferred from V1 launch per **[ADR-0019](../decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md)**
> (V1 Launch Wave Narrowed to cycle / feng / yuan). The sprint plan below is
> **preserved verbatim** — codebase, ASO metadata, reviewer notes, bundle ID,
> and the ADR-0018 design-reference status all remain intact and current.
>
> **Do not begin Sprint M.1 in V1.** Restart only when ADR-0019's restart
> triggers fire (cycle DAU + feng/yuan ship + retention thresholds).
>
> **Status of work done before the pause**:
>
> - Codebase complete enough to ship technically: SPAM-18/19/20/21 done
>   (name + reviewer-visible vocabulary), `ITSAppUsesNonExemptEncryption`
>   set (P0-1), VoiceOver-accessible Me-tab navigation done (P0-3),
>   ADR-0018 reference implementation `apps/ming-pan-app/app/(tabs)/index.tsx`
>   migrated to consume `SWIPE_TO_ME` (this session).
> - Sprint M.2 (Family Lineage Chart) + Sprint M.3 (Historical Figure
>   Comparison) — the uniqueness-axis lifts identified during ADR-0015
>   work — are **NOT yet built**. They remain V1.1 deliverables when
>   restart fires.
> - Bundle ID `com.hexastral.mingpan` reserved; reviewer notes per template
>   on file.
> - The app continues to typecheck under the shared monorepo and is exercised
>   on every shared-package change as a regression consumer for
>   `@zhop/core-ui`, `@zhop/satellite-ui`, and `@zhop/satellite-runtime`.

## Scope (per ADR-0015 §"MingPan", strengthened 2026-05-31)

Pure BaZi + 紫微 chart generator + classical reference + **family lineage chart**
+ **historical figure comparison**. No daily-utility (deliberate exception in
Doctrine v2 — MingPan is a tool, not a companion). One-time $4.99 IAP.

**Strengthening rationale**: original MingPan scope scored 3.5/6 on conceptual
uniqueness axes (per ADR-0015 §"Conceptual Uniqueness Checklist"). Family lineage
chart lifts axis 3 (UX paradigm — multi-generation tree, not seen in any other
BaZi calculator) and axis 6 (interactivity — cross-generation patterns). Historical
figure comparison lifts axis 4 (cultural framing — academic context). Together
they raise pass odds from 70% → 85%.

## Sprint M.1 · Strip narrative + chart core + classical reference

**Goal**: simplify existing fate-app from "reading report" to "chart generator + reference".

### Deliverables

1. Remove all "reading chapters" / "ch1 / ch4" narrative report code
2. Keep BaZi chart visualization + 紫微 chart visualization (reuse existing astro-core compute)
3. Add classical reference popups: each gan-zhi / star / palace tapped opens
   educational reference (no per-user "your fate is X" copy)
4. Remove daily fortune snapshot + streak + push (this is a tool, not a daily app)
5. Remove invite-unlock + chapter gating
6. Universal Link "View this chart in MingPan" support for cycle/yuan/feng deep-links

### Effort: ~5-6 person-days. Mostly subtraction.

### Risk: existing fate-app users expect narrative. Pre-PMF so OK to break. Add migration note.

---

## Sprint M.2 · Family Lineage Chart (uniqueness axis 3 + 6)

**Goal**: deliver the multi-generation family-tree BaZi chart that no other BaZi
calculator on the App Store has.

### Deliverables

1. Family tree schema:
   - Up to 5 generations × 2 parents-per-person = ~31 node tree max
   - Each node: name + birth (full) + relationship (self / parent / grandparent / etc.)
   - Stored at `apps/hexastral-api/src/db/schema.ts` `familyMembers` table
2. `apps/fate-app/components/FamilyLineageView.tsx`:
   - Tree visualization (top-down, self at bottom, ancestors above)
   - Each node compact card: name + 干 + 主星
   - Tap node → full chart for that person
   - Cross-generation pattern detection: "3 generations 庚金 day master" / "母系 hai 三合"
3. Privacy framing: explicit consent text per added family member ("I have
   permission from this person to add their birth info")
4. Limit: Free shows self only; lifetime IAP unlocks full lineage tree

### Effort: ~6-7 person-days

### Risk: privacy backlash if perceived as "ancestor data harvesting." Mitigate
with consent text + on-device-default storage.

---

## Sprint M.3 · Historical Figure Comparison (uniqueness axis 4)

**Goal**: deliver "compare your chart to 李白 / 苏轼 / 王阳明" — academic-style
historical comparison that distinguishes from generic calculators.

### Deliverables

1. Historical figures database:
   - 40 figures across 朝代 (汉 / 唐 / 宋 / 明 / 清 / 现代)
   - Each: name, birth (computed from historical records), brief biography,
     chart structure highlights, classical 八字 / 紫微 analysis if known
   - Categories: 诗人 / 政治家 / 思想家 / 武将 / 商人 / etc.
2. Comparison view:
   - Your chart side-by-side with historical figure
   - Highlight shared patterns: "You share 戊土 day master with 苏东坡"
   - Educational note: how this pattern manifested in their life
3. Authoring requirement:
   - 40 figures × 4 locales × ~300 words/locale = 48,000 words content
   - Source: classical biographies + modern academic analyses
   - **No predictive claims** — strictly historical-educational comparison

### Effort: ~6-7 person-days. Content-heavy.

### Risk: historical accuracy disputes. Mitigate with academic source citations.

---

## Sprint M.4 · Export + ASO + TestFlight + $4.99 lifetime IAP

**Goal**: PDF export + ASO finalization + TestFlight build.

### Deliverables

1. PDF export: structured chart + classical reference + family lineage section
   + historical figure comparison results (50-80 pages, depending on lineage size)
2. `apps/fate-app/aso-metadata.json` revised:
   - App name: MingPan (per SPAM-18, done)
   - Subtitle: "BaZi · 紫微 · Lineage · Classical Reference"
   - Position as EDUCATION / REFERENCE
   - Reviewer notes: emphasize **family lineage + historical figure comparison**
     as the unique-experience differentiators
3. $4.99 lifetime IAP: `hexastral_mingpan_lifetime`
   - Free: basic self chart + 5 historical figures + classical reference snippets
   - Lifetime: PDF export + full reference + unlimited charts + full family lineage
     (up to 31 nodes) + all 40 historical figures
4. Screenshots × 4 locales:
   - BaZi chart (self) — axis 1 + 2 signals
   - 紫微 chart (self)
   - **Family lineage tree** (4-5 generations) — axis 3 + 6 signals, unique
   - **Historical figure comparison page** (e.g. compare with 苏东坡) — axis 4 signal
   - Classical reference page
5. Reviewer notes: cite (a) Doctrine v2 §"Conceptual Uniqueness Checklist"
   approach (b) precedent of Truity 16Types (educational + non-predictive)
   (c) family lineage UX is unique in BaZi-calculator category

### Effort: ~4-5 person-days

### Total MingPan investment: ~3 weeks (was 2-3, now 3-4 due to lineage + historical figures)

---

# Timeline · 12-14 weeks total (with parallelism)

```
                 W1               W2               W3               W4
cycle:    [S1][S2][S3][S4][S5] [submit]------[review]------------------- 
                                       |
widget-kit lands (S1 end), unblocks ↓
                                       |
feng:                  [F1][F2][F3][F4][F5][F6][submit]------[review]----
                                                |
yuan v2:                              [Y1][Y2][Y3][Y4][Y5][submit]------
                                                            |
MingPan:                                       [M1][M2][M3][submit]-----
```

- **Week 1-5**: cycle sprint 1-5 (cycle goes to ASC)
- **Week 4-9**: feng starts at cycle's S4 (widget infra ready), 6 sprints (cycle in review meanwhile)
- **Week 8-12**: yuan v2 starts after feng S2 (validation that widget-kit production-ready), 5 sprints
- **Week 10-12**: MingPan parallel to yuan tail, 3 sprints

**Sequential submission**: cycle (W6) → feng (W10) → yuan (W14) → MingPan (W14-15)

If cycle rejected at W6:
- Pause new submissions, apply appeal
- Continue dev on feng/yuan/MingPan
- Resubmit cycle
- If 3rd rejection → trigger SPAM-11 PWA fallback

---

# Cross-app shared infrastructure

| Package | Used by | Status |
|---|---|---|
| `packages/widget-kit-ios` | cycle, feng, yuan | Build in cycle S1 |
| `packages/watch-kit-ios` | cycle, feng, yuan | Build in cycle S1 |
| `packages/satellite-runtime` family-events | cycle, feng, yuan | Already exists; extend |
| `packages/astro-core` flying-stars | feng | Build in feng F2 |
| `packages/scenario-yuan` daily insights | yuan | Extend in yuan Y2 |
| `apps/hexastral-api` push scheduler | cycle, feng, yuan | Build in cycle S4, reuse |
| RC Universe Bundle | All 4 | Configure when 2 apps live |

---

# Risk register

| Risk | App | P | Impact | Mitigation |
|---|---|---|---|---|
| Cycle Sprint 1 widget infra blocks | All | 25% | Delays all 3 downstream apps | Fall back to no-widget V1; ship widget V1.1 |
| Content authoring delays 节气 / patterns | cycle, feng, yuan | 40% | Sprint slips 1 week | AI-drafted + native review parallelism |
| AI chat tone drift | feng, yuan | 30% | Customer feedback bad | Strict prompts + canned fallback + post-launch monitoring |
| Yuan v2 rejected for compatibility-as-horoscope | yuan | 15-20% | 2-3 week delay | Pre-submit ASO + screenshot dry-run vs Doctrine v2 hard rules |
| Feng AI prediction overreach | feng | 15% | Rejection | Per ADR-0015, AI does NOT predict; only educates |
| MingPan rejected as 4.3(a) minimum function | MingPan | 15% | Pivot to "reference" not "calculator" | Add wiki + export to bulk up |
| RC catalog SKU misconfiguration | All | 15% | Pro purchase fails | Test on TestFlight before each submission |
| Universe Bundle attach rate < 15% by month 3 | All | 30% | Doctrine v2 retention model wrong | Iterate pricing; consider $7.99/mo Universe |
