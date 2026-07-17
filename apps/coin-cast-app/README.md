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

## Casting sources

- **Motion sensing:** each line captures its own DeviceMotion sequence. Real acceleration, gravity direction, angular velocity, device timing, and the final three rigid-body orientations cause the 6/7/8/9 result. Raw motion stays on-device; only a SHA-256 digest is retained for provenance.
- **Digital assistance:** offered explicitly when sensing is unavailable, interrupted, insufficient, or physics cannot settle. It uses secure random bytes and is recorded separately; there is no silent random fallback from a sensing cast.

Custom images are permission-checked, decoded, resized to a 2048 px maximum while preserving the full aspect ratio, converted to JPEG, validated, and then persisted atomically. Native dependency or permission changes require rebuilding the iOS dev client; Metro reload alone is insufficient.
