# @zhop/widget-kit-android

Android **Glance** home-screen widgets for HexAstral satellite apps (Yuun first).

## Contract

Same JSON envelope as iOS (`hexastral_widget_payload_v1` / `YuunWidgetData`).
RN writes via `writeAndroidWidgetPayload`; the widget **never** calls the API.

| Density | Android grid (approx) | iOS family |
| --- | --- | --- |
| Small | 2×2 | `systemSmall` |
| Medium | 4×2 | `systemMedium` |
| Large | 4×4 | `systemLarge` |

Empty state until the app has synced once (“Open Yuun to sync”).

## Usage (Yuun)

```jsonc
// app.json plugins
["@zhop/widget-kit-android/app.plugin.js", {
  "widgetName": "Yuun",
  "appSlug": "yuun"
}]
```

```ts
import { writeAndroidWidgetPayload } from '@zhop/widget-kit-android'
// usually via apps/auspice-app/lib/widget-bridge.ts dual-write
```

After adding the dependency: `bun install`, then `bunx expo prebuild --platform android` (or `expo run:android`).

See `docs/apps/yuun/android-widget-runbook.md`.
