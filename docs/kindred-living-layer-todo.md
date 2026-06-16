# Kindred (yuel) — living-layer & report TODO

Carry-over backlog from the 2026-06 review session. Phases 1–3 of the timeline /
what-if value work shipped (see "Already shipped"). A second report review (2026-06,
screenshots) opened more — see "Round 2" below.

---

## Round 2 — report review (2026-06 screenshots)

Done this round: en chapter title shrunk (no 3-line wrap); svc-astro en term handling
made meaning-based (no literal "tiger-horse trinity"). Confirmed for the user: the
synastry report + timeline + what-if are **八字-only** — no 紫薇/Zi Wei in the compute
(that's a separate app, ming-pan). Still open:

- **Accept-invite must skip the birth form when birth already exists.**
  `app/accept/[token].tsx` always shows `BirthForm`. If `loadSelfBirth()` returns a
  saved birth, skip the form and POST `/respond` with it (auto-accept); only show the
  form when there's genuinely no birth on file.
- **Staged moon loader missing on form→reading.** The bond report (`(bonds)/[id].tsx`)
  shows `GeneratingStages` on `isGenerating` (202), but the SOLO create flow
  (`(onboarding)/reveal.tsx`) shows the plain `AutoMoonPhaseLoader` — no staged
  carousel. Wire `GeneratingStages` into the create→reveal path (the stages exist).
- **Person references are inconsistent in the LLM output** (root of the 甲乙/you/zy
  mess). Across chapters the model writes "Jia's / Yi's" (romanized 甲乙), real names
  ("you" / "zy"), AND "Day Master's Wood" — so the client's 甲方/乙方 personalization
  only catches some. Fix generation-side: prompt the model to refer to the two people
  by ONE consistent scheme — ideally the real names, so **make name required** in
  onboarding self + accept + pair-input (the user's suggestion); never 甲乙 / jiǎ-yǐ.
- **Meaning-first terms in zh too.** 寅午三合局 is opaque even to zh readers; extend the
  meaning-based directive to the zh path (only the en tone guide is refined so far),
  and consider a curated term→meaning gloss for the worst offenders
  (亡神 / 用神 / 日主 / 建禄格…). Heavy but a real differentiator — tune via generate+review.

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
- Report locale-freeze: the synastry report + its chrome (essence chip, chapter
  section labels, primer, share card) render in the locale it was GENERATED in
  (`interpretation.language` via `localeFromTag`), not the device — switching language
  no longer re-wraps / half-translates an archived report. App chrome stays device.
- Per-viewer person labels: 甲方/乙方 personalize in the report locale — reader = "you"
  (no zh "你" in English), other = name or a localized "the other person" (no bare
  ambiguous "Partner"); English viewer possessive "you's" → "your".
- 命理 jargon density: svc-astro en tone guide now tells the LLM to use terms
  sparingly + gloss with pinyin + English on first use (future generations only;
  needs svc-astro deploy + a generate-and-review tuning pass).
- Round 2: en chapter title 34→28 (no 3-line wrap); svc-astro en terms now
  meaning-based not literal (寅午三合 → "their ambitions reinforce each other", not
  "tiger-horse trinity"). Both need an svc-astro deploy + on-device check.

## Generation-side follow-ups (minor — svc-astro)
- Person-label scheme: the client now personalizes 甲乙 away (user never sees them),
  so the 天干 collision is moot in the UI. Cleanest future fix: have the LLM emit
  neutral tokens (`{{A}}`/`{{B}}`) without an English possessive, so the client maps
  without the "you's"→"your" patch. Low priority.
- Term density: tune by generating a few en reports and trimming further if still
  dense; consider adding the missing synastry terms (天干/三合/六合/六冲/亡神/劫煞)
  to the `hehun` term map in `i18n-prompt.ts` for consistent glosses.
