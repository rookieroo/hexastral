# @zhop/satellite-ui

Composite UI for **satellite apps** (Coin Cast, Face Oracle, Dream Oracle, Numerology).

## Boundary vs `@zhop/core-ui`

| Layer | Package | Examples |
|-------|---------|----------|
| Primitives | `core-ui` | `Button`, `Card`, `Pill`, `EmptyState`, `CoreUIProvider` |
| Satellite flows | `satellite-ui` (this) | `SatelliteOnboarding`, `SatellitePaywall`, `SatelliteHistoryList`, `SatelliteShareCard` |

Flagships (hexastral-app, yuan-app, feng-app) should use `core-ui` only. Do not import `satellite-ui` from flagships — it pulls satellite-specific peers (RevenueCat, portfolio session assumptions).

## Consumers

`coin-cast-app`, `xingqi-app`, `dream-oracle-app`, `numerology-app`.

See [ADR-0005](../../docs/decisions/0005-package-boundaries.md).
