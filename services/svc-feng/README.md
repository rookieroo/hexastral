# @zhop/svc-feng

Feng-shui analysis worker behind `hexastral-api` (service binding only — not public).

## Pipeline stages (Kanyu “别胡说” wave)

```
maps → annotate (raw passthrough) → vision (VLM) → compute (in API / astro-core)
  → form_li (single mid-pass LLM, fail-open) → synthesize (lean briefing + hard audit)
```

| Path | Purpose |
|---|---|
| `GET  /health` | Bucket + secret presence |
| `POST /maps/render` | Mapbox Static Image → R2 |
| `POST /annotate` | Raw tile passthrough (client draws overlays) |
| `POST /vision/analyze` | Dual-pass VLM (形煞 / 砂水) on **unannotated** north-up tiles |
| `POST /street/sha` | Optional Mapillary street 形煞 (premium / non-apartment) |
| `POST /form-li/interpret` | Mid-pass `FormLiNotes` (Zod + hard audit; returns `failOpen` on error) |
| `POST /synthesize` | Lean final chapters from compact briefing (`maxTokens ≤ 8192`) |

Deterministic 玄空 / 八宅 / 形理 compute lives in `packages/astro-core/src/feng/` (no HTTP hop).

### Honesty contracts

- Vision prompts must **not** claim arrows / 二十四山环 / bagua wedges on imagery.
- Mid-pass is **exactly one** LLM call this wave; failures **fail-open** (`formLiNotes: null`) — job still synthesizes.
- Final synth must **not** dump full vision/compute JSON; uses `buildSynthesisBriefing` (≤12k chars).
- Public combination copy uses `readingPublic` only (medical classical denylist).

This wave does **not** change 沈氏 golden acceptance ([docs/apps/feng/acceptance-standard.md](../../docs/apps/feng/acceptance-standard.md)).

## R2 buckets

- `feng-maps` — raw Mapbox PNGs (keyed by SHA-1 of canonical render params)
- `feng-annotated` — annotated / street cache prefixes

## Secrets

```bash
cd services/svc-feng
bunx wrangler secret put MAPBOX_TOKEN
bunx wrangler secret put GEMINI_API_KEY
# optional: MAPILLARY_TOKEN for street 形煞
```

## Local dev

```bash
cd services/svc-feng
bun dev
bun test
```

## Caching

`/maps/render` keys are SHA-1 of canonicalized `{ lat, lng, zoom, width, height, mode, bearing, pitch }` (lat/lng rounded to 5 decimals).

Mapbox-specific code is isolated in `src/lib/mapbox.ts`.
