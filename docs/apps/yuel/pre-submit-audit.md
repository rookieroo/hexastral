# Yuel pre-submit audit

**App:** Yuel (`apps/kindred-app`) · **Bundle:** `com.hexastral.yuel` · **Date:** 2026-07-31

Deep pre–App Store check: code blockers fixed in-repo; remaining ASC/RC/screenshot work is human-only. Launch order (ADR-0019): **Submit Yuun first, then Yuel**.

---

## Findings

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | Blocker | No Delete Account (Apple 5.1.1(v)) | **Fixed** — Settings + `lib/account-delete.ts`; API `PURGE_STEPS` already covers `userBonds`, `bondInvitations`, `kindredPushQueue`, `pushTokens` |
| 2 | Blocker | Paywall missing auto-renew + Privacy/Terms (3.1.2) | **Fixed** — `PaywallView` + paywall copy/links |
| 3 | Blocker | UL `/resonate/{token}` ≠ `/accept/[token]` | **Fixed** — `+native-intent.ts` rewrite |
| 4 | Blocker | Timeline push tap allowlist dropped `/(timeline)` | **Fixed** — allowlist + `timeline-push.test.ts` |
| 5 | Blocker | RC / `ascAppId` placeholders | **Gated + documented** — `isKindredIapConfigured()` / `initializeYuanIap` refuse `REPLACE_WITH_*`; human must fill secrets before Submit |
| 6 | Should-fix | EN missing `bondList.add` | **Fixed** |
| 7 | Should-fix | Settings `legalUrl` zh-Hant → English | **Fixed** — maps via `privacyPolicyUrl` / `tw` segment |
| 8 | Should-fix | Upcoming `pushFuel === null` looked empty | **Fixed** — loading copy |
| 9 | Should-fix | Empty invite CTA / a11y | **Fixed** — wired `emptyCta` + short a11y |
| 10 | Should-fix | Settings dark vs paper flash | **Fixed** — settings stack chrome = `kindredDark`; glossary/terms keep paper |
| 11 | Should-fix | `chapter-preview` ungated in prod | **Fixed** — `__DEV__` redirect |
| 12 | Should-fix | PushFuelDisclosure user-wide remaining fallback | **Fixed** — bond-scoped preview only |
| 13 | Debt | Dead UI / unused `@zhop/satellite-ui` | **Cleaned** this round |
| 14 | Debt | Soft token colors (`#ffffff` / SkyHero) | Deferred — not 拒审 |

---

## Secrets gate (must not ship silently)

| Secret / config | Where | Ship rule |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / Android | EAS `env` + runtime `config.revenueCat` | Must be real `appl_*` / `goog_*`. `REPLACE_WITH_*` → IAP stays unavailable (`isKindredIapConfigured()` false) |
| Production RC entitlement | RC dashboard | `kindred_pro` + products `kindred_pro_monthly` / `kindred_pro_annual` |
| `submit.production.ios.ascAppId` | `apps/kindred-app/eas.json` | Replace `REPLACE_WITH_ASC_APP_ID` before `eas submit` |
| Apple Team | `eas.json` `appleTeamId` | Already set (`L9Z47DW56X`) — verify ASC app record matches |

Do **not** paste real keys into git. Use EAS secrets / local env for production profiles.

---

## Residual human checklist (not agent-fillable)

- [ ] **Submit Yuun first**, then Yuel (ADR-0019)
- [ ] App Store Connect record (display name Yuel, category Lifestyle)
- [ ] Sign in with Apple capability on `com.hexastral.yuel`
- [ ] Privacy nutrition labels
- [ ] ASO / screenshots (4 locales) — see `docs/publish/`
- [ ] Fill production RevenueCat keys + `eas.json` `ascAppId`
- [ ] Device smoke: invite UL `yuel.hexastral.com/resonate/{token}` opens accept when app installed
- [ ] Device smoke: timeline push tap opens `/(timeline)…`
- [ ] Device smoke: Delete Account purges bonds + re-onboards
- [ ] Yuun → Yuel carry-over (same Apple/Google identity)
- [ ] Legal URLs already 200 on `yuel.hexastral.com` — re-spot-check before submit

---

## Verification commands

```bash
bun typecheck --filter=@zhop/kindred-app --filter=@zhop/scenario-kindred --filter=@zhop/hexastral-api
bun test apps/kindred-app/lib/timeline-push.test.ts
bun test apps/kindred-app/lib/ddl.test.ts
rg "本月运势|Compatibility Score|SoulMatch|注定你会" apps/kindred-app packages/scenario-kindred --glob '!**/.claude/**'
```

Related: [launch.md](./launch.md) · [push-fuel-contract.md](./push-fuel-contract.md) · [docs/publish/README.md](../../publish/README.md)
