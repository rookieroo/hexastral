# 半两 · 设计 Brief

> **现行管线**：标准字体库 + dark 青铜。见 [TYPOGRAPHY.md](./TYPOGRAPHY.md)。

| 参数 | 取值 |
|------|------|
| 书体 | 秦小篆 |
| 字体 | `fonts/Shuowen.ttf`（全字库说文解字） |
| 读序 | 右「半」左「兩」 |
| 廓缘 | 秦早期**无郭** |

```bash
python3 ../fonts/setup-fonts.py
python3 gen-type-skins.py banliang
```

`banliang_glyphs.py` / `gen-banliang.py` 为已弃用的 path 描摹管线。
