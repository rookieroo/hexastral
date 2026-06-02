# ADR-0021: Kindred v2 — solo-first reading on the ming-pan frame

- Status: Accepted
- Date: 2026-06-02
- Builds on: [ADR-0008](0008-three-layer-architecture.md), [ADR-0014](0014-bonds-timeline-architecture.md), [ADR-0018](0018-hexastral-design-language.md), [ADR-0019](0019-v1-wave-narrowed-cycle-feng-yuan.md)
- Amends: [ADR-0001](0001-yuan-naming.md) (product shape, not naming)

## Context

Kindred as currently built is unusable for a single user. After filling their
own birth info, user A reaches a fork (`(onboarding)/mode.tsx`): fill the
partner's birth info, send an invite, or skip. The skip path lands on an
**empty bonds list** — there is nothing to read, nothing to come back for.
Every gram of value is gated on a second person. Pre-PMF this is a funnel
cliff: the user who downloads alone (the overwhelming majority) gets nothing
in their first session.

Meanwhile, ming-pan-app — frozen per ADR-0019, code retained — already
implements exactly the missing layer:

- Client-side 八字 + 紫微 compute (`lib/natal.ts`, `lib/ziwei.ts` via iztro),
  anonymous, no server required for the base reading
- `POST /api/natal` bootstrap + `GET /api/report/chapter/{slug}` LLM chapters
  (八字紫微合参 report), HMAC v2 signed
- Chapter unlock gating (free ch1/ch4, locked chapters via email binding +
  invite-to-unlock), `EmailBindSheet` OTP flow
- Native chart rendering (`ZiweiChartView`, `ChartAppendix`), web share
  surfaces (`hexastral.com/u/{username}`, `/report/{id}`)
- The ADR-0018 design-language reference implementation

The two products share one skeleton: a reading (solo or pair), LLM chapters
on top of deterministic charts, chart display, invitation-driven unlocks, and
(planned, in neither app yet) AI chat anchored on selected report text.
Maintaining two divergent shells is waste.

## Decision

### 1. Solo-first: A's own report is the product's first deliverable

After A fills their own birth info, A immediately gets a solo reading — the
same 八字紫微合参 report ming-pan produces, generated through the same
pipeline (`/api/natal` + `/api/report/chapter/*`). Content parity with
ming-pan's report is a hard requirement.

合盘 Threads become the second layer: unlocked by filling the partner's
birth info or inviting them. The existing `POST /api/bonds/solo` (A fills
B's info) and invitation flow are unchanged.

### 2. Rebuild kindred-app on the ming-pan frame

Fork the ming-pan-app shell into kindred-app rather than continuing to grow
the current invite-first shell:

| Reused from ming-pan | Kept from current kindred-app | Discarded |
|---|---|---|
| Onboarding gate → birth → (tabs) home/me | Intro parable animation (this branch) | `(onboarding)/mode.tsx` fork-first flow |
| Reading overlay + chapter list/detail | `accept/[token]` DDL claim flow | Onboarding-gated bond creation |
| natal/ziwei/reading-cache libs | RevealMoment ceremony | |
| EmailBindSheet, me-tab account patterns | scenario-kindred hooks + ChapterPager | |
| Native chart views + web share links | Paywall / RevenueCat wiring | |

Phases:

- **K1 — Solo reading**: port ming-pan's compute libs + report screens; route
  becomes intro → birth (self only) → home with own report.
- **K2 — Threads**: re-hang the bonds list/detail off the home as the second
  section; partner fill / invite entry points live inside it.
- **K3 — 划词 AI chat**: text-selection on any report paragraph opens a chat
  sheet seeded with that passage + chart context. Net-new for both apps
  (ming-pan does NOT have this today); entitlement-gated per ADR-0012/0013.
- **K4 — Assets**: Q版 mascot, chapter 实物意象, App Store screenshots.

### 3. Invitations: user-sends-only, add SMS link, no SMS provider

The compliance posture stays "the user sends, we never touch B's contact
info" (`deliveryMode: 'user'`, nothing stored server-side):

- **mailto:** (existing) stays.
- **Add `sms:` link** alongside it — same model, the message leaves from A's
  own number. One new button, zero new infrastructure.
- **Do NOT integrate an SMS provider** (Twilio / SNS / etc.). Rejected on all
  three axes the team raised:
  - Cost: per-message fees + A2P 10DLC registration + number rental.
  - 风控: carrier spam filtering, sender-reputation pooling, delivery opacity.
  - Compliance: TCPA-style consent — B never agreed to receive messages from
    us; B receiving a message from A (a real person they know) is a
    fundamentally different legal and social position.

### 4. Email binding: keep, but demote to the claim/restore layer

Keep the svc-mailer OTP binding (SES cost is negligible, ~$0.10/1k). It
serves three real jobs: invite-claim matching when B accepts, cross-device
restore, and chapter-unlock invites (ming-pan pattern).

Demotion: email binding must never gate the solo report. The solo reading
works anonymously (client compute + HMAC-signed chapter fetch). Binding is
requested only at the moments it's actually needed: sending an invite,
restoring, or claiming an invite-unlock. Sign in with Apple already supplies
a verified email; OTP binding is the fallback for users who skip it.

### 5. Dark mode only

kindred-app already hardcodes `mode='dark'` (`_layout.tsx`) and the ADR-0018
ink aesthetic is dark-only. Make it official: the app never reads
`kindredLight`; those tokens remain in `hexastral-tokens` solely for the web
teaser surface. No system-preference switching.

### 6. Intro animation precision

The stick-figure parable (this branch) is upgraded to:

- **Grounded feet**: gait phase is distance-driven (one cycle per
  stride-length of travel) so feet plant instead of sliding; every figure's Y
  follows the planet's curve so feet stay on the rim.
- **Four-act hierarchy**: ambient light steps up one notch per act, an
  intertitle caption names each act in an ever-brighter tone, and the camera
  pushes in slightly on the final act.

### 7. Character and imagery assets

- **Q版 mascot**: a chibi rendition of the stick figure for App Store
  screenshots, share posters, and empty states. The in-app parable keeps the
  ink-brush vector figure — the Q版 is a marketing/display asset only.
- **实物意象 for report chapters**: each chapter kind is anchored by one
  physical object, rendered in the same ink style, used in ChapterCard
  headers, ShareableChapterCard, and the locked-chapter paywall list:

| Chapter | Object | Why |
|---|---|---|
| first_impression | 茶盏 (a first pour of tea) | the moment of meeting |
| communication | 信笺 (a folded letter) | words that travel |
| conflict | 磨石 (whetstone) | friction that sharpens |
| complement | 榫卯 (mortise-and-tenon) | two shapes that only work together |
| monthly_outlook | 月相 (moon-phase strip) | cycles |
| long_term_advice | 年轮 (tree rings) | time made visible |
| solo · personality | 印章 (seal) | the self, stamped |
| solo · timeline | 罗盘 (compass) | bearings through decades |

Generation prompts live in `apps/kindred-app/assets/imagery/README.md`.

## Consequences

### Positive

- A single user gets real value in the first session; the funnel cliff is gone.
- Frozen ming-pan code gets a second life instead of rotting; one shell, one
  design language, one report pipeline to maintain.
- Invitation compliance posture unchanged (no PII, no sending infrastructure)
  while gaining an SMS-shaped entry point for the dominant messaging habit in
  the zh market.
- Solo report + Threads in one app matches how relationships actually start:
  you read yourself first, then you read the two of you.

### Negative

- Current kindred-app onboarding screens (mode / other-meta / other-birth)
  are partially discarded — sunk cost accepted per pre-PMF house rule.
- Two report types (solo + synastry) in one app adds navigation/IA complexity
  that ming-pan never had.
- 划词 AI chat is net-new engineering (it exists in neither app, despite
  being assumed shared).
- iztro (紫微 compute) becomes a kindred-app dependency — bundle weight.
- Solo report on Kindred overlaps ming-pan's eventual un-freeze; accepted
  because ming-pan stays frozen until the ADR-0019 restart triggers fire.

## References

- `apps/ming-pan-app/lib/{natal,ziwei,reading,reading-cache}.ts` — solo pipeline to port
- `apps/ming-pan-app/components/{ReadingReport,EmailBindSheet,ZiweiChartView}.tsx`
- `apps/kindred-app/app/(onboarding)/` — current flow, partially superseded
- `apps/hexastral-api/src/routes/bonds.ts` — `POST /api/bonds/solo`, invite routes
- `packages/scenario-kindred/` — hooks + chapter components, unchanged
- `packages/astro-core/src/{hehun,synastry,relationship-timeline}.ts`
- ADR-0012 / ADR-0013 — chat entitlements for K3
- ADR-0019 — ming-pan freeze + restart triggers
