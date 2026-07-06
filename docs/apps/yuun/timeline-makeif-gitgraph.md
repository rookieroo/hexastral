# Timeline / Make-if as a git graph — progress + handoff

> **Why this doc**: the timeline/make-if redesign is a multi-phase epic that can't
> be visually verified in the cloud sandbox (no device). This is the alignment
> doc: what shipped, the design model, how to run + verify locally, and what's
> left. Pick up from "Remaining tasks".
>
> **Last updated**: 2026-06-06 — diff view, 择吉, Phase 6 per-node LLM all
> shipped on top of yesterday's 冲合刑害会 precision. Plus a Tower/Fork-style git
> graph polish on Timeline (per-branch colors, merge rings on the trunk).
> **Branch**: `main`. Phases 1–6 complete except visual verification on device.
> **Already on main**: every shipped phase below — the doc is now an audit, not a handoff.

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
- ✅ **冲合刑害会 precision** SHIPPED (2026-06-05 afternoon): new
  `analyzeBranchAgainstNatal(incoming, natal, stems?)` in `astro-core/combinations.ts`
  detects the strongest 进盘×本命 interaction (sanhe-ju / sanhui-ju / chong /
  liuhe / sanxing / liuhai / zixing). `chipFor` priority extended; old
  `personal_clash`-only 冲 broadens to "冲任一本命支". Six new chip kinds with
  zh-Hans/zh-Hant/ja/en labels (`signals.{sanhe,sanhui,liuhe,sanxing,liuhai,zixing}`).
  Hero detection now also fires on 三合/三会/三刑/六害 future years.
  - tests: 11 new cases in `combinations.test.ts` (priority order, 透干 status)
  - `bun typecheck`/`bun test` green (802 pass, +11 from before).
- ✅ **diff view** SHIPPED (2026-06-06): the highlighted 假如 vs the real life-line
  rendered row-by-row in `MakeIfDiffPanel` ([apps/auspice-app/app/makeif.tsx]).
  Each row = fork age / branch dot age / merge age. Left column shows the real
  大运 干支 + 流年 verdict; right shows the alt-life verdict; rows where the two
  verdicts **diverge** get an accent-tinted bg + "相左/diverges" suffix — the
  "real diff" moments. Deterministic, no LLM. i18n keys `makeifDiff.{header,
  realCol, altCol, forkRow, mergeRow, sameSuffix, diffSuffix}` in all 4 locales.
- ✅ **择吉 deep-link** SHIPPED (2026-06-06): when a FUTURE 流年 is selected,
  Timeline shows a "→ {year}年的吉日窗口" link routing to `/event` with the year's
  Feb 1 → May 1 window prefilled (立春-aligned, within the server's 92-day cap).
  `event.tsx` now reads `useLocalSearchParams<{event,from,to}>` and pre-populates
  state; Free still gets the next-30-days clamp, Pro picks within the window.

### Phase 6 — make-if per-node LLM expansion  ✅ SHIPPED (2026-06-06)
The diff-panel rows are the tap targets: tap any row → server hits Workers AI
(via SVC_ASTRO) for a short "at this age in that life, you would be…" line on
that specific node, rendered inline below the row. Same guard / cache pattern
as `/makeif`.
- **svc-astro**: new `POST /cycle/makeif-node-narrate` ([services/svc-astro/src/routes/cycle.ts])
  takes the branch shape + focusAge + the real-vs-alt verdict pair; returns one
  30–80 字 line, locale-targeted.
- **hexastral-api**: new `POST /api/auspice/makeif/node` ([apps/hexastral-api/src/routes/auspice.ts])
  — Pro-gated, KV-cached 30d per `(birth · branch shape · focusAge · verdict pair)`,
  shares the existing `MAKEIF_GUARD_CONFIG` daily limit.
- **client**: `fetchMakeIfNodeNarrative()` ([apps/auspice-app/lib/api.ts]); the
  `MakeIfDiffPanel` wraps each row in a `Pressable` and renders the narrative
  inline once it lands. Per-(branch.id, age) cache in component state survives
  taps; switching the featured branch resets it.
- **verification**: `bun typecheck` (35) + `bun test` (802) green. Workers AI
  generation is verifiable locally via `wrangler dev`.

### Acceptance for the epic
Every git operation visible in the graph maps to a real 命理 action, both screens
read as the reference git graph (Tower/Fork-style — per-branch hues + merge
rings on the trunk), and share == on-screen state. ✅ as of 2026-06-06; the
final capability menu lives in §7 below.

## 5. Broader deferred backlog (infra-blocked, separate from this epic)
- Kindred timeline **local push** wiring — needs `expo-notifications` (EAS/native;
  sandbox can't `bun install` it). Pure schedule builder ships ready + tested in
  `@zhop/scenario-kindred` (`buildTimelineNotificationPlan`). See
  [apps/yuel/bonds-timeline-plan.md](../yuel/bonds-timeline-plan.md).
- T4 live synastry-chapter generation verification — needs CF Workers AI (the
  deterministic parser half is tested).
- Track B widget (MoonDot/PNG) — needs Xcode.
- Ops: deploy + `bun db:migrate:prod` (migration `0011`) + RevenueCat $6.99
  `hexastral_compatibility` product config — needs prod creds / App Store Connect.

## 6. Branch / merge state
- `main` carries every shipped phase (1–6). The 2026-06-06 wave adds:
  - **Timeline UI polish**: `BRANCH_PALETTE` (8 hues) — per-大运 git-graph branch
    color; merge-back nodes are hollow rings on the trunk (the git "Merge X"
    commit visual); 大运 head + merge-back stroke uses the branch hue.
  - **Diff view** (deterministic, no LLM) — 假如 vs real, row by row.
  - **择吉 deep-link** — future 流年 → /event prefilled.
  - **Phase 6 per-node LLM** — tap-to-expand on the diff rows.
- Visual verification on device is still owed for the Timeline visual changes
  (Skia path geometry; no test coverage). Suggested sweep:
  - [ ] each 大运 reads as a distinctly-coloured branch (peel + lane + merge)
  - [ ] past 大运 have a hollow ring on the trunk at the merge point
  - [ ] current 大运 stays open at HEAD; "now" still glows
  - [ ] Share PNG renders correctly with the new colored branches

## 7. Capability menu — final
All deterministic capabilities + Phase 6 LLM now wired in:

| 命理 ability | feature | astro-core | ready |
|---|---|---|---|
| 十神 | node life-domain / branch theme | `getShiShen` | ★★★ ✅ |
| 化解/通关 | conflict resolution | `recommendFavorableElement`/`WUXING_GENERATE` | ★★★ ✅ |
| 神煞 | event-flavor chips | `analyzeShenSha` family | ★★★ ✅ |
| 冲合刑害会 | precise node reasons | `analyzeBranchAgainstNatal` | ★★★ ✅ |
| 择吉 | best window to act | Auspice 择日 (`searchAuspiceDays`) | ★★ ✅ (deep-link) |
| diff | 假如 vs real side-by-side | `MakeIfDiffPanel` (deterministic) | ★★★ ✅ |
| per-node 推演 | tap-a-row LLM zoom | `fetchMakeIfNodeNarrative` | ★★★ ✅ |
| 合婚 overlay | partner 大运/流年 on your axis | `calculateHeHun` | ★★ (= Kindred bonds-timeline) |
| 紫微大限 | alt interpretation lens | iztro (deps) | ★ (deferred) |
