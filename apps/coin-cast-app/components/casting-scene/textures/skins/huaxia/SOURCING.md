# 华夏钱币史 skin set — sourcing & faithfulness ledger

Faithful 碑拓 (ink-rubbing) skins for the casting scene. **Hard rule: every coin's
白描 is reproduced from a real artifact — actual inscription / script / layout —
never a substitute font or invented glyph.** Earlier font-stamped drafts (Long
Cang / LXGW WenKai) are RETIRED as fabrication.

## Method

1. Source one real coin image, **Public Domain or CC0 only** (CC-BY / CC-BY-SA
   avoided — attribution + share-alike are unfit for a shipped proprietary app).
   Verified per-file via the Wikimedia Commons API `extmetadata.LicenseShortName`.
2. Relief glyphs extracted with ImageMagick high-pass (`blur + minus_dst`) /
   local-adaptive-threshold (`-lat`) — naive `-threshold` collapses a 3D coin
   photo to a blob. Denoise (morphology Open/Close + despeckle).
3. Duotone `-level-colors '#16110a','#e7ddc7'` → ink on 宣纸 → 碑拓 texture.
   The glyphs are the real coin's; no font is used.

## Ledger (對讀 = read top→bottom→right→left; 2-char = right→left)

| Coin | 朝代 | Script | Reading | Source file (Wikimedia Commons) | License | Status |
|---|---|---|---|---|---|---|
| 半兩 | 秦 | 小篆 | 半(右) 兩(左) | `File:Chinese Money 8 - Ban Liang Coin.jpg` | CC0 | re-crop WIP |
| 五銖 | 汉 | 篆 | 五(右) 銖(左) | `File:Golden variant of Wu Zhu coin.jpg` | PD* (uploader) | dist/wuzhu-yang.png · ⚠ **provenance gray**: source is a 中国国家博物馆 photo PD-tagged by the Commons uploader (museum may claim photo rights). 李博 self-PD scans exist but only as multi-coin plates (too small/soft to crop clean). **Re-source clean or commission before monetizing.** |
| 大泉五十 | 新莽 | 悬针篆 | 大(上) 泉(下) 五(右) 十(左) | `File:073 S-126 Xin Wang Mang, 6-23 AD, 26mm.jpg` | CC0 | noisy (low-contrast source) |
| 開元通寶 | 唐 | 隶楷 | 開(上) 元(下) 通(右) 寶(左) | `File:KaiyuanTongbao.png` | PD* (uploader) | dist/kaiyuan-yang.png · ⚠ **provenance gray**: Commons source is "unknown origin", PD claimed by uploader. **Re-source clean or commission before monetizing.** |
| 大觀通寶 | 宋徽宗 | 瘦金 | 大(上) 觀(下) 通(右) 寶(左) | `File:Southern Song Dynasty - 3 Cash, 1107-1110. Da Guan Tongbao. ss - MA-Shops.jpg` | Public domain | noisy (2-coin, cropped obverse) |

Source page URL = `https://commons.wikimedia.org/wiki/<file>`. Each file's PD/CC0
status was confirmed from its Commons page license at fetch time (2026-06-26) —
re-verify before shipping.

## Known gaps / next

- **半兩**: source is a 2-coin (obverse+reverse) white-bg shot; left-crop +
  auto-trim mis-bounded — fix the crop, then extract.
- **大泉五十 / 大觀**: photo sources are patinated/low-contrast → noisy extraction.
  Either re-source a real 拓片 (pre-1929 谱录《歷代古錢圖說》《古泉匯》, PD) for a
  cleaner白描, accept the noise as 金石残破 (per "不完美也是一种美"), or human polish.
- Hero coins + any figurative world-tier coins (owl / portrait) want a human
  trace/polish pass (Kindred glyph pipeline) — photo extraction won't be gallery-clean.
- FINAL baked textures live in `dist/` (`wuzhu-yang.png`, `kaiyuan-yang.png`, shared
  `back-su-yin.png`), wired via `lib/coin-skins.ts` → settings skin selector, gated on the
  `coincast_pro` entitlement. 半兩 / 大泉五十 / 大觀 stay WIP (scratchpad `ref/f_*.png`)
  pending cleaner 拓片 sources or a human polish pass.

---

## SHIPPED SET (2026-07-01): realistic bronze, two-sided

Direction changed from 碑拓-rubbing to **realistic bronze** (founder call — "真实铜钱刻画",
真实质感). Baked by `gen-huaxia.py` (Pillow + numpy + scipy), NOT the ImageMagick 碑拓
pipeline above. Source photos are now committed under `huaxia/src/` so the set is fully
reproducible (`python3 gen-huaxia.py` — defaults to `./src`). Each skin is **two-sided**:
`<id>-yang.png` (字面/obverse) + `<id>-yin.png` (背面/reverse).

| id | Coin | 朝代 | Faces | Source (huaxia/src/) |
|---|---|---|---|---|
| banliang | 半兩 | 秦 | obverse + synth 素背 | banliang.jpg (CC0) |
| wuzhu | 五銖 | 汉 | obverse + synth 素背 | wuzhu.jpg (PD*) |
| daquan | 大泉五十 | 新莽 | obverse + **real 素背** | daquan.jpg (CC0, 2-coin) |
| kaiyuan | 開元通寶 | 唐 | obverse + synth 素背 | kaiyuan.png (PD*) |
| daguan | 大觀通寶 | 宋徽宗 | obverse + **real 素背** | daguan.jpg (PD, 2-coin) |

- **synth 素背** = plain reverse blurred from the coin's own patina (these issues ARE
  plain-backed, so it's faithful) — used where the photo is obverse-only. 大泉/大觀 came as
  2-coin obverse+reverse shots → real 素背.
- **Provenance**: PD/CC0 per the ledger above, but 五銖 + 開元 are "gray" (museum photo
  rights). Fine for now; re-source clean CC0 or commission before heavy monetization.
- **Pipeline**: detect coin blob(s) → square crop 1024² → enhance + unsharp → circular
  mask → punch 方孔 → save as **JPEG q88** (≤500KB/cap; opaque albedo for 3D).
- **Vector prototype**: `huaxia/vector/gen-kaiyuan-vector.py` → `kaiyuan-vector-*.png`
  (clean 隶楷 master for small-screen QA; not wired to skins yet).
- **Do NOT delete `src/`** — losing it is how the previous realistic set was lost.
