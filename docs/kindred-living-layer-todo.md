# Kindred (yuel) — living-layer & report TODO

Carry-over backlog from the 2026-06 review session. Phases 1–3 of the timeline /
what-if value work shipped (see "Already shipped" below). One item remains.

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
- Free/Pro depth gating (Phase 3): free now gets a near-term taste — the monthly
  what-if windows + a ~3-month 流月 timeline slice + upsell cards; the 10-year
  `longterm` + full axis + push stay the Pro moat. Timeline free path runs only the
  light buildEgoLiuYue, never the heavy buildEgoTimeline (no loading regression).
