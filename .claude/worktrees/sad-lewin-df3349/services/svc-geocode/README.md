# svc-geocode

Geocoding and timezone lookup service.

Responsibilities:
1. Convert city/place input into normalized geocode data.
2. Cache geocode results in KV to reduce external API load.

## Dependencies

1. KV: `GEOCODE_CACHE` (namespace: `hexastral-geocode-cache` — **placeholder** `REPLACE_WITH_KV_ID` must be filled)
2. External Nominatim API (`https://nominatim.openstreetmap.org`)

## Required Variables and Secrets

Vars:
1. `ENVIRONMENT=production`
2. `NOMINATIM_EMAIL` (required by Nominatim policy)

Secrets:
1. None required by default.

## Local Development

```bash
cd services/svc-geocode
bun dev
```

## Production Deployment

```bash
cd services/svc-geocode
bun deploy
```

## Deployment Notes

1. Fill `REPLACE_WITH_KV_ID` and `REPLACE_WITH_PREVIEW_KV_ID` in `wrangler.jsonc` with the `hexastral-geocode-cache` namespace ID (for solo dev, both can be the same value).
2. `NOMINATIM_EMAIL` must be a valid monitored address — required by Nominatim usage policy.
3. **Naming**: Cloudflare worker name is `hexastral-svc-geocode` (differs from directory `svc-geocode`). Service binding in `hexastral-api/wrangler.jsonc` must reference `"service": "hexastral-svc-geocode"`.
4. Deploy in **Wave 1** — no outbound service bindings.

## Smoke Checks

1. Search endpoint returns valid coordinates.
2. Repeated requests hit cache path.
