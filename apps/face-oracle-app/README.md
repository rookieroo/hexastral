# Face Oracle (`face-oracle-app`)

Independent satellite for face + dual-palm physiognomy with birth contrast.

**Product:** [docs/apps/face-oracle/product.md](../../docs/apps/face-oracle/product.md) · **ADR:** [docs/decisions/0028-face-oracle-dual-track.md](../../docs/decisions/0028-face-oracle-dual-track.md)

## Funnel

1. Biometric consent  
2. Three photos: left palm → right palm → face  
3. Birth Form  
4. Paywall: `faceoracle_reading` (≥ $9.99) **or** `faceoracle_pro_*`  
5. Reading → result / Timeline; Pro schedules local event + recapture reminders  

## Commands

```bash
cd apps/face-oracle-app
bunx expo start
# native modules:
npx expo install expo-notifications
```

## SKUs

| Product | Role |
|---|---|
| `faceoracle_reading` | One-shot consumable |
| `faceoracle_pro_monthly` / `_annual` | Timeline + 6 photo slots / UTC month |
