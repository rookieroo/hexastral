# fate-app (命 · 八字 + 紫微)

Tier-3 ASO funnel satellite. Pure personal-fate reading — 八字 four-pillar + 紫微 12-palace.
Replaces the retired omnibus `hexastral-app`'s natal surface. **No auth, no IAP.**

- Positioning + KPIs (acquisition / birth-chart capture / funnel — **not** DAU) and the full
  build/drop plan: [docs/phase-k-plan.md](../../docs/phase-k-plan.md) §0.1.1 + K.1.
- Funnels to Kindred / Fēng via the dynamic discovery endpoint (K.2, `source='fate'`).
- The 命理 line's daily-active lives in **Cycle** (黄历 + 对你而言), fed by the chart this app
  captures into portfolio memory — not here.

## Status

K.1.1 scaffold only — bootable shell wired to `usePortfolioSatelliteBootstrap`. The 八字/紫微
reading, birth-form, report, and funnel surfaces land in K.1.2–K.1.4 (harvested from the
retired hexastral-app).

## Local steps still required

- `eas init` → replace `REPLACE_WITH_FATE_EAS_PROJECT_ID` in `app.json` + `eas.json`.
- Add `assets/icon.png` + `assets/splash.png` (designer brief).
- `bun install` from the repo root before `bun --filter @zhop/fate-app dev`.

## Dev

```
bun install                       # from repo root
bun --filter @zhop/fate-app dev
```
