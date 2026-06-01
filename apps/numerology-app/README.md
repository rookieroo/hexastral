# Numerology

A HexAstral satellite app — Pythagorean numerology calculator (Phase D).

## Status

v0.1.0 scaffold. Manual setup required before TestFlight:

1. `cd apps/numerology-app && eas init` — fills `EAS_PROJECT_ID`
2. Paste the project ID into `app.json` `extra.eas.projectId` and all four
   `EXPO_PUBLIC_EAS_PROJECT_ID` slots in `eas.json`
3. Apple Developer → Identifiers → register `com.hexastral.numerology`
4. App Store Connect → create app
5. RevenueCat → create products (`numerology_pro_monthly`, `numerology_pro_annual`)
6. Paste RevenueCat iOS public key into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`

## Architecture

- v1.0: deterministic Pythagorean numerology — no LLM, no IAP gate. Six numbers
  (Life-Path, Birthday, Expression, Soul-Urge, Personality, Personal-Year)
  computed by `apps/hexastral-api/src/lib/numerology.ts` and rendered locally.
- v1.5: AI-narrated paragraph per number (response slot already reserved as
  `interpretation` on `POST /api/numerology/compute`).
- Single-language English at v0.1; add zh / ja by extending `lib/i18n.ts`.

## Routes

- `/` — Home: tap "Calculate" → opens compute sheet
- `/compute` — Form (full name + birth date) → POST `/api/numerology/compute`
- `/result` — Six-number panel
- `/settings` — Language + about
