# Watch complication scaffold (not wired into prebuild)

Swift sources for Yuun Apple Watch complications. Kept **outside**
`apps/auspice-app/targets/` so `@bacons/apple-targets` does not attach a
misconfigured iOS-flavoured Watch target (see widget-build-runbook).

## Activate later

1. Copy this folder to `apps/auspice-app/targets/watch/`
2. Ensure `expo-target.config.js` uses a watchOS-capable type / deployment target
   validated against current `@bacons/apple-targets` docs
3. `bunx expo prebuild -p ios --clean`
4. Build the Watch scheme on a watchOS simulator / paired device
