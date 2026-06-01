# hexastral-app

Expo iOS app for HexAstral.

## Responsibilities

1. User onboarding and identity flows.
2. Reading product experience (Ba Zi, Zi Wei, I Ching, Feng Shui, dual-chart).
3. Purchases and subscription UX via RevenueCat.
4. Push permission and device token registration.

## Runtime Dependencies

1. API gateway: `https://api.hexastral.com`
2. RevenueCat SDK: `react-native-purchases`
3. Expo notifications: push token + registration flow
4. React Query for network data lifecycle

## Required Environment Variables

Public runtime env (set in `eas.json` build.production.env or via EAS Secret):
1. `EXPO_PUBLIC_ENV`
2. `EXPO_PUBLIC_API_URL`
3. `EXPO_PUBLIC_REVENUECAT_IOS_KEY` — RevenueCat Dashboard → iOS App → Public API Key
4. `EXPO_PUBLIC_EAS_PROJECT_ID`
5. `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — Google Cloud Console → OAuth Client → iOS (Bundle ID: `com.hexastral`)

Notes:
1. `lib/config.ts` resolves API URL from `EXPO_PUBLIC_API_URL` first.
2. `lib/subscription.ts` uses `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
3. `lib/pushNotifications.ts` uses `EXPO_PUBLIC_EAS_PROJECT_ID` when requesting Expo push token.
4. `lib/auth.tsx` calls `GoogleSignin.configure()` with `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` at module load. Google Sign-In button should be hidden if this value is empty (i.e. before Google OAuth is configured).

## 🚀 Complete iOS Build & Release Guide

This guide details how to handle daily local development, local builds for TestFlight (saving EAS cloud capacity), and fully automated EAS cloud builds for production.

### Phase 1: Initial Setup (App Store Connect & Expo)

Before building for real devices or TestFlight, you must configure Apple Developer credentials:

1. **Obtain App Store Connect (ASC) API Key:**
   - Log in to [App Store Connect](https://appstoreconnect.apple.com/) > **Users and Access** > **Integrations**.
   - Generate a new API Key with **App Manager** access.
   - Download the `.p8` file. Keep the **Issuer ID** and **Key ID** handy.
2. **Configure EAS CLI:**
   ```bash
   npm i -g eas-cli
   eas login
   ```
3. **Set Secrets in Expo:**
   Do not commit sensitive keys. Push your local `.env.local` to EAS:
   ```bash
   eas secret:push
   ```

### Phase 2: Local Development (Without EAS)

For daily logic and UI writing, use your local machine.

**Option A: iOS Simulator (Fastest)**
```bash
bun dev
# Press 'i' in terminal to auto-launch the iOS Simulator
```

**Option B: Wired Real Device (No EAS required, uses Xcode)**
1. Connect iPhone via USB.
2. Generate native files:
   ```bash
   npx expo prebuild --clean
   ```
3. Open project in Xcode:
   ```bash
   xed -b ios
   ```
4. In Xcode: Select the `HexAstral` target > **Signing & Capabilities** > Check "Automatically manage signing" > Choose your Personal Team (Free Apple ID is fine).
5. Select your connected iPhone at the top center and press `Cmd + R` to install the app.
6. Run `bun dev` in terminal to start the Metro bundler. The app on your phone will connect to your local dev server.

### Phase 3: Build for TestFlight (Local Mac Build)

If you want to build the actual `.ipa` for TestFlight without waiting in EAS queues or consuming cloud build quotas, you can use your Mac's local Xcode environment via EAS CLI. EAS will still talk to Apple to manage certificates automatically, but the heavy compilation happens locally.

1. **Run a Local Production Build:**
   ```bash
   eas build --profile production --platform ios --local
   ```
   *This outputs an `application-*.ipa` file in your project directory upon success.*

2. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios
   ```
   *The CLI will ask you for the path to the binary. Select the newly generated `.ipa`. EAS will use your ASC API Key to upload it to Apple's TestFlight.*

### Phase 4: Production Release (EAS Cloud Automation)

When ready for the official App Store release, or if you prefer full CI/CD automation, delegate the entire process to EAS Cloud.

1. **Trigger Cloud Build:**
   ```bash
   bun build:prod
   # Under the hood: eas build --profile production --platform ios
   ```
   *EAS provisions a clean macOS VM, runs `pod install`, compiles, and signs the app automatically.*

2. **Submit to Apple:**
   Once the cloud build succeeds, submit the cloud artifact directly to App Store Connect:
   ```bash
   bun submit:ios
   # Under the hood: eas submit --platform ios
   ```
   *(Pro tip: You can combine them into one seamless automated flow by running `eas build --profile production --platform ios --auto-submit`)*

### TestFlight Checklist

1. `app.json` version and `ios.buildNumber` must be bumped from the last release before generating a new `.ipa`.
2. All production environment variables (e.g. `EXPO_PUBLIC_ENV=production`) are properly configured in EAS Secrets or `eas.json`.
3. In App Store Connect, TestFlight Beta testers only need to be added once per group. Subsequent builds upload automatically but might require a quick compliance click inside ASC before rollout.
4. If an API change caused the issue, re-deploy the previous API version first and document the incident.

## Architecture Pointers

1. Router entry and root providers: `app/_layout.tsx`
2. Network config: `lib/config.ts`
3. Subscription implementation: `lib/subscription.ts`
4. Push registration flow: `lib/pushNotifications.ts`
5. Theme and palettes: `lib/theme.ts`

## Related Docs

1. Root architecture and dependency graph:
- [../../README.md](../../README.md)
2. Deployment and operations handbook:
- [../../deploy.md](../../deploy.md)
