# Yuun — Android home widgets runbook

Home-screen Glance widgets (small / medium / large), aligned with iOS
`systemSmall` / `Medium` / `Large`. **Not** Lock Screen / Wear.

## Stack

| Layer | Location |
| --- | --- |
| RN sync | [`lib/widget-bridge.ts`](../../apps/auspice-app/lib/widget-bridge.ts) → `writeAndroidWidgetPayload` |
| Package | [`packages/widget-kit-android`](../../packages/widget-kit-android) |
| Prefs | `yuun_widget_prefs` / key `hexastral_widget_payload_v1` (same JSON as iOS) |
| Glance | `YuunGlanceAppWidget` + `YuunWidgetReceiver` |

The widget **never** calls the API. Open the app once to populate.

## Prebuild / run

```bash
cd apps/auspice-app
bun install
bunx expo prebuild --platform android
bunx expo run:android
```

Confirm `app.json` includes `@zhop/widget-kit-android/app.plugin.js`.

## Device matrix

1. Cold install → add **Yuun** widget → empty / “open to sync” chrome  
2. Open app (any screen) → widget shows today’s public 黄历  
3. Add birth → medium/large show For you when payload includes `fit`  
4. Change locale / 宜忌 mode → return to foreground → widget refreshes  
5. Tap widget → launches Yuun  
6. Force-stop app → widget still shows last payload  

## ASO

Play listing may claim home widgets (S/M/L). Do **not** claim Lock Screen or Watch on Android. Copy: `aso-metadata.json` → `googlePlay`.
