# HexAstral · Launch Sequence

> **Status**: ACTIVE · 2026-05  
> Companion to `docs/anti-spam-positioning.md`. This doc locks in *which apps ship when* and *which apps are deferred*, given the 4.3(b) rejection risk.

---

## 1. Launch wave (priority order)

**Revised 2026-05-31 (SPAM-21)** — after deep anti-spam audit (`docs/anti-spam-positioning.md` §3 risk table), the lowest-risk app leads. Old order put `fate` first because of brand readiness; new order puts `cycle` first because of **review survivability**. The point of W1 is to build UseONE, LLC publisher credibility before the riskier apps are submitted.

| Wave | App | Bundle ID | Tier | Pass odds | Submission target |
|---|---|---|---|---|---|
| **W1** | **cycle** | `com.hexastral.cycle` | Subscription flagship | **75-85%** | First — Chinese almanac = deterministic calendar utility, REFERENCE primary category, plenty of existing-approved precedents (黄历/LunaCal/Almanac+) |
| **W2** | **feng** | `com.hexastral.feng` | High ASP (one-shot) | **60-70%** | After W1 cleared — compass + photogrammetry + classical site theory has obvious utility, LIFESTYLE/Reference |
| **W3** | **yuan** | `com.hexastral.yuan` | Subscription flagship | **50-60%** | After W2 cleared — couples-chart compatibility; needs MBTI-pair analog frame to land |
| **W4** | **MingPan** (fate) | `com.hexastral.fate` | Funnel | **35-45%** | Last — single-chart 命盘. Highest risk; benefits maximally from W1-W3 publisher credibility built before submission. Display name "Fate" was retired → "MingPan" (SPAM-18) to remove destiny-loaded English semantic. |

**Cadence**: 2-3 weeks minimum between submissions. Avoid same-week multi-submit (triggers automated spam-family check on developer account).

**Stagger principle**: each wave should ship AND clear review before the next is submitted. If W1 (cycle) is rejected, all subsequent waves pause until we appeal-fix and re-clear W1. If W1 passes but W2 rejects, W3 may still go — judgment call based on rejection reason.

**Why not all-four-parallel**: a same-week 4-app submission risks (a) developer-account-level 4.3(b) "spam family" flag, (b) shared-rejection-reason cascade where one app's reviewer interpretation propagates to the other 3 reviewers, (c) inability to learn from rejection signal before committing the next batch.

---

## 2. V1.5 Wave (per ADR-0017) — face / coin / dream redesigned

> **Revised 2026-05-31**: Originally these 3 apps were marked for archive (per draft ADR-0016). Re-evaluation per ADR-0017 confirms they CAN pass App Store review when redesigned per Doctrine v2. The same Conceptual Uniqueness Checklist (ADR-0015) that lifts cycle/feng/yuan/MingPan to 85-95% pass odds applies here. These apps are now scheduled as V1.5 wave (W5-W7), not archived.

| Wave | App (new display name) | Bundle | Pass odds | V1 Trigger | Tier |
|---|---|---|---|---|---|
| **W5** | **Coincast** (was coin-cast) | `com.hexastral.coincast` | **80-85%** | Begins when V1 W1 + 1 other V1 app cleared review | Sub + free unlimited divinations |
| **W6** | **FaceRead** (was face-oracle) | `com.hexastral.face` | **75-80%** | Begins after Coincast Sprint 2 proven | Sub + one-time deep analysis |
| **W7** | **DreamRead** (was dream-oracle) | `com.hexastral.dream` | **75-80%** | Begins after Coincast Sprint 3 proven | Sub for journal |

**V1.5 active dev triggers** (per ADR-0017):
- ✅ V1 W1 cycle approved + live in App Store
- ✅ ≥ 1 additional V1 app (feng / yuan / MingPan) also approved
- ✅ ≥ 30 days of cycle production telemetry (subscription conversion ≥ 1% baseline)
- ✅ Doctrine v2 anti-spam framing empirically validated

If any V1 app rejected for 4.3(b): V1.5 wait extends. If 2+ rejected: V1.5 paused; activate SPAM-11 PWA fallback.

**V1.5 development scope** (per `docs/sprints/v1.5-face-coin-dream-sprint-plan.md`):
- Coincast: I-Ching study tool + hexagram journal + AI 易经 tutor + classical Wang Bi / Zhu Xi commentary
- FaceRead: classical 神相 physiognomy reference + Family Face Lineage + historical figure comparison (NOT palm reading, NOT predictive)
- DreamRead: dream journal + 周公解梦 24-category + Jungian/Freudian comparative (NOT fortune-telling)

**V1.5 timeline**: 8-12 weeks (1-2 engineers parallel) starting when triggers met.

---

## 3. Permanently retired

| Bundle | Reason |
|---|---|
| `com.hexastral.hexastral` | Rejected 4.3(b); see ADR-0014. Cannot resubmit same bundle. Cancelled permanently. |

The all-in-one storefront concept is **architecturally infeasible** under current App Store policy. The "matrix experience" lives at hexastral.com (web/PWA) instead.

---

## 4. Per-wave readiness checklist

Before any wave is submitted, verify the per-app file:

| Item | cycle (W1) | feng (W2) | yuan (W3) | MingPan/fate (W4) |
|---|---|---|---|---|
| i18n trigger scrub | ✅ | ✅ | ✅ | ✅ |
| `aso-metadata.json` (4 locales) | ✅ | ✅ | ✅ | ✅ |
| `app.json` `ITSAppUsesNonExemptEncryption: false` | ✅ | ✅ | ✅ | ✅ |
| Display name anti-spam check | ✅ "Cycle" | ✅ "Feng" | ✅ "Yuán" | ✅ "MingPan" (was "Fate") |
| Category set (per ASO `primaryCategory`) | ⏳ in ASC | ⏳ in ASC | ⏳ in ASC | ⏳ in ASC |
| Screenshots (per `docs/screenshot-direction.md`) | ⏳ | ⏳ | ⏳ | ⏳ |
| App icon (1024 PNG, sRGB, no alpha) | ⏳ | ⏳ | ⏳ | ⏳ |
| EAS `projectId` filled | ⏳ | ✅ (in app.json) | ✅ (in app.json) | ⏳ |
| EAS `ascAppId` filled (in `eas.json`) | ⏳ | ⏳ | ⏳ | ⏳ |
| Google iOS reversed-client-id (where applicable) | ⏳ | ✅ | ⏳ | ⏳ |
| VoiceOver-accessible main flow | ⏳ | ⏳ | ⏳ | ✅ |
| Crash reporting (Sentry) | ⏳ | ⏳ | ⏳ | ⏳ |
| Funnel events emitted | ⏳ | ⏳ | ⏳ | ⏳ |
| IAP wired (for subscription apps cycle + yuan) | ⏳ | N/A (one-shot) | ⏳ | N/A (no IAP, invite-unlock) |
| Native ios/android dir regenerated post-rename (`expo prebuild --clean`) | N/A | N/A | N/A | ⏳ required after SPAM-18 |
| `GET /api/user/:id/export` for GDPR Art. 20 | ⏳ shared | | | |
| User delete cascade audited | ⏳ shared | | | |

---

## 5. Appeal protocol (when a wave gets rejected)

1. **Reply in Resolution Center** within 24h. English. Emphasize the empirical-science framing from `docs/anti-spam-positioning.md` §1. Cite the analogy to MBTI / Big Five / Enneagram personality frameworks that are accepted on the App Store under Lifestyle / Education.
2. **Reference classical Chinese scholarship** by name (《三命通会》《滴天髓》《子平真诠》《青囊经》《葬经》) — establishes that this is structured cultural-academic content, not generic horoscope content.
3. **Point to per-app `_doNotUse` documentation** in the ASO metadata file — proves we proactively excluded trigger language.
4. If reviewer escalates: **escalate to App Review Board**. Cite the academic literature, the cultural specificity (East Asian metaphysics ≠ Western astrology), and the existing precedent of accepted educational-typology apps.
5. **If 2 consecutive rejections + board fail**: pause subsequent waves, pivot to PWA-only via hexastral.com (SPAM-11).

---

## 6. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-05 | 4-app launch wave locked: fate → cycle → yuan → feng | All four can be reframed defensibly under empirical-science doctrine |
| 2026-05 | face-oracle / coin-cast / dream-oracle DEFERRED | Direct overlap with cited 4.3(b) trigger phrases; rebrand required |
| 2026-05 | hexastral-app bundle ID RETIRED (ADR-0014) | Rejected; cannot resubmit |
| 2026-05 | Logo / designer hire DEFERRED until W1 cleared | Don't sink design $ until doctrine validated empirically |
| 2026-05 | Single-app V1 considered, REJECTED in favor of 4-app parallel | User chose to push 4 in parallel and only set submission priority at the end |
