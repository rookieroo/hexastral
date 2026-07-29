# Watch complication scaffold (superseded)

**Live sources are now under** [`apps/auspice-app/targets/`](../../../apps/auspice-app/targets/):

| Folder | bacons type | Role |
|---|---|---|
| `targets/watch/` | `watch` | Minimal companion Watch App (required host; must sort before watch-widget) |
| `targets/watch-widget/` | `watch-widget` | WidgetKit complications (circular / rectangular / corner / inline) |

This folder is kept only as historical reference. Prefer editing the live targets.

## Activate / rebuild

```bash
cd apps/auspice-app
bunx expo prebuild -p ios --clean
# Xcode: build YuunWatchApp (or run iPhone scheme — embeds Watch content)
# Pair Watch / watchOS Simulator → Edit Face → add Yuun complication
```

See [widget-build-runbook.md](./widget-build-runbook.md) § Watch.
