# Kindred (Kindred) — Synastry iOS App

The synastry-focused flagship in the HexAstral brand matrix. Standalone Expo
app that consumes `@zhop/scenario-kindred` for all relationship-domain logic.

See [ADR-0024](../../docs/decisions/0024-app-brand-naming.md) for product / brand
context.

## Architecture

```
apps/kindred-app/
├── app/
│   ├── _layout.tsx              GestureHandler + Auth + KindredClientGate
│   ├── index.tsx                Route decision (first launch vs returning)
│   ├── (onboarding)/            intro → dual-tab pair input → reveal
│   │   ├── intro.tsx            0 · stick-figure parable (first launch only)
│   │   ├── pair-input.tsx       1 · dual-tab 合盘 form — you / TA tabs (icons are
│   │   │                            the stick figures; thread animates on switch).
│   │   │                            TA path: know (fill) | invite (mailto) | skip
│   │   └── reveal.tsx           2 · RevealMoment ceremony (solo create)
│   ├── (bonds)/                 Main app after onboarding
│   │   ├── index.tsx            Bond list (or waiting state)
│   │   └── [id].tsx             Bond detail (ChapterPager or summary)
│   └── accept/[token].tsx       DDL-claimed entry for B-users (modal)
├── components/
│   ├── StickFigure.tsx          shared mascot (intro + pair-input tab icons)
│   ├── IntroScene.tsx           intro scenery: sky / ground / galaxy / glow / dust
│   │                                + drop-in slot for AI backdrop plates
│   ├── reading/                 solo 八字紫微 report UI (ported from ming-pan, ADR-0021 K1)
│   │   ├── ReadingOverlay.tsx   ink-bloom open/close shell
│   │   ├── ReadingReport.tsx    chapter list + detail (RevenueCat-gated locked chapters)
│   │   ├── ChartAppendix.tsx    八字 chart at-a-glance
│   │   ├── ZiweiChartView.tsx   紫微 12-palace native chart
│   │   └── reading-i18n.ts      reading strings + data-atom labels (4 locales)
│   ├── PairTabBar.tsx           animated you/TA tab bar + connecting thread
│   ├── PersonFields.tsx         compact birth-info field stack (both tabs)
│   └── EmailVerifyModal.tsx     email verification bottom sheet
├── lib/solo/                    solo reading compute + cache (ported from ming-pan)
│   ├── natal.ts                 八字 four-pillar compute (@zhop/astro-core)
│   ├── ziwei.ts                 紫微 compute (iztro, lazy)
│   ├── reading.ts               五行 counts · 大运 chain · day-master relations
│   └── reading-cache.ts         POST /api/natal + GET /api/report/chapter/* (HMAC v2)
├── lib/selfBirth.ts             persistent self birth info (seed for the solo reading)
├── app/(reading)/               HOME: solo reading (ADR-0021 solo-first)
├── assets/intro/                AI scene-plate slot + generation prompt guide
├── assets/imagery/              Q版 mascot + chapter 实物意象 prompt guide
├── lib/
│   ├── config.ts                Env vars (apiUrl, env, RevenueCat keys)
│   ├── hmac.ts                  v2 HMAC-SHA256 request signing
│   ├── auth.tsx                 AuthProvider — bootstrap userId on first launch
│   ├── client.tsx               KindredClientGate — wires HexastralClient → scenario-yuan
│   ├── i18n.ts                  4 locales (en / zh / zh-Hant / ja)
│   └── onboardingDraft.ts       In-memory + AsyncStorage onboarding draft
├── app.json + app.config.cjs    Expo + bundle id com.hexastral.yuel
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
cd apps/kindred-app
cp .env.example .env
# Fill EXPO_PUBLIC_REVENUECAT_IOS_KEY when ready

bun dev           # Metro bundler
bun ios           # Build + run iOS simulator
```

## App Store metadata (anti-spam compliant; supersedes ADR-0001 register)

See `aso-metadata.json` for the full per-locale ASC strings. Brand display titles:

| Locale | Listing name |
|--------|-------------|
| en-US | Kindred: BaZi Couples Chart |
| zh-Hans | Kindred · 八字合盘 |
| zh-Hant | Kindred · 八字合盤 |
| ja-JP | 縁・四柱推命の相性 |

- Bundle id: `com.hexastral.yuel`
- Apple Seller: UseONE, LLC
- Subtitle (en): "BaZi compatibility · classical insight"
- Category: Lifestyle (Education secondary). Distances from saturated horoscope cluster.

## Setup checklist before first release

- [ ] Create EAS project: `eas init` → fill `EAS_PROJECT_ID` in `.env` + `app.json`
- [ ] Register `com.hexastral.yuel` bundle id in Apple Developer + App Store Connect
- [ ] Create Kindred app in RevenueCat → fill `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- [ ] Create RevenueCat products: `kindred_pro_monthly`, `kindred_pro_annual` (entitlement `kindred_pro`)
- [ ] Add `applinks:hexastral.com` association in App Store Connect
- [ ] Upload icon + splash to `assets/`
- [ ] Localize listing in App Store Connect for 4 markets

## Code dependencies

| Package | Role |
|---------|------|
| `@zhop/scenario-kindred` | All synastry domain logic (types, hooks, components) |
| `@zhop/hexastral-client` | Typed Hono RPC client (wired via lib/client.tsx) |
| `@zhop/hexastral-tokens` | Base + `/yuan` design tokens |
| `@zhop/ddl-client` | Deferred deep link claim (B-user email → install → /accept) |

This app does NOT depend on:
- `@zhop/portfolio-client` (that's for satellites; Kindred is a flagship)
- `@zhop/satellite-runtime` / `@zhop/satellite-ui` (same reason)

## Status

Phase B v0:
- ✅ Project scaffold + 4-locale i18n
- ✅ Dual-tab pair-input onboarding (stick-figure tabs · you / TA · know | invite | skip)
- ✅ Bond list with waiting state
- ✅ Bond detail with ChapterPager + fallback summary
- ✅ DDL accept modal for B-users
- ✅ Solo "fill TA" path → reveal (`useSoloBond`) + mailto invite path (`useBondInvitation`)
- ⏳ Sharing (ShareableChapterCard → view-shot → expo-sharing) — wired stub
- ⏳ RevenueCat paywall — placeholder env vars
- ⏳ Apple Sign In — `usesAppleSignIn: true` declared, integration TBD

Before opening the App Store listing, complete the setup checklist above
and run end-to-end on a physical device through TestFlight.
