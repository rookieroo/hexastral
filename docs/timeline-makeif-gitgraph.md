# Timeline / Make-if as a git graph — progress + handoff

> **Why this doc**: the timeline/make-if redesign is a multi-phase epic that can't
> be visually verified in the cloud sandbox (no device). This is the alignment
> doc: what shipped, the design model, how to run + verify locally, and what's
> left. Pick up from "Remaining tasks".
>
> **Last updated**: 2026-06-05.
> **Branch**: `claude/timeline-gitgraph` (Phases 1–3a; NOT yet merged to main).
> **Already on main**: the earlier insight-density pass (reason-chips, hero 爆点,
> WYSIWYG share, make-if 影响/时机) — merge `6ae6db0`.

## 0. TL;DR

Both screens should read + behave like a real git graph (the reference is this
repo's own commit graph in any git GUI): a trunk, branches that **peel out, run
their own commits, and merge back**, with every git operation mapped to a real
product action. Timeline now does this structurally (Phases 1–3a). Make-if has
the highlight/explanation layer but not yet per-node LLM expansion or the
advanced ops (Phases 4–5).

## 1. Git graph → business mapping (design of record)

| git concept | Timeline | Make-if |
|---|---|---|
| trunk / master | 命 (本命 day-master through-line) | your real, lived life |
| branch | a 大运 (peel out → 流年 commits → merge back) | a 「假如」 (alt-life periods → merge back / run on) |
| commit (node) | a 流年 (verdict + one reason chip) | a key period in that alt-life |
| HEAD / checked-out | now (current 大运 = open branch, "now" at the live year) | now |
| checkout (tap branch) | expand that 大运's full decade | switch the highlighted 假如 |
| click commit | node detail popup | node detail popup |
| expand (LLM) | 流年 deep-read | **branch-node LLM reasoning** (Phase 4) |
| merge conflict | **冲太岁 year = conflict marker** (Phase 5) | tension point with reality |
| cherry-pick | — | **pull a 假如's good outcome back into real life** (Phase 5) |
| tag / star | mark a pivotal year (ties to 印证) | mark a turning point |
| diff | — | **a 假如 branch vs the real line, side by side** (Phase 5) |

Constraint that shaped the plan: the timeline payload's top-level `liunian` was
only ±5 years; `dayun` is 8 rows (80y). Make-if nodes are client-generated.
So "every branch has its own run of commits" needed a **server data change** for
timeline (Phase 1) but is client-only for make-if.

## 2. What shipped

### On main (earlier, merge `6ae6db0`)
- Node verdict word (吉/平/凶) + single priority reason chip (冲 > 忌神 > 用神 >
  桃花 > 驿马) + one hero 爆点 node.
- WYSIWYG share: `resolveNodeDetail` (pure, shared by live screen + capture) —
  the PNG bakes the node the user has SELECTED.
- Make-if: one branch always highlighted; featured explanation = 影响 (概要) +
  注意/时机 (current 命局 favoredMove), only for present/future (actionable) forks.

### On `claude/timeline-gitgraph` (Phases 1–3a, this epic)
- **Phase 1 — server** (`369ae13`): each `DayunRow` now carries its own `liunian`
  (the full decade, each with the 对你而言 fit/reasons overlay).
  - `apps/hexastral-api/src/routes/cycle-timeline.ts` — `liunianForDayun()` per decade
  - `schemaVersion 1 → 2`; `TIMELINE_CACHE_VERSION v2 → v3` (`db/schema.ts`)
  - `apps/auspice-app/lib/api.ts` — client `DayunRow.liunian` + `schemaVersion: 2`
  - test: `cycle-timeline.test.ts` asserts each 大运's 流年 span the decade
- **Phase 2 — client layout** (`e504b1e`): `buildGraph` rewritten so every 大运 is a
  real branch (peel → 流年 commits → merge back; current = open HEAD). Other 大运
  show NOTABLE 流年; Free locks non-current to ghost bumps, current branch runs
  only up to "now".
  - `apps/auspice-app/components/TimelineGraph.tsx`
  - `resolveNodeDetail` searches per-大运 流年 so any year node resolves on tap
- **Phase 3a — checkout** (`a172fbd`): tap a 大运 → expand its full decade (tap again
  to collapse). Drives the detail bubble; share captures the checked-out decade.
  - `expandedDayunIndex` threaded through `TimelineGraph`; `handleSelect` maps the
    1-based 大运 step id → 0-based array index in `timeline.tsx`.

All `bun test` (791) + `bun typecheck` (35) + `biome` green. **Not visually verified.**

## 3. Run + verify locally

```bash
bun install                      # if needed (sandbox couldn't; you can)
bun typecheck && bun test        # should be green

# Backend (so the timeline payload carries per-大运 流年):
cd apps/hexastral-api && bun deploy     # or run locally with wrangler dev
#   NOTE: TIMELINE_CACHE_VERSION bumped to v3 — old cached rows auto-invalidate
#   on next read. No manual migration needed (compute-on-read cache).

# Auspice app:
cd apps/auspice-app && bun dev          # open timeline + make-if screens
```

**Timeline — what to check (the structural ask):**
- [ ] each 大运 peels out of the 命 trunk, shows its 流年 as commits, merges back
- [ ] current 大运 is the open HEAD; "now" glows at the live year
- [ ] tap a (Pro) 大运 → its full decade expands; tap again → collapses
- [ ] tap any node → detail bubble; verdict word + one reason chip per node
- [ ] hero node (nearest notable upcoming year) stands out for the share
- [ ] Share PNG == what's on screen (selected node + checked-out decade)
- [ ] Free tier: only current decade up to now; other 大运 are ghost bumps

**Make-if — what to check (already on main):**
- [ ] one branch always highlighted; others recede
- [ ] featured explanation shows 影响 + (for present/future) 注意/时机
- [ ] share features the highlighted branch

If the git-graph geometry is off (curves, spacing, lane, merges), that's
`buildGraph` in `TimelineGraph.tsx` — the Canvas just renders the nodes/edges it
emits.

## 4. Remaining tasks (reprioritized 2026-06-05 — deterministic 命理 first)

Decision: bring the deterministic 命理 capabilities in FIRST (high aha, no
black-box, verifiable). The LLM branch expansion is now **secondary**.

### Phase 4 (NEW priority) — deterministic 命理 layer  ★ buildable + verifiable now
The git-graph skeleton is a vessel; these fill it with real 命理 business. All
backed by existing `astro-core` — no Workers AI.

> **✅ SHIPPED** on `claude/timeline-shishen-huajie` (`bun test`/`typecheck`/`biome`
> green; NOT yet visually verified or merged): all 3 below.
> - 1 十神 decade-theme: `getShiShen(...).category` on 大运 nodes → `timelineDomain`
> - 2 化解: `analyzeGeJu(...).favorableElement` → `timelineHuajie` on conflict nodes
> - 3 命主干 backdrop (make-if): real 大运 十神 at merge/fork age → `makeifBackdrop`

1. **十神 decade-theme** — each 大运 carries its 十神 category vs the 日主
   (`getShiShen(dayMaster, periodStem).category` → 比劫/食伤/财星/官杀/印绶), mapped
   to a life domain (人际/表达/财富/事业/学业). The branch gets a NAME (git: a
   branch has a theme); 流年 keep verdict + chip. Make-if forks read as "this
   choice activates your 财/官/印…".
2. **化解 / 通关 ("支线解法")** — conflict nodes (冲太岁 `clash` / 忌神 `unfavorable`)
   show their resolution: lean into the chart's 用神 element
   (`getFourPillarsShiShen` → `analyzeGeJu` → `recommendFavorableElement`) + the
   通关 五行 for a 克 relationship (`WUXING_GENERATE`). git merge-conflict →
   resolution.
3. **merge 命理 statement** — when a branch merges back to the trunk, say WHY:
   the real 大运 at the merge age (its 十神 theme) reabsorbs the 假如 — the
   命 vs 运 vs 选择 line ("even this choice gets pulled back toward your 官 decade").

### Phase 5 — more deterministic ops
- ✅ **神煞 event-flavor** SHIPPED (`b122604`): 天乙贵人/文昌/将星/劫煞 added to the
  single-priority node chip (`chipFor` takes a `ShenShaBranches` bundle).
- ✅ **cherry-pick** SHIPPED (`7d49880`): actionable 假如 → "带回现实" (用神 +
  nearest favorable 流年); past 假如 keep the 命主干 backdrop (mutually exclusive).
- ⬜ **冲合刑害会** interaction precision (`analyzeBranchClashes` /
  `analyzeBranchCombinations`) — deeper node reasons (流年 × 大运 × 本命). Moderate
  value (overlaps the existing chip); deferred.
- ⬜ **diff**: a 假如 branch vs the real line side-by-side — a comparison VIEW
  (new UI surface). Deferred — bigger UI, device-only to verify.
- ⬜ **择吉** on actionable future nodes (ties make-if 时机 to real date-picking) —
  needs the 择日 engine + a date surface. Deferred.

### Phase 6 (was Phase 4) — make-if branch-node LLM expansion  ⚠️ secondary; needs Workers AI to verify
Tap a node on a 假如 branch → LLM "at this age in that life, you'd be…".
Per-branch generator exists (`lib/makeIfBranches.ts` + `fetchMakeIfNarratives`);
extend to per-node. Buildable offline; generation only verifiable with Workers AI.

### Capability menu (the full 命理 → git/screen map, for reference)
| 命理 ability | feature | astro-core | ready |
|---|---|---|---|
| 十神 | node life-domain / branch theme | `getShiShen` | ★★★ |
| 化解/通关 | conflict resolution | `getWuXingRelation`/`recommendFavorableElement`/`WUXING_GENERATE` | ★★★ |
| 神煞 | event-flavor chips | `analyzeShenSha`/`getTianYiGuiRen`/`getWenChangGuiRen`/`getJiangXing`/`getJieSha` | ★★★ |
| 冲合刑害会 | precise node reasons | `analyzeBranchClashes`/`analyzeBranchCombinations` | ★★ |
| 合婚 overlay | partner 大运/流年 on your axis | `calculateHeHun` | ★★ (= Kindred bonds-timeline) |
| 择吉 | best window to act | Auspice 择日 | ★★ |
| 紫微大限 | alt interpretation lens | iztro (deps) | ★ |

### Acceptance for the epic
Every git operation visible in the graph maps to a real 命理 action, both screens
read as the reference git graph, and share == on-screen state.

## 5. Broader deferred backlog (infra-blocked, separate from this epic)
- Kindred timeline **local push** wiring — needs `expo-notifications` (EAS/native;
  sandbox can't `bun install` it). Pure schedule builder ships ready + tested in
  `@zhop/scenario-kindred` (`buildTimelineNotificationPlan`). See
  `docs/bonds-timeline-plan.md`.
- T4 live synastry-chapter generation verification — needs CF Workers AI (the
  deterministic parser half is tested).
- Track B widget (MoonDot/PNG) — needs Xcode.
- Ops: deploy + `bun db:migrate:prod` (migration `0011`) + RevenueCat $6.99
  `hexastral_compatibility` product config — needs prod creds / App Store Connect.

## 6. Branch / merge state
- `claude/timeline-gitgraph` — Phases 1–3a, pushed, **awaiting merge** + your
  visual verification.
- Earlier work already merged to `main` (`6ae6db0` and before).
