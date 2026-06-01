# @zhop/satellite-runtime

Shared glue for portfolio Expo apps:

- `usePortfolioSatelliteBootstrap` — generates a per-install `anonymous_id`, fires `app_open`, captures `?ddl=` deep links, resolves `GET /api/ddl/:token`, caches `session.meta` locally, emits `portfolio_ddl_claimed`.
- `PortfolioAppleBanner` — optional Sign in with Apple that emits `portfolio_apple_linked` (credential is **not** sent to the API yet).
- `ingestGrowthEvent` — `POST /api/growth/events` with `@zhop/growth-funnel` payloads.

Set `EXPO_PUBLIC_API_URL` in each app when pointing at non-production Workers.
