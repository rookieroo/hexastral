# svc-notify

Notification delivery service.

Responsibilities:
1. Device token registry.
2. Push delivery orchestration.
3. Daily fortune queue consumption.
4. Optional multi-channel alerts (Slack/Discord/Telegram/Pushover/Firebase).

## Dependencies

1. Service binding: `SVC_API` → `hexastral-api`
2. Queue consumer: `DAILY_FORTUNE_QUEUE` (queue: `daily-fortune`), DLQ: `daily-fortune-dlq`
3. KV: `EXPO_PUSH_TOKENS` (namespace: `hexastral-expo-push-tokens` — **placeholder** `REPLACE_WITH_KV_ID`)
4. Cron trigger: `0 * * * *` (hourly — dispatches push to timezones at 8:00 AM local)

## Required Variables and Secrets

Vars:
1. `ENVIRONMENT=production`

Secrets:
1. `INTERNAL_KEY`
2. `FIREBASE_SERVICE_ACCOUNT` (if Firebase channel enabled)
3. Optional: `PUSHOVER_API_TOKEN`, `PUSHOVER_USER_KEY`, `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Local Development

```bash
cd services/svc-notify
bun dev
```

## Production Deployment

```bash
cd services/svc-notify
bun deploy
```

## Deployment Notes

1. Create `daily-fortune` queue and `daily-fortune-dlq` before deploying.
2. Fill `REPLACE_WITH_KV_ID` with the `hexastral-expo-push-tokens` KV namespace ID.
3. **`INTERNAL_KEY` must be the same value** as in `hexastral-api` and `svc-signal`.
4. For solo development, `preview_id` can equal the production `id` in the KV binding.
5. Keep this service internal-only (no public routes, service-binding access only).
6. Deploy in **Wave 2** — after Wave 1 leaf services. Despite binding to `hexastral-api` via `SVC_API`, Cloudflare resolves this at runtime, not deploy time.

## Smoke Checks

1. Register-device endpoint stores token in `EXPO_PUSH_TOKENS`.
2. Queue consumer sends a test notification without DLQ fallback.
3. Internal-key protected endpoints reject invalid key.
