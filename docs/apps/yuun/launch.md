# Yuun — launch checklist

**Bundle:** `com.hexastral.yuun` · **Display name:** Yuun · **Directory:** `apps/auspice-app` · **Marketing version:** `1.0.0`

Yuun is a Chinese almanac (中华黄历) with Today-first navigation and a three-tier ladder:

| Tier | Identity | For you | Push | Widget / Watch |
|---|---|---|---|---|
| Anonymous Free | local `deviceId` | conclusion summary (on-device birth) | public 黄历; **with birth on file → + 判语 + corpus hook** (birth-keyed, not sign-in-keyed) | public 黄历 + optional Fit via WatchConnectivity **(iOS)** |
| Signed-in Free | Apple/Google | same + restore | same as anonymous (sign-in only adds sync / restore) | + Watch credential for independent refresh **(iOS)** |
| Pro (`auspice_pro`) | + RC entitlement | full reasons | + deterministic tips | full explanation stays in-app; LLM only on tap |

> **No-IAP first ship:** Production / preview set `EXPO_PUBLIC_IAP_ENABLED=false`. Paywall shows Coming soon (no StoreKit / Play Billing). Do not create store subscriptions until banking is ready. See [release-config-gate.md](./release-config-gate.md).

> **ASO / review note:** Store copy matches Free almanac; no Pro prices / RevenueCat while `EXPO_PUBLIC_IAP_ENABLED=false`. Widget / Lock Screen / Watch may be claimed on **App Store** only after production archive + device evidence (see [widget-watch-scope.md](./widget-watch-scope.md)). **Google Play:** home widgets (S/M/L) after [android-widget-runbook.md](./android-widget-runbook.md) matrix; do not claim Lock Screen / Watch on Android. System requirements (iOS): App iOS 15.1+, widgets iOS 17.0+, watchOS 10+.

---

## State (July 2026+)

**Code complete (Today-first IA + launch harden):**
- **Today** (`/(tabs)/`): WeekStrip + yi/ji + For you; calendar expands inline (chevron under the strip); swipe left → Settings
- **Calendar** / **Settings** modular groups
- For-you: free verdict + summary; Pro = per-reason (locked until IAP enabled)
- Anonymous local birth preview + sign-in CTA; sync when multi-device on
- Calendar feed: free `/calendar.ics` · Pro `/calendar/p/:token` (signed personal feed)
- 亲友: Free cap 3; Pro unlimited
- **Timeline (2026-08)**: the deterministic life is FREE for every tier — all 大运 /
  流年 / 流月 + 对你而言 readings, zero LLM. Pro adds interpretation depth only:
  per-node LLM deep-read, MonthlyDepth card, 印证 (event pinning). No paywall rows
  on the page.
- **Make-if (what-if)**: Pro-only end to end — Library entry hidden while IAP is
  off (no dead "coming soon" wall); deep links land on a neutral coming-soon note.
- Notifications: server Expo push (anonymous = public; signed-in = personal; Pro = tips); timeline node (Pro)
- Paywall: Coming soon when IAP off; Apple + Google + RC when `EXPO_PUBLIC_IAP_ENABLED=true`
- Root `AuspiceErrorBoundary`; `supportsTablet: false`; marketing `1.0.0`

**Native Widget + Watch (iOS v1 capability — evidence-gated):**
- Targets in repo: `targets/widget`, `targets/watch`, `targets/watch-widget`
- **Go only if** production archive includes all three + TestFlight device matrix passes (see [widget-build-runbook.md](./widget-build-runbook.md)). If any target missing or path fails → strip ASO/screenshot claims before submit.
- **Android:** Glance home widgets (S/M/L) via `@zhop/widget-kit-android` — see [android-widget-runbook.md](./android-widget-runbook.md). No Lock Screen / Wear.

---

## Open work (pre-submit)

### Backend (human secrets / deploy)
- [ ] Confirm Worker secrets needed for Free path (e.g. `CYCLE_CALENDAR_SECRET`)
- [ ] `ALLOW_DEV_PRO=0` on production vars
- [ ] _(Post-banking)_ RevenueCat + ASC IAP + webhook + `EXPO_PUBLIC_IAP_ENABLED=true`
- [ ] Spot-check: deploy API after Yuun API diffs (`cd apps/hexastral-api && bun deploy`) — **needs explicit approval**
- [ ] Confirm birthCity nullish schema live; retest three save paths on device

### App Store Connect
- [ ] ASC record; **content rating 12+**
- [ ] Paste ASO from `apps/auspice-app/aso-metadata.json` (4 locales) — no-IAP copy
- [ ] Screenshots per [screenshot-direction.md](../../publish/screenshot-direction.md); Widget/Watch shots only if archive evidence exists; avoid purchase UI while IAP off
- [ ] `node scripts/aso-charcount.mjs` + `node scripts/aso-code-parity.mjs`
- [ ] Fill `eas.json` `ascAppId` (RC keys optional until post-banking)
- [ ] Nutrition Labels match privacy manifest collected types
- [ ] Device smoke: [pre-submit-smoke.md](./pre-submit-smoke.md)

### Google Play
- [ ] Listing from `aso-metadata.json` → `googlePlay` (home widgets OK after matrix; no Watch/lock)
- [ ] Smoke: install, Today / Calendar, birth, push, sign-in, account delete
- [ ] Widget matrix: [android-widget-runbook.md](./android-widget-runbook.md)
- [ ] No Play Billing products for no-IAP ship

### Build + evidence
- [ ] EAS production with `EXPO_PUBLIC_IAP_ENABLED=false`
- [ ] _(iOS)_ EAS production archive: confirm widget / watch / watch-widget embedded if claiming widgets
- [ ] _(iOS)_ TestFlight: iPhone + Watch matrix when claiming widgets

### Local validation (no CI)
- [ ] `bun run preflight` green (typecheck + lint + test + check-deps + ASO parity/charcount + release-config soft-OK)

### Deploy legal pages
- [ ] Deploy `hexastral-web` so `/en|/zh|/tw|/ja/privacy/yuun` return localized appendix (HTTP 200) — **needs approval**

---

## Go / No-Go

**No-IAP Go** if Free path + ASO/privacy + smoke are green; IAP / RC / banking open items are **not** P0 blockers for this ship.

Any P0 on Free path (crash, broken birth, missing privacy URL, misleading Pro prices in store) → **No-Go**.

**Post-banking:** first auto-renewable subscription must be submitted with a new app version; restore Pro ASO + `EXPO_PUBLIC_IAP_ENABLED=true`.
