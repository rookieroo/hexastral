"""秦半两字形 — path 依 F01 咸阳博物馆半两（banliang-xianyang.jpg）描摹。

读序：右「半」左「兩」。CC BY-SA · 见 banliang_ref.py。
"""
from __future__ import annotations

# 100×100；对照 ref_relief_annotated.jpg（F01 浮雕）
# 半：八字肩 · 宽横 · 中竖 · 底撇
BAN_STROKES: list[str] = [
    "M 36 16 L 50 10 L 64 16",
    "M 20 32 L 80 32",
    "M 50 32 L 50 56",
    "M 50 56 Q 24 64 10 88",
    "M 50 56 Q 76 64 90 88",
]

# 兩：顶横 · 双框 · 框内双人（短人两）
LIANG_STROKES: list[str] = [
    "M 6 13 L 94 13",
    "M 11 13 L 11 76",
    "M 43 13 L 43 76",
    "M 11 76 L 43 76",
    "M 27 25 L 27 64",
    "M 27 25 L 19 43",
    "M 27 25 L 35 43",
    "M 57 13 L 57 76",
    "M 89 13 L 89 76",
    "M 57 76 L 89 76",
    "M 73 25 L 73 64",
    "M 73 25 L 65 43",
    "M 73 25 L 81 43",
]

POS: dict[str, tuple[float, float, float]] = {
    "ban": (452, 302, 108),
    "liang": (146, 302, 108),
}

GLYPHS: dict[str, list[str]] = {
    "ban": BAN_STROKES,
    "liang": LIANG_STROKES,
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


def obverse_glyphs(ink: str = "#d4bc82", stroke_w: float = 11.0) -> str:
    parts: list[str] = []
    for key, strokes in GLYPHS.items():
        cx, cy, h = POS[key]
        parts.append(_place(strokes, cx, cy, h, ink, stroke_w))
    return "".join(parts)
