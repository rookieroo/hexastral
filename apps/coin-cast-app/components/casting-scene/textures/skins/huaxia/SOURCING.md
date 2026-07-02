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

## SHIPPED SET (2026-07-01, updated 2026-07-02): realistic bronze, two-sided

Direction changed from 碑拓-rubbing to **realistic bronze** (founder call — "真实铜钱刻画",
真实质感). Baked by `gen-huaxia.py` (Pillow + numpy + scipy), NOT the ImageMagick 碑拓
pipeline above. Source photos are now committed under `huaxia/src/` so the set is fully
reproducible (`python3 gen-huaxia.py` — defaults to `./src`). Each skin is **two-sided**:
`<id>-yang.png` (字面/obverse) + `<id>-yin.png` (背面/reverse).

| id | Coin | 朝代 | Faces | Source (huaxia/src/) |
|---|---|---|---|---|
| banliang | 半兩 | 秦 | obverse + **real 素背** | banliang-qin.jpg (CC0, Scott Semans) |
| wuzhu | 五銖 | 汉 | obverse + **real 素背** | wuzhu-han.jpg (CC0, Scott Semans) |
| daquan | 大泉五十 | 新莽 | obverse + **real 素背** | daquan.jpg (CC0, 2-coin) |
| kaiyuan | 開元通寶 | 唐 | obverse + synth 素背 | kaiyuan-tang.jpg (CC0, Gary Todd) |
| daguan | 大觀通寶 | 宋徽宗 | obverse + **real 素背** | daguan.jpg (PD, 2-coin) |

### 2026-07-02 source refresh

Replaced provenance-gray 五銖 (museum photo) and 開元 (unknown-origin uploader PD claim)
with verified CC0 sources from Scott Semans and Gary Todd. Also upgraded 半兩 to a
higher-contrast Scott Semans CC0 single-coin photo from the S-series (obverse+reverse
pair in one frame — now generates a real 素背 reverse instead of synthetic).

| Old source | New source | License | Improvement |
|---|---|---|---|
| banliang.jpg (CC0, Gary Todd, 2-coin white-bg) | banliang-qin.jpg (CC0, Scott Semans, 2-coin dark-bg) | CC0 → CC0 | better coin/background contrast, real reverse |
| wuzhu.jpg (PD* museum, 751×750 white-bg) | wuzhu-han.jpg (CC0, Scott Semans, 4277×2591) | PD* → CC0 | **license clean**, higher resolution, 2-coin obv+rev pair |
| kaiyuan.png (PD* unknown, 627×634) | kaiyuan-tang.jpg (CC0, Gary Todd, 3888×2592) | PD* → CC0 | **license clean**, higher resolution |
| daquan.jpg | unchanged | CC0 | fine |
| daguan.jpg | unchanged + gamma pre-brightening for dark patina | PD | better contrast |

**Pipeline improvements**:
- Brightness-based coin detection for dark-background photos (Scott Semans style)
- Gamma correction stage for low-contrast coins (daguan: 0.58, kaiyuan: 0.65)
- New `gen-huaxia-rubbing.py`: experimental photo-based 碑拓 ink-rubbing variant → `dist/rubbing/`

### Historical sources (archived, not in current build)

| File | Source | Reason retired |
|---|---|---|
| banliang.jpg | Gary Todd CC0 5184×3456 | white-bg 2-coin shot, coin detection gave loose crops |
| wuzhu.jpg | NMC museum PD* 751×750 | provenance gray (museum photo rights) |
| kaiyuan.png | unknown uploader PD* 627×634 | provenance gray, very low resolution |
