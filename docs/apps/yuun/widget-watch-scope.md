# Auspice (Yuun) — native Widget + Watch scope

Status: **P0–P5 scaffolding in repo.** Activate with prebuild + App Group on device — see [widget-build-runbook.md](./widget-build-runbook.md).

## SSOT

| Layer | Location |
|---|---|
| RN layout mock | `apps/auspice-app/components/WidgetCard.tsx` |
| RN write + 7-day window | `apps/auspice-app/lib/widget-bridge.ts` → `@zhop/widget-kit-ios` |
| Shared types | `packages/widget-kit-ios/src/types.ts` (`YuunWidgetData`) |
| Home + Lock Screen Swift | `apps/auspice-app/targets/widget/` |
| Watch complications | Scaffold: `docs/apps/yuun/watch-complication-scaffold/` (activate under `targets/watch` when watchOS target is validated) |
| Public 黄历 fallback | `targets/widget/AlmanacEngine.swift` (subset; not full astro-core) |

## Families

- Home: `systemSmall` / `systemMedium` / `systemLarge`
- Lock Screen: `accessoryCircular` / `accessoryRectangular`
- Watch: accessory circular / rectangular / corner (same App Group)

## Data

App Group `group.com.hexastral.yuun`. Envelope key `hexastral_widget_payload_v1`; legacy `almanac_days` mirrored for one release.

Pro `fit` is written only when `auspice_pro` is entitled. AlmanacEngine never invents fit.

## IAP

Free: public 黄历 on all sizes. Pro: 「对你而言」 line on medium / large / lock / watch rectangular.
