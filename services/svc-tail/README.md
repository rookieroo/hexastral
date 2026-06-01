# svc-tail

Centralized tail log consumer.

Responsibilities:
1. Receive logs from API and service tail consumers.
2. Provide a single place for operational log observation.

## Dependencies

1. Tail consumer bindings from other workers.

## Required Variables and Secrets

Vars:
1. None required by default.

Secrets:
1. None required by default.

## Local Development

```bash
cd services/svc-tail
bun dev
```

## Production Deployment

```bash
cd services/svc-tail
bun deploy
```

## Deployment Notes

1. Deploy this service **first** (Wave 1) — before any service that references it in `tail_consumers`.
2. All other workers send logs here automatically once deployed — no per-service configuration needed beyond the `tail_consumers` entry in each `wrangler.jsonc`.
3. Keep log retention and export strategy documented in the ops handbook.

## Smoke Checks

1. Confirm incoming logs from at least one upstream worker.
2. Verify error-level events are visible and searchable.
