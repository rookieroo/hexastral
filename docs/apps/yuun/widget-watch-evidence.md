# Yuun Widget / Watch — device evidence checklist

Use with a **production** (or TestFlight production-signed) build. Source presence alone is not enough for Go.

## Archive

- [ ] Archive embeds `AuspiceWidget` (Home + Lock)
- [ ] Archive embeds `YuunWatchApp` (or current watch target name)
- [ ] Archive embeds watch complications (`watch-widget`)
- [ ] App Group `group.com.hexastral.yuun` on App + extensions
- [ ] Deployment targets: App 15.1 · Widget 17.0 · watchOS 10+
- [ ] Icons / complications assets non-placeholder

## Device matrix

- [ ] Fresh install: add Home widget before opening app → public 黄历 floor
- [ ] Open app once → widget refreshes with synced window
- [ ] Lock Screen accessory families
- [ ] Birth on device → For you line on widget
- [ ] Paired Watch via WatchConnectivity (phone reachable)
- [ ] Watch while phone unreachable (signed-in credential path)
- [ ] Cross midnight refresh
- [ ] Locale + yiji mode change rewrites payload
- [ ] Birth update / account delete clears personal lines
- [ ] Complications: circular / rectangular / corner / inline

## Gate

All boxes checked → keep ASO Widget/Watch claims.  
Any failure → strip ASO + screenshots before submit ([launch.md](./launch.md)).
