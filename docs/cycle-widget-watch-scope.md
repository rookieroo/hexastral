# Auspice (cycle) — native Widget + Watch scope

Status: **spec/preview done in RN; native targets ~0% (not shippable yet).** This
doc scopes the native work to turn the RN mockups into real home-screen widgets
and a watch face/complication.

## What exists today (the easy 30%)

All in `apps/cycle-app` (RN), reusable as the **visual + data spec**:

- `components/DailyCard.tsx` — 4 watch-face templates (modern / lunar / almanac /
  ancient) from one `buildDailyCardModel(date, day, …)`.
- `components/WidgetCard.tsx` — small / medium / large widget layouts.
- `components/StaticMoon.tsx` + core-ui `MoonPhaseLoader` — Skia 月相.
- `lib/widget-config.ts` — persisted template + 月相 skin (the config UI lives in
  `/display`).
- `DevWidgetPreview` — mock-data harness.

**These render inside the RN app only.** iOS home-screen widgets and watch faces
**cannot** be RN — they MUST be native SwiftUI (WidgetKit / watchOS). So the RN
`WidgetCard`/`DailyCard` are a faithful **mockup**, not a functional widget.

## The 70% that's missing

### A. Data bridge (do this first — both targets depend on it)
The native widget/watch need each day's 黄历 (干支 / 宜忌 / 节气 / 月相 phase / 对你而言).
Two options:

1. **App Group shared container (recommended for v1).** The RN app already fetches
   `/api/cycle/day`; on refresh it writes the next N days (e.g. 7–30) of
   `DailyCardModel`-shaped JSON into an App Group (`group.com.hexastral.cycle`)
   `UserDefaults`/file. The widget/watch read that container — **no Swift port of
   the engine, no network in the extension.** WidgetKit `TimelineProvider`
   produces one entry per day from the cached array. Personalization (对你而言)
   comes along for free since the RN app already has the birth info.
   - Cost: a small `react-native` ↔ App Group bridge (write JSON) + the Swift read.
   - Limit: widget only as fresh as the last app open + WidgetKit's own refresh
     budget. Fine for a daily almanac (the data changes once/day).

2. **Port the deterministic engine to Swift.** `astro-core`'s 干支/节气/宜忌 math in
   Swift so the extension computes offline with no app dependency.
   - Cost: high (re-implement + golden-test parity vs astro-core). 
   - Benefit: widget works even if the app is never opened.
   - **Defer** — option 1 ships far faster; revisit only if refresh-on-open proves
     insufficient in the field.

### B. WidgetKit target (iOS home + lock screen)
- New Xcode **Widget Extension** target (SwiftUI). Expo: add via a config plugin
  (e.g. `@bacons/apple-targets` or a hand-rolled plugin) so `expo prebuild`
  regenerates it — otherwise the target is lost on every prebuild.
- Families: `systemSmall` / `systemMedium` / `systemLarge` (mirror `WidgetCard`) +
  optional `accessoryRectangular`/`accessoryCircular` lock-screen.
- `TimelineProvider` reads the App Group array → one entry/day, `.atEnd` policy
  (or refresh at local midnight).
- Render the same ink-on-dark design (the widget canvas is hardcoded dark — it does
  NOT follow light mode, matching the in-app preview decision).
- Skia isn't available in the extension → the 月相 is a **static SwiftUI/Canvas
  draw** (or a pre-rendered asset per phase, 30 frames) rather than the live Skia
  shader. Acceptable (widgets are static snapshots anyway).

### C. watchOS target
- New **watchOS app + Widget Extension** (complications use WidgetKit on watchOS 9+).
- Complication families: `.accessoryCircular` (月相 + 干支), `.accessoryRectangular`
  (干支 + 宜/忌 line), `.accessoryCorner`.
- Same App Group bridge (the paired iPhone app writes; the watch reads via its own
  App Group or WatchConnectivity transfer).
- A full watch-face "app" (the rich almanac face) is a bigger lift — start with
  complications, which are the high-value daily-glance surface.

## IAP / Pro gating
- Free faces: `modern` / `lunar`. Pro faces: `almanac` / `ancient` + the **对你而言**
  line on any face. The extension reads the `cycle_pro` entitlement from the shared
  App Group (the RN app writes it on entitlement change) and downgrades to a free
  face if not Pro. This makes the widget/watch a **visible Pro upsell** on the home
  screen.

## Effort estimate (native dev)
| Piece | Estimate |
|---|---|
| App Group bridge (RN write + plugin) | 2–3 d |
| WidgetKit extension (3 sizes + timeline) | 1–1.5 wk |
| watchOS complications | 1–1.5 wk |
| Pro gating + 月相 assets + polish | 3–4 d |
| **Total** | **~3–4 weeks** of Swift/Xcode |

## Sequencing recommendation
1. App Group bridge + WidgetKit `systemSmall`/`Medium` (fastest visible win; the
   home-screen widget is the bigger acquisition surface than the watch).
2. `systemLarge` + lock-screen accessories.
3. watchOS complications.
4. Rich watch face (optional, IAP showcase).

Do NOT block the v1 App Store submission on this — ship the app (calendar +
push + 对你而言) first; widget/watch is a fast-follow that strengthens retention
and the Pro story.
