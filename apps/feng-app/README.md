# @zhop/feng-app — Fēng / 風

Flagship Expo app for the feng-shui product surface. Active V1 launch wave
(cycle / feng / yuan trio, ADR-0019). The analysis pipeline is live end-to-end:
real Mapbox satellite imagery, Gemini Vision (外巒頭), deterministic 玄空 + 八宅
compute (`@zhop/astro-core/feng`), and CF Workers AI synthesis (flagship tier:
Kimi → Qwen → GLM) — wired in `services/svc-feng/`.

See [docs/feng-fix-plan.md](../../docs/feng-fix-plan.md) for the current
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
  → (new-site)/address    : Mapbox-backed search + drop pin
  → (new-site)/facing     : satellite tile + drag-arrow FacingCalibrator
  → (new-site)/building   : build-year ladder, move-in year, floor
  → (new-site)/review     : confirm → POST /api/feng/sites + analyze
                           → poll /api/feng/jobs/:id
                           → on done, route to (report)/[siteId]
```

## Manual setup pending

```sh
cd apps/feng-app
eas init                                     # paste projectId into app.json + eas.json
# Apple Developer → register com.hexastral.feng
# RevenueCat → hexastral_feng_site / pro_monthly / pro_annual / annual_refresh
# Designer → assets/{icon,splash}.png (see assets/README.md)
```
