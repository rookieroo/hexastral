# Migrations

All 23 historical migrations (0000–0022) were collapsed into a single baseline
on 2026-05-14 because the production database had no real users and the legacy
migration chain included a stalled destructive change (0002 `DROP COLUMN
avatar_url`) that was never applied.

## Resetting the production D1 database

The baseline is **not** committed yet. To bring the database back online:

```bash
# 1. In Cloudflare dashboard or via wrangler CLI:
wrangler d1 delete hexastral-db --remote
wrangler d1 create hexastral-db
# (copy the new database_id into apps/hexastral-api/wrangler.jsonc)

# 2. Generate the baseline from current schema.ts
cd apps/hexastral-api
bun db:generate          # produces 0000_baseline.sql

# 3. Review the SQL (optional but recommended)
cat migrations/0000_*.sql | less

# 4. Apply to the new remote D1
bun db:migrate:prod

# 5. Smoke test
bun deploy
curl https://api.hexastral.com/api/health
```

## Going forward

Each schema change in `src/db/schema.ts` should be followed by:

```bash
bun db:generate         # creates next 000N_*.sql migration
bun db:migrate          # applies to local D1 (dev)
bun db:migrate:prod     # applies to remote D1 (deploy)
```
