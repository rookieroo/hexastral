# Yuun release config — human console gate

Code cannot fill ASC / RevenueCat / Worker secrets. Complete before `AUSPICE_REQUIRE_PROD_KEYS=1 node scripts/assert-release-config.mjs` and production EAS.

## App Store Connect

- [ ] App record for `com.hexastral.yuun`
- [ ] Numeric `ascAppId` → `apps/auspice-app/eas.json` `submit.production.ios.ascAppId`
- [ ] App Store URL → `apps/auspice-app/lib/config.ts` `APP_STORE_URL`
- [ ] IAP: `auspice_pro_monthly`, `auspice_pro_annual`
- [ ] Content rating **12+**
- [ ] Privacy Nutrition Labels aligned with `app.json` `privacyManifests.NSPrivacyCollectedDataTypes`
- [ ] ASO pasted from `aso-metadata.json` (en / zh-Hans / zh-Hant / ja)

## RevenueCat

- [ ] Entitlement `auspice_pro`
- [ ] Offering `auspice_default` with monthly + annual packages
- [ ] iOS / Android public SDK keys → EAS Secrets / production env (`EXPO_PUBLIC_REVENUECAT_*`)
- [ ] Webhook → production API + `REVENUECAT_WEBHOOK_SECRET`

## Cloudflare Worker (`hexastral-api`)

- [ ] `bunx wrangler secret put REVENUECAT_API_KEY` (from API package dir)
- [ ] `REVENUECAT_WEBHOOK_SECRET`
- [ ] `CYCLE_CALENDAR_SECRET`
- [ ] Vars: `ALLOW_DEV_PRO=0`
- [ ] Production API deployed with birthCity nullish schema (retest device saves)

## EAS

- [ ] Production profile builds with real RC keys (not REPLACE_*)
- [ ] `node scripts/assert-release-config.mjs` soft-OK locally; strict mode green in submit pipeline

**Do not** run production deploy / remote D1 migrate without explicit approval.
