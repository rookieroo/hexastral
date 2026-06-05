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
