# v10h 半两

## 核心转变：纹路即底
之前 v10g 在纯色场上叠归一化 luma 扰动，仍像「数字噪点」。
v10h 直接把参考图裁切铺满钱身：

| 皮肤 | 底图来源 | 处理 |
|------|----------|------|
| 纸本 | `tex-rubbing-body.jpg` 左缘墨海 | blur 10 抹平字口，保留拓纸纤维/墨渍 |
| 印章 | `skin/seal-paste.jpg` 瓷盒膏面 | blur 6，保留膏体厚薄 |

实图坑洼仅 3–4% 乘性压印（结构咬合，不是盐粒）。

## 生成
`python3 docs/design/coins/scripts/gen-banliang-v10.py`
