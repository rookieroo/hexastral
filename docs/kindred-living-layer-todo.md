# Kindred (yuel) — living-layer & report TODO

Carry-over backlog from the 2026-06 review session. Phase 1 of the timeline value
work shipped (default 10y + per-year density + Pro "see-further" door, commit
`a47b859`). What remains, in priority order, with enough context to act cold.

---

## Phase 2 — 10-year what-if (decision推演) — BIGGEST piece

**Why:** the what-if currently ranks only the **next 12 months** of 流月 windows
(`buildBondMakeIf(..., { months: 12 })`, `apps/hexastral-api/src/routes/bonds.ts`
POST `/:id/makeif`). The product needs a **10-year decision horizon**: for big moves
(结婚 / 要孩子 / 同居 / 异地), rank the best *years* ahead, with reasons.

**Current building blocks**
- `planRelationshipDecision(ego, other, { months })` in astro-core — month-granular
  window ranker (`apps/hexastral-api/src/lib/relationship-makeif.ts` wraps it →
  `RelMakeIfDTO { yongshen, windows[], verdict, bestKey }`).
- Each window is `{ year, month, ... }` keyed `${year}-${month}`.

**Proposed approach**
1. New astro-core fn `planRelationshipDecisionByYear(ego, other, { fromYear, years })`
   (parallel to the monthly one) → ranks the next N **years** by relationship
   favorability (流年 合/冲 to the pair's 用神 + 桃花/驿马/食伤 per the existing
   move-signal logic), returning `{ year, score, rationale, bestMonthsInYear? }`.
2. Server: extend `/:id/makeif` (or a new `/:id/makeif/longterm`) to return both the
   near-term monthly windows AND the 10-year yearly ranking. Pro-gated.
3. Client: the what-if screen (`app/(bonds)/makeif.tsx`) gets a two-tier view —
   "near term (next 12 months, monthly)" + "the decade ahead (best years)".

**Watch out:** 120 months is too noisy at month granularity — the long horizon must
be **yearly**, not monthly. Keep the monthly view for near-term only. New domain
logic deserves a golden test in `packages/astro-core/src/__tests__/`.

---

## Phase 3 — free/Pro depth gating (锁纵深, not 年限)

**Why:** today timeline + what-if are **fully** Pro-gated (free sees nothing — the
server early-returns `{ pro:false, upsell }`). That hides all the value; the cleaner
split (decided in the audit) is **gate depth, not span**:

- **Free**: the **next 12 months** — a near-term taste of both timeline + what-if.
- **Pro**: the **10-year** node interpretations + the 10-year decision推演 + the
  hidden "看更远" (already built) + the push timetable (already Pro).

**Where**
- Timeline gate: `app/(timeline)/index.tsx` (`if (!pro)` wall) +
  `bonds.ts` GET `/timeline` (currently early-returns for non-Pro). Give free the
  near-term slice instead of nothing.
- What-if gate: `bonds.ts` POST `/:id/makeif`.
- Depends on Phase 2 (the 10y tier must exist before we can gate it apart from the
  free near-term tier).

---

## Other pending UX (from the same review)

### Black block above the personal-report CTA — NEEDS A SCREENSHOT
`components/reading/ReadingReport.tsx`. The CTA (`S.unlockBtn`) is cinnabar, chapters
are paper — neither is black. The only dark element is `SealNumeral` (the 碑拓 chapter
seal, `backgroundColor: kindredDark.bg`, ~line 99), which is intentional. Don't
guess-fix; get a marked screenshot to pinpoint (seal vs a divider vs a dark ground
leaking) before touching it.

### Personal-report 划词 SelectionActionBar
The solo reading long-press jumps **straight to chat**; it should show the same
划词 bar the synastry report uses (copy / chat / highlight), modelled on
`components/SelectionActionBar.tsx` + the `(bonds)/[id].tsx` wiring. NOTE: the
personal report has **no** timeline/what-if, so it gets the bar only — no
`LivingLayerFab`. (The return-to-report nav + personal chat framing already shipped,
commit `9e58ad3`.) Long-press wiring lives in `ReadingReport.tsx` (`onLongPress` →
`askParagraph`) → `(reading)/index.tsx` `handleAskAI`.

### "Let go" black-hole animation
Releasing a thread (解缘) should play an animation: the night sky spawns a black hole
that swallows the let-go node, then it's gone. Today it's a plain `confirmDelete`
Alert + optimistic list removal (`(reading)/index.tsx` `confirmDelete`, `useBondList`
`deleteBond`). Home sky is Skia (`components/home/SkyField.tsx` / `SkyHero.tsx`) —
the black hole would live there, triggered on a successful `deleteBond`.

---

## Already shipped this session (for context)
- Per-bond chapter unlock; natal report decoupled from 合盘 accept.
- Living-layer FAB: icon-only discs fanning along the ring; GitCommitHorizontal↔
  Vertical toggle morph; +Chat.
- Centerpiece: intensity-driven (severity) differentiation, tilt capped ~8.6°.
- Birth-edit: stale-birth list tag (`basedOnStaleBirth`), edit-copy, and the Pro
  in-place **recompute** (`POST /:id/recompute`).
- Timeline Phase 1 (this doc's top): 10y default + density + see-further door.
