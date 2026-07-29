# Auspice WidgetKit — build runbook

RN + native scaffold for Yuun home-screen / Lock Screen / Watch complications.

## Architecture

- **RN write**: [`lib/widget-bridge.ts`](../../apps/auspice-app/lib/widget-bridge.ts) → `@zhop/widget-kit-ios` `writeWidgetPayload` → App Group `group.com.hexastral.yuun`
- **Keys**: `hexastral_widget_payload_v1` (envelope) + legacy mirror `almanac_days`
- **iOS Widget**: [`targets/widget/`](../../apps/auspice-app/targets/widget/) — small / medium / large + accessory circular / rectangular; `AlmanacEngine.swift` fills public fields on cache miss
- **Watch**: [`targets/watch/`](../../apps/auspice-app/targets/watch/) (companion app) + [`targets/watch-widget/`](../../apps/auspice-app/targets/watch-widget/) (complications); same App Group. Folder order matters: `watch` before `watch-widget`.
- **Xcode targets**: `@bacons/apple-targets` on prebuild
- **Entitlements helper**: `@zhop/widget-kit-ios/plugin`

## One-time setup

1. Deps (already in package.json after install):
   ```bash
   cd apps/auspice-app
   bun add @bacons/apple-targets react-native-shared-group-preferences '@zhop/widget-kit-ios@workspace:*'
   ```

2. Plugins in `app.json`: `@bacons/apple-targets` + `@zhop/widget-kit-ios/plugin` (appSlug `yuun`, group `group.com.hexastral.yuun`).

3. **Apple Developer portal** — App Groups capability on:
   - `com.hexastral.yuun`
   - `com.hexastral.yuun.widget`
   - `com.hexastral.yuun.watch`
- `com.hexastral.yuun.watch.widget`
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
- Gallery name/description follow App Group locale (fallback: device language): en → "Yuun Almanac" / English blurb; not hardcoded 黄历.
- Lock Screen rectangular shows **both** 宜 and 忌 (short verbs); circular stays 月相 + 干支.
- Shape parity: `YuunWidgetDay` (TS) ↔ `SharedDay` (Swift).
- Plain App Group keys `yuun_widget_locale` / `yuun_widget_tip_label` back chrome if envelope decode drifts.
- `prebuild --clean` regenerates targets from `targets/*` — do not treat hand-edited `ios/` as SSOT.
- Moon phase in extension is SwiftUI geometry, not Skia.
- Bundle id of the extension is `com.hexastral.yuun.widget` (not `….AuspiceWidget`).
  App Group must be on both App IDs in the Developer portal.

## Watch

Requires **both** Apple targets (bacons):

| Path | Type | Bundle | Kind / product |
|---|---|---|---|
| [`targets/watch/`](../../apps/auspice-app/targets/watch/) | `watch` | `com.hexastral.yuun.watch` | Companion stub (hosts extension) |
| [`targets/watch-widget/`](../../apps/auspice-app/targets/watch-widget/) | `watch-widget` | `com.hexastral.yuun.watch.widget` | Complications · kind `YuunWatch` |

Same App Group as iPhone widget. Open Yuun on iPhone once so the envelope is written; Watch reads it (no Metro on watchOS).

```bash
cd apps/auspice-app
bunx expo prebuild -p ios --clean
# Build/run iPhone scheme (embeds Watch Content) or select YuunWatchApp in Xcode
# watchOS Simulator or paired Watch → Edit Face → Complications → Yuun
```

**Apple Developer portal** — App Groups on:

- `com.hexastral.yuun`
- `com.hexastral.yuun.widget`
- `com.hexastral.yuun.watch`
- `com.hexastral.yuun.watch.widget`

First device build after adding Watch targets: use `bun run ios:device` (shim passes
`-allowProvisioningUpdates` so Xcode can create App IDs + profiles). Expo’s stock
`expo run:ios --device` skips that flag when `DEVELOPMENT_TEAM` is already in the
pbxproj, which is why you see “No profiles for …watch…”.

**Watch data path:** iPhone App Group does **not** sync to Watch. After each
widget write, `@zhop/widget-kit-ios` pushes keys via **WatchConnectivity**;
`YuunWatchApp` writes the Watch-local App Group and reloads complications.
Open Yuun home on iPhone once (with Watch nearby) after installing.

Alternatively open `ios/Yuun.xcworkspace` → YuunWatchApp / YuunWatch →
Signing & Capabilities → enable Automatic for team `L9Z47DW56X` once.

Historical scaffold (do not prebuild from here): [`watch-complication-scaffold/`](./watch-complication-scaffold/).

### Acceptance (Watch)

- [ ] `YuunWatchApp` + `YuunWatch` appear in Xcode after prebuild
- [ ] Complication gallery lists **Yuun**
- [ ] After opening iPhone Yuun: circular shows 月相 + 干支; rectangular shows 干支 + 宜/对你
- [ ] `solarTerm` only on 节气当日 (empty otherwise)
- [ ] DEV moon phase slider reloads `YuunWatch` too
- [ ] Bundle IDs: host `….yuun.watch`, extension `….yuun.watch.widget` (prefix rule)

Until Watch is signed + installed, Lock Screen accessories on the iPhone widget cover the glance use case.

