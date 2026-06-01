# Yuán (緣) — Synastry iOS App

The synastry-focused flagship in the HexAstral brand matrix. Standalone Expo
app that consumes `@zhop/scenario-yuan` for all relationship-domain logic.

See [ADR-0001](../../docs/decisions/0001-yuan-naming.md) and
[ADR-0002](../../docs/decisions/0002-brand-matrix.md) for product / brand
context.

## Architecture

```
apps/yuan-app/
├── app/
│   ├── _layout.tsx              GestureHandler + Auth + YuanClientGate
│   ├── index.tsx                Route decision (first launch vs returning)
│   ├── (onboarding)/            8-screen form-as-conversation flow
│   │   ├── welcome.tsx          1 · 緣 cinnabar seal, breathing
│   │   ├── name.tsx             2 · A's name
│   │   ├── birth-date.tsx       3 · A's birth date (inline picker)
│   │   ├── birth-time.tsx       4 · A's birth time (with "I don't know" skip)
│   │   ├── birth-place.tsx      5 · A's birth city
│   │   ├── mode.tsx             6 · Invite vs fill-in
│   │   ├── invite-email.tsx     7a · Email + relationship + send
│   │   ├── fill-other.tsx       7b · A enters B's birth (solo mode)
│   │   └── reveal.tsx           8 · RevealMoment ceremony
│   ├── (bonds)/                 Main app after onboarding
│   │   ├── index.tsx            Bond list (or waiting state)
│   │   └── [id].tsx             Bond detail (ChapterPager or summary)
│   └── accept/[token].tsx       DDL-claimed entry for B-users (modal)
├── components/
│   └── ProgressIndicator.tsx    6-segment onboarding progress bar
├── lib/
│   ├── config.ts                Env vars (apiUrl, env, RevenueCat keys)
│   ├── hmac.ts                  v2 HMAC-SHA256 request signing
│   ├── auth.tsx                 AuthProvider — bootstrap userId on first launch
│   ├── client.tsx               YuanClientGate — wires HexastralClient → scenario-yuan
│   ├── i18n.ts                  4 locales (en / zh / zh-Hant / ja)
│   └── onboardingDraft.ts       In-memory + AsyncStorage onboarding draft
├── app.json + app.config.cjs    Expo + bundle id com.hexastral.yuan
├── eas.json                     EAS build profiles (dev / preview / production)
├── package.json
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

## Quick start

```bash
# From the monorepo root:
bun install
cd apps/yuan-app
cp .env.example .env
# Fill EXPO_PUBLIC_REVENUECAT_IOS_KEY when ready

bun dev           # Metro bundler
bun ios           # Build + run iOS simulator
```

## App Store metadata (anti-spam compliant; supersedes ADR-0001 register)

See `aso-metadata.json` for the full per-locale ASC strings. Brand display titles:

| Locale | Listing name |
|--------|-------------|
| en-US | Yuán: BaZi Couples Chart |
| zh-Hans | 緣 · 八字合盘 |
| zh-Hant | 緣 · 八字合盤 |
| ja-JP | 縁・四柱推命の相性 |

- Bundle id: `com.hexastral.yuan`
- Apple Seller: UseONE, LLC
- Subtitle (en): "BaZi compatibility · classical insight"
- Category: Lifestyle (Education secondary). Distances from saturated horoscope cluster.

## Setup checklist before first release

- [ ] Create EAS project: `eas init` → fill `EAS_PROJECT_ID` in `.env` + `app.json`
- [ ] Register `com.hexastral.yuan` bundle id in Apple Developer + App Store Connect
- [ ] Create Yuán app in RevenueCat → fill `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- [ ] Create RevenueCat products: `hexastral_yuan_pro_monthly`, `hexastral_yuan_pro_annual`
- [ ] Add `applinks:hexastral.com` association in App Store Connect
- [ ] Upload icon + splash to `assets/`
- [ ] Localize listing in App Store Connect for 4 markets

## Code dependencies

| Package | Role |
|---------|------|
| `@zhop/scenario-yuan` | All synastry domain logic (types, hooks, components) |
| `@zhop/hexastral-client` | Typed Hono RPC client (wired via lib/client.tsx) |
| `@zhop/hexastral-tokens` | Base + `/yuan` design tokens |
| `@zhop/ddl-client` | Deferred deep link claim (B-user email → install → /accept) |

This app does NOT depend on:
- `@zhop/portfolio-client` (that's for satellites; Yuán is a flagship)
- `@zhop/satellite-runtime` / `@zhop/satellite-ui` (same reason)

## Status

Phase B v0:
- ✅ Project scaffold + 4-locale i18n
- ✅ 8-screen onboarding (form-as-conversation pattern)
- ✅ Bond list with waiting state
- ✅ Bond detail with ChapterPager + fallback summary
- ✅ DDL accept modal for B-users
- ⏳ Solo mode (fill-other) — UI ready, awaiting `useSoloBond` hook in scenario-yuan
- ⏳ Sharing (ShareableChapterCard → view-shot → expo-sharing) — wired stub
- ⏳ RevenueCat paywall — placeholder env vars
- ⏳ Apple Sign In — `usesAppleSignIn: true` declared, integration TBD

Before opening the App Store listing, complete the setup checklist above
and run end-to-end on a physical device through TestFlight.
