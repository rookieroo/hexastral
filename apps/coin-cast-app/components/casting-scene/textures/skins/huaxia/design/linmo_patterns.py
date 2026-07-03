"""临摹层 · C.Design 铜钱纹几何抽象 + 原币形制方孔。

参考：assets/IMG_5944 (铜钱纹 5×5)、IMG_5942 (秦汉唐宋明原币)。
图案主、字形辅；阴面取同系列简化纹。
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable


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


def ring(cx: float, cy: float, r: float, sw: float) -> str:
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke-width="{sw:.1f}"/>'


def nested_rings(cx: float, cy: float, radii: tuple[float, ...], sw: float) -> str:
    return "".join(ring(cx, cy, r, sw) for r in radii)


def corner_dots(h: HoleGeom, offset: float = 22, r: float = 5.5) -> str:
    """方孔四角钉 — 铜钱纹经典要素。"""
    pts = [
        (h.x - offset, h.y - offset),
        (h.x + h.w + offset, h.y - offset),
        (h.x + h.w + offset, h.y + h.h + offset),
        (h.x - offset, h.y + h.h + offset),
    ]
    return "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>' for x, y in pts)


def inner_hole_rim(h: HoleGeom, inset: float = 7, sw: float = 4.5) -> str:
    return (
        f'<rect x="{h.x + inset:.1f}" y="{h.y + inset:.1f}" '
        f'width="{h.w - 2 * inset:.1f}" height="{h.h - 2 * inset:.1f}" '
        f'fill="none" stroke-width="{sw:.1f}"/>'
    )


def four_point_star(cx: float, cy: float, r: float, sw: float, concave: float = 0.38) -> str:
    """四角星 — 内凹边（C.Design 星芒）。"""
    pts: list[tuple[float, float]] = []
    for i in range(4):
        ang = math.pi / 2 * i - math.pi / 2
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    def mid(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = mx - cx, my - cy
        d = math.hypot(dx, dy) or 1
        k = 1 - concave
        return cx + dx / d * r * k, cy + dy / d * r * k
    d = (
        f"M {pts[0][0]:.1f} {pts[0][1]:.1f} "
        f"Q {mid(pts[0], pts[1])[0]:.1f} {mid(pts[0], pts[1])[1]:.1f} {pts[1][0]:.1f} {pts[1][1]:.1f} "
        f"Q {mid(pts[1], pts[2])[0]:.1f} {mid(pts[1], pts[2])[1]:.1f} {pts[2][0]:.1f} {pts[2][1]:.1f} "
        f"Q {mid(pts[2], pts[3])[0]:.1f} {mid(pts[2], pts[3])[1]:.1f} {pts[3][0]:.1f} {pts[3][1]:.1f} "
        f"Q {mid(pts[3], pts[0])[0]:.1f} {mid(pts[3], pts[0])[1]:.1f} {pts[0][0]:.1f} {pts[0][1]:.1f} Z"
    )
    return f'<path d="{d}" fill="none" stroke-width="{sw:.1f}" stroke-linejoin="round"/>'


def intersecting_arcs(cx: float, cy: float, r: float, sw: float) -> str:
    """四弧交瓣 — 铜钱纹 R4C4 类。"""
    parts: list[str] = []
    for i in range(4):
        ang = math.pi / 2 * i
        ex = cx + r * math.cos(ang)
        ey = cy + r * math.sin(ang)
        parts.append(
            f'<path d="M {cx:.1f} {cy - r:.1f} A {r:.1f} {r:.1f} 0 0 1 {ex:.1f} {ey:.1f}" '
            f'fill="none" stroke-width="{sw:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


def petal_lens(cx: float, cy: float, r: float, sw: float) -> str:
    """四瓣透镜 — 双弧交叠。"""
    parts: list[str] = []
    for ang in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        x0 = cx + r * math.cos(ang)
        y0 = cy + r * math.sin(ang)
        x1 = cx + r * math.cos(ang + math.pi / 2)
        y1 = cy + r * math.sin(ang + math.pi / 2)
        parts.append(
            f'<path d="M {x0:.1f} {y0:.1f} A {r:.1f} {r:.1f} 0 0 1 {x1:.1f} {y1:.1f}" '
            f'fill="none" stroke-width="{sw:.1f}"/>'
        )
    return "".join(parts)


def diamond(cx: float, cy: float, half: float, sw: float) -> str:
    return (
        f'<path d="M {cx:.1f} {cy - half:.1f} L {cx + half:.1f} {cy:.1f} '
        f'L {cx:.1f} {cy + half:.1f} L {cx - half:.1f} {cy:.1f} Z" '
        f'fill="none" stroke-width="{sw:.1f}" stroke-linejoin="round"/>'
    )


def cross_spokes(cx: float, cy: float, r0: float, r1: float, sw: float) -> str:
    parts: list[str] = []
    for ang in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        x0 = cx + r0 * math.cos(ang)
        y0 = cy + r0 * math.sin(ang)
        x1 = cx + r1 * math.cos(ang)
        y1 = cy + r1 * math.sin(ang)
        parts.append(
            f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" '
            f'stroke-width="{sw:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


def radial_spokes(cx: float, cy: float, n: int, r0: float, r1: float, sw: float) -> str:
    parts: list[str] = []
    for i in range(n):
        ang = 2 * math.pi * i / n - math.pi / 2
        parts.append(
            f'<line x1="{cx + r0 * math.cos(ang):.1f}" y1="{cy + r0 * math.sin(ang):.1f}" '
            f'x2="{cx + r1 * math.cos(ang):.1f}" y2="{cy + r1 * math.sin(ang):.1f}" '
            f'stroke-width="{sw:.1f}" stroke-linecap="round"/>'
        )
    return "".join(parts)


def lo_shu_grid(cx: float, cy: float, cell: float = 28, r: float = 3.5) -> str:
    grid = [(0, 0, 4), (1, 0, 9), (2, 0, 2), (0, 1, 3), (2, 1, 7), (0, 2, 8), (1, 2, 1), (2, 2, 6)]
    parts: list[str] = []
    for col, row, n in grid:
        px = cx + (col - 1) * cell
        py = cy + (row - 1) * cell
        for k in range(n):
            ox = (k % 3) * 7 - 7
            oy = (k // 3) * 7 - 3
            parts.append(f'<circle cx="{px + ox:.1f}" cy="{py + oy:.1f}" r="{r:.1f}"/>')
    return "".join(parts)


PatternFn = Callable[[HoleGeom], str]


def _banliang_yang(h: HoleGeom) -> str:
    # 秦半两：大孔无廓，双环 + 四角钉 + 淡四出
    return (
        nested_rings(300, 300, (192, 168, 142), 4)
        + corner_dots(h, 20, 5)
        + cross_spokes(h.cx, h.cy, 48, 138, 5)
    )


def _banliang_yin(h: HoleGeom) -> str:
    return nested_rings(300, 300, (185, 158), 5) + four_point_star(300, 300, 72, 6)


def _wuzhu_yang(h: HoleGeom) -> str:
    # 汉五铢：大孔内廓，五环钉 + 五辐
    return (
        inner_hole_rim(h, 8, 5)
        + nested_rings(300, 300, (198, 172, 148), 3.5)
        + corner_dots(h, 18, 4.5)
        + radial_spokes(h.cx, h.cy, 5, 55, 168, 6)
    )


def _wuzhu_yin(h: HoleGeom) -> str:
    return inner_hole_rim(h, 8, 4) + nested_rings(300, 300, (188, 162), 4) + diamond(300, 300, 38, 5)


def _daquan_yang(h: HoleGeom) -> str:
    # 新莽：十字泉 + 四弧瓣
    return (
        inner_hole_rim(h, 6, 4)
        + cross_spokes(h.cx, h.cy, 56, 182, 9)
        + petal_lens(300, 300, 118, 5)
        + corner_dots(h, 16, 4)
        + ring(300, 300, 196, 4)
    )


def _daquan_yin(h: HoleGeom) -> str:
    return cross_spokes(h.cx, h.cy, 68, 128, 5) + ring(300, 300, 178, 4)


def _kaiyuan_yang(h: HoleGeom) -> str:
    # 唐开元：三环 + 八卦辐 + 方孔钉
    return (
        inner_hole_rim(h, 6, 4.5)
        + nested_rings(300, 300, (200, 168, 138), 3.5)
        + corner_dots(h, 15, 4)
        + radial_spokes(300, 300, 8, 108, 178, 4)
    )


def _kaiyuan_yin(h: HoleGeom) -> str:
    return nested_rings(300, 300, (190, 155), 4) + lo_shu_grid(300, 300, 26, 3)


def _daguan_yang(h: HoleGeom) -> str:
    # 宋大观：四弧交星 + 双环
    return (
        inner_hole_rim(h, 6, 4)
        + intersecting_arcs(300, 300, 125, 6)
        + four_point_star(300, 300, 58, 5, 0.42)
        + nested_rings(300, 300, (198, 172), 3)
    )


def _daguan_yin(h: HoleGeom) -> str:
    return four_point_star(300, 300, 88, 5, 0.35) + ring(300, 300, 182, 4)


def _hongwu_yang(h: HoleGeom) -> str:
    # 明洪武：细廓 + 中心菱 + 十二辐
    return (
        inner_hole_rim(h, 6, 4.5)
        + nested_rings(300, 300, (202, 178), 3)
        + diamond(300, 300, 32, 4)
        + radial_spokes(300, 300, 12, 118, 188, 2.5)
        + corner_dots(h, 14, 3.5)
    )


def _hongwu_yin(h: HoleGeom) -> str:
    return nested_rings(300, 300, (188, 148), 4) + diamond(300, 300, 52, 5)


LINMO_PATTERNS: dict[str, tuple[PatternFn, PatternFn]] = {
    "banliang": (_banliang_yang, _banliang_yin),
    "wuzhu": (_wuzhu_yang, _wuzhu_yin),
    "daquan": (_daquan_yang, _daquan_yin),
    "kaiyuan": (_kaiyuan_yang, _kaiyuan_yin),
    "daguan": (_daguan_yang, _daguan_yin),
    "hongwu": (_hongwu_yang, _hongwu_yin),
}
