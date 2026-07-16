# 汉五铢 · 三分区主题实验

写实图仅作 **结构引导**（对齐 / 浮雕检测），主题脸图为 procedural，不含照片 RGB。

| Mask | 含义 |
|------|------|
| `masks/hole.png` | 方孔（输出 alpha=0） |
| `masks/body.png` | 钱身地 |
| `masks/glyph.png` | 钱文（照片 DoG ∪ 矢量五/铢） |
| `masks/overlay.png` | R=hole G=body B=glyph 调试叠图 |

| Theme | 文件 |
|-------|------|
| 水墨 | `themes/ink.png` |
| 碑拓 | `themes/rubbing.png` |
| 印章朱文 | `themes/seal.png` |

重跑：`python3 apps/coin-cast-app/scripts/experiment-wuzhu-regions.py`
