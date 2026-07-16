# CoinCast

Growth satellite — standalone I Ching oracle — Expo 54 scaffold.

**Launch doc:** [docs/apps/coincast/README.md](../../docs/apps/coincast/README.md)

Install once from the monorepo root (`bun install`), then:

```bash
cd apps/coin-cast-app && bun dev
```

**Brand icons:** `node scripts/gen-brand-assets.mjs` (writes `docs/design/coins/*.svg` + `assets/*.png`; needs `rsvg-convert`).

**Default coin cap textures:** `node scripts/gen-logo-coin-face.mjs` → `assets/coins/faces/logo*.png`

Settings → Coin appearance: logo default, or upload a custom face (scaled to fit, no crop).
