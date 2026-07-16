# CoinCast

Growth satellite — standalone I Ching oracle — Expo 54 scaffold.

**Launch doc:** [docs/apps/coincast/README.md](../../docs/apps/coincast/README.md)

Install once from the monorepo root (`bun install`), then:

```bash
cd apps/coin-cast-app && bun dev
```

**Brand icons:** `node scripts/gen-brand-assets.mjs` (writes `docs/design/coins/*.svg` + `assets/*.png`; needs `rsvg-convert`).

**五帝钱皮肤（三主题）:**
- 生成：`python3 scripts/design-wudi-themes.py` → `faces/<id>-{ink,rubbing,seal}.png` (+ `-back`, `-bump`)
- 汉五铢设计稿实验：`python3 scripts/design-wuzhu-themes.py` → `assets/coins/experiments/wuzhu-design/`

设置里切换「水墨 / 碑拓 / 印章」。默认 `han-wuzhu-ink`。摇卦时字面朝上为阴(2)、幕面朝上为阳(3)，见 `lib/coin-skins.ts`。
