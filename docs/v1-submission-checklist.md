# HexAstral V1 Submission Checklist

> **Status**: ACTIVE · everything code-side is done. This doc inventories the **external + manual** work between "code is ready" and "cycle-app live in App Store" (cycle = W1 per SPAM-21 revised wave order).
>
> **2026-05-31 — V1 NARROWED** ([ADR-0019](decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md)):
> the V1 launch wave is **cycle → feng → yuan v2 only**. MingPan (was W4) is
> **PAUSED** as a V1.1 candidate; numerology / Meihua + the V1.5 trio remain
> deferred. Tables below that still list "4 apps" / "W4 MingPan" are preserved
> for restart reference and **annotated inline** as PAUSED — do not act on
> MingPan / numerology items during V1.

---

## 0 · One-line situation

- **3 V1 apps active** (code complete + anti-spam scrubbed): **cycle / feng / yuan v2**
- **1 V1 app paused** (V1.1 candidate, per ADR-0019): **MingPan** (was W4; codebase
  serves as the ADR-0018 design reference). Bundle ID `com.hexastral.mingpan`
  retained, ASO + reviewer notes current — spin-up cost is days, not weeks.
- **1 satellite paused** (V1.1 candidate): **numerology / Meihua** (Phase K pivot)
- 3 app deferred per ADR-0014 / ADR-0017 V1.5 wave: **face-oracle (FaceRead) / coin-cast / dream-oracle (DreamRead)**
- hexastral-web doctrine-aligned; PWA upgrade (SPAM-11) deferred as backup channel
- **75 / 91 P-tasks complete (82%)**. Remaining 16 are either external (dashboards / accounts), large optional (PWA / widget), or your-judgment-call (final logo).

---

## 1 · Wave gate before W1 submission

These block W1 (**cycle-app**, per SPAM-21 revised sequence). Do in order; some serialize on each other.

### 1.1 Brand / legal

| # | Task | Owner | Status |
|---|---|---|---|
| 1.1.1 | Confirm `UseONE, LLC` legal name exact match in Delaware Certificate of Formation (already done in code/docs) | you | ⏳ verify |
| 1.1.2 | USPTO TM-search for `HEXASTRAL` Class 9 + 41 (per `docs/decisions/0014-...` referenced research report) | you / lawyer | ⏳ |
| 1.1.3 | File USPTO `HEXASTRAL` word mark — Class 9 + Class 41 | lawyer / TEAS Plus | ⏳ ~$700 |
| 1.1.4 | (Optional) USPTO `USEONE` Class 42 — lawyer-review crowded "ONE" field first | lawyer | ⏳ |
| 1.1.5 | Mark all 4 apps with `™` (immediate) — change to `®` after USPTO approval (~12-18 months) | self | trivial |

Cite the trademark research report (already received) when briefing the lawyer.

### 1.2 Apple Developer Program

| # | Task | Owner |
|---|---|---|
| 1.2.1 | Confirm `UseONE, LLC` enrollment Active (D-U-N-S done per earlier) | you |
| 1.2.2 | Sign Paid Apps Agreement + tax + banking in App Store Connect (REQUIRED for IAP) | you |
| 1.2.3 | Sign Apple Developer Agreement (Schedule 2) | you |
| 1.2.4 | Enable Apple Sign-In capability for each of 4 bundle IDs | you (developer portal) |

### 1.3 Create 3 App Store Connect entries (V1 wave, per ADR-0019)

| # | Bundle ID | App display | ASC entry |
|---|---|---|---|
| 1.3.1 | `com.hexastral.cycle` | Cycle | create + record `ascAppId` |
| 1.3.2 | `com.hexastral.feng` | Feng | create + record `ascAppId` |
| 1.3.3 | `com.hexastral.yuan` | Yuán | create + record `ascAppId` |

For each: pick primary category per the per-app `aso-metadata.json` `primaryCategory` field. Apply ASO copy (title/subtitle/keywords/promotionalText/description) from each `aso-metadata.json` — already drafted in 4 locales.

**Deferred (V1.1 candidates, do NOT create in V1)**:

| # | Bundle ID | App display | Status |
|---|---|---|---|
| 1.3.D1 | `com.hexastral.mingpan` (was `com.hexastral.fate`) | MingPan | PAUSED — create ASC entry only when ADR-0019 restart triggers fire |
| 1.3.D2 | `com.hexastral.numerology` | Numerology (Meihua) | PAUSED — V1.1 candidate per ADR-0019 |

### 1.4 EAS values (fills placeholders that block the EAS submit pipeline)

These came up in P0-2. Fill each via dashboard work, then I (or you) paste them in.

**Active (V1 wave per ADR-0019)**:

- **cycle-app** — placeholders still present; fill before W1 submission.
- **feng-app** — `eas.projectId` filled; verify ASC App ID after creating §1.3 entry.
- **yuan-app** — `eas.projectId` filled; verify ASC App ID after creating §1.3 entry.

**Deferred (MingPan / fate-app)**: the table below documents the fate-app
placeholders for V1.1 reference; **do NOT fill in V1** (creating the ASC entry
for a paused app risks reviewer-perception of "submitted then withdrew").

| Placeholder | Get from | Fill into | V1 status |
|---|---|---|---|
| `REPLACE_WITH_ASC_APP_ID` | App Store Connect → My Apps → MingPan → App Information → Apple ID (10-digit) | `apps/fate-app/eas.json:58` | **DEFERRED** |
| `REPLACE_WITH_FATE_EAS_PROJECT_ID` | `eas init --slug fate` or expo.dev account UUID | `apps/fate-app/app.json:69` | **DEFERRED** |
| `REPLACE_WITH_FATE_GOOGLE_IOS_REVERSED_CLIENT_ID` | Google Cloud OAuth iOS client | `apps/fate-app/app.json:83` | **DEFERRED** |

### 1.5 RevenueCat — products for subscription-flagships

Only cycle and yuan have subscription products. fate is funnel (no IAP), feng is one-shot.

| # | RC product | Maps to | ASC IAP type |
|---|---|---|---|
| 1.5.1 | `cycle_pro_monthly` / `cycle_pro_annual` | grants entitlement `cycle_pro` | Auto-renew subscription |
| 1.5.2 | `yuan_pro_monthly` / `yuan_pro_annual` | grants entitlement `yuan_pro` | Auto-renew subscription |
| 1.5.3 | `universe_pro_monthly` / `universe_pro_annual` | grants all 3 entitlements + allowance | Auto-renew (bundle SKU) |
| 1.5.4 | `hexastral_feng_single` | single-purchase, SKU `feng_analysis` | Non-consumable (one-shot) |
| 1.5.5 | `hexastral_cast_3` (renamed from `_divination_3`) | consumable | Consumable |
| 1.5.6 | `hexastral_cast_single` (renamed) | single-purchase, SKU `cast` | Non-consumable |
| 1.5.7 | Setup `REVENUECAT_WEBHOOK_SECRET` env var on hexastral-api worker | for webhook authorization | wrangler secret |
| 1.5.8 | Verify RC events route to `hexastral-api/api/iap/webhook` correctly | smoke test with TestFlight purchase | end-to-end |

### 1.6 Sentry projects (P0-7 deferred external work)

| # | Task | Where |
|---|---|---|
| 1.6.1 | Sign up Sentry org (free tier 5K events/mo) | sentry.io/signup |
| 1.6.2 | Create 3 V1 projects (React Native platform): cycle-app, feng-app, yuan-app. **fate-app PAUSED per ADR-0019** — create that Sentry project when MingPan resumes. | Sentry dashboard |
| 1.6.3 | Copy 3 DSNs | Sentry → project settings |
| 1.6.4 | Create Sentry CLI auth token (scope: `project:releases`) | Sentry → User → Auth Tokens |
| 1.6.5 | Per-app: `bun add @sentry/react-native` + add EAS secrets `EXPO_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | local + `eas secret:create` |
| 1.6.6 | Wire `initCrashReporting({ app: 'cycle' })` etc. in 3 V1 satellite RootLayouts (fate's wiring stays in place — code already done, just no DSN until V1.1) | `apps/{cycle,yuan,feng}-app/app/_layout.tsx` |

Full per-app setup recipe: `docs/setup/sentry-crash-reporting.md`.

---

## 2 · Per-app assets (designer track)

Currently deferred per the session decision to wait for W1 acceptance before sinking $8-15K on designer hire.

| # | Asset | Status |
|---|---|---|
| 2.1 | App icon 1024×1024 (4 apps) | ⏸ Decision: keep `fate-app/assets/icon.png` for fate? Or hire designer per `docs/designer-brief.md`? |
| 2.2 | Screenshots 6.7" + 6.5" + 5.5" per locale per app (4 apps × 4 locales × ~8 screenshots) | ⏸ Use Figma + actual device captures (DIY) OR hire designer |
| 2.3 | Splash screen art | ⏸ Same call as 2.1 |
| 2.4 | Brand guidelines doc | ⏸ Same call |

Visual register: `docs/screenshot-direction.md` (8-section designer brief, includes 13 forbidden visuals). Designer brief: `docs/designer-brief.md`.

**My call**: skip designer hire for W1. Use stock minimalist screenshots — actual chart screens + AI chat — to validate doctrine. If accepted, hire designer for W2-W4 polish. If rejected, you don't sunk-cost a designer.

---

## 3 · Submission strategy (per anti-spam doctrine + ADR-0019 V1 narrowing)

| Wave | App | Pass odds | Min gap before next | Notes |
|---|---|---|---|---|
| **W1** | **cycle** | **95%** | 2-3 weeks **AND** W1 cleared review | 6/6 conceptual uniqueness axes. Anchors UseONE, LLC publisher credibility |
| W2 | feng | **88%** | 2-3 weeks after W1 ship | 6/6 axes — compass + multi-space + 节气 maintenance + 流月飞星 + widget/watch |
| W3 | yuan v2 | **85%** | 2-3 weeks after W2 | 6/6 axes — viral invite + family chart + daily insights + classical pair patterns |
| ~~W4~~ | **MingPan** (fate) | **PAUSED** | — | **V1.1 candidate per ADR-0019.** ASC entry, IAP setup, screenshots, Sentry — all deferred until restart triggers fire. Scope (5.5/6 axes — family lineage + historical figure comparison) and pass odds (85%) preserved for re-activation. |

**Order rationale (revised 2026-05-31, SPAM-21 + ADR-0019)**: previous order put `fate` first because of brand readiness; the deep audit (`docs/anti-spam-positioning.md` §3) flipped this to **survivability-first** (`cycle → feng → yuan → MingPan`). The 2026-05-31 V1 narrowing (ADR-0019) further trims the V1 wave to the first three. Each subsequent submission still carries the credibility of all prior approvals — and shrinking the V1 wave concentrates that credibility on the three apps that ship.

If W1 rejected: appeal once → fix → resubmit. If 2 rejections in a row → pivot to PWA per SPAM-11 backup plan. Don't push W2-W4 until W1 cleared.

### 3.1 Per-app submission notes for reviewer

Each ASC submission has a Review Notes field. Pre-empt 4.3(b) concerns there.

Template:

```
Reviewer note · {App Name}

This is not Western astrology or fortune-telling. {App Name} is an educational
tool grounded in classical Chinese cosmology — comparable to MBTI / Big Five
personality frameworks but rooted in the Ba Zi (八字 / Four Pillars) tradition
documented from the Song dynasty (10th c. CE) onward.

Classical reference texts: 《三命通会》 (Wan Yuwu, Ming dynasty), 《滴天髓》
(Liu Bowen, Yuan-Ming), 《子平真诠》 (Shen Xiao Zhan, Qing dynasty), and (for Feng)
《青囊经》 (Qīngnáng jīng) + Tang-dynasty 《葬经》 (Zàngjīng).

The app provides:
  · Structured chart calculation from birth time
  · AI-augmented personality / relationship / spatial insights citing the classical
    sources by name
  · Educational glossary for each technical term

The app does NOT provide:
  · Daily horoscope or zodiac-based predictions
  · Fortune-telling or future-event predictions
  · Mystical "spiritual" content

ASO metadata `_doNotUse` field documents the trigger-word vocabulary
proactively excluded from listing.

Test account (if needed): {provide TestFlight account}
```

### 3.2 If rejected

Resolution Center response — within 24h:

1. Emphasize empirical-science framing (cite `docs/anti-spam-positioning.md` §1)
2. Re-cite the MBTI / Big Five analogy
3. Re-cite classical texts by name
4. Point at ASO `_doNotUse` list as proof of proactive scrub
5. If 2nd rejection → escalate to App Review Board

Full appeal protocol: `docs/launch-sequence.md` §5.

---

## 4 · Post-submission ops

### 4.1 Monitoring (once W1 in TestFlight + review)

| Lever | Where | What you're watching |
|---|---|---|
| Crash rate | Sentry dashboard | <0.5% fatal events → green; >2% → fix before review |
| Funnel events | Cloudflare Analytics Engine query on `GROWTH_FUNNEL_ANALYTICS` | `first_reading_started → first_reading_completed` conversion rate |
| Subscription events | Same dataset, filter `event_name = 'subscription_started'` | Sub events are the revenue KPI |
| Feature flags | `wrangler kv:key list --binding=GUARD_KV --prefix=flag:` | Currently 0 flags set; build muscle by flipping a test flag during TestFlight |

### 4.2 Kill-switch drills

Before submission, dry-run the kill-switch primitive so ops muscle is there if needed post-launch:

```bash
bunx wrangler kv:key put --binding=GUARD_KV "flag:test_kill" 'true'
# Verify within 60s: GET https://api.hexastral.com/api/flags returns {test_kill: true}
# In dev build: useFlag('test_kill', false) returns true after foreground
bunx wrangler kv:key delete --binding=GUARD_KV "flag:test_kill"
```

### 4.3 GDPR endpoints

Both ship-ready (P0-4 + P0-5):

- DELETE `/api/user/:userId` — cascades 30 tables (Art. 17 erasure)
- GET `/api/user/:userId/export` — full JSON archive (Art. 20 portability)

Surface in Me-tab UI when user requests; both behind HMAC + userId path-match.

---

## 5 · Deferred technical (won't ship in V1)

These are documented and code-ready when needed; not blocking V1 submission.

| ID | Title | Trigger to activate |
|---|---|---|
| P1-14 | iOS Lock Screen / Home widget (Level 2 timeline) | After W1 cleared review → V1.1 |
| SPAM-11 | hexastral-web → full PWA (manifest + SW + Web Push + Stripe) | If W1 rejected and appeal fails OR if you decide to dual-channel |
| SPAM-16 P2 | DB column rename (`divination_credits_remaining` etc.) + table rename `divinations` | Pre-PMF migration window OR V1.1 cleanup |
| SPAM-17 P2 | Internal slug rename `'faceoracle'` / `'dreamoracle'` (vs. just display name) | If/when face/dream apps revived |
| ADR-0012 update | Document the new fate=funnel tier hierarchy formally | Anytime; nice-to-have |

---

## 6 · Deferred satellite apps (per SPAM-9 / ADR-0014 / ADR-0017 / **ADR-0019**)

| App | Status | Revival conditions (ALL true) |
|---|---|---|
| **`ming-pan-app` (MingPan)** | **V1.1 candidate** — code-complete; PAUSED 2026-05-31 per ADR-0019 | (a) cycle cleared ASC review + 30d stable (b) cycle DAU ≥ 1000 / D30 ≥ 20% / crash-free ≥ 99.5% (c) at least one of feng / yuan cleared review (d) no active P0 / P1 incident |
| **`numerology-app` (Meihua)** | **V1.1 candidate** — Phase K pivot; PAUSED 2026-05-31 per ADR-0019 | (a) MingPan resumes (numerology rides MingPan's V1.1 wave) OR (b) cycle telemetry shows divination-crossover appetite |
| `face-oracle-app` (FaceRead) | V1.5 wave per ADR-0017 | (a) cycle/feng/yuan all cleared review (b) doctrine empirically validated (c) FaceRead-specific design (capture-surface sub-spec) authored (d) PWA fallback ready |
| `coin-cast-app` (Coincast) | V1.5 wave per ADR-0017 | Same set; coin-toss ritual animation designed |
| `dream-oracle-app` (DreamRead) | V1.5 wave per ADR-0017 | Same set; dark nocturnal palette designed |
| `hexastral-app` | RETIRED PERMANENTLY (bundle ID `com.hexastral.hexastral` cannot be reused) | Never. See `docs/decisions/0014-retire-hexastral-app-bundle.md` |

---

## 7 · Doc inventory · reference index

Everything written this session, by relevance to submission:

**Strategy / positioning**
- `docs/anti-spam-positioning.md` — vocabulary + reframing playbook (4 locales)
- `docs/launch-sequence.md` — wave order + per-wave readiness table + appeal protocol
- `docs/screenshot-direction.md` — designer brief, 13 forbidden visuals, per-app strategy

**Decisions (ADRs)**
- `docs/decisions/0014-retire-hexastral-app-bundle.md` — why hexastral-app is gone forever
- `docs/decisions/0015-product-doctrine-v2.md` — utility-anchored doctrine for V1 wave
- `docs/decisions/0017-v1.5-wave-face-coin-dream.md` — V1.5 wave deferral (Coincast / FaceRead / DreamRead)
- `docs/decisions/0018-hexastral-design-language.md` — matrix-wide no-tab gesture nav + shared `SWIPE_TO_ME` + minimalism
- `docs/decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md` — **THIS narrowing**; restart triggers for MingPan + numerology

**Sprint plans (active V1 wave)**
- `docs/sprints/cycle-sprint-plan.md` — cycle execution (Sprint 1 done)
- `docs/sprints/feng-yuan-mingpan-sprint-plan.md` Part 1 (feng) + Part 2 (yuan v2) ACTIVE; Part 3 (MingPan) PAUSED

**Setup recipes**
- `docs/setup/sentry-crash-reporting.md` — Sentry per-app install + EAS secrets + source-maps

**Designer / commercial**
- `docs/designer-brief.md` — what to send the designer (when hired)

**Per-app ASO metadata (4 locales each, anti-spam compliant)**
- `apps/fate-app/aso-metadata.json`
- `apps/cycle-app/aso-metadata.json`
- `apps/yuan-app/aso-metadata.json`
- `apps/feng-app/aso-metadata.json`

---

## 8 · This week (suggested 7-day plan)

| Day | What |
|---|---|
| Mon | 1.2 Apple Developer (verify enrollment + sign Paid Apps Agreement). 1.6.1-1.6.4 Sentry account + projects (30 min). |
| Tue | 1.3 Create the **cycle** ASC entry first (W1 = cycle); pull ASO from `apps/cycle-app/aso-metadata.json`. Then create the other 3. 1.4 record `ascAppId` for cycle (priority). |
| Wed | 1.5 RC product setup (2-3 hr): focus on `hexastral_cycle_pro_*` SKUs (W1 needs only cycle subscription). 1.4 paste EAS values into cycle app.json/eas.json. |
| Thu | Hire decision: designer ($8-15K, `docs/designer-brief.md`) OR DIY screenshots. Start whichever path — but only commit budget if W1 (cycle) clears. |
| Fri | 1.1.2-1.1.3 lawyer outreach for trademark (TEAS Plus filing, ~$700). |
| Weekend | TestFlight smoke test (**cycle-app**); verify IAP works, Sentry receives events, funnel events fire. ~~Run `expo prebuild --clean` on fate-app~~ — skipped (MingPan PAUSED per ADR-0019). |
| Following Mon | **W1 cycle-app submission.** feng (W2) and yuan v2 (W3) follow per ADR-0019; **MingPan W4 PAUSED**, do not submit in V1. |

---

## 9 · Open decisions to lock before Wed

| Decision | Default | Override deadline |
|---|---|---|
| Designer hire NOW or post-W1? | post-W1 (save $) | Thu |
| fate-app keeps current icon.png OR commission new? | keeps current | Thu |
| Stripe vs Paddle for eventual PWA path? | Stripe (Cloudflare integration) | unblock SPAM-11 if needed |
| Trademark application timing — at TestFlight OR after W1 cleared? | At TestFlight (parallel) | Fri |
| Test account for App Review submission notes | create one with `chartPublic=true` username `apple-review-test` | Sat |

---

## 10 · "Done" definition

V1 ships when:
- ✅ fate-app live on App Store (W1 cleared review)
- ✅ At least 1 paying test purchase verified end-to-end through RC webhook → entitlement grant → app sees `cycle_pro` (or whatever the test SKU is)
- ✅ Sentry receiving events from production install
- ✅ Funnel events emitting (verify in Analytics Engine query)
- ✅ Apple Sign-In + Google Sign-In working in production install
- ✅ All linked surfaces (privacy / terms / public profile) load without 404

W1 ship date target: **3-4 weeks from today** assuming no rejection cycle. Add 2-3 weeks per rejection cycle.

If rejected twice + appeal fails → activate SPAM-11 PWA path (6-16 dev days) as backup distribution.
