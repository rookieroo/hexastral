# Yuel pre-submit audit

**App:** Yuel (`apps/kindred-app`) · **Bundle:** `com.hexastral.yuel` · **Date:** 2026-07-31

Deep pre–App Store check. Launch order: **Submit Yuun first, then Yuel**.  
**MVP monetization:** one-time `hexastral_compatibility`; `kindred_pro` subscription deferred.

Device smoke: [pre-submit-smoke.md](./pre-submit-smoke.md).  
Human residual: [human-residual.md](./human-residual.md).

---

## Findings

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | Blocker | No Delete Account (Apple 5.1.1(v)) | **Fixed** |
| 2 | Blocker | Paywall missing auto-renew + Privacy/Terms (3.1.2) | **Fixed** (+ legalDisclaimer footer) |
| 3 | Blocker | UL `/resonate/{token}` ≠ `/accept/[token]` | **Fixed** — hostful UL parse + `app/resonate/[token]` Redirect + tests |
| 4 | Blocker | Timeline push tap allowlist dropped `/(timeline)` | **Fixed** |
| 5 | Blocker | RC / `ascAppId` placeholders | **Gated + documented** — human fill |
| 6–13 | Should-fix / debt | i18n, Upcoming loading, empty CTA, settings chrome, chapter-preview gate, PushFuel scope, dead code | **Fixed / cleaned** |
| 14 | Product | Subscription vs one-time | **DECIDED** — MVP one-time; sub Phase 2 |

---

## Secrets gate

| Secret / config | Ship rule |
|---|---|
| RC iOS/Android keys | Real `appl_*` / `goog_*`; refuse `REPLACE_WITH_*` |
| ASC products (MVP) | **`hexastral_compatibility` only** — defer `kindred_pro_*` |
| `eas.json` `ascAppId` | Replace `REPLACE_WITH_ASC_APP_ID` before `eas submit` |

---

## Residual human checklist

- [ ] **Submit Yuun first**, then Yuel (ADR-0019)
- [ ] ASC record + Sign in with Apple + nutrition labels + ASO/screenshots
- [ ] RC: `hexastral_compatibility` + webhook; Yuun `auspice_pro` products
- [ ] Fill production RC keys + both `ascAppId`s
- [ ] Device: [pre-submit-smoke.md](./pre-submit-smoke.md) (invite UL, one-time unlock, carry-over, delete)
- [ ] Yuun: [../yuun/pre-submit-smoke.md](../yuun/pre-submit-smoke.md) + Widget evidence or strip ASO claims
- [ ] Legal URLs 200 on `yuel` / `yuun` brand hosts
- [ ] **Reload Metro / rebuild** after invite UL harden before re-testing AirDrop

---

## Verification commands

```bash
bun typecheck --filter=@zhop/kindred-app --filter=@zhop/scenario-kindred --filter=@zhop/core-ui
bun test apps/kindred-app/lib/native-intent.test.ts apps/kindred-app/lib/timeline-push.test.ts
```

Related: [launch.md](./launch.md) · [docs/publish/README.md](../../publish/README.md)
