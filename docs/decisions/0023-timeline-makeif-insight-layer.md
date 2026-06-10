# ADR-0023 — Timeline & Make-If: the insight layer

Status: accepted (2026-06) · Supersedes nothing; deepens ADR-0020 (cycle/timeline).

## Context — the product's lifeline

The git-graph **Timeline (人生时间线)** and **Make-If (假如人生)** ship today as a
beautiful, novel, shareable *visual* — but the insight under the visual is thin:

- Timeline = a decorated luck-calendar. 80 equal nodes, each a coarse 吉/平/凶 dot
  + a generic per-grade advice line (same text for every 平 node). No named
  turning points, no connection to the user's real life.
- Make-If = a novelty toy. "假如你28岁结婚" → an LLM story the user knows is
  fiction; no real decision, no comparison, no judgment.

The aha is currently **visual** (git-graph as a life), not **cognitive** (a true
insight). For an East-Asian-metaphysics product the aha has exactly two sources,
and we serve neither:

1. **Retrodiction** — describe the user's *past/personality* so accurately it
   feels uncanny → earns belief. (Kindred's `ahaHook` does this for pairs.)
2. **Decision-relevant foresight** — a specific, actionable read on a *real*
   choice/timing the user cares about.

## Decision

Keep both names and entry points (brand/marketing assets — `/timeline`,
`/makeif`, 人生时间线 / 假如人生 unchanged). Add a deeper **insight layer** inside
each, on a shared deterministic keystone. All readings stay reflective/
non-deterministic (existing `buildEnhancedGuardrails` enforces 倾向/参考, never 定论).

### Keystone — `periodSignals` (DONE, `packages/astro-core/src/period-signals.ts`)

`periodSignals(subject, { element, branch })` → `{ fit, reasons, favorsElement,
harmsElement, clashesBenming, taohua }`. Composes the already-tested
`personalAlmanacOverlay` (用神/忌神/六冲) + `getTaoHua` (桃花 table). No new 五行 math.
Richer 神煞 (驿马/红鸾/将星 — table fns already in `shensha.ts`) deferred until each
has a verified period-activation rule. Powers BOTH features below.

### A. Timeline →「印证」(retrodiction), a new layer inside the timeline

- **Interaction**: on a past node, "这一年我经历了…" → tag the year with an
  `EVENT_TYPES` category (career/relationship/health/travel/education/family —
  the `lifeEvents` table already exists) + optional note. The pinned event
  overlays the timeline; tapping opens a **命盘解释卡**: the period's
  `periodSignals` + a one-line LLM "retrodiction" connecting event ↔ signals
  ("你结婚那年正逢桃花当令"). Event→signal mapping is deterministic
  (relationship→桃花/红鸾; career→官杀/驿马/财; …); the LLM only dresses a hit.
- **Why first**: lowest-cost way to manufacture "怎么这么准"; builds belief +
  a real-life-event data flywheel.
- **A2** name the turning points (deterministic detection of 用神↔忌神 flips,
  冲大运, peak windows → a top "你这一生的关键节点" headline).
- **A3** forward decision windows (wire the existing 择日/event-search to the
  流月 layer: "未来12个月哪几月适合做大事").
- **Files**: `apps/auspice-app/app/timeline.tsx` (+ an EventPin sheet & explain
  card), `lib/api.ts` (life-events client), `apps/hexastral-api/.../life-events.ts`
  (reuse), `services/svc-astro` (period-signals + retrodiction one-liner,
  flagship tier).

### B. Make-If → real-decision support (its primary mode)

- **Interaction**: lead with "你正在纠结一个选择吗?" → user states a real decision +
  timing; fork is placed at the **current/near-future** 大运 (not the past);
  branches are the decision's actual options. Reuse the single-branch highlight
  UI (already shipped) to spotlight the recommended path.
- **Grounding**: each option's narrative is grounded in the fork-period's
  `periodSignals`; a final **synthesis verdict** weighs the paths ("创业那条与你
  用神最合,但要熬过 38–40 过渡") — the value crystallizes here.
- **Files**: extend `services/svc-astro/.../cycle.ts` `/makeif-narrate`
  (decision-aware prompt + verdict; bump `tier: 'standard'` → `'flagship'` — this
  is a paid flagship feature), `apps/auspice-app/lib/makeIfBranches.ts`,
  `app/makeif.tsx`.

## Phasing

Keystone (done) → A1 印证 (highest-aha) → A2 turning points → B real-decision +
verdict → A3 windows. A1 and B both consume `periodSignals`.

## Consequences

- Strong visual stays; insight layer makes it credible + decision-useful.
- Retrodiction creates a belief loop + a proprietary life-event dataset.
- Compliance unchanged: all LLM output stays 趋势·参考 under existing guardrails.

## Amendment (2026-06-10) — the context boundary + make-if's honest value

Founder framing, resolved into three principles. The make-if STRUCTURE already
exists (interactive forks `user-{age}-{event}` on tappable mainline nodes, chips +
free text, future=时机 / past=reflection, compare-vs-mainline); the gap is VALUE,
not plumbing. These principles say where the value is and where context must NOT go.

1. **Timeline stays context-free — by design, not omission.** Do NOT add a
   "tell me your situation" box to the timeline. The 命理 rhythm (大运/流年/流月) is
   fixed from birth and does not bend to what the user types — interrogating them
   on the spine would be both philosophically wrong and the exact "AI agent forces
   context-association" fatigue users now resent. The timeline reads the
   unchangeable rhythm; it never asks.

2. **Make-if is the SOLE context surface — opt-in + premise-agnostic.** Context
   belongs only in make-if, where the user *volunteers* a branch ("假如 I do X at
   age N"). The engine reads only the **node energy × decision-class**, never the
   truth of the premise — so the supplied context may be real or hypothetical, past
   or future, and it is never validated, never pried into. That premise-agnosticism
   IS the feature: total freedom to explore, zero intrusion. A make-if is, exactly,
   "a timeline with a volunteered branch" — the parallel-universe framing is what
   makes the context welcome rather than creepy.

3. **The honest value is 择时 / decision-fit, not outcome-prediction.** Because the
   rhythm doesn't change with choice, make-if must NOT imply "choose X → fate Y."
   Its real, defensible value is the one piece of genuine user agency: **where on
   the fixed rhythm you place an action.** So the under-developed value unlocks via:
   - **Comparison-first** — the headline is 2–3 branches' fit *side by side* + the
     synthesis verdict (ADR-0023 §B), not a single fictional narrative. The decision
     moment is the product.
   - **择时 mode** — slide the SAME intended move across 2–3 future windows; show
     which the 命理 favors ("this move sits better in the 2028 window than now").
     This is the most honest and most valuable what-if — it uses the fixed-rhythm
     truth instead of fighting it.
   - **Decision archetypes** — structured chips (advance/hold · change path · commit
     to a person · big commitment/spend · relocate · start something) as the
     welcoming default, free text as the escape hatch. Pick a branch-*type*, never
     write an essay.
   - **Premise-agnostic tone** — the narrative reads "how this move sits with the
     energy of that time," never "and so you will…". Reuse the hardened timeline
     prompt principles (name the domain, reflection-not-prediction, no fatalism,
     close on agency).

## Amendment (2026-06-10b) — make-if as the macro 择时 decision engine

Founder: this turns make-if into "一款绝妙的决策机". Two scales of 择时 exist; make-if
is the missing MACRO one and funnels into the existing MICRO one.

- **MICRO 择时 (BUILT) = 择日.** `/event` reverse-择日: `event ∈ CYCLE_EVENTS`
  (wedding/business/signing/move/move-in/travel/burial/groundbreaking/medical/study)
  + `range:{from,to}` (≤92d) → top-3 auspicious DAYS. The timeline already deep-links
  a chosen future 流年 → `/event` prefilled with that year's 立春 window (`ZejiLink`).
  Answers "within this date range, which DAY."
- **MACRO 择时 (the gap make-if fills) = 择运.** "This life-move — which 运/年 does my
  命理 favor?" Today make-if only gives a single "current window favors this KIND of
  move" verdict, and user-fork verdicts are **hash-seeded (fiction)** — not the real
  node read. The new value is a **cross-window ranking** of one decision via
  `periodSignals` over candidate windows (this 流年 / next / next 大运).

**Design (decided):**
1. **Reuse `CYCLE_EVENTS` as the shared decision vocabulary** — do NOT invent a new
   archetype taxonomy. make-if's pickable decisions are the CYCLE_EVENTS subset that
   are genuine life-moves with a 择日 landing (business/wedding/move/study/signing),
   plus a couple of macro-only classes (守成/转向) that carry no 择日 handoff.
2. **The funnel / closed loop:** make-if macro verdict ("creating a business sits
   better in 2028 — 用神得力 that year, 忌神当值 now") → **deep-link the existing
   `/event` 择日** (event + that window's range) → day-level picks. One event
   vocabulary, two zoom levels: make-if picks the YEAR/运, 择日 picks the DAY. The
   timeline today makes the user pick the year themselves; make-if supplies the
   *which-year* judgment above it. Loop with the node push: timeline says WHEN to
   watch → make-if says which WINDOW a move sits best → 择日 says which DAY.
3. **Fix the fake verdict:** replace `buildUserBranch`'s hash-seeded dots' headline
   fit with the real `periodSignals` read at the diverge window (keep locale-invariant
   structural seeding for the lane shape only).
4. **Deterministic vs LLM:** the cross-window fit + ranking is deterministic
   (`periodSignals`, free, cacheable, the trust spine); LLM writes only the synthesis
   prose (落库-cached, Pro/flagship tier, premise-agnostic tone per the timeline
   hardening + the make-if doctrine above).

**Phasing:** P1 (in-sandbox-verifiable) = CYCLE_EVENTS-driven macro 择时 comparison
+ real fork verdict + the `/event` deep-link handoff (client + astro-core, typecheck/
test). P2 (deploy-gated) = the LLM synthesis + 落库 + Pro gate.
