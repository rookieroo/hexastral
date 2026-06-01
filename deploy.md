# Deployment Operations

This runbook is the deploy reference for the monorepo. All production deploys
happen **locally** via wrangler / EAS. CI runs validation only — it does not deploy.

## Preflight (recommended before any release)

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
cd services/svc-admin-notify && bun deploy
cd services/svc-astro && bun deploy
cd services/svc-signal && bun deploy
cd services/svc-notify && bun deploy
cd services/svc-geocode && bun deploy
cd services/svc-mailer && bun deploy
cd services/svc-tail && bun deploy
```

### 2. API (with DB migration)

`bun deploy` in `apps/hexastral-api` runs `db:generate` first to ensure schema
and migration files are in sync.

```bash
cd apps/hexastral-api
bun db:generate          # generate any pending drizzle migration
bun db:migrate:prod      # apply migrations to remote D1 (review SQL first)
bun deploy               # deploy worker to Cloudflare
```

### 3. Web

```bash
cd apps/hexastral-web && bun deploy
cd apps/useone-tech    && bun deploy
```

## iOS Release (EAS)

```bash
cd apps/hexastral-app
eas build --profile production --platform ios
eas submit --platform ios
```

Same pattern for satellite apps (`coin-cast-app`, `dream-oracle-app`, `face-oracle-app`).

## Secrets and Config Checklist

- Sync secrets with `bun sync-secrets` / `bun sync-secrets:all` as needed.
- Confirm `INTERNAL_KEY` is aligned between API and internal services.
- Confirm required KV/D1/R2 bindings are configured in each worker `wrangler.jsonc`.
- Confirm EAS env for mobile apps is synced via `bun sync-eas-env`.

## What CI does (and does not)

- **Does**: typecheck / lint / test / check-deps on every PR and push to main.
- **Does not**: deploy to production. There is no auto-deploy. All deploys are
  triggered locally by an authorized engineer running the commands above.

This is intentional — Cloudflare Workers deploys are near-instant and roll back
with a single command (`wrangler rollback`), so the operational simplicity of
"deploy from your terminal" outweighs the value of a CI deploy pipeline at this
project's scale.
