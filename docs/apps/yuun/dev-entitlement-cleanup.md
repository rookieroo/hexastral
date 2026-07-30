# Production D1 — quarantine `dev_set_subscription` Pro grants

**Do not run without explicit approval.** Remote write against production D1.

## Impact

Audit found ~11 active `universe_pro` rows with `product_id = 'dev_set_subscription'`
from the temporary production `/api/dev/set-subscription` backdoor (now closed).

These grants are not real RevenueCat purchases. Leaving them active lets those
accounts keep Pro after launch.

## Preview (read-only)

```sql
SELECT user_id, entitlement_key, product_id, expires_at, granted_at
FROM user_entitlements
WHERE product_id = 'dev_set_subscription'
ORDER BY granted_at;
```

## Cleanup (expires immediately — preferred over hard DELETE for audit trail)

```sql
UPDATE user_entitlements
SET expires_at = datetime('now')
WHERE product_id = 'dev_set_subscription'
  AND (expires_at IS NULL OR expires_at > datetime('now'));
```

## Apply (after approval)

```bash
cd apps/hexastral-api
bunx wrangler d1 execute hexastral-db --remote --command \
  "UPDATE user_entitlements SET expires_at = datetime('now') WHERE product_id = 'dev_set_subscription' AND (expires_at IS NULL OR expires_at > datetime('now'));"
```

Then redeploy API if not already deployed with the production `/api/dev/*` hard block.
