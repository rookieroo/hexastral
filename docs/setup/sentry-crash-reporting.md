# Sentry Crash Reporting · Setup

> **Status**: wrapper shipped (P0-7). This doc covers the per-app install +
> EAS source-map upload hook that turn the wrapper into actual crash data.

---

## 1. What's already done (in repo)

- `packages/satellite-runtime/src/crash.ts` — Sentry wrapper with:
  - `initCrashReporting({ app, dsn?, disabled? })` — call once at app boot
  - `setCrashUserContext(userId | null)` — tag user after sign-in
  - `captureCrashError(error, extra?)` — manually report a swallowed error
- Wired into `apps/fate-app/app/_layout.tsx` as the canonical example
- Peer dep declared (optional) in `packages/satellite-runtime/package.json`
- **Graceful no-op**: when `EXPO_PUBLIC_SENTRY_DSN` is unset or
  `@sentry/react-native` is not installed, the wrapper degrades to no-op
  without crashing.

---

## 2. Per-app install (one-time, per satellite)

For each of `fate`, `cycle`, `yuan`, `feng`:

```bash
cd apps/<app>-app
bun add @sentry/react-native
```

Then add `initCrashReporting({ app: '<app>' })` at the top of `app/_layout.tsx`
above any React imports — see fate-app for the pattern.

**Don't initialize multiple times** — `initCrashReporting` is idempotent,
but for clarity keep it to one call site per app.

---

## 3. Sentry project setup (one-time, in Sentry dashboard)

1. Create a Sentry organization (free tier is fine for pre-PMF):
   https://sentry.io/signup/
2. Create **one project per app** (recommended) or one project with `app`
   tag (cheaper at scale):
   - `fate-app` · platform: React Native
   - `cycle-app` · React Native
   - `yuan-app` · React Native
   - `feng-app` · React Native
3. Copy each project's **DSN** (looks like `https://<key>@<org>.ingest.sentry.io/<project_id>`)
4. Create a **CLI auth token** at Settings → Account → Auth Tokens with
   scope `project:releases` (needed for source-map upload)

---

## 4. Per-app environment configuration

Each app's EAS profile needs the DSN:

```jsonc
// apps/<app>-app/eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://<key>@<org>.ingest.sentry.io/<project_id>"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://<same-dsn>"
      }
    }
  }
}
```

Local dev (`bun dev`) intentionally leaves DSN unset → wrapper no-ops →
your console isn't polluted with dev errors.

---

## 5. EAS source-map upload (production builds only)

Without source maps, every crash report shows a minified stack trace
(`<unknown>:1:42342`) which is useless. Source map upload happens
post-build via EAS hook:

```jsonc
// apps/<app>-app/eas.json — production profile
{
  "build": {
    "production": {
      "env": { ... },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

Then add `metro.config.js` to use Sentry's bundler integration:

```js
// apps/<app>-app/metro.config.js
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)
module.exports = config
```

And configure `app.json` to include Sentry's Expo plugin:

```jsonc
// apps/<app>-app/app.json
{
  "expo": {
    "plugins": [
      // ... existing plugins
      "@sentry/react-native/expo"
    ]
  }
}
```

Set Sentry secrets in EAS:

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
eas secret:create --scope project --name SENTRY_ORG --value <org-slug>
eas secret:create --scope project --name SENTRY_PROJECT --value <project-slug>
```

Then `eas build --profile production --platform ios` auto-uploads source
maps as part of the bundle step. No additional hook scripts needed.

---

## 6. Verify it works

After a production build (TestFlight or App Store):

1. Install on a device
2. Force a crash:
   ```ts
   import { captureCrashError } from '@zhop/satellite-runtime'
   captureCrashError(new Error('test crash from device'))
   ```
3. Check Sentry → Issues — the event should appear within 30 seconds with:
   - User-id tag (if signed in)
   - App tag (`fate` / `cycle` / etc.)
   - Release tag (`app@<version>`)
   - Environment (`production`)
   - Deobfuscated source-mapped stack trace

If the stack trace is still minified, source-map upload didn't run — check
the build log for `Uploading source maps` lines.

---

## 7. Operational notes

- **Free tier**: 5K events/month per project. Enough for pre-PMF; at GA scale
  you'll burn through this in days with auto-instrumentation off, hours
  with it on. Plan to upgrade or sample.
- **Kill-switch**: if a Sentry outage starts back-pressuring app boot
  (rare but possible), pass `disabled: true` via the feature-flag system:
  ```ts
  const sentryKill = useFlag('sentry_kill', false)
  initCrashReporting({ app: 'fate', disabled: sentryKill })
  ```
  Then `wrangler kv:key put --binding=GUARD_KV "flag:sentry_kill" 'true'`
  to flip globally.
- **Source map upload errors**: don't fail the build. Check post-build
  logs and re-upload manually if needed:
  ```bash
  bunx sentry-cli sourcemaps upload --release app@1.0.0 ./<bundle>.js.map
  ```

---

## 8. Open items

- [ ] Create Sentry org + 4 projects (manual, fate / cycle / yuan / feng)
- [ ] `bun add @sentry/react-native` in each of the 4 satellite apps
- [ ] Add EXPO_PUBLIC_SENTRY_DSN to each app's eas.json env block
- [ ] Add Sentry Expo plugin + metro.config.js to each app
- [ ] Configure EAS secrets (SENTRY_AUTH_TOKEN / ORG / PROJECT)
- [ ] Wire `setCrashUserContext(userId)` post-sign-in (existing hook
      in `usePortfolioSatelliteBootstrap` is the natural spot)
- [ ] Add `initCrashReporting({ app: 'cycle' })` to cycle-app _layout.tsx
- [ ] Add `initCrashReporting({ app: 'kindred' })` to yuan-app _layout.tsx
- [ ] Add `initCrashReporting({ app: 'feng' })` to feng-app _layout.tsx
