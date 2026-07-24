# @zhop/feng-app — Fēng / 風

Flagship Expo app for the feng-shui product surface. Active V1 launch wave
(cycle / feng / yuan trio, ADR-0019). The analysis pipeline is live end-to-end:
real Mapbox satellite imagery, Gemini Vision (外巒頭), deterministic 玄空 + 八宅
compute (`@zhop/astro-core/feng`), and CF Workers AI synthesis (flagship tier:
Kimi → Qwen → GLM) — wired in `services/svc-feng/`.

See [docs/apps/feng/fix-plan.md](../../docs/apps/feng/fix-plan.md) for the current
fix/polish backlog and [ADR-0019](../../docs/decisions/0019-v1-wave-narrowed-cycle-feng-yuan.md)
for launch scope.

## Quick start

```sh
cd apps/feng-app
bun typecheck
bun ios       # or `bun dev` to use the Expo dev client over LAN
```

The app boots into the (tabs) home screen. If the user has no birth info on
their hexastral user row, `/api/feng/sites/:id/analyze` will still complete
but the 八宅 chapter will be replaced by a "missing birth profile" notice —
the report stays useful via the 玄空 + 外巒頭 chapters alone.

## Flow

```
First launch
  → AuthProvider registers POST /api/user (no HMAC)
  → FengClientProvider wires hexastral-client + HMAC signer
  → (tabs)/index renders empty state with "+ Add site" CTA

Add site
  → (new-site)/address    : geocode + name
  → (new-site)/facing     : satellite tile + compass facing
  → (new-site)/building   : build-year ladder, move-in year, floor
  → (new-site)/floorplan  : optional floor plan + north align + 中宫 pin
  → (new-site)/birth      : optional birth info (6th chapter)
  → (new-site)/review     : confirm → paywall (`hexastral_feng_single`) if needed
                           → POST /api/feng/sites + analyze
                           → (report)/[siteId] (poll job)
                           → chat: unlimited follow-ups bundled with purchase
```

## Manual setup pending

```sh
cd apps/feng-app
eas init                                     # paste projectId into app.json + eas.json
# Apple Developer → register com.hexastral.kanyu
# RevenueCat → hexastral_feng_single (one-shot report + bundled chat)
# Designer → assets/{icon,splash}.png (see assets/README.md)
```
