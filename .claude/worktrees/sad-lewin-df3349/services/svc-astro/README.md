# svc-astro

Internal compute and interpretation service.

Responsibilities:
1. Metaphysics chart computation.
2. AI interpretation generation.
3. Internal-only APIs consumed by `hexastral-api`.

## Dependencies

1. Rate limiter binding: `RATE_LIMITER`
2. AI provider secrets: Gemini (primary), DeepSeek (fallback)

## Required Variables and Secrets

Vars:
1. `ENVIRONMENT=production`

Secrets:
1. `GEMINI_API_KEY` (Only needed for Physiognomy VLM, text routes use Workers AI)

## Local Development

```bash
cd services/svc-astro
bun dev
```

## Production Deployment

```bash
cd services/svc-astro
bun deploy
```

## Deployment Notes

1. Do not expose public routes. This service is invoked only via service binding from `hexastral-api`.
2. Rate limiter is enabled as defense-in-depth — do not remove it.
3. Deploy in **Wave 1** (no outbound service bindings; can deploy in parallel with svc-tail, svc-geocode, svc-mailer).
4. Both AI keys are recommended. The service falls back to DeepSeek-R1 when Gemini is unavailable.

## Smoke Checks

1. `hexastral-api` chart request can invoke this service.
2. AI key errors do not appear in logs.
3. 429 behavior is visible when high-rate requests are replayed.
