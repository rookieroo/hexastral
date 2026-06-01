# hexastral-api

Cloudflare Worker API gateway for HexAstral.

Responsibilities:
1. Public HTTPS API for iOS/Web clients.
2. Authentication, rate limiting, quota enforcement.
3. Data persistence through D1.
4. Internal orchestration through service bindings.

## Dependencies

Infrastructure bindings (production):
1. D1: `DB` (id: `00ceb8fe-35a1-42b1-9f7f-828e1142dd68`)
2. KV: `GUARD_KV`, `DDL_KV`, `FORTUNE_CACHE`
3. Rate limiters: `RATE_LIMITER`, `CHART_RATE_LIMITER`
4. Workers AI: `AI`
5. Service bindings: `SVC_ASTRO`, `SVC_FORTUNE`, `SVC_NOTIFY`, `SVC_GEOCODE`, `SVC_MAILER`
6. R2: `FACE_PHOTOS_BUCKET` (bucket: `hexastral-face-photos`), `ANALYTICS_BUCKET` (bucket: `hexastral-analytics`)

> **FORTUNE_CACHE placeholder:** `wrangler.jsonc` contains `REPLACE_WITH_FORTUNE_CACHE_KV_ID`. Create the `hexastral-fortune-cache` KV namespace in the Cloudflare dashboard and replace the placeholder before deploying. This namespace must be identical to the one used by `svc-fortune` and `svc-notify`.

## Required Variables and Secrets

Vars:
1. `ENVIRONMENT=production`

Secrets:
1. `INTERNAL_KEY`
2. `TURNSTILE_SECRET`
3. `REVENUECAT_WEBHOOK_SECRET`
4. `DDL_SERVICE_TOKEN` (if DDL internal caller check is enabled)

## Local Development

```bash
cd apps/hexastral-api
bun dev
```

Database migration:

```bash
bun db:generate
bun db:migrate
```

## Production Deployment

1. Validate wrangler bindings and IDs.
2. Apply D1 migrations first.
3. Deploy worker.

```bash
cd apps/hexastral-api
bun db:generate
bun db:migrate:prod
bun deploy
```

## Deployment Notes

1. Keep `infra-types.ts` and `wrangler.jsonc` binding list in sync.
2. `FORTUNE_CACHE` KV placeholder must be filled before deploy — see Dependencies section.
3. **`INTERNAL_KEY` must be the same value** across `hexastral-api`, `svc-fortune`, and `svc-notify`. Generate once with `openssl rand -hex 32`, then `wrangler secret put INTERNAL_KEY` in all three directories.
4. Route `api.hexastral.com` must be configured as a Custom Domain pointing to this worker after first deploy.
5. Always run `bun db:migrate:prod` before `bun deploy` if there are pending migrations.
6. Deploy after all Wave 1 and Wave 2/3 services are deployed — see [deploy.md](../../deploy.md).

## Smoke Checks

1. Read route returns 200.
2. A chart route can call `SVC_ASTRO` successfully.
3. Webhook route rejects invalid `REVENUECAT_WEBHOOK_SECRET`.
4. Turnstile-protected routes reject missing token in production.
