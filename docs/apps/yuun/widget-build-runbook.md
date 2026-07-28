# Auspice WidgetKit — build runbook

RN + native scaffold for Yuun home-screen / Lock Screen / Watch complications.

## Architecture

- **RN write**: [`lib/widget-bridge.ts`](../../apps/auspice-app/lib/widget-bridge.ts) → `@zhop/widget-kit-ios` `writeWidgetPayload` → App Group `group.com.hexastral.yuun`
- **Keys**: `hexastral_widget_payload_v1` (envelope) + legacy mirror `almanac_days`
- **iOS Widget**: [`targets/widget/`](../../apps/auspice-app/targets/widget/) — small / medium / large + accessory circular / rectangular; `AlmanacEngine.swift` fills public fields on cache miss
- **Watch**: [`targets/watch/`](../../apps/auspice-app/targets/watch/) — complications reading the same group
- **Xcode targets**: `@bacons/apple-targets` on prebuild
- **Entitlements helper**: `@zhop/widget-kit-ios/plugin`

## One-time setup

1. Deps (already in package.json after install):
   ```bash
   cd apps/auspice-app
   bun add @bacons/apple-targets react-native-shared-group-preferences '@zhop/widget-kit-ios@workspace:*'
   ```

2. Plugins in `app.json`: `@bacons/apple-targets` + `@zhop/widget-kit-ios/plugin` (appSlug `yuun`, group `group.com.hexastral.yuun`).

3. **Apple Developer portal** — App Groups capability on BOTH:
   - `com.hexastral.yuun`
   - `com.hexastral.yuun.widget` (and Watch target if generated)
   - Group id must be exactly `group.com.hexastral.yuun`

4. Prebuild + run:
   ```bash
   cd apps/auspice-app
   bunx expo prebuild -p ios --clean
   bun run ios
   ```

5. Long-press home screen → add **Yuun 黄历** (small / medium / large). Lock Screen → add circular / rectangular. Open the app once so Today syncs a 7-day window.

## Acceptance checklist

- [ ] Widget appears in the gallery as **Yuun 黄历**
- [ ] After opening App once: 干支 / 宜忌 visible on small + medium
- [ ] Kill app: cached day still shows
- [ ] Large shows officer / mansion when payload includes them
- [ ] Lock Screen accessories show 干支
- [ ] `__DEV__` / Settings → 桌面组件与表盘: RN `WidgetCard` small/medium/large match field content
- [ ] Pro: medium/large/lock show「对你而言」; Free: `fit` null
- [ ] Cold start with empty App Group: AlmanacEngine still shows a public 干支 day (no fit)

## Gotchas

- **Xcode 16+ Debug gallery blank**: Widget targets must set `ENABLE_DEBUG_DYLIB=NO`
  (plugin `plugins/withWidgetDisableDebugDylib.cjs`). Otherwise the extension ships
  as `*.debug.dylib` and never appears in 添加小组件 search. Release/EAS builds are fine.
- Gallery search: host app name **Yuun** (not “小组件”). On iOS 18+ also try long-press
  the Yuun icon → widget / edit options.
- Native module: `NativeModules.RNSharedGroupPreferences`. If the name differs, adjust `packages/widget-kit-ios/src/useWidgetSync.ts`.
- Shape parity: `YuunWidgetDay` (TS) ↔ `SharedDay` (Swift).
- `prebuild --clean` regenerates targets from `targets/*` — do not treat hand-edited `ios/` as SSOT.
- Moon phase in extension is SwiftUI geometry, not Skia.
- Bundle id of the extension is `com.hexastral.yuun.widget` (not `….AuspiceWidget`).
  App Group must be on both App IDs in the Developer portal.

## Watch (P3)

Scaffold Swift lives at [`docs/apps/yuun/watch-complication-scaffold/`](./watch-complication-scaffold/)
(not under `targets/` — apple-targets would otherwise attach a broken iOS-flavoured
Watch target). To activate: copy into `targets/watch/` with a correct watchOS
`expo-target.config.js`, then `bunx expo prebuild -p ios --clean`.

Until then, Lock Screen accessories on the iPhone widget cover the glance use case.

