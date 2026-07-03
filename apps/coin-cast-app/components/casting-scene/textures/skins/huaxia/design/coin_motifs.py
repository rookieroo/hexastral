"""HexAstral · 卦钱六爻原创套（自有 IP）。

设计原则（综合多轮迭代）：
- 六爻起卦：字面阳纹饱满，背面阴纹克制，掷出后可辨 2/3
- 图案主、一字点睛为辅（字面廓下小篆，低透明度）
- 天圆地方方孔 + 朝代形制意象，不临摹第三方图库
- 公有领域概念：四出、爻象、八卦、洛书、日月

viewBox 600×600，中心 (300,300)。
"""
from __future__ import annotations

import math
from dataclasses import dataclass

CX, CY = 300.0, 300.0
HOLE = 43.0  # half-edge of square hole (86×86)


@dataclass(frozen=True)
class OracleCoinSpec:
    theme: str
    yang_desc: str
    yin_desc: str
    mark: str
    font_key: str


ORACLE_SET: dict[str, OracleCoinSpec] = {
    "banliang": OracleCoinSpec("起卦", "四出方镂", "三断爻", "卦", "shuowen"),
    "wuzhu": OracleCoinSpec("揲爻", "五辐方镂", "单实爻", "爻", "shuowen"),
    "daquan": OracleCoinSpec("变卦", "十字变爻", "双断爻", "变", "shuowen"),
    "kaiyuan": OracleCoinSpec("流通", "八卦环", "洛书点", "易", "wenkai"),
    "daguan": OracleCoinSpec("观象", "涟漪三爻", "三断爻", "觀", "zhenkai"),
    "hongwu": OracleCoinSpec("阴阳", "日月八辐", "单月", "陰", "wenkai"),
}

_NUDGE = ((1.2, -0.7), (-1.0, 0.9), (0.8, 1.2), (-1.1, -0.8))


def _circle(cx: float, cy: float, r: float, sw: float, fill: str = "none") -> str:
    return (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" '
        f'stroke="currentColor" stroke-width="{sw:.1f}"/>'
    )


def _line(x1: float, y1: float, x2: float, y2: float, sw: float) -> str:
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
        f'stroke="currentColor" stroke-width="{sw:.1f}" stroke-linecap="round"/>'
    )


def _dot(cx: float, cy: float, r: float, fill: str) -> str:
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" stroke="none"/>'


def _rect(x: float, y: float, w: float, h: float, *, sw: float = 0, fill: str = "none") -> str:
    stroke = f' stroke="currentColor" stroke-width="{sw:.1f}"' if sw > 0 else ""
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}"{stroke}/>'


def _hole(paper: str) -> str:
    return _rect(CX - HOLE, CY - HOLE, HOLE * 2, HOLE * 2, fill=paper)


def _evenodd_disc(cx: float, cy: float, r: float, cut: str) -> str:
    disc = (
        f"M {cx - r:.1f} {cy:.1f} A {r:.1f} {r:.1f} 0 1 0 {cx + r:.1f} {cy:.1f} "
        f"A {r:.1f} {r:.1f} 0 1 0 {cx - r:.1f} {cy:.1f} Z"
    )
    return f'<path fill-rule="evenodd" fill="currentColor" stroke="none" d="{disc} {cut}"/>'


def _yao(cx: float, cy: float, yang: bool, count: int, span: float, gap: float, bar_h: float) -> str:
    parts: list[str] = []
    total = count * bar_h + (count - 1) * gap
    y0 = cy - total / 2
    for i in range(count):
        y = y0 + i * (bar_h + gap)
        if yang:
            parts.append(_rect(cx - span / 2, y, span, bar_h, fill="currentColor"))
        else:
            w = span * 0.36
            mid = span * 0.28
            parts.append(_rect(cx - span / 2, y, w, bar_h, fill="currentColor"))
            parts.append(_rect(cx - span / 2 + w + mid, y, w, bar_h, fill="currentColor"))
    return "".join(parts)


def _si_chu(sw: float) -> str:
    half = HOLE
    corners = [(CX + half, CY - half), (CX + half, CY + half), (CX - half, CY + half), (CX - half, CY - half)]
    parts: list[str] = []
    for qx, qy in corners:
        ang = math.atan2(qy - CY, qx - CX)
        parts.append(_line(qx, qy, CX + 224 * math.cos(ang), CY + 224 * math.sin(ang), sw * 0.88))
    return "".join(parts) + _circle(CX, CY, 196, sw * 0.5)


def _rim_pair(sw: float) -> str:
    return _circle(CX, CY, 231, sw) + _circle(CX, CY, 204, sw * 0.55)


# ── 起卦 · 半两 ───────────────────────────────────────────────────
def yang_banliang(sw: float, paper: str, ink: str) -> str:
    sq = HOLE - 2
    cut = f"M {CX - sq:.1f} {CY - sq:.1f} h {sq * 2:.1f} v {sq * 2:.1f} h {-sq * 2:.1f} Z"
    return _rim_pair(sw) + _evenodd_disc(CX, CY, 172, cut) + _si_chu(sw) + _hole(paper)


def yin_banliang(sw: float, paper: str, ink: str) -> str:
    return _rim_pair(sw) + _yao(CX, CY, False, 3, 58, 12, 7) + _hole(paper)


# ── 揲爻 · 五铢 ───────────────────────────────────────────────────
def yang_wuzhu(sw: float, paper: str, ink: str) -> str:
    parts = [_circle(CX, CY, 212, sw * 2.2), _circle(CX, CY, 190, sw * 0.6)]
    for i in range(5):
        ang = 2 * math.pi * i / 5 - math.pi / 2 + 0.12
        parts.append(_line(CX + 56 * math.cos(ang), CY + 56 * math.sin(ang), CX + 170 * math.cos(ang), CY + 170 * math.sin(ang), sw * 0.92))
    cut = f"M {CX - HOLE:.1f} {CY - HOLE:.1f} h {HOLE * 2:.1f} v {HOLE * 2:.1f} h {-HOLE * 2:.1f} Z"
    return "".join(parts) + _evenodd_disc(CX, CY, 166, cut)


def yin_wuzhu(sw: float, paper: str, ink: str) -> str:
    return _circle(CX, CY, 228, sw) + _yao(CX, CY, True, 1, 52, 0, 10) + _hole(paper)


# ── 变卦 · 大泉 ───────────────────────────────────────────────────
def yang_daquan(sw: float, paper: str, ink: str) -> str:
    parts = [_circle(CX, CY, 231, sw * 0.65), _circle(CX, CY, 200, sw * 1.6)]
    for ang in (0.06, math.pi / 2, math.pi, 3 * math.pi / 2):
        parts.append(_line(CX + 52 * math.cos(ang), CY + 52 * math.sin(ang), CX + 178 * math.cos(ang), CY + 178 * math.sin(ang), sw))
    parts.append(_yao(CX, CY, False, 1, 38, 0, 6))
    cut = f"M {CX - 38:.1f} {CY - 38:.1f} h 76 v 76 h -76 Z"
    return "".join(parts) + _evenodd_disc(CX, CY, 150, cut)


def yin_daquan(sw: float, paper: str, ink: str) -> str:
    return _circle(CX, CY, 228, sw) + _yao(CX, CY, False, 2, 50, 11, 7) + _hole(paper)


# ── 流通 · 开元 ───────────────────────────────────────────────────
def yang_kaiyuan(sw: float, paper: str, ink: str) -> str:
    tri_bits = [1, 1, 0, 0, 1, 0, 1, 0]
    parts = [_circle(CX, CY, 231, sw * 0.6), _circle(CX, CY, 199, sw * 1.65)]
    for i, bits in enumerate(tri_bits):
        ang = math.radians(251 + i * 45)
        gx = CX + 164 * math.cos(ang)
        gy = CY + 164 * math.sin(ang)
        for j, solid in enumerate([bits, (bits + 1) % 2, 1]):
            ly = gy - 10 + j * 10
            if solid:
                parts.append(_rect(gx - 14, ly - 2.5, 28, 5, fill="currentColor"))
            else:
                parts.append(_rect(gx - 14, ly - 2.5, 10, 5, fill="currentColor"))
                parts.append(_rect(gx + 4, ly - 2.5, 10, 5, fill="currentColor"))
    return "".join(parts) + _hole(paper)


def yin_kaiyuan(sw: float, paper: str, ink: str) -> str:
    grid = [(0, 0, 4), (1, 0, 9), (2, 0, 2), (0, 1, 3), (2, 1, 7), (0, 2, 8), (1, 2, 1), (2, 2, 6)]
    parts = [_circle(CX, CY, 229, sw)]
    for col, row, n in grid:
        px = CX + (col - 1) * 30
        py = CY + (row - 1) * 30
        for k in range(n):
            parts.append(_dot(px + (k % 3) * 7 - 7, py + (k // 3) * 7 - 3, 3.2, ink))
    return "".join(parts) + _hole(paper)


# ── 观象 · 大观 ───────────────────────────────────────────────────
def yang_daguan(sw: float, paper: str, ink: str) -> str:
    rings = "".join(_circle(CX, CY, 218 - i * 18, sw * 0.42) for i in range(4))
    return rings + _yao(CX, CY, True, 3, 44, 10, 6) + _hole(paper)


def yin_daguan(sw: float, paper: str, ink: str) -> str:
    return _circle(CX, CY, 227, sw) + _yao(CX, CY, False, 3, 54, 12, 7) + _hole(paper)


# ── 阴阳 · 洪武 ───────────────────────────────────────────────────
def yang_hongwu(sw: float, paper: str, ink: str) -> str:
    parts = [
        _circle(CX, CY, 231, sw * 0.58),
        _dot(CX - 30, CY + 0.8, 18, ink),
        f'<path d="M {CX + 35:.1f} {CY - 19:.1f} A 19 19 0 1 1 {CX + 35:.1f} {CY + 19:.1f} '
        f'A 13 13 0 1 0 {CX + 35:.1f} {CY - 19:.1f} Z" fill="{ink}" stroke="none"/>',
    ]
    for i in range(8):
        ang = 2 * math.pi * i / 8 - math.pi / 2 + 0.18
        parts.append(_line(CX + 108 * math.cos(ang), CY + 108 * math.sin(ang), CX + 176 * math.cos(ang), CY + 176 * math.sin(ang), sw * 0.48))
    return "".join(parts) + _hole(paper)


def yin_hongwu(sw: float, paper: str, ink: str) -> str:
    return (
        _circle(CX, CY, 228, sw)
        + f'<path d="M {CX + 1:.1f} {CY - 23:.1f} A 23 23 0 1 1 {CX + 1:.1f} {CY + 23:.1f} '
        f'A 15.5 15.5 0 1 0 {CX + 1:.1f} {CY - 23:.1f} Z" fill="{ink}" stroke="none"/>'
        + _hole(paper)
    )


_YANG = {
    "banliang": yang_banliang,
    "wuzhu": yang_wuzhu,
    "daquan": yang_daquan,
    "kaiyuan": yang_kaiyuan,
    "daguan": yang_daguan,
    "hongwu": yang_hongwu,
}
_YIN = {
    "banliang": yin_banliang,
    "wuzhu": yin_wuzhu,
    "daquan": yin_daquan,
    "kaiyuan": yin_kaiyuan,
    "daguan": yin_daguan,
    "hongwu": yin_hongwu,
}


def yang_motif(coin_id: str, sw: float, paper: str, ink: str) -> str:
    return _YANG[coin_id](sw, paper, ink)


def yin_motif(coin_id: str, sw: float, paper: str, ink: str) -> str:
    return _YIN[coin_id](sw, paper, ink)


def coin_motif_label(coin_id: str) -> str:
    s = ORACLE_SET[coin_id]
    return f"{s.theme} · {s.yang_desc} / {s.yin_desc}"


def oracle_mark(coin_id: str) -> OracleCoinSpec:
    return ORACLE_SET[coin_id]

# backward compat for gen scripts
COIN_MOTIFS = {k: (v.yang_desc, v.yin_desc) for k, v in ORACLE_SET.items()}
