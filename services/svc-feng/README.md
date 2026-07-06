# @zhop/svc-feng

Feng-shui analysis orchestration worker. Sits behind `hexastral-api` —
not exposed to the public internet.

## Routes

| Path | Purpose | V1 status |
|---|---|---|
| `GET  /health` | Bucket + secret presence probe | Real |
| `POST /maps/render` | Fetch a Mapbox Static Image, cache to R2 | **Real** (needs `MAPBOX_TOKEN`) |
| `POST /annotate` | Composite SVG overlays onto a cached map | Pass-through stub (resvg-wasm wires Week 3) |
| `POST /vision/analyze` | Gemini 2.5 Pro Vision over 3 annotated PNGs | Stub (real call Week 5) |
| `POST /synthesize` | Stage 3 — 6 chapters from vision + compute | Stub (real call Week 5) |

Stage 2 (deterministic 玄空 / 八宅 compute) lives in
`packages/astro-core/src/feng/` — no HTTP hop.

## R2 buckets

- `feng-maps` — raw Mapbox PNGs. 30-day TTL, key = SHA-1 of normalized request.
- `feng-annotated` — overlay results. 7-day TTL (because 流年 rollover changes annotations annually).

Create with:

```bash
wrangler r2 bucket create feng-maps
wrangler r2 bucket create feng-annotated
```

## Secrets

```bash
wrangler secret put MAPBOX_TOKEN     # static-images:read scope
wrangler secret put GEMINI_API_KEY   # Vertex AI / AI Studio
```

## Local dev

```bash
cd services/svc-feng
bun dev                # wrangler dev — uses LocalR2 + dummy secrets
```

## Caching contract

- Every `/maps/render` request is keyed by SHA-1 of canonicalized
  `{ lat, lng, zoom, width, height, mode, bearing, pitch }`. lat/lng are
  rounded to 5 decimal places (~1m) before hashing.
- Same coordinates from any user share the same cache entry — feng-shui
  audits of identical addresses don't double-bill Mapbox.

## Replacement seam

The Mapbox-specific code is isolated to `src/lib/mapbox.ts`. Swapping
providers (MapTiler, self-hosted OSM, etc.) is a contained change. See
[docs/apps/feng/fix-plan.md §13](../../docs/apps/feng/fix-plan.md#13-locked-decisions-resolved-2026-05-15)
for the V1 decision to use Mapbox single-provider.
