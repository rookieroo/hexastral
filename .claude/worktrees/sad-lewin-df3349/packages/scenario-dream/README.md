# @zhop/scenario-dream

Shared **dream interpretation** flow: text input → portfolio preview API → navigation to `/result` (or custom `onSuccess`).

## Usage

1. Wrap a route with `DreamScenarioProvider`, passing a host-specific `DreamScenarioApi` (`runPreview`) and `locale`.
2. Render `DreamDescribeScreen` with `strings` (i18n) and `palette` (from `useTheme().colors` or `darkTokens`).

Flagship (`hexastral-app`) uses `lib/runDreamPortfolioPreview.ts` + `x-client-platform: ios` against `EXPO_PUBLIC_API_URL`.

Satellite (`dream-oracle-app`) uses `@zhop/portfolio-client` `runAuto` inside the adapter.
