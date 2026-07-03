# 华夏六币 · 书体与字体规范

> **策略**：先确定各朝代钱币的**书体类别**与**标准字体文件**，再用统一 `bronze_face` 烘焙 dark 青铜皮肤。  
> 不再逐币手描 SVG path（不可控、难维护）。

## 币种 → 书体 → 字体

| id | 钱币 | 朝代书体 | 字体文件 | 授权 | 说明 |
|----|------|----------|----------|------|------|
| `banliang` | 半兩 | **秦小篆** | `fonts/Shuowen.ttf` | 全字库说文解字（政府开放数据） | 秦半两为标准小篆，与《说文》体系一致 |
| `wuzhu` | 五銖 | **汉篆** | 同上 `Shuowen.ttf` | 同上 | 汉五铢仍为小篆系统，与秦篆同族；五铢字口略肥、方孔更大（形制参数单独配置） |
| `daquan` | 大泉五十 | **悬针篆** | `Shuowen.ttf` + **纵向拉伸 1.12×** | 同上 | 开源无正版悬针篆字库；以说文小篆为底，SVG `scale(1,1.12)` 近似悬针修长笔画 |
| `kaiyuan` | 開元通寶 | **唐隶楷** | `fonts/LXGWWenKai-Regular.ttf` | SIL OFL 1.1 | 开元为成熟楷书，霞鹜文楷为开源隶楷风格 |
| `daguan` | 大觀通寶 | **瘦金体** | `fonts/LXGWZhenKaiGB-Regular.ttf` | SIL OFL 1.1 | 无 OFL 瘦金体；霞鹜臻楷 GB 为开源**近似**（细劲、略纵向拉伸） |
| `hongwu` | 洪武通寶 | **明楷书** | `LXGWWenKai-Regular.ttf` | SIL OFL 1.1 | 明代官楷，与开元同族 |

### 字体来源

```bash
cd apps/coin-cast-app/components/casting-scene/textures/skins/huaxia/fonts
python3 setup-fonts.py
```

| 文件 | 上游 |
|------|------|
| `Shuowen.ttf` | 全字库说文解字（[EBAS 对齐版](https://github.com/AlexanderMisel/font-test/blob/gh-pages/EBAS.ttf)） |
| `LXGWWenKai-Regular.ttf` | [lxgw/LxgwWenKai](https://github.com/lxgw/LxgwWenKai) v1.521 |
| `LXGWZhenKaiGB-Regular.ttf` | [lxgw/lxgwzhenkai](https://github.com/lxgw/lxgwzhenkai) v0.825 |

正式商用前请自行核对授权；悬针篆 / 瘦金体为**风格近似**，非博物馆单币复刻。

## 统一设计层

| 层 | 模块 | 内容 |
|----|------|------|
| 形制 | `typography.COIN_TYPES` | 方孔尺寸、窄郭、字面坐标 |
| 字面 | `typography.obverse_glyphs()` | `@font-face` + `<text>` |
| 质感 | `bronze_face.py` | 暗铜渐变、浮雕滤镜、锈斑 |
| 烘焙 | `gen-type-skins.py` | rsvg-convert → `design/dist/*.png` |

## 读序与字面

| 币 | 读序 | 字符 |
|----|------|------|
| 半两 / 五铢 | 右 → 左 | 半·兩 / 五·銖 |
| 四品通宝 / 大泉 | 上·下·右·左 | 见 `typography.py` |

## 弃用

- `banliang_glyphs.py` / `wuzhu_glyphs.py` 及 `verify-*-glyphs.py`：**path 描摹管线**，保留仅供对读，不再接入 `coin-skins`。
- `gen-banliang.py` / `gen-wuzhu.py`：由 `gen-type-skins.py` 取代。

## 命令

```bash
python3 fonts/setup-fonts.py      # 首次
python3 design/gen-type-skins.py  # 六币全部
python3 design/gen-type-skins.py wuzhu banliang  # 单币
```
