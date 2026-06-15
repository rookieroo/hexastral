# Kindred (yuel) — living-layer & report TODO

Carry-over backlog from the 2026-06 review session. Phases 1 + 2 of the timeline /
what-if value work shipped (see "Already shipped" below). What remains, in priority
order, with enough context to act cold.

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
- What-if gate: `bonds.ts` POST `/:id/makeif` (returns `windows` + `longterm`).
- Phase 2 (the 10y tier) is now SHIPPED, so this is UNBLOCKED: gate the `longterm`
  years (and the 10y timeline nodes) for Pro; hand free the near-term slice
  (≤12 months of `windows` + the current-year timeline) instead of an empty wall.

---

## Other pending UX (from the same review)

### Black block above the personal-report CTA — NEEDS A SCREENSHOT
`components/reading/ReadingReport.tsx`. The CTA (`S.unlockBtn`) is cinnabar, chapters
are paper — neither is black. The only dark element is `SealNumeral` (the 碑拓 chapter
seal, `backgroundColor: kindredDark.bg`, ~line 99), which is intentional. Don't
guess-fix; get a marked screenshot to pinpoint (seal vs a divider vs a dark ground
leaking) before touching it.

---

## Already shipped this session (for context)
- Per-bond chapter unlock; natal report decoupled from 合盘 accept.
- Living-layer FAB: icon-only discs fanning along the ring; GitCommitHorizontal↔
  Vertical toggle morph; +Chat.
- Centerpiece: intensity-driven (severity) differentiation, tilt capped ~8.6°.
- Birth-edit: stale-birth list tag (`basedOnStaleBirth`), edit-copy, and the Pro
  in-place **recompute** (`POST /:id/recompute`).
- Timeline Phase 1: 10y default + per-year density + Pro see-further door (`a47b859`).
- What-if Phase 2: 10-year yearly decision ranker — `planRelationshipDecisionByYear`
  (astro-core, +5 golden tests), `longterm` DTO on `/:id/makeif`, and the "未来十年"
  tier in the make-if screen with localized year formatters (`52c7132` + `0908139`).
- Solo reading 划词 bar (copy / chat / highlight; highlights persist by chartHash).
- Let-go black-hole animation: the released thread is swallowed by an accretion-ring
  collapse in SkyHero (was: drift outward + fade). Wants an on-device tuning pass.
