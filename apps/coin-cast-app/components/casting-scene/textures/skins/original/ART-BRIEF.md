# 原创碑拓 Pro 卦钱库 — 美术 Brief & 规格

The clean-IP path for the paywalled coin-skin vault: **original 碑拓 (ink-rubbing)
coin art**, authored in-house (no PD-photo extraction, no real-artifact copying,
no religious scripture). Resolves the licensing + cultural-sensitivity bind —
these are our own designs, safe to monetize and to market as "original".

## 为什么走原创(而非 PD 提取)

- PD/CC0 提取 = 非独家(机械变换公共素材,竞品可复制)+ 出处灰区 + 干净书法币几乎都是宗教经文(敏感)。
- 原创设计 = 无侵权风险、无宗教敏感、风格统一、可控、可作"独家"卖点。
- (诚实备注:AI 生成图自身可注册版权在某些法域存疑;靠人类指挥/策展/手搭矢量增强作者性。最大价值是**消除侵权与敏感这两个真实风险**。)

## 审美规格(碑拓 / 墨拓)

| 项 | 值 |
|---|---|
| 宣纸底 | `#e7ddc7`(纤维噪:feTurbulence 低频,~10% alpha) |
| 墨 | `#16110a`;朱砂变体 `#9c2a1c` |
| 外廓 | 宽厚(stroke ~42/600),内外各一细线 |
| 方孔 | 居中,鼓出方廓(stroke ~22/600) |
| 金石残破 | feDisplacementMap(scale 7–9)+ 破墨 speck(高频 turbulence lift) |
| 画幅 | 1254×1254,正方;底烘成宣纸(非透明) |

## 钱形

- 默认 **方孔圆钱**(圆 + 中央方孔);也可方形(参考阿尔摩哈德方币的独特感,原创化)。
- 两面:`<theme>-yang.png`(字面/主面)+ `-yin.png`(背面;可共用 `huaxia/dist/back-su-yin.png` 素背,或单独设计 太极/河洛点)。

## 选题清单(全原创,无宗教经文)

1. **八卦钱** ✅ 已出(先天八卦,加粗爻线)
2. **太极** ✅ 已出(阴阳鱼环穿,**中心钱眼留空**——不可遮挡钱眼)
3. **五行 五枚套** ✅ 已出 **「四体一钱」**:同一元素字以 **甲骨(上)· 小篆(右)· 隶书(下)· 楷书(左)** 四体绕钱眼,顺时针即字形演变。
   - 甲骨 = **复用 `apps/kindred-app/components/home/ElementGlyph.tsx` 的手描甲骨/金文路径**(owned,跨产品一致);小篆/隶书 = 手描(简单字可行,金最难);楷 = LXGW WenKai(OFL)。
4. 十二生肖 / 十二地支(套系,收藏向)— 下一个
5. 天干 / 河图洛书点阵 · 二十八宿星象
6. **世界文明母题的"原创演绎"**(非临摹):希腊橄榄枝/枭、罗马月桂 —— 取形意重画为碑拓原创纹样。

## 规则(硬)

- 不临摹任何具体实物币;不放真实/伪造的"实物铭文"冒充真品;不使用任何宗教经文(古兰/清真言/佛经等)。
- 八卦/五行/生肖/星象皆为公共领域概念,**原创地重绘**即可,属我方作品。

## 管线

SVG master(`original/*.svg`)→ 内嵌 paper+ink 滤镜 → `rsvg-convert -w 1254` → `original/dist/*.png` → 注册进 `lib/coin-skins.ts`(`pro: true`)。八卦钱即此流程产出,可照搬。
