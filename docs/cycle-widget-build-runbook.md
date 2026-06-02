# Auspice WidgetKit — build runbook (activate the scaffold)

The RN-side scaffold is in the repo and tsc-green / non-breaking:
- `targets/widget/index.swift` — the SwiftUI WidgetKit widget (small + medium).
- `targets/widget/expo-target.config.js` — target config for `@bacons/apple-targets`.
- `lib/widget-bridge.ts` — writes the day into the App Group (no-ops until linked).
- `app/(tabs)/index.tsx` — calls `syncTodayWidget(...)` whenever the day loads.
- `app.json` → `ios.entitlements` declares the `group.com.hexastral.cycle` App Group.

Until the steps below run, `lib/widget-bridge.ts` is a no-op (it talks to
`NativeModules.RNSharedGroupPreferences`, which is absent). The app builds + runs
exactly as before. **These steps require Xcode + a native rebuild — do them on the
dev machine; CI does not build native.**

## Steps

1. **Install the native deps** (don't pin versions here — let bun resolve):
   ```bash
   cd apps/auspice-app
   bun add @bacons/apple-targets react-native-shared-group-preferences
   ```
   - `@bacons/apple-targets` — config plugin that adds the Widget Extension target.
   - `react-native-shared-group-preferences` — registers the native module the
     bridge writes through (`NativeModules.RNSharedGroupPreferences`).

2. **Enable the config plugin** — add to `app.json` → `expo.plugins`:
   ```json
   "plugins": ["expo-router", "expo-dev-client", "expo-notifications", "@bacons/apple-targets"]
   ```
   (Left OUT of the repo on purpose: adding it before step 1 breaks `expo start`,
   since the plugin module isn't resolvable yet.)

3. **Apple Developer portal** — enable the **App Groups** capability and create
   `group.com.hexastral.cycle` for BOTH bundle ids:
   - `com.hexastral.cycle` (main app)
   - `com.hexastral.cycle.AuspiceWidget` (the widget — created by the plugin)

4. **Prebuild** (regenerates `ios/` with the widget target + entitlements):
   ```bash
   npx expo prebuild -p ios --clean
   ```

5. **Build + run** the app (`bun ios` / Xcode). Then:
   - Long-press the home screen → add the **Auspice 黄历** widget (small / medium).
   - Open the app once (writes today's 黄历 to the App Group) → the widget fills in.

## Verify / gotchas
- **Native module name:** the bridge reads `NativeModules.RNSharedGroupPreferences`.
  If `react-native-shared-group-preferences` registers under a different name,
  adjust the const in `lib/widget-bridge.ts`. (Alternatively, write a tiny local
  Expo module that does `UserDefaults(suiteName:).set(_, forKey:)` — no external dep.)
- **Shape parity:** `WidgetDay` (TS) must match `SharedDay` (Swift). Keep them in sync.
- **Encoding:** the bridge stores a JSON **string** under `almanac_days`; the Swift
  reads `defaults.string(forKey:)`. If the native module stores objects instead of
  strings, decode accordingly.
- **月相** in the widget is a simple SwiftUI dot, not the app's Skia shader (Skia
  isn't available in extensions). Swap for a per-phase asset or a SwiftUI Canvas
  draw when polishing.

## Follow-ups (per docs/cycle-widget-watch-scope.md)
- Write an **N-day window** (batch fetch), not just today, so the WidgetKit timeline
  spans several days between app opens.
- Mirror the **auspice_pro entitlement** into the App Group so the widget can show the
  Pro 对你而言 line / Pro faces and downgrade gracefully for free users.
- **watchOS complications** — a second `@bacons/apple-targets` target reading the
  same App Group.
- `systemLarge` + lock-screen `accessory*` families.
