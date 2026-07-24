# Xingqi — physiognomy iOS app (形气)

Independent HexAstral satellite. Shell chrome inspired by Yuel (Sign-In, BirthForm,
Settings, Timeline density); product funnel is ADR-0028 three-source + dual IAP.

**Client brand:** Syel · `com.hexastral.syel` · scheme `syel`  
**API / RC opaque ids:** still `faceoracle` portfolio target + `faceoracle_*` SKUs.

See [ADR-0028](../../docs/decisions/0028-face-oracle-dual-track.md) and
[product.md](../../docs/apps/xingqi/product.md).

## Navigation

Root **Stack** (no bottom tabs) — same model as Kanyu / Yuel:

- Intro (tap to begin) → Home
- Funnel: consent → capture → birth → paywall (modal) → result as full-screen pushes
- Settings / Sign-in: stack pushes, not stacked sheets

## Dev

```bash
cd apps/xingqi-app
bunx expo start --dev-client -c
bun run typecheck
```

After first EAS project: replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.json` / `eas.json`.
