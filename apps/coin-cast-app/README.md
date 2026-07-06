# CoinCast

Growth satellite — standalone I Ching oracle — Expo 54 scaffold.

**Launch doc:** [docs/apps/coincast/README.md](../../docs/apps/coincast/README.md)

Install once from the monorepo root (`bun install`), then:

```bash
cd apps/coin-cast-app && bun dev
```

**Brand icons:** `node scripts/gen-brand-assets.mjs` (writes `docs/design/coins/*.svg` + `assets/*.png`; needs `rsvg-convert`).

**五帝钱皮肤:** `node scripts/gen-wudi-coin-faces.mjs` — 水墨印章矢量临摹（`scripts/wudi-coins.mjs`，布局参考 `assets/coins/source.png`；需 `rsvg-convert`，通宝钱文最好装 `LXGW WenKai`）。每枚生成 `faces/<id>.png`（正面/字面）与 `faces/<id>-back.png`（背面/幕面·光背星月）。摇卦时字面朝上为阴(2)、幕面朝上为阳(3)：正面挂底盖(−Y)、背面挂顶盖(+Y)，见 `lib/coin-skins.ts`。
