# Feng (風) — Closeout Plan (V1 launch)

**Purpose**: stop incremental feature-patching. This is the single map from
"engines code-complete" to "shipped, validated, monetizing". Supersedes the
task-level docs as the *sequencing* authority; they remain the detail:
`feng-fix-plan.md` (Waves 1-3), `feng-pro-grade-plan.md` (D1-D4),
`feng-deploy-acceptance.md` (manual steps). Date: 2026-06-30.

## Operating principle: FEATURE FREEZE

The theory engine is done (D1-D4, astro-core 776/776). **No new metaphysics
engines** except the two explicitly scoped below. From here the work is
**Validate → Polish → Ship**, not "add more". Anything not on this plan is V1.1.

## Definition of Done (V1 launch)

Feng is "finished" when ALL are true:
1. **Deployed & device-verified** — svc-feng + hexastral-api live; a real device
   produces a correct end-to-end report (the §5 smoke list in deploy-acceptance).
2. **Store-submittable** — every App Store review gate passes (W4).
3. **Professionally validated** — a 风水师 has signed off a sample-report batch (W1).
4. **Monetizing** — Pro + single-purchase verified end-to-end; RevenueCat
   products live; price set (W5).
5. **Premium-enough report UX** — meets the flagship design bar (W3 gate).
6. **No P0/P1 open** in the feng surface.

---

## Workstreams (6, non-overlapping)

Owner key: **[ME]** code I can do now · **[YOU]** human/account/device/$ ·
**[DESIGN]** needs a design decision or designer.

### W1 — Professional validation (THE differentiator gate) — ✅ DONE
Goal: earn the word "专业". Decision: in-house standard, no external expert.
- ✅ **七星打劫 + 城门诀** finished (沈氏 operational, golden-tested, wired).
- ✅ **Sample-report harness** `scripts/feng-sample-report.ts` (`bun feng:samples`):
  runs the real D1-D4 assembly over a 坐向×元运×terrain matrix → readable MD.
- ✅ **Acceptance standard** `docs/feng-acceptance-standard.md` — the rubric +
  red-flags = the in-house ruler. Self-validation log started.
- ✅ First self-validation run caught + fixed a real defect (二五交加 mis-reading
  旺 in 9运 → phase rule tightened: 煞组合 read 旺 only on true 当令). astro-core
  139 feng-suite tests green.
- Ongoing: re-run `bun feng:samples` against the standard after any engine change.

### W2 — Correctness hardening (honesty of the output) — 🟡 core done
- ✅ **Confidence note** (`report_confidence_note`, 4 locales) under the report:
  理气 (玄空/八宅/格局/形理) = exact 演算; 峦头 (砂/水/形煞) = AI/DEM 推断, 仅供参考.
  Synthesis prompt also gets a confidence-discipline rule (don't let inferred form
  override deterministic verdicts; phrase 峦头 as "likely/appears").
- ✅ Degraded states already fail-open (flat→no DEM 砂, no birth→no 八宅,
  VLM/street off→degraded) + the note frames them.
- ⬜ 水系按宫归 from coords + azimuth-from-coords for VLM features (D3 precision).

### Account deletion — extend purge — 🟡
- ✅ Chat (conversations + cascading messages) now purged in `DELETE /api/user/:id`
  (universal user content). singlePurchases retained for audit (de-identified).
- ⬜ Per-app content tables (kindred bonds, fate readings, auspice cache) — extend
  as each app ships.

### W3 — Report experience + Yuel navigation re-architecture — 🟡 core done
Direction (locked): kindred 水墨 aesthetic + bespoke 罗盘 loader + kindred nav model.

**Navigation re-architecture (2026-06-30)** — retired the bottom-4-tab layout for
the Yuel/kindred model:
- ✅ `(tabs)/_layout` Tabs → **Stack, no bottom bar** (paths unchanged, zero
  reference churn; 墨青 contentStyle).
- ✅ Home (`(tabs)/index`) rebuilt as the **Yuel night surface**: 風 brand + gear
  (top), ink site cards on 墨青, persistent **朱砂 FAB (add site)**, **left-swipe →
  Settings** (Pan gesture, kindred parity), first-site empty invite.
- ✅ Settings (`(tabs)/profile`) rebuilt **kindred-style** (dark ink, header
  back, Card sections) — account / birth / privacy / sign-out / delete-account,
  and **folds the retired Compass + Readings tabs in as tool links**. Edge-only
  back-swipe.
- ✅ **Shell color fix (2026-06-30)** — the home/settings ground read as a flat
  mid-teal (`inkTeal #0F1E26`). Added `FENG_PALETTE.night #0A1316` (deep near-black
  墨, whisper of teal) + `nightRaised` card tone + `hairline`; applied to home,
  settings, stack ground, BootSplash, AuthGate so launch→home is one continuous
  墨 ground. Per-screen `StatusBar` set (dark shells = light bars; cream report =
  dark bar) — fixes invisible status text on the cream paper.
- ✅ **Compass + readings dark-themed** to the Yuel night surface (night ground,
  rice/copperGold/cinnabar, hairline cards, back-header parity with Settings).
- ✅ **Brand mark redesigned (2026-06-30)** — the bare `風` character is replaced
  by `components/FengMark.tsx`, an honest **trace** (potrace) of the oracle-bone
  (甲骨文) 鳳/風 phoenix from a rubbing the founder supplied (in oracle bone 風/鳳
  are one graph — the divine bird whose wingbeat raises the wind). Single tintable
  fill path, pure react-native-svg (no Skia). Wired into BootSplash / sign-in /
  intro / home (header at 44px — the glyph is too intricate to read below ~44).
  App **icon / adaptive-icon / splash regenerated** from the same glyph (铜金 on
  night) + `app.json` splash/adaptive backgroundColor → `#0A1316`. Reproducible:
  `scripts/gen-feng-mark.sh` (+ `.ts`); source rubbing + traced SVG stored under
  `assets/brand/`.
- ✅ **Onboarding cold-open** (`app/(intro)`) — net-new: a slowly-turning 罗盘
  (reused pure-SVG `BaguaCompassOverlay`, fixed 朱砂 磁针, no Skia) under the 風
  wordmark + two locale lines + 朱砂 "tap to begin". Tap-only (never auto-advances),
  fades into the home. One-shot via `lib/onboarding.ts` AsyncStorage flag; boot
  (`app/index.tsx`) routes first-launch → `(intro)`, returning → home.
  Note: shows **post-auth** (inside AuthGate), i.e. a welcome cold-open after
  sign-in, not before. Pre-auth ordering = optional V1.1 polish.
- ⬜ NEEDS DEVICE QA; remaining: dark-theme the (new-site) + (birth-info) flows
  (still on core-ui light theme); optional Skia SkyHero.

---
Direction (locked): kindred 水墨 aesthetic + bespoke 罗盘 loader.
- ✅ **罗盘 Loader** `components/LuopanLoader.tsx` — rotating pure-SVG
  `BaguaCompassOverlay` + reanimated, fixed 朱砂 磁针, reduce-motion aware,
  **no Skia** (no native rebuild). Wired into report loading + analyzing states.
- ✅ **宣纸 report restyle** — report now reads as ink-on-paper (`FENG_PAPER`
  palette in Fēng's 墨青/铜金/朱砂 brand): cream ground, 墨 ink body, 铜金 chapter
  tags, 朱砂 golden-line + CH badge, paper chapter sheets w/ hairline borders,
  飞星盘 on paper ground, form-li/零正/救应 tones mapped. Staggered FadeInDown
  entrance retained.
- **Decision (no Skia for V1)**: kindred's richest pieces (MoonPhaseLoader,
  InkWipeReveal bloom, InkCenterpiece) need `@shopify/react-native-skia` — a
  native dep + rebuild. Achieved the 水墨 look token-only; the **Skia ink-bloom
  report entrance is a scoped V1.1 upgrade** (kindred patterns documented in the
  W3 research).
- ⬜ NEEDS DEVICE QA (unpreviewable here): paper contrast on real screen, loader
  legibility on cream, dark-mode interplay.
- ⬜ Remainder: A11y on heavier screens (facing/birth-info/compass/chat) +
  contrast audit + address-map + onboarding expectation-setting.

### W4 — Compliance & store readiness (can it ship)
- ✅ **AI-chat moderation + report mechanism** (App Store 1.2). DONE:
  - `lib/chat-moderation.ts` — bilingual heuristic screen on BOTH user input
    (before LLM, → safe refusal, no billing) and AI output (→ replaced before
    persist); admin alerted on blocks.
  - `POST /api/chat/report` — verifies message ownership → dispatches to
    `SVC_ADMIN_NOTIFY` (no new table). core-ui `ReadingChatScreen` gained an
    `onReportMessage` prop + long-press "report" affordance; feng chat wired
    (`reportChatMessage`) + 4-locale strings. Shared → all apps inherit it.
  - Typecheck clean across core-ui/api/feng-app.
- [ME] Account-deletion follow-up: extend the purge to kindred/auspice/fate
  user-owned tables (currently feng-scoped) — do before those apps ship.
- [YOU] App Privacy declarations (birth + location); reviewer notes; "not
  fortune-telling" copy audit in-app.
- [YOU+ME] Mapillary street: legal sign-off (CC-BY-SA derived use) → then enable
  token; UI attribution already wired. Else defer street to V1.1.

### W5 — Monetization & funnel — 🟡 (single-purchase only, no sub)
- ✅ **De-subscription copy** (4 locales): IAP note = "one-time purchase";
  chat_pro_required → "unlock this report to ask follow-ups"; chat_pro_unlimited
  → "unlimited follow-ups" (no "Pro membership" framing).
- ⬜ **Chat access model decision** (real): feng has no sub, but chat is currently
  server-gated `pro_required` → no one can chat. Pick: (a) chat free-taste +
  bundled with the report purchase, or (b) drop chat from feng V1. Backend
  (`resolveChatTier` for feng) + upsell target need aligning.
- [YOU] Pricing $ + RevenueCat single-purchase product (`hexastral_feng_single`).
- ⬜ [ME] Peer-promote (cycle↔feng↔yuan, ADR-0019) in Me→Discover — deferred:
  needs sister-app URL schemes + App Store fallback links.

### W6 — Infra hardening & ops (won't fall over) — scope by "no real users yet"
- [ME] Cost controls: confirm caching + adaptive gating for the heavy stages
  (vision, DEM 9-call, street); log token/$ per job.
- [ME] Robustness (pick what matters pre-launch): annotated-tile R2 existence
  check on report render; svc-feng failure backoff; job dedup on rapid re-tap.
- [YOU] Observability: alert on `job.failed` rate; dashboard for analyze latency.

---

## Phased sequence (with go/no-go gates)

**P0 — Deploy & verify what exists (unblocks everything)** · [YOU] + [ME]
Deploy svc-feng + api; dev build; run the §5 smoke list. Fix only real defects
found (not new features). **Gate: a correct report renders end-to-end on device.**

**P1 — Validation + honesty** · W1 harness + W2 confidence/degraded + (opt) 2 格局.
**Gate: 风水师 sign-off.** (This is the longest-lead, human-dependent item —
start the harness now so the expert can begin during P2.)

**P2 — Experience + compliance** · W3 (design decision → build) + W4 (AI-chat
moderation, privacy). **Gate: design bar met + all review gates pass.**

**P3 — Monetize + harden + submit** · W5 + W6 + EAS prod build + TestFlight.
**Gate: ASC submission.**

Run order rationale: P0 first (you can't validate or polish what isn't deployed);
W1 harness in parallel from P0 (expert is the critical path); design decision
(W3) gates the biggest build, so make it early in P2.

---

## Decisions — LOCKED (2026-06-30)

1. **风水师**: NOT engaging an external expert. The in-house engine + my own
   验证 is the standard. → W1 becomes: I define the sample-report acceptance
   standard and self-validate; no human sign-off gate. The "专业" claim rests on
   the sourced 沈氏 algorithms + golden tests, not a third-party signature.
2. **Pricing**: **single-purchase only, high ACV. NO subscription.** → drop
   Pro/sub framing; RevenueCat = one consumable (`hexastral_feng_single`) per
   report. access-check already grants via `single_purchase`; remove sub-implying
   copy. (Annual-refresh could be a second one-time SKU later.)
3. **Mapillary street 形煞**: **enable for V1.** I do the legal/ToS diligence
   (see §Mapillary diligence below); attribution already wired.
4. **Report UX**: **ink-wash (水墨) à la `apps/kindred-app`** + a bespoke **罗盘
   (luopan) Loader**. I study kindred's motion/ink patterns and build to them.
5. **七星打劫 / 城门诀**: **V1 — DONE** (沈氏 operational rules, golden-tested,
   wired via detectPatterns → report + synthesis). astro-core 137 feng tests.
6. **Infra bar**: pre-PMF, no real users → W6 is best-effort; prioritize cost
   logging + fail-open (already in), defer circuit-breaker/dedup to post-launch.

## Mapillary diligence (engineering read — not legal advice; you confirm)

- Mapillary imagery is **CC-BY-SA 4.0**; the API ToS permits programmatic access.
- We **do not redistribute or display** the photos — we derive 形煞 findings and
  show only our text. CC-BY-SA's share-alike attaches to *adaptations of the
  imagery*; a textual 形煞 verdict is arguably not a derivative work of the photo,
  but **attribution is still required** and is the safe default.
- Action taken: attribution string surfaced in-report (`streetAttribution`).
- Residual risk to confirm with counsel before scaling: whether our findings are
  "derived data" needing share-alike. Low for V1 (text-only, attributed), but
  **your final call** to flip `MAPILLARY_TOKEN` on in prod.

## Explicitly deferred to V1.1 / V1.5 (not in this closeout)

- RoomPlan / 户型立极 (interior star placement, AR) — V1.5, native + LiDAR.
- 替卦 beyond 下卦/替卦 already shipped; 月/日/时 beyond 月紫白.
- MingPan funnel node (ADR-0019) — returns with MingPan.

## What I (code) will do the moment you pick a P0/P1 start

Default if you don't specify: **W1 sample-report harness** (unblocks the
longest-lead human gate) + **W4 AI-chat moderation** (the one missing store
gate), in parallel — both are pure code, no human/design dependency.
