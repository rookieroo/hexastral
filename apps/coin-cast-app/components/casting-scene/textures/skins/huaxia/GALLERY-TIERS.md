# Gallery tiers vs shipped skins

`gallery.html` shows four visual pipelines for the 华夏五枚. Only **one** tier is wired
into the app (`lib/coin-skins.ts`).

| Tier | Script | Output | Shipped? |
|------|--------|--------|----------|
| 华夏 | `gen-huaxia.py` | `dist/*-{yang,yin}.jpg` | **Yes** — realistic bronze |
| 碑拓 | `gen-huaxia-tracing.py` | `dist/tracing/` | **No** — gallery WIP |
| 印章 | `gen-seal-from-tracing.py` | `dist/seal-photo/` | **No** — gallery WIP |
| 手描 | `gen-huaxia-hand-rubbing.py` | `dist/hand-rubbing/` | **No** — gallery WIP |

Do **not** add `tracing/`, `seal-photo/`, or `hand-rubbing/` paths to `coin-skins.ts`
until a human sign-off against `original/dist/bagua-yang.png` at 74px thumb scale.

Promotion criteria (碑拓 / 手描):

1. Vector RING/HOLE from `original/gen-coins.py` — no photo rim bleed.
2. 素背 coins: yin is synth plain back, not re-traced obverse.
3. Split paper/ink SVG filters — no double-paper mud.
4. Per-coin `tracing_config.json` tuned; PNG intermediate before JPEG cap.
