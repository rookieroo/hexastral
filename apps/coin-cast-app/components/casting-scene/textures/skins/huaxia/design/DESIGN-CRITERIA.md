# 华夏币 · 设计皮肤选图标准

> **现行字面管线**（2026-07）：标准字体库 → 统一 dark 青铜。见 `TYPOGRAPHY.md`、`gen-type-skins.py`。  
> 实物照片仍用于 gallery「华夏」对读 tier 与形制参数参考。

## 什么叫高质量参考图

| 维度 | 合格 | 不合格 |
|------|------|--------|
| **字口** | 半/兩（或五铢等）笔画边界可辨，浮雕或拓片对比清晰 | 锈蚀糊成一团、像素化、强 JPEG 块 |
| **构图** | 单枚字面占画面 ≥40%，正面平视、少透视 | 展柜远景、多枚叠放难裁切 |
| **分辨率** | 字面区域有效 ≥800px 边长（或矢量拓片） | <400px（如 F01 仅 314px 仍可用因字口极利） |
| **形制** | 与目标朝代一致（秦半两无郭、方孔、素背） | 汉以后郭缘、花穿误当秦制 |
| **授权** | CC0 / PD 优先；CC-BY(-SA) 可署名 | 商业图库未购、馆方 © 无许可 |
| **背景** | 纯色/深布利于 relief 提取；或博物馆正射 | 杂乱纹理与钱面混淆 |

## 推荐来源（优先级）

1. **博物馆单枚正射** — 咸阳博 F01、上博/Gary Todd 展柜中挑一枚
2. **Gary Lee Todd CC0** — `S-83` 秦半两、`Chinese Money` 系列；[Category:Ban Liang](https://commons.wikimedia.org/wiki/Category:Ban_Liang_coins)
3. **钱范阴文** — 笔画最干净，作结构辅证（需理解阴阳）
4. **Scott Semans CC-BY** — 版别全，选 **high-relief / VF** 标注者

## 各币待选方向（未实施）

| id | 目标形制 | 候选关键词 / Commons |
|----|----------|----------------------|
| wuzhu | 汉五铢，郭缘可选，穿多方正 | `Wu Zhu` `五铢` Gary Todd S-series |
| daquan | 新莽悬针篆，厚缘 | `daquan` `大泉五十` |
| kaiyuan | 唐开元，隶楷，郭深 | 已有 kaiyuan-tang CC0 |
| daguan | 宋瘦金，郭窄 | daguan PD 2-coin 中挑字面更利者 |
| hongwu | 明楷书 | hongwu 2-coin |

选好后：下载 → `src/<id>-ref.jpg` → `design/<id>_glyphs.py` + `gen-<id>.py`，廓缘**参照实物有无郭**（秦半两无郭 = 渐变缘，唐宋以降可加窄郭）。

## 半两 / 五铢已定

| id | 参考 | 廓缘 |
|----|------|------|
| banliang | F01 咸阳博 CC BY-SA | 无郭 |
| wuzhu | W01 Todd S-114 CC0 | 窄郭渐变 |
