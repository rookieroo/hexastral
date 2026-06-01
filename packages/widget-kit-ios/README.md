# @zhop/widget-kit-ios

iOS WidgetKit + WatchKit infrastructure for HexAstral satellite apps.

Cross-app shared package per ADR-0015 Doctrine v2 §"Daily-utility lock-in" and
cycle Sprint 1 deliverable. Used by cycle, feng, yuan v2 (not MingPan — tool
apps have no widget).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Native (JS)                       │
│                                                          │
│   useWidgetSync(slug, locale, data)  ──┐                 │
│   writeWidgetPayload(slug, data)       │                 │
│                                         ▼                │
│                              react-native-app-group     │
│                              -bridge (native bridge)    │
└─────────────────────────────────────────┬────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────┐
│                 App Group UserDefaults                   │
│       group.com.hexastral.shared.{appSlug}              │
│       Key: hexastral_widget_payload_v1                  │
│       Value: JSON (WidgetSyncPayload<TData>)            │
└─────────────────────────────────────────┬────────────────┘
                                          │ (read)
                                          ▼
┌─────────────────────────────────────────────────────────┐
│           iOS WidgetExtension (Swift)                    │
│                                                          │
│   HexastralProvider: TimelineProvider                    │
│      → reads payload from App Group                      │
│      → generates Timeline entries (1 per 4h)             │
│                                                          │
│   Widget families:                                       │
│      Small (158x158)   — 干支 + 节气 countdown           │
│      Medium (338x158)  — + 今日宜                        │
│      Lock-Screen (160x76) — + 家庭事件                   │
└──────────────────────────────────────────────────────────┘
```

## Status (2026-05-31)

| Component | State |
|---|---|
| TS types (WidgetSyncPayload, AppSlug, per-app data) | ✅ Sprint 1 complete |
| RN-side useWidgetSync hook | ✅ Sprint 1 complete (with AsyncStorage fallback) |
| Expo config plugin (props validation + log) | ✅ Sprint 1 complete |
| Native bridge module (`react-native-app-group-bridge`) | ⏳ Sprint 5 (Swift native code) |
| Plugin Xcode mutation (withXcodeProject) | ⏳ Sprint 5 |
| Swift Widget templates | ✅ Sprint 1 (template files; integrated Sprint 5) |
| Apple Watch complication (modular small) | ⏳ Sprint 5 |

## Usage (Sprint 5 final form)

### 1. Install in your app

In your app's `app.json`:

```jsonc
{
  "expo": {
    "plugins": [
      [
        "@zhop/widget-kit-ios/plugin",
        {
          "widgetName": "CycleWidget",
          "appSlug": "cycle",
          "appGroupId": "group.com.hexastral.shared.cycle",
          "watchComplication": true
        }
      ]
    ]
  }
}
```

Then `expo prebuild --clean` to generate the Xcode targets.

### 2. Wire data on the RN side

In your top-level component (e.g. cycle's Today tab):

```tsx
import { useWidgetSync, type CycleWidgetData } from '@zhop/widget-kit-ios'

function TodayTab() {
  const { ganZhi, lunarDate, nextSolarTerm } = useCycleData()
  const { upcomingFamilyEvent } = useFamilyEvents()

  const widgetData: CycleWidgetData = {
    ganZhi,
    lunarDate,
    nextSolarTermName: nextSolarTerm.name,
    nextSolarTermDays: nextSolarTerm.daysAway,
    todayYi: getFirstYi(),
    nextFamilyEventLabel: upcomingFamilyEvent?.label,
    nextFamilyEventDays: upcomingFamilyEvent?.daysAway,
  }

  useWidgetSync('cycle', currentLocale, widgetData)

  return <TodayContent />
}
```

### 3. Imperative writes (e.g. from push handler)

```tsx
import { writeWidgetPayload } from '@zhop/widget-kit-ios'

// e.g. after push notification updates data
await writeWidgetPayload('cycle', 'zh-Hans', updatedData)
```

## Data contract

All widget data flows through `WidgetSyncPayload<TData>`:

```ts
interface WidgetSyncPayload<TData> {
  updatedAt: string           // ISO timestamp
  appSlug: AppSlug             // 'cycle' | 'feng' | 'yuan' | 'mingpan'
  locale: WidgetLocale         // 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'
  data: TData                  // app-specific
  freshUntil?: string          // ISO timestamp for next refresh
}
```

Per-app data shapes are exported from `./types`:
- `CycleWidgetData` — 干支, 农历, 节气, 家庭事件
- `FengWidgetData` — 流月飞星, 房间提示, 节气维护
- `YuanWidgetData` — 双盘 fit, 1-line, 周年倒计时

## Apple Watch complication (Sprint 5)

When `watchComplication: true` is passed to the config plugin, an additional
WatchKit ClockKit target is generated. It reads the same App Group data and
renders a modular small complication.

## Privacy

- Widget payload is stored in App Group UserDefaults (sandboxed to your bundle's
  app + extensions only)
- No data leaves the device
- iCloud sync of App Group UserDefaults is OFF by default (we use our own
  sync via hexastral-api)

## Sprint roadmap

- **Sprint 1 (current)**: TS types, RN hook with AsyncStorage fallback, plugin shell, Swift templates
- **Sprint 5 (cycle ship)**: native bridge module, Xcode mutation in plugin, Swift compile, on-device testing
- **Feng + Yuan adoption (W2 + W3)**: drop-in usage of useWidgetSync with FengWidgetData / YuanWidgetData
- **V1.5 expansion**: Coincast adds hexagram widget, FaceRead adds face-stats widget, DreamRead adds dream-pattern widget

## References

- ADR-0015 §"Daily-utility lock-in" (mandatory widget × 3 + watch per Doctrine v2)
- `docs/sprints/cycle-sprint-plan.md` Sprint 1 + Sprint 5
- `docs/sprints/feng-yuan-mingpan-sprint-plan.md`
- WidgetKit docs: https://developer.apple.com/documentation/widgetkit
- App Groups: https://developer.apple.com/documentation/xcode/configuring-app-groups
