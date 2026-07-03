"""汉五铢字形 — path 依 W01 wuzhu-wudi.jpg（S-114 武帝）描摹。

读序：右「五」左「銖」。CC0 Gary Lee Todd。
"""
from __future__ import annotations

# 100×100；对照 _relief_crop_wu.jpg / _relief_crop_zhu.jpg
# 五：上弧横 · 下弧横 · 收腰交叉两斜
WU_STROKES: list[str] = [
    "M 24 12 Q 50 8 76 12",
    "M 32 16 Q 48 50 28 82",
    "M 68 16 Q 52 50 72 82",
    "M 22 88 Q 50 84 78 88",
]

# 銖：左金宽倒 V · 竖 · 两横；右朱短顶横 · 竖 · 深腰弯 · 外展曲脚
ZHU_STROKES: list[str] = [
    # 金
    "M 2 10 L 26 32",
    "M 50 10 L 26 32",
    "M 26 32 L 26 92",
    "M 8 44 L 44 44",
    "M 6 62 L 46 62",
    # 朱
    "M 58 10 L 82 10",
    "M 70 18 L 70 92",
    "M 44 44 Q 70 60 96 44",
    "M 70 62 Q 42 80 36 94",
    "M 70 62 Q 98 80 104 94",
]

POS: dict[str, tuple[float, float, float]] = {
    "wu": (454, 298, 104),
    "zhu": (147, 300, 120),
}

GLYPHS: dict[str, list[str]] = {
    "wu": WU_STROKES,
    "zhu": ZHU_STROKES,
}


def _place(strokes: list[str], px: float, py: float, target_h: float, ink: str, sw: float) -> str:
    box_h = 100.0
    s = target_h / box_h
    tx = px - 50 * s
    ty = py - (box_h / 2) * s
    body = "".join(
        f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="{sw / s:.2f}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
        for d in strokes
    )
    return f'<g transform="translate({tx:.2f},{ty:.2f}) scale({s:.4f})">{body}</g>'


def obverse_glyphs(ink: str = "#d4bc82", stroke_w: float = 10.5) -> str:
    parts: list[str] = []
    stroke_by_key = {"wu": 10.8, "zhu": 11.2}
    for key, strokes in GLYPHS.items():
        cx, cy, h = POS[key]
        parts.append(_place(strokes, cx, cy, h, ink, stroke_by_key.get(key, stroke_w)))
    return "".join(parts)
