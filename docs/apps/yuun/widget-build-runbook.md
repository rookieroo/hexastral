# Auspice WidgetKit — build runbook

RN + native scaffold for Yuun home-screen / Lock Screen / Watch companion + complications.

## Architecture

- **App-level sync**: [`hooks/useYuunWidgetSync.ts`](../../apps/auspice-app/hooks/useYuunWidgetSync.ts) (RootLayout — AppState / locale / birth), not Home-only
- **RN write**: [`lib/widget-bridge.ts`](../../apps/auspice-app/lib/widget-bridge.ts) → `@zhop/widget-kit-ios` `writeWidgetPayload` → App Group `group.com.hexastral.yuun`
- **Watch provision**: [`lib/watch-provision.ts`](../../apps/auspice-app/lib/watch-provision.ts) mints `w1.*` via HMAC, writes `yuun_watch_preferences_v1` + `yuun_watch_credential`, then `syncWatchAppGroup`
- **Keys**: `hexastral_widget_payload_v1` (envelope) + legacy mirror `almanac_days` + Watch prefs / credential
- **iOS Widget**: [`targets/widget/`](../../apps/auspice-app/targets/widget/) — small / medium / large + accessory circular / rectangular; `AlmanacEngine.swift` fills public fields on cache miss
- **Watch**: [`targets/watch/`](../../apps/auspice-app/targets/watch/) (companion: Today / Browse / Settings) + [`targets/watch-widget/`](../../apps/auspice-app/targets/watch-widget/) (complications); same App Group. Folder order matters: `watch` before `watch-widget`.
- **API**: `POST /api/watch/credentials` (HMAC) · `POST /api/auspice/watch/bootstrap` (Watch Bearer). Requires D1 migration `0035_elite_jetstream.sql` (`watch_credentials`). **Do not** run `bun db:migrate:prod` without explicit approval.
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

5. Long-press home screen → add **Yuun 黄历** (small / medium / large). Lock Screen → add circular / rectangular. Open Yuun **once on any screen** so RootLayout syncs a multi-day window (Home is not required).

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
| [`targets/watch/`](../../apps/auspice-app/targets/watch/) | `watch` | `com.hexastral.yuun.watch` | Full companion (Today / Browse / Settings) |
| [`targets/watch-widget/`](../../apps/auspice-app/targets/watch-widget/) | `watch-widget` | `com.hexastral.yuun.watch.widget` | Complications · kind `YuunWatch` |

Same App Group as iPhone widget. See [widget-watch-scope.md](./widget-watch-scope.md) for WCSession + bootstrap Bearer.

```bash
cd apps/auspice-app
bunx expo prebuild -p ios --clean
# bun run ios:device installs the iPhone host (embeds Watch content) —
# deploy YuunWatchApp onto the paired Watch from Xcode for companion UI changes.
# watchOS Simulator or paired Watch → Edit Face → Complications → Yuun
```

**Watch changes look stale after a successful device build.** `bun run ios:device`
builds `Debug-watchos/YuunWatchApp.app` (complications nested in its `PlugIns/`) and
embeds it under `Yuun.app/Watch/`, but iOS only hands that payload to the paired Watch
opportunistically. Every target is pinned to `CURRENT_PROJECT_VERSION = 1` /
`MARKETING_VERSION = 0.1.0` by the targets plugin, so a rebuilt Watch App is
byte-different yet version-identical and the phone keeps the copy already on the Watch.
Verify, then push it yourself instead of waiting:

```bash
APP=$(echo ~/Library/Developer/Xcode/DerivedData/Yuun-*/Build/Products/Debug-watchos/YuunWatchApp.app)
WATCH=$(xcrun devicectl list devices | grep 'Apple Watch' | grep physical \
  | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')
xcrun devicectl device info apps --device "$WATCH" | grep yuun   # what the Watch runs now
xcrun devicectl device install app --device "$WATCH" "$APP"
xcrun devicectl device process launch --device "$WATCH" com.hexastral.yuun.watch
```

Launching once is what reloads the complications: the companion writes the App Group
payload and calls `WidgetCenter.reloadTimelines(ofKind: "YuunWatch")`. Complication
*layout* changes ride the new `YuunWatch.appex` binary, so already-placed slots update
in place — re-adding on the face is only needed when `supportedFamilies` gains a family.

**Apple Developer portal** — App Groups on:

- `com.hexastral.yuun`
- `com.hexastral.yuun.widget`
- `com.hexastral.yuun.watch`
- `com.hexastral.yuun.watch.widget`

First device build after adding Watch targets: use `bun run ios:device` (shim passes
`-allowProvisioningUpdates` so Xcode can create App IDs + profiles). Expo’s stock
`expo run:ios --device` skips that flag when `DEVELOPMENT_TEAM` is already in the
pbxproj, which is why you see “No profiles for …watch…”.

**Watch data path:**

1. Open Yuun on iPhone **once** (any screen, Watch nearby) → App Group write +
   WCSession push of envelope / prefs / credential.
2. Watch App can then refresh via `POST /api/auspice/watch/bootstrap` (Bearer in
   Keychain) without keeping the iPhone foreground.
3. Complications read the Watch-local App Group; date lookup must not use
   `days.first`. Offline floor = `AlmanacEngine` (no `fit`).

Empty `yuun_watch_credential` is a **tombstone** (revokes Watch Keychain). Missing
key on the phone must not clear Watch (widget sync may run before provision).

Alternatively open `ios/Yuun.xcworkspace` → YuunWatchApp / YuunWatch →
Signing & Capabilities → enable Automatic for team `L9Z47DW56X` once.

Historical scaffold (do not prebuild from here): [`watch-complication-scaffold/`](./watch-complication-scaffold/).

### Acceptance (Watch)

- [ ] `YuunWatchApp` + `YuunWatch` appear in Xcode after prebuild
- [ ] Companion shows Today / Browse / Settings (not sync-button-only)
- [ ] Complication gallery lists **Yuun**
- [ ] After opening iPhone Yuun once:
  - circular: moon + ganZhi (solar term on 节气当日)
  - corner: moon + curved ganZhi/term label
  - rectangular: ganZhi + 宜 two verbs + 忌 two verbs (Modular / Infograph Modular faces)
  - inline: 宜 one · 忌 one
- [ ] For you appears in Watch App Today (not in complications)
- [ ] Pull-to-refresh on Watch updates without iPhone foreground (credential present)
- [ ] `solarTerm` only on 节气当日 (empty otherwise)
- [ ] DEV moon phase slider reloads `YuunWatch` too
- [ ] Bundle IDs: host `….yuun.watch`, extension `….yuun.watch.widget` (prefix rule)
- [ ] Local D1 has `watch_credentials` (migration 0035); bootstrap returns `private, no-store`

Until Watch is signed + installed, Lock Screen accessories on the iPhone widget cover the glance use case.

**ASO / v1 launch:** do not claim Widget/Watch in store copy until this milestone is
explicitly released — keep [launch.md](./launch.md) / ASO parity scripts honest.

