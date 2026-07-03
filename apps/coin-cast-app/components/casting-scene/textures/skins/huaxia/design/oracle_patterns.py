"""六爻占卜铜钱 · 图案层（字面阳纹 / 背面阴纹）。

图案优先、文字为辅：起卦时 3 背 2 字，两面纹样差异须在小尺寸 3D 币上可辨。
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable


def _sw(base: float, scale: float = 1.0) -> float:
    return base * scale


def hole_corners(hx: float, hy: float, hw: float, hh: float) -> list[tuple[float, float]]:
    x1, y1 = hx, hy
    x2, y2 = hx + hw, hy + hh
    return [(x2, y1), (x2, y2), (x1, y2), (x1, y1)]


def si_chu_wen(
    cx: float,
    cy: float,
    hx: float,
    hy: float,
    hw: float,
    hh: float,
    inner_r: float = 168,
    stroke_w: float = 10,
) -> str:
    """四出文 — 方孔四角射向廓缘（素钱起卦经典纹）。"""
    parts: list[str] = []
    for qx, qy in hole_corners(hx, hy, hw, hh):
        ang = math.atan2(qy - cy, qx - cx)
        ex = cx + inner_r * math.cos(ang)
        ey = cy + inner_r * math.sin(ang)
        parts.append(
            f'<line x1="{qx:.1f}" y1="{qy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" '
            f'stroke-width="{stroke_w:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


def radial_spokes(cx: float, cy: float, count: int, r0: float, r1: float, stroke_w: float) -> str:
    parts: list[str] = []
    for i in range(count):
        ang = (2 * math.pi * i / count) - math.pi / 2
        x0 = cx + r0 * math.cos(ang)
        y0 = cy + r0 * math.sin(ang)
        x1 = cx + r1 * math.cos(ang)
        y1 = cy + r1 * math.sin(ang)
        parts.append(
            f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" '
            f'stroke-width="{stroke_w:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


def ring(cx: float, cy: float, r: float, stroke_w: float) -> str:
    return (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" '
        f'stroke-width="{stroke_w:.1f}"/>'
    )


def yao_bars(
    cx: float,
    cy: float,
    yang: bool,
    count: int = 3,
    span: float = 56,
    gap: float = 14,
    bar_h: float = 8,
    stroke_w: float = 0,
) -> str:
    """三爻条 — 阳爻实线 / 阴爻断线（背面识读）。"""
    parts: list[str] = []
    total_h = count * bar_h + (count - 1) * gap
    y0 = cy - total_h / 2
    for i in range(count):
        y = y0 + i * (bar_h + gap)
        if yang:
            parts.append(f'<rect x="{cx - span / 2:.1f}" y="{y:.1f}" width="{span:.1f}" height="{bar_h:.1f}" rx="1"/>')
        else:
            w = span * 0.38
            mid = span * 0.24
            parts.append(f'<rect x="{cx - span / 2:.1f}" y="{y:.1f}" width="{w:.1f}" height="{bar_h:.1f}" rx="1"/>')
            parts.append(
                f'<rect x="{cx - span / 2 + w + mid:.1f}" y="{y:.1f}" width="{w:.1f}" height="{bar_h:.1f}" rx="1"/>'
            )
    return "".join(parts)


def bagua_ring(cx: float, cy: float, radius: float, stroke_w: float = 7) -> str:
    """八卦方位简纹 — 八组短爻绕廓。"""
    names = "乾巽坎艮坤震離兌"
    tri: dict[str, list[int]] = {
        "乾": [1, 1, 1],
        "巽": [1, 1, 0],
        "坎": [0, 1, 0],
        "艮": [1, 0, 0],
        "坤": [0, 0, 0],
        "震": [0, 0, 1],
        "離": [1, 0, 1],
        "兌": [0, 1, 1],
    }
    parts: list[str] = []
    for i, name in enumerate(names):
        ang = math.radians(270 + i * 45)
        gx = cx + radius * math.cos(ang)
        gy = cy + radius * math.sin(ang)
        bits = tri[name]
        for j, solid in enumerate(bits):
            ly = gy - 12 + j * 12
            if solid:
                parts.append(
                    f'<rect x="{gx - 18:.0f}" y="{ly - 3:.0f}" width="36" height="6" rx="1" '
                    f'stroke-width="{stroke_w:.1f}"/>'
                )
            else:
                parts.append(f'<rect x="{gx - 18:.0f}" y="{ly - 3:.0f}" width="14" height="6" rx="1"/>')
                parts.append(f'<rect x="{gx + 4:.0f}" y="{ly - 3:.0f}" width="14" height="6" rx="1"/>')
    return "".join(parts)


def lo_shu_dots(cx: float, cy: float, cell: float = 34, r: float = 5) -> str:
    """洛书九宫点 — 背面河洛。"""
    grid = [(0, 0, 4), (1, 0, 9), (2, 0, 2), (0, 1, 3), (2, 1, 7), (0, 2, 8), (1, 2, 1), (2, 2, 6)]
    parts: list[str] = []
    for col, row, n in grid:
        px = cx + (col - 1) * cell
        py = cy + (row - 1) * cell
        for k in range(n):
            ox = (k % 3) * 8 - 8
            oy = (k // 3) * 8 - 4
            parts.append(f'<circle cx="{px + ox:.1f}" cy="{py + oy:.1f}" r="{r:.1f}"/>')
    return "".join(parts)


def sun_moon(cx: float, cy: float, r: float = 22) -> str:
    return (
        f'<circle cx="{cx - 28:.1f}" cy="{cy:.1f}" r="{r:.1f}"/>'
        f'<path d="M {cx + 34:.1f} {cy - r:.1f} A {r:.1f} {r:.1f} 0 1 1 {cx + 34:.1f} {cy + r:.1f} '
        f'A {r * 0.72:.1f} {r * 0.72:.1f} 0 1 0 {cx + 34:.1f} {cy - r:.1f} Z"/>'
    )


def moon_only(cx: float, cy: float, r: float = 24) -> str:
    return (
        f'<path d="M {cx:.1f} {cy - r:.1f} A {r:.1f} {r:.1f} 0 1 1 {cx:.1f} {cy + r:.1f} '
        f'A {r * 0.7:.1f} {r * 0.7:.1f} 0 1 0 {cx:.1f} {cy - r:.1f} Z"/>'
    )


def cloud_scroll(cx: float, cy: float, w: float = 120) -> str:
    return (
        f'<path d="M {cx - w:.1f} {cy:.1f} Q {cx - w * 0.5:.1f} {cy - 18:.1f} {cx:.1f} {cy:.1f} '
        f'Q {cx + w * 0.5:.1f} {cy + 18:.1f} {cx + w:.1f} {cy:.1f}" fill="none" stroke-width="8" '
        f'stroke-linecap="round"/>'
    )


def cross_quarter(cx: float, cy: float, r0: float, r1: float, stroke_w: float) -> str:
    parts: list[str] = []
    for ang in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        x0 = cx + r0 * math.cos(ang)
        y0 = cy + r0 * math.sin(ang)
        x1 = cx + r1 * math.cos(ang)
        y1 = cy + r1 * math.sin(ang)
        parts.append(
            f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" '
            f'stroke-width="{stroke_w:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


@dataclass(frozen=True)
class HoleGeom:
    x: float
    y: float
    w: float
    h: float

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2


PatternFn = Callable[[HoleGeom], str]


def _banliang_yang(h: HoleGeom) -> str:
    return si_chu_wen(300, 300, h.x, h.y, h.w, h.h, inner_r=175, stroke_w=11) + ring(300, 300, 198, 4)


def _banliang_yin(h: HoleGeom) -> str:
    return ring(300, 300, 185, 5) + yao_bars(300, 300, yang=False, count=3, span=64)


def _wuzhu_yang(h: HoleGeom) -> str:
    return (
        radial_spokes(h.cx, h.cy, 5, 52, 175, 9)
        + ring(h.cx, h.cy, 178, 4)
        + si_chu_wen(300, 300, h.x, h.y, h.w, h.h, inner_r=155, stroke_w=7)
    )


def _wuzhu_yin(h: HoleGeom) -> str:
    return radial_spokes(h.cx, h.cy, 5, 60, 120, 5) + yao_bars(300, 300, yang=True, count=1, span=48, bar_h=10)


def _daquan_yang(h: HoleGeom) -> str:
    return (
        cross_quarter(h.cx, h.cy, 58, 180, 10)
        + ring(h.cx, h.cy, 190, 5)
        + radial_spokes(h.cx, h.cy, 8, 95, 165, 4)
    )


def _daquan_yin(h: HoleGeom) -> str:
    return cross_quarter(h.cx, h.cy, 70, 130, 6) + yao_bars(300, 300, yang=False, count=2, span=52)


def _kaiyuan_yang(h: HoleGeom) -> str:
    return bagua_ring(300, 300, 178, 6) + ring(300, 300, 142, 3)


def _kaiyuan_yin(h: HoleGeom) -> str:
    return lo_shu_dots(300, 300, cell=30, r=4) + ring(300, 300, 175, 4)


def _daguan_yang(h: HoleGeom) -> str:
    return (
        cloud_scroll(300, 268, 110)
        + cloud_scroll(300, 332, 90)
        + yao_bars(300, 300, yang=True, count=3, span=42, bar_h=6, gap=10)
    )


def _daguan_yin(h: HoleGeom) -> str:
    return yao_bars(300, 300, yang=False, count=3, span=58) + ring(300, 300, 188, 4)


def _hongwu_yang(h: HoleGeom) -> str:
    return sun_moon(300, 300, 20) + radial_spokes(300, 300, 12, 130, 175, 3)


def _hongwu_yin(h: HoleGeom) -> str:
    return moon_only(300, 300, 26) + ring(300, 300, 182, 4)


ORACLE_PATTERNS: dict[str, tuple[PatternFn, PatternFn]] = {
    "banliang": (_banliang_yang, _banliang_yin),
    "wuzhu": (_wuzhu_yang, _wuzhu_yin),
    "daquan": (_daquan_yang, _daquan_yin),
    "kaiyuan": (_kaiyuan_yang, _kaiyuan_yin),
    "daguan": (_daguan_yang, _daguan_yin),
    "hongwu": (_hongwu_yang, _hongwu_yin),
}
