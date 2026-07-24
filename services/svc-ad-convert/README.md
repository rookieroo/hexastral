# svc-ad-convert

Internal Cloudflare Worker: queue consumer that posts merchant conversion events
to Meta / Google / TikTok / Reddit. No public routes.

See [docs/setup/web-url-surfaces.md](../../docs/setup/web-url-surfaces.md).

## Setup

```bash
bunx wrangler queues create ad-convert
bunx wrangler queues create ad-convert-dlq
cd services/svc-ad-convert
bun deploy
bun run secrets:sync
```

Producer: `hexastral-api` binding `AD_CONVERT_QUEUE` → queue `ad-convert`.
Alerts: `SVC_ADMIN_NOTIFY` + shared `ALERT_KV` (GUARD_KV id) for 1h throttle.
