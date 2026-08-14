# Yuun — Android home widgets runbook

Home-screen Glance widgets (small / medium / large), aligned with iOS
`systemSmall` / `Medium` / `Large`. **Not** Lock Screen / Wear.

## Stack

| Layer | Location |
| --- | --- |
| RN sync | [`lib/widget-bridge.ts`](../../apps/auspice-app/lib/widget-bridge.ts) → `writeAndroidWidgetPayload` |
| Package | [`packages/widget-kit-android`](../../packages/widget-kit-android) |
| **Layout SSOT** | [`lib/widget-spec.json`](../../apps/auspice-app/lib/widget-spec.json) → generated `WidgetSpec.kt` (`bun run widget-spec:gen`; preflight runs `widget-spec:check`) — Glance, WidgetKit and the RN preview all read the same numbers |
| Prefs | `yuun_widget_prefs` / key `hexastral_widget_payload_v1` (same JSON as iOS) |
| Glance | `YuunGlanceAppWidget` + `YuunWidgetReceiver` |

The widget **never** calls the API. Open the app once to populate
(`useYuunWidgetSync` on iOS **and** Android → `widget-bridge` dual-write).

## Prebuild / run

```bash
cd apps/auspice-app
bun install
bunx expo prebuild --platform android
bunx expo run:android
```

Confirm `app.json` includes `@zhop/widget-kit-android/app.plugin.js`.

## Find it in the picker

Android exposes **one** resizable Glance widget. Layouts track live cell size
(`SizeMode.Exact`): ~2×2 Small / ~4×2 Medium / ~4×4 Large, aligned with iOS
`systemSmall` / `Medium` / `Large` content (For you + tip on Large only).

Moon phase uses Unicode glyphs (not iOS PNG logos) until asset packaging lands.

1. Long-press Home → **Widgets** (or Apps → long-press Yuun → Widgets).
2. Search **Yuun** / **黄历** / **Almanac** (label is locale-aware).
3. Drag onto Home; resize for medium/large layouts.

Verify the provider is installed (not just that Gradle succeeded):

```bash
adb shell dumpsys package com.hexastral.yuun | grep APPWIDGET_UPDATE
adb shell dumpsys appwidget | grep YuunWidgetReceiver
```

Both must mention `YuunWidgetReceiver`. If missing: uninstall/reinstall the APK (a failed `adb install` after a successful assemble leaves an old package without widgets).

### Xiaomi / Redmi / HyperOS

Third-party (Android) widgets are **not** in the top-level search. Typical path:

1. Long-press Home → **微件 / Widgets**
2. Scroll to **有微件的应用 / Apps with widget support** → **全部 / All**
3. Open **Android 微件 / Android widgets** (small text — easy to miss)
4. Find **Yuun 黄历 / Yuun Almanac** there

Also: open Yuun once after install; use a **dev-client / `run:android` APK**, not Expo Go. Wi‑Fi vs USB install does not change widget registration.

## Device matrix

1. Cold install → add **Yuun Almanac / Yuun 黄历** → empty / “open to sync” chrome  
2. Open app (any screen) → widget shows today’s public 黄历  
3. Add birth → medium/large show For you when payload includes `fit`  
4. Change locale / 宜忌 mode → return to foreground → widget refreshes  
5. Tap widget → launches Yuun  
6. Force-stop app → widget still shows last payload  

## ASO

Play listing may claim home widgets (S/M/L). Do **not** claim Lock Screen or Watch on Android. Copy: `aso-metadata.json` → `googlePlay`.
