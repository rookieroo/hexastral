# CoinCast — MVP / launch doc

**Directory:** `apps/coin-cast-app` · **Bundle:** `com.hexastral.coincast` · **Display name:** CoinCast

Growth satellite — standalone I Ching oracle with 3D coin casting and portfolio-linked history.

---

## Positioning (App Store)

> Rigorous 易经 companion — real coin physics, classical line rules (6/7/8/9), and cited commentary. Study tool + journal framing, not generic fortune spam.

**Visual:** Zinc structural UI + ink-wash accents; ink-stone altar + inscription coin caps (no yao bars on caps).

**Brand mark:** `docs/design/coins/coincast-mark-three.svg` (三枚方孔钱) · `wu-zhu.svg` (单枚参考). Regenerate app icons: `node apps/coin-cast-app/scripts/gen-brand-assets.mjs` (needs `rsvg-convert`).

---

## MVP scope (current)

| Layer | Shipped | Notes |
|---|---|---|
| Casting | 3-coin physics + shake / button | WebGL scene lazy-loaded |
| Output | Hexagram + AI interpretation via `svc-astro` `/yiching/cast` | `yaoValues` from client entropy |
| Personalization | None for divination — birth charts live in **Yuun** / **Yuel** | CoinCast is one-question-one-cast; no birth info in the cast pipeline |
| Monetization | **Consumable-first:** 1 / 5 / 10 cast packs | `coincast_pro_*` for skins + quota; `universe_pro` cross-app |
| Quota | Guest 3/day · linked 3/month + credits | `evaluateCoincastQuota` |
| Platform | iOS (Expo 54) | Settings via top-right + left-swipe (Fēng model) |

### Post-MVP

- 40-stalk method, hexagram journal, 64-gua study path, widget/watch

---

## Monetization

| SKU | Type | Purpose |
|---|---|---|
| `coincast_cast_pack_1` | consumable | +1 cast credit |
| `coincast_cast_pack_5` | consumable | +5 cast credits |
| `coincast_cast_pack_10` | consumable | +10 cast credits |
| `coincast_pro_monthly` / `_annual` | subscription | Extra cast quota + coin skins (no birth-chart interpretation) |
| `universe_pro_*` | subscription | All app Pros + shared birth info |

Paywall surfaces **packs first**, subscriptions secondary.

---

## Birth info & chart apps

CoinCast **does not** collect or use birth info for 六爻. Settings → **八字与命盘** opens a funnel to:

- **Yuun** (`auspice-app`) — personal BaZi + Zi Wei + life timeline  
- **Yuel** (`kindred-app`) — two-chart synastry  

Birth data SSOT remains `GET/PUT /api/portfolio/birth-info`, edited only in apps that need a chart.

---

## Technical dependencies

- `@zhop/portfolio-client` — preview/linked, readings
- `@zhop/satellite-runtime` — HMAC, purchases, bootstrap
- `hexastral-api` — `portfolio` target `coincast`
- `svc-astro` — `/yiching/cast`

---

## Commands

```bash
cd apps/coin-cast-app
bun dev
bun typecheck
eas build --profile production --platform ios
```
