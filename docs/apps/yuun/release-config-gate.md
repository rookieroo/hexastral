# Yuun release config — human console gate

Code cannot fill ASC / RevenueCat / Worker secrets. Complete before production EAS submit.

## No-IAP first ship (current)

Banking / Paid Apps Agreement may be incomplete. Ship as a **free app** with `EXPO_PUBLIC_IAP_ENABLED=false` (see `eas.json` production / preview).

- [ ] **Do not** create ASC / Play subscription products for this version
- [ ] **Do not** attach IAP to the App Store version
- [ ] Production / preview: `EXPO_PUBLIC_IAP_ENABLED=false` (already in `eas.json`)
- [ ] RC keys may stay `REPLACE_*` — SDK skips configure; paywall shows Coming soon
- [ ] ASO from `aso-metadata.json` (no Pro prices / RevenueCat)
- [ ] **Google Play:** use `aso-metadata.json` → `googlePlay` — home widgets (S/M/L) after [android-widget-runbook.md](./android-widget-runbook.md); **no** Watch / lock-screen claims

When banking is ready, flip the post-banking checklist below and ship a **new** version with IAP (first subscription must ship with an app version).

## App Store Connect

- [ ] App record for `com.hexastral.yuun`
- [ ] Numeric `ascAppId` → `apps/auspice-app/eas.json` `submit.production.ios.ascAppId`
- [ ] App Store URL → `apps/auspice-app/lib/config.ts` `APP_STORE_URL`
- [ ] Content rating **12+**
- [ ] Privacy Nutrition Labels aligned with `app.json` `privacyManifests.NSPrivacyCollectedDataTypes`
- [ ] ASO pasted from `aso-metadata.json` (en / zh-Hans / zh-Hant / ja)
- [ ] _(Post-banking)_ IAP: `auspice_pro_monthly`, `auspice_pro_annual` + link to version

## Google Play

- [ ] Free app listing; no Play Billing products for no-IAP ship
- [ ] Paste `googlePlay` locale copy (home widgets after matrix; no Watch/lock)
- [ ] Device smoke: install, Today / Calendar, birth, push permission, sign-in, account delete
- [ ] Home Glance widgets: [android-widget-runbook.md](./android-widget-runbook.md) matrix before claiming on Play
- [ ] _(Post-v1)_ Wear / lock-screen widgets — not in this ship

## RevenueCat _(post-banking)_

- [ ] Entitlement `auspice_pro`
- [ ] Offering `auspice_default` with monthly + annual packages
- [ ] iOS / Android public SDK keys → EAS Secrets / production env (`EXPO_PUBLIC_REVENUECAT_*`)
- [ ] Webhook → production API + `REVENUECAT_WEBHOOK_SECRET`
- [ ] Set `EXPO_PUBLIC_IAP_ENABLED=true` on production / preview

## Cloudflare Worker (`hexastral-api`)

- [ ] `CYCLE_CALENDAR_SECRET` (calendar feeds)
- [ ] _(Post-banking)_ `bunx wrangler secret put REVENUECAT_API_KEY` + `REVENUECAT_WEBHOOK_SECRET`
- [ ] Vars: `ALLOW_DEV_PRO=0`
- [ ] Production API deployed with birthCity nullish schema (retest device saves)

## EAS

- [ ] No-IAP ship: production build with `EXPO_PUBLIC_IAP_ENABLED=false`
- [ ] _(Post-banking)_ Production profile with real RC keys (not REPLACE_*) + `EXPO_PUBLIC_IAP_ENABLED=true`
- [ ] `node scripts/assert-release-config.mjs` — soft-OK for no-IAP; strict mode when keys required

**Do not** run production deploy / remote D1 migrate without explicit approval.
