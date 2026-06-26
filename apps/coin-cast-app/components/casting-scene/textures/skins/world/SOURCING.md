# 世界钱币 skin set — sourcing & faithfulness ledger

Faithful 碑拓 (ink-rubbing) skins of historic coins from civilizations beyond
China — the "world coin rubbing cabinet" tier. **Same hard rule as 华夏: every
coin is reproduced from a real artifact (actual inscription / iconography),
Public-Domain or CC0 only, never an invented motif or substitute lettering.**

> **Direction (2026-06-26): world tier avoids RELIGIOUS-TEXT coins.** The dirham +
> Almohad square dirham extracted beautifully but carry Quranic / Shahada text —
> using sacred scripture as a tossable, paywalled divination coin is a cultural /
> market risk, so both are SHELVED (removed from app). Prefer **secular** subjects:
> Greek/Roman figurative (needs human polish) or pure date/denomination/pattern coins.
> NOTE: the clean-extraction sweet spot (flat calligraphic photo) overlaps heavily with
> religious Islamic coinage — so secular world coins will mostly need human polish, OR
> commissioned original 碑拓 art (the only route to defensible exclusive IP for a paywall).

## Extraction classes (what reproduces faithfully)

- **Calligraphic / aniconic** (Islamic dirham): pure script, flat relief →
  high-pass extraction from a clean photo is gallery-clean. EASIEST, most faithful.
- **Square-hole 4-char** (和同開珎): same family as 华夏 cash → extracts like 開元.
- **Figurative** (portrait / owl / fire-altar): bust + device relief →
  photo high-pass is NOISY. Needs a cleaner source (museum CC0 line-engraving /
  rubbing) or a human trace-polish pass. Do NOT ship the rough auto-extract.

## Ledger

| Coin | 文明 · 年代 | Type | Faithful imagery (reproduce exactly) | Source (Wikimedia Commons) | License | Status |
|---|---|---|---|---|---|---|
| 迪拉姆(方)Almohad dirham | 穆瓦希德/阿尔摩哈德 · 12–13 c. | calligraphic · **SQUARE** | 正背皆马格里布库法体经文，无图像；**方形币**（圆币中独树一帜） | `File:Dirham LACMA M.2002.1.435 (1 of 2)` + `(2 of 2)` | Public domain (LACMA) | **SHELVED** — 库法体古兰经文,文化敏感(占卜 app 收费墙),已撤出 app + 删资产 |
| 迪拉姆 Dirham | 倭马亚 Umayyad · 99–101 AH | calligraphic / aniconic | 正面心：清真言「لا إله إلا الله وحده لا شريك له」+ 边铭造币地·年份；背面心：第112章 al-Ikhlāṣ；边铭：古兰 9:33。纯库法体，无图像 | `File:Silver dirham of Umar II, 718-19 obverse.jpg` + `…reverse.jpg` (matched pair) | CC0 | **SHELVED** — 清真言/古兰经文,文化敏感(占卜 app 收费墙),已撤出 app + 删资产 |
| 和同開珎 Wadō kaichin | 日本奈良 · 708 CE | square-hole 4-char | 方孔；和(上) 同(下) 開(右) 珎(左) 對讀；素背。仿唐開元形制 | **Munro 1904《Coins of Japan》Fig 10** (IA `coinsofjapan00munr_0`, p.34 / leaf n71 — 和同開珎 obverse + 素背 reverse line engraving). NB: `Wadou012.jpg` = a coin-shaped monument, NOT a coin | Public domain | **SOURCED** (real PD engraving) but auto-extract ROUGH — 精刻阴影排线高通/`-lat` 皆噪 → **WIP, human polish or real 拓片** |
| 第纳尔 Denarius | 罗马帝国 Trajan · 98–117 | figurative | 正面：桂冠图拉真侧面像(右)+ 拉丁环铭；背面：立姿神祇(Pax/Victoria 等)+ 铭文 | `File:…Silver denarius of Traian, Kawczyce…jpg` (or any PD imperial denarius) | Public domain | figurative → human polish |
| 索利都斯 Solidus | 拜占庭 Leontius · 695–698 | figurative | 正面：正面冠冕半身像，执 akakia + 十字宝球，「D LEO PE AV」；背面：三级台阶十字架「VICTORIA AVGЧ · CONOB」 | `File:Solidus of Leontius (695-698 AD).jpg` | CC0 | figurative → human polish |
| 德拉克马 Drachm | 萨珊波斯 Bahram IV · 388–399 | figurative | 正面：王者侧面胸像，带翼冠 + korymbos，巴列维铭文；背面：火坛 + 两侍立者 | `File:Drachm of Sasanian ruler Bahram IV ca CE 388–99 (obverse).jpg` | CC0 | figurative → human polish |
| 四德拉克马 Tetradrachm | 古希腊雅典 · 5–4 世纪 BCE | figurative | 正面：戴盔雅典娜侧面像(右)；背面：立鸮正脸 + 橄榄枝 + 新月 + ΑΘΕ | `File:Athens, tetradrachm, 86-84 BC, Weber 3526.png` | Public domain | rough seed (athens-owl) → human polish |

Source page URL = `https://commons.wikimedia.org/wiki/<file>`. PD/CC0 confirmed
from each Commons page license at fetch time (2026-06-26) — re-verify before ship.

## Notes

- **Dirham is the world-tier anchor** — calligraphic coins extract faithfully and
  read beautifully as 碑拓; lead the world series with Islamic + other epigraphic
  issues (Abbasid, Ottoman, Mughal) where photo→rubbing is clean.
- **Figurative coins**: the auto-extract is only a positioning seed. For ship
  quality, source a museum CC0 line-engraving or commission a human 碑拓 trace
  (same pipeline as the Kindred hand-authored glyphs). Flag clearly; don't pass
  off a noisy auto-extract as final.
- WIP extractions live in scratchpad/coins/ (`w_dirham.png` is the clean one).
