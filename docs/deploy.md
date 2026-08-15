# Deployment Operations

This runbook is the deploy reference for the monorepo. All production deploys
happen **locally** via wrangler / EAS. There is no CI.

## Preflight (run before any release / submit)

```bash
bun run preflight   # typecheck + lint + test + check-deps + ASO gates + release-config
```

Or individually:

```bash
bun typecheck     # type errors block deploy
bun lint          # biome issues
bun test          # unit tests
bun check-deps    # version consistency across workspaces
```

Or one-shot:

```bash
bun run deploy:preflight              # full preflight (includes iOS checks)
bun run deploy:preflight:api-only     # skip iOS
```

## Production Deployment Order

Deploy bottom-up to keep service bindings live for callers:

### 1. Internal services

Each service is deployed independently from its own directory. Order does not
matter inside services because they only call each other through service bindings
that resolve at runtime; if a downstream service is being redeployed, callers
retry transparently.

```bash
cd services/svc-admin-notify && bun run deploy
cd services/svc-astro && bun run deploy
cd services/svc-signal && bun run deploy
cd services/svc-notify && bun run deploy
cd services/svc-geocode && bun run deploy
cd services/svc-mailer && bun run deploy
cd services/svc-tail && bun run deploy
cd services/svc-feng && bun run deploy
cd services/svc-ad-convert && bun run deploy
```

> Note: use `bun run deploy` — bare `bun deploy` is a reserved Bun subcommand on
> newer Bun versions. All 9 services set `"workers_dev": false` (internal-only
> via service bindings; no public `*.workers.dev` URL).

### 2. API (with DB migration)

`bun deploy` in `apps/hexastral-api` runs `db:generate` first to ensure schema
and migration files are in sync.

```bash
cd apps/hexastral-api
bun db:generate          # generate any pending drizzle migration
bun db:migrate:prod      # apply migrations to remote D1 (review SQL first)
bun run deploy           # deploy worker to Cloudflare
```

### 3. Web

```bash
cd apps/hexastral-web && bun run deploy
cd apps/useone-tech    && bun run deploy
```

## iOS Release (EAS)

```bash
cd apps/auspice-app
eas build --profile production --platform ios
eas submit --platform ios
```

Same pattern for the other satellite apps (`kindred-app`, `feng-app`,
`coin-cast-app`, `xingqi-app`). `hexastral-app` is retired — do not build it.

## Secrets and Config Checklist

- Sync secrets with `bun sync-secrets` / `bun sync-secrets:all` as needed.
- Confirm `INTERNAL_KEY` is aligned between API and internal services.
- Confirm required KV/D1/R2 bindings are configured in each worker `wrangler.jsonc`.
- Confirm EAS env for mobile apps is synced via `bun sync-eas-env`.

## R2 retention (svc-feng buckets)

`writeCache` (`@zhop/ai-vision`) stamps an `expiresAt` metadata TTL that is a
**soft read-side** guard only — `readCache` returns null past it, but nothing
physically deletes the object. There is no sweep cron. Physical GC of the
transient prefix must be a Cloudflare **R2 lifecycle rule** (dashboard or S3
API — wrangler cannot manage these). Intended retention per bucket:

| Bucket | Prefix | Intended TTL | Set how |
| --- | --- | --- | --- |
| `feng-maps` (`MAPS_CACHE`) | raw satellite tiles | ~90 d transient | R2 lifecycle rule (non-PII, regenerable) |
| `feng-annotated` (`ANNOTATED_CACHE`) | `annotated-raw/*` (report tiles) | **permanent** (10y `ttlSeconds` in `annotate.ts`) | none — exempt from any lifecycle rule |
| `feng-annotated` | `feng-vision/*`, `feng-interior/*` (JSON) | 180 d / 5 min (degraded) | soft TTL; optional lifecycle |
| `feng-floorplans` (`FLOORPLAN_CACHE`) | uploaded floor plans (PII) | **owned** — deleted on site/account deletion (`/floorplan/delete`), NOT lifecycle-GC'd | none |

If you add an R2 lifecycle rule to `feng-annotated`, it MUST exclude the
`annotated-raw/` prefix or live reports lose their map imagery.

## Validation (no CI)

GitHub Actions was removed — validation and deploys are both local. `bun run preflight`
replaces what CI used to check (typecheck / lint / test / check-deps / ASO gates /
release-config). Run it before any build or submit.

This is intentional — Cloudflare Workers deploys are near-instant and roll back
with a single command (`wrangler rollback`), so the operational simplicity of
"deploy from your terminal" outweighs the value of a CI deploy pipeline at this
project's scale.
