# HexAstral Monorepo

> **Maintainer**: HexAstral Engineering
> **Stack**: Cloudflare Workers + Expo 54 + Next.js 15 + Bun + Turborepo

HexAstral is an AI-powered East Asian metaphysics product suite built on Cloudflare + Expo.

## Product Philosophy

1. Transparent interpretation over black-box fortune telling.
2. One user identity and one data model across all reading types.
3. Service-oriented backend with strict boundaries and observable operations.

## Brand Matrix

See [docs/decisions/0002-brand-matrix.md](docs/decisions/0002-brand-matrix.md).

```
HexAstral (master / LLC publisher)
├── Flagships — single CJK glyph + Latin transliteration
│   ├── HexAstral        — 命緣卦道 four-tab life navigator
│   ├── Yuán  / 緣       — relationship & compatibility (in development)
│   └── Fēng  / 風       — feng-shui (Q3+, deferred)
└── Satellites — independent Western names, shared backend
    ├── Coin Cast        — I-Ching coin divination
    ├── Xingqi           — physiognomy (palm + face)
    └── Dream Oracle     — dream interpretation
```

## Repository Structure

```text
apps/
  hexastral-api/        Cloudflare Worker API gateway (Hono + D1)
  hexastral-web/        Next.js on Cloudflare — unified web surface
  useone-tech/          Next.js on Cloudflare — LLC corporate site (privacy/terms)
  fate-app/             Satellite — 八字 + 紫微 birth-chart
  yuan-app/             Satellite — Yuán bonds (relationship)
  cycle-app/            Satellite — lunar cycle tracking
  feng-app/             Satellite — Fēng sites + 风水
  numerology-app/       Satellite — numerology readings
  coin-cast-app/        Satellite — I-Ching divination
  dream-oracle-app/     Satellite — dream interpretation
  xingqi-app/           Satellite — Xingqi physiognomy (palm + face)
  (hexastral-app/       — flagship 命緣卦道, planned but not yet implemented)
services/
  svc-astro/            Core metaphysics compute + AI interpretation
  svc-signal/           Daily almanac cron worker (00:00 UTC)
  svc-notify/           Push notification delivery (hourly cron + queue consumer)
  svc-geocode/          City / timezone geocoding (Nominatim cache)
  svc-mailer/           Transactional email (AWS SES)
  svc-admin-notify/     Admin alert sink (Telegram)
  svc-tail/             Centralized log aggregation (tail consumer for all workers)
packages/
  hexastral-tokens/     Design tokens (palette + typography + motion)
  hexastral-client/     Hono RPC client (typed from hexastral-api)
  astro-core/           Pure TypeScript metaphysics engine
  astro-i18n/           Multilingual labelization
  ddl-client/           Deferred deep link + fingerprint
  growth-funnel/        Attribution event schema
  email/                React Email templates + SES/Resend
  logger/               Workers JSON logger
  scenario-dream/       Dream input UI (shared with dream-oracle-app; reserved for flagship)
  scenario-palmface/    Face/palm capture (shared with xingqi-app; reserved for flagship)
  scenario-yuan/        Yuán bonds UI + hooks (yuan-app + hexastral-web)
  scenario-feng/        Fēng sites UI + hooks (feng-app)
  ai-vision/            Gemini vision + R2 cache (svc-feng + svc-astro)
  core-ui/              Shared RN primitives (Phase F)
  portfolio-client/     Satellite app API client (shared by 4 satellites)
  portfolio-posters/    Share poster templates
  satellite-ui/         Feature shell for satellite apps
  satellite-runtime/    Satellite bootstrap (DDL ingest, attribution, Apple linking)
  expo-env-loader/      Expo .env bootstrap
  ui/                   Web UI components (web only)
  ui-native/            React Native primitives wrapper
tooling/
  typescript-config/    Shared tsconfig presets
docs/
  README.md             Doc index (apps · publish · setup · ADRs)
  ROADMAP.md            Four-app launch scope (Yuun · Yuel · Feng · CoinCast)
  apps/                 Per-app plans and TODOs
  publish/              App Store / ASC / trademark (human-only)
  setup/                RC, Sentry, funnel wiring
  decisions/            Active ADRs · archive/decisions/ for superseded
```

## Dependency Graph (Service Bindings)

```text
fate-app, yuan-app, cycle-app, feng-app, numerology-app,
coin-cast-app, dream-oracle-app, xingqi-app
  → https://api.hexastral.com (hexastral-api)

hexastral-web → https://api.hexastral.com (hexastral-api)

hexastral-api
  → svc-astro (chart compute, AI interpretation)
  → svc-geocode (city lookup)
  → svc-notify (push delivery)
  → svc-mailer (transactional email)
  → svc-admin-notify (alerts)

svc-signal     → hexastral-api (SVC_API) → svc-admin-notify
svc-notify     → hexastral-api (SVC_API) → svc-admin-notify
svc-astro      → svc-admin-notify
svc-tail       ← (tail consumer for all workers)
```

The DAG is acyclic. All D1 writes go through `hexastral-api`. Internal services
never bind D1 directly.

## Request and Data Flow

1. iOS / web signs request and calls `hexastral-api`.
2. API authenticates (HMAC for mobile, Turnstile for web) and applies quota.
3. API calls internal service via Service Binding for compute or side-effects.
4. Services persist and cache data via SVC_API back into D1/KV/R2.
5. Async jobs (almanac / push) run via Queue + Cron.

## Engineering Standards

1. TypeScript strict mode, no `any`.
2. Hono + `HTTPException` for API errors.
3. API route handlers must use injected `db` from middleware.
4. Service-to-service calls use service bindings (no public endpoints).
5. iOS network fetching uses React Query hooks.
6. All shared design tokens come from `@zhop/hexastral-tokens`.

## Quick Start

```bash
bun install
bun dev
```

Common commands:

```bash
bun typecheck                # all workspaces
bun lint                     # all workspaces (biome)
bun format:fix               # biome auto-format
bun test                     # all workspaces with tests (astro-core, svc-fortune)
bun check-deps               # version consistency across workspaces
```

## Deployment

CI runs validation only (typecheck / lint / test / check-deps on every PR). All
production deploys happen **locally** via wrangler / EAS — see [deploy.md](deploy.md).

```bash
# API (with DB migration)
cd apps/hexastral-api && bun deploy

# Each service
cd services/svc-astro && bun deploy

# Web
cd apps/hexastral-web && bun deploy

# Mobile satellites (cloud build via EAS)
cd apps/fate-app && eas build --profile production --platform ios
cd apps/yuan-app && eas build --profile production --platform ios
# (same pattern for cycle / feng / numerology / coin-cast / dream-oracle / xingqi)
```

## Documentation Index

- [docs/README.md](docs/README.md) — full doc index
- [docs/ROADMAP.md](docs/ROADMAP.md) — launch scope (Yuun · Yuel · Feng · CoinCast)
- [docs/publish/README.md](docs/publish/README.md) — App Store / human-only checklist
- [docs/decisions/0024-app-brand-naming.md](docs/decisions/0024-app-brand-naming.md) — Yuun / Yuel brand naming
- [deploy.md](deploy.md) — Local deploy runbook
- [apps/hexastral-api/README.md](apps/hexastral-api/README.md) — API deployment
