# Synastry in Auspice — folding 合盘 home, and the Kindred question

> **Status**: PLAN (2026-06-05). No code yet — this is the "设计好方案" before build.
> **Premise (founder)**: Kindred struggles for seed traffic; most of its value
> Auspice can do (maybe better); **adding a birthday in Auspice is the natural
> funnel**. So: bring 合盘 (synastry) fully into Auspice — a per-亲友 relationship
> timeline + node notifications + a 合盘 make-if — and reconsider whether Kindred
> needs to exist.
> **Builds on**: [timeline-makeif-gitgraph.md](timeline-makeif-gitgraph.md) (the
> git-graph + 命理 layer already shipped in Auspice) ·
> [bonds-timeline-plan.md](bonds-timeline-plan.md) (the Kindred relationship-timeline
> this generalizes).

## 0. TL;DR

A 亲友 in Auspice already carries a birth. Compute the **two-chart synastry
timeline** client-side (both charts are the user's own device-local data — no
cross-device privacy problem, unlike Kindred), render it as the **same git graph**
we just built, attach **opt-in node notifications** (the proven `push.ts` pattern),
and unlock the deep layer with the **one-time $6.99 合盘 purchase**. The recurring
node reminders are what make a one-time purchase worth it ("this relationship,
every turning point ahead, on your calendar"). A **合盘 make-if** lets the user
record this relationship's what-ifs — but it NEVER drives notifications.

## 1. Why this is strong (and why Kindred is in question)

- **Funnel**: birthday entry is already in Auspice (`people.tsx`). Kindred needs a
  separate install + seed traffic it can't get. Same value, no extra app to seed.
- **Privacy is EASIER here**: Kindred's load-bearing constraint (D2) is "partner
  B's birth must never reach A's device", forcing server-side merge + projection.
  In Auspice the user enters the 亲友 birth themselves → both charts are local →
  **synastry timeline computes on-device**, no server, no projection, no cron.
- **Most value already exists** (see §2): the engines, the pair route, the
  git-graph UI, the local-notification pattern, the $6.99 product.
- **The one-time-purchase problem is solved**: a synastry report read once is
  weak. A relationship *timeline with reminders* is recurring value → justifies a
  one-time unlock and invites re-engagement.

## 2. Reuse inventory (what already exists — this is mostly assembly)

| Need | Already have | Where |
|---|---|---|
| Synastry score/grade/dims | `calculateHeHun` (deterministic) | astro-core |
| **Relationship timeline engine** | `getRelationshipTimelineNodes` / `getRelationshipTimelineNotifications` | astro-core/relationship-timeline.ts |
| 合盘 today + 择吉 | `/api/auspice/pair` | hexastral-api/routes/pair |
| Deep six-chapter reading (LLM) | synastry chapters generator | svc-astro/hehun |
| Git-graph UI | `TimelineGraph` (and `MakeIfGraph`) | apps/auspice-app/components |
| Local node notifications | `scheduleTimelineReminders` pattern + prefs toggle | apps/auspice-app/lib/push.ts + (tabs)/me.tsx |
| 亲友 entry + free taste | `people.tsx` (生肖 + score + 短语) | apps/auspice-app |
| One-time product | `hexastral_compatibility` ($6.99 consumable) | currently Kindred RevenueCat; needs an Auspice-side product |
| 命理 node layer | 十神 theme / 化解 / 神煞 chips / hero | shipped (timeline-makeif-gitgraph) |

**Gap**: Auspice IAP today is subscription only (`auspice_pro` / `universe_pro`,
`lib/pro.ts`). A one-time consumable purchase path must be added (or gate the
synastry timeline behind `auspice_pro` for v1 and add the consumable later).

## 3. Architecture (client-side synastry, on-device)

```
亲友 (people.tsx, device-local birth) + self birth
        │  both charts on device — no server needed
        ▼
astro-core getRelationshipTimelineNodes(self, 亲友)   ← already exists
        ▼
RelationshipTimelineGraph (a TimelineGraph variant)   ← reuse the git graph
        ├─ free taste: score + 生肖 + this year's node(s)
        ├─ unlock ($6.99 one-time / auspice_pro): full 前瞻 + node detail
        └─ opt-in notifications (push.ts pattern) → 偏好设置
```

- **No new server route required** for the timeline itself (compute-on-device).
  The deep LLM six-chapter reading stays server-side (`/api/auspice/pair` or the
  existing synastry chapters) and is the premium content.
- **Node semantics** mirror the shipped personal timeline: 流年 where the two
  charts interact (一方/双方 大运 换运, 流年 冲/合 between them), verdict + the
  single priority chip, 化解 on conflict nodes, hero 爆点.

## 4. The three features

### 4.1 合盘 timeline (per 亲友)  ★ deterministic, on-device
A relationship git graph: the trunk = the relationship through-line; nodes = the
significant shared 流年/大运-transition moments (from `getRelationshipTimelineNodes`).
Reuse `TimelineGraph` (or a thin `RelationshipTimelineGraph` wrapper). Entry: tap a
亲友 → "关系时间轴".

### 4.2 合盘 node notifications  ★ the recurring value
Opt-in, in **偏好设置** (next to the existing 人生 timeline reminder toggle). Local
notifications at the relationship's upcoming significant nodes
(`getRelationshipTimelineNotifications`), Pro/one-time-purchase gated. This is the
答案 to "why pay for a one-time 合盘": the reminders keep giving.

### 4.3 合盘 make-if (synastry what-if)  ⚠ design-careful; NEVER notifies
The user records THIS relationship's node events + choices ("假如那年我们一起创业",
"假如当年没分开"). Reuse `MakeIfGraph`. The branch plays against the real
relationship line (命主干 reabsorption, like the personal make-if).
**Hard rule (founder)**: make-if is 真真假假 — over-interpreting or "intervening"
backfires. So make-if is **explore-only; it is NOT a notification source**.
Notifications come ONLY from the deterministic 人生/合盘 timeline nodes.

## 5. Monetization — LOCKED model (founder, 2026-06-08)

**Content vs delivery are decoupled** (the check before merge):
- **One-time $6.99 (`hexastral_compatibility`)** = buy out ONE relationship's full
  reading + 前瞻 timeline VIEW. You own the content. **Does NOT grant push.**
  Non-subscribers can buy + view.
- **Notifications (合盘节点提醒)** = **subscription ONLY** (`auspice_pro` /
  `universe_pro`). Recurring delivery = recurring revenue; a one-time fee must
  never buy perpetual push. (Already enforced: `scheduleSynastryReminders` gates
  on `getAuspiceProActive`.)
- So: **pay-once = content; subscribe = ongoing delivery across all relationships.**
- Current branch is a safe subset (everything subscription-gated; one-time not
  built yet). S3 adds ONLY the one-time VIEW unlock, leaving push subscription-only.

### (original framing, superseded by the locked model above)

- **Free**: synastry taste (score + 生肖 + one 短语), this year's relationship node.
- **One-time $6.99 (`hexastral_compatibility`)**: full deep reading + the
  relationship timeline 前瞻 + node notifications for THAT relationship. Recurring
  reminders justify the price.
- **`auspice_pro` / `universe_pro`**: all relationships' timelines + notifications
  (the power-user bundle).
- v1 may gate behind `auspice_pro` and add the per-relationship consumable next
  (Auspice has no one-time purchase path yet — see §2 gap).

## 6. The Kindred question — disposition options

This plan makes Kindred's core (synastry) redundant in Auspice. Options:
1. **Freeze** — keep the code + the standalone app, stop pushing the cross-app
   funnel; revisit if Auspice synastry validates demand. (Lowest regret.)
2. **Fold & deprecate** — migrate anything Auspice lacks (deep chat? multi-bond
   compare?) then sunset the app. (Highest focus, irreversible-ish.)
3. **Keep as power-user app** — Auspice = mass funnel + one-time synastry; Kindred =
   deep multi-relationship + chat subscription for the few who want it.

**Recommendation**: **(1) Freeze** now — build §4.1/§4.2 in Auspice, measure
whether the birthday→synastry→one-time-purchase funnel converts. Don't sunset
Kindred until Auspice synastry proves the demand Kindred couldn't seed. The
earlier cross-app handoff work stays in the tree but we stop funneling to it.

## 7. What's lost by not using Kindred (be honest)
- Kindred's **invite/resonance flow** (partner B fills their own birth, PII never
  on A's device). In Auspice the user types the 亲友 birth themselves — fine for
  most cases, but no "send them a link to fill it in" social loop.
- Kindred's **deep multi-relationship compare** + LLM **chat**. The chat moat is
  real for power users; if it matters, keep option (3).

## 8. Phased build

| Phase | What | Verify |
|---|---|---|
| S1 | `RelationshipTimelineGraph` from `getRelationshipTimelineNodes` (reuse TimelineGraph); entry from 亲友 | typecheck; device |
| S2 | 合盘 node notifications (push.ts pattern) + 偏好设置 toggle | typecheck; device |
| S3 | Gate: free taste vs unlock (auspice_pro first; consumable next) | typecheck |
| S4 | Fix the funnel bugs: lunar taste disappearing; decouple taste from the (now-removed) Kindred hand-off | device |
| S5 | 合盘 make-if (reuse MakeIfGraph) — explore-only, no notifications | device |
| S6 | Kindred: stop the cross-app funnel push (freeze) | review |

S1–S3 + S4 are the core (deterministic, mostly on-device, high reuse). S5 is the
complex one (the user flagged it) — design its event/choice recording model before
building. S6 is a one-line funnel decision.

## 9. Open questions (decide before/within build)
- **One-time consumable in Auspice**: ✅ **ADD IT** — Auspice's first
  non-subscription SKU.
- **合盘 make-if event model**: ⏸ **DEFERRED (not urgent)** — design separately
  before building S5.
- **Kindred**: ✅ **FREEZE (option 1)** — stop the cross-app funnel; keep the code.
- **Deep reading delivery**: ✅ **BOTH — no conflict.** Deterministic timeline +
  化解 is the always-on base; the LLM six-chapter is the premium the one-time
  purchase unlocks. They STACK (when/宜忌/化解 vs why/叙事), not either/or.

## 10. Locked build order
S1 合盘 timeline (on-device) → S2 node notifications + 偏好 → S3 one-time IAP +
gate (free taste → full + 前瞻 + notifications + LLM deep reading) → S4 funnel bug
fixes (lunar taste; decouple from frozen Kindred hand-off) → S6 stop Kindred
funnel. S5 (合盘 make-if) DEFERRED.

---

## 11. S5 — 合盘 make-if (relationship what-if) — DESIGN (2026-06-08)

> Status: **PLAN**. Build S5a (deterministic) when ready; S5b (LLM) needs CF
> Workers AI. S1–S4/S6 shipped; this is the last piece.

### 11.1 Concept
The make-if treatment applied to a RELATIONSHIP. Trunk = the real relationship
line (the two charts' synastry over time, from `buildSynastryTimeline`); a branch
= a recorded relationship choice ("假如我们当年异地") forking at a chosen age,
exploring the alternate trajectory and — for past forks — reconciling back to the
real line (does the pair's 合缘 base pull it back? the 命/运/选择 line, but for two).

### 11.2 Hard rules (founder, non-negotiable)
- **NEVER a notification source.** Make-if is 真真假假; over-interpreting or
  "intervening" backfires. Only the deterministic 合盘 timeline nodes (S2) notify.
- **Explore-only, reflective framing.** Keep the personal make-if's "仅供反思,
  非预测" disclaimer. No "你该离开TA"-style advice about a REAL person — this is
  more sensitive than personal make-if; frame as 反思, never prescription.
- **Gated** like the relationship view (one-time unlock OR subscription).

### 11.3 Privacy
Both charts are device-local (the user entered the 亲友). Deterministic parts run
on-device. The LLM narrative sends both births to the server — acceptable in
Auspice (both are the user's OWN data; no third-party-PII problem like Kindred's
partner B).

### 11.4 What the user records (the model flagged as complex)
A relationship event + the age it (hypothetically) happened, kept tasteful via
**presets** (free-text risks over-personal / invasive 真真假假):
- Curated neutral set: 结识 / 在一起 / 异地 / 同居 / 结婚 / 分手 / 和好 / 共事 /
  远行 / 生子 … (final list TBD).
- User picks an event + an age. Past fork = reflection ("假如当年…"); present/future
  = projection.
- Stored per-relationship, device-local (mirror the personal make-if fork store).

### 11.5 Deterministic core — S5a (buildable + verifiable now, NO Workers AI)
- `buildSynastryTimeline` → the real relationship line + the period backdrop at the
  fork (relationship-favorable vs strained, from the synastry node's 冲/合/十神).
- `MakeIfModel` / `buildUserBranch` / `MakeIfGraph` → the branch git-graph (reuse).
- A deterministic verdict: does the choice land in a relationship-favorable or
  strained window (the 合盘 backdrop — analogous to the personal 命主干 line).
- `makeifDiff` (already on main for personal) → extend to 现实关系线 vs 假如关系线.

### 11.6 LLM layer — S5b (needs CF Workers AI; verification deferred)
- A PAIR make-if narrative: "假如你们当年X,这段关系会…".
- Extend `POST /api/auspice/makeif` (or a new `/api/auspice/pair-makeif`) to accept
  BOTH births + the relationship event; reuse the hehun synastry prompt machinery
  + the make-if narrative shape + the existing daily rate limit.
- Gated (one-time/subscription).

### 11.7 Where it lives
Recommend: a **section on `/relationship/[id]`** (below the timeline), shown when
the user has full access — keeps the whole relationship in one place. (Alt: a
dedicated `/relationship/[id]/makeif`.)

### 11.8 Reuse inventory
| Need | Reuse |
|---|---|
| Branch git-graph | `components/MakeIfGraph` |
| Branch model | `lib/makeIfBranches` (`buildUserBranch` / `buildInteractiveModel`) |
| Real relationship line + backdrop | `lib/synastry-timeline` (S1) |
| 现实 vs 假如 diff | `makeifDiff` (extend the personal one) |
| LLM narrative | `lib/api fetchMakeIfNarratives` / `POST /api/auspice/makeif` (extend to pair) |
| Per-fork device storage | mirror the personal make-if fork store |

### 11.9 Phasing
- **S5a (deterministic)**: relationship make-if graph (fork the relationship line
  with a preset event) + deterministic backdrop verdict + diff vs the real line.
  `bun typecheck` + test verifiable.
- **S5b (LLM)**: pair make-if narrative per branch. Buildable offline; generation
  verified only with Workers AI.

### 11.10 Open questions (decide before building)
- Preset event list — curate the neutral set; how much free-text (if any).
- Screen placement: relationship section vs dedicated screen.
- Pair LLM endpoint: extend `/makeif` vs a new `/pair-makeif`.
- Past-fork "reconcile back": use the pair's 合缘 base as the pull?
- Gating: same one-time/subscription as the view, or subscription-only (it's
  generative)?

### 11.11 Risks
- 真真假假 sensitivity (about a REAL person) → presets + reflective framing + NO
  notifications + disclaimer. Highest-care copy of anything in this plan.
- LLM unverifiable in sandbox → S5b deferred behind Workers AI.
