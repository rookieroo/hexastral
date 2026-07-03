# 五铢 · 设计 Brief

> **现行管线**：标准字体库 + dark 青铜。见 [TYPOGRAPHY.md](./TYPOGRAPHY.md)。

| 参数 | 取值 |
|------|------|
| 书体 | 汉篆（小篆系统） |
| 字体 | `fonts/Shuowen.ttf` |
| 读序 | 右「五」左「銖」 |
| 廓缘 | 汉制**窄郭**渐变 |

```bash
python3 ../fonts/setup-fonts.py
python3 gen-type-skins.py wuzhu
```

`wuzhu_glyphs.py` / `verify-*-glyphs.py` 为已弃用的 path 描摹管线。
