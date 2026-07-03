"""Shared 华夏六枚字面 SVG fragments — clean, bold font-based design.

Characters rendered with system fonts (Songti SC, LXGW WenKai) at extra-bold
weight for maximum visibility at small sizes. Stroke outlines add thickness.
Unified design across all 6 coins — same ring/hole geometry, three palettes.

Three styles:
  - 碑拓 (rubbing):  black ink (#16110a) on rice paper (#f5f0e6)
  - 印章 (seal):     red ink (#8b1a1a) on paper (#faf5ee)
  - 写实 (bronze):   bright relief (#b09470) on dark ground → patina in Python
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ── Palettes ──────────────────────────────────────────────
INK = "#16110a"
PAPER = "#f5f0e6"
SEAL_INK = "#8b1a1a"
SEAL_PAPER = "#faf5ee"
BRONZE_RELIEF = "#b09470"
BRONZE_GROUND = "#0e0c0b"

HUAXIA_COINS = [
    ("banliang", "秦 · 小篆"),
    ("wuzhu", "汉 · 篆"),
    ("daquan", "新莽 · 悬针篆"),
    ("kaiyuan", "唐 · 隶楷"),
    ("daguan", "宋徽宗 · 瘦金体"),
    ("hongwu", "明 · 楷书"),
]

# ── Fonts & layout ────────────────────────────────────────
# Songti SC Black for bold seal-script clarity; LXGW WenKai for kai-style.
# Stroke outline adds pen-width thickness for small-size legibility.
FONT_BOLD = "Songti SC, STSong, Noto Serif SC, serif"
FONT_KAI = "LXGW WenKai, Songti SC, KaiTi, serif"

# Character settings per coin: (font, weight, char_size, right_left_size)
# All positions in 600×600 viewBox.
_CHAR_CFG = {
    # 2-char horizontal (right-to-left read)
    "banliang": (FONT_BOLD, "900", 140, 140),
    "wuzhu":    (FONT_BOLD, "900", 140, 140),
    # 4-char cross (top-bottom-right-left read)
    "daquan":   (FONT_BOLD, "900", 126, 118),
    "kaiyuan":  (FONT_KAI,  "700", 126, 118),
    "daguan":   (FONT_BOLD, "600", 120, 112),
    "hongwu":   (FONT_KAI,  "700", 126, 118),
}

# Character positions in 600×600 viewBox
_CHAR_POS = {
    "banliang": [("right", 448, 302), ("left", 152, 302)],
    "wuzhu":    [("right", 448, 302), ("left", 152, 302)],
    "daquan":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "kaiyuan":  [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "daguan":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
    "hongwu":   [("top", 300, 118), ("bottom", 300, 492), ("right", 468, 302), ("left", 132, 302)],
}

# Character text per coin (the actual characters to render)
_CHARS = {
    "banliang": {"right": "半", "left": "兩"},
    "wuzhu":    {"right": "五", "left": "銖"},
    "daquan":   {"top": "大", "bottom": "泉", "right": "十", "left": "五"},
    "kaiyuan":  {"top": "開", "bottom": "元", "right": "通", "left": "寶"},
    "daguan":   {"top": "大", "bottom": "觀", "right": "通", "left": "寶"},
    "hongwu":   {"top": "洪", "bottom": "武", "right": "通", "left": "寶"},
}


def _char_text(ch, x, y, size, font, weight, ink, stroke_w=4):
    """Build a <text> element with bold stroke outline for thickness."""
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="middle" dominant-baseline="central" '
        f'fill="{ink}" stroke="{ink}" stroke-width="{stroke_w}" '
        f'stroke-linejoin="round" stroke-linecap="round">{ch}</text>'
    )


def _build_obv(cid, ink, stroke_w=4):
    """Build obverse SVG fragment using bold font characters."""
    font, weight, char_sz, rl_sz = _CHAR_CFG[cid]
    parts = []
    for pos, x, y in _CHAR_POS[cid]:
        ch = _CHARS.get(cid, {}).get(pos)
        if ch is None:
            continue
        sz = rl_sz if pos in ("right", "left") else char_sz
        parts.append(_char_text(ch, x, y, sz, font, weight, ink, stroke_w))
    return "".join(parts)


# ── SVG Filters (gentle, for texture not noise) ───────────

# Clean stone-carving filter: light displacement, minimal speckle
STONE_FILTER = (
    '<filter id="stone" x="-5%" y="-5%" width="110%" height="110%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="7" result="n"/>'
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="disp"/>'
    '<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" seed="23" result="s"/>'
    '<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 0" result="sa"/>'
    '<feComposite in="sa" in2="disp" operator="in" result="speck"/>'
    '<feComponentTransfer in="speck"><feFuncA type="linear" slope="0.08"/></feComponentTransfer>'
    '<feMerge><feMergeNode in="disp"/><feMergeNode in="speck"/></feMerge></filter>'
)

# Subtle paper fiber filter
PAPER_FILTER = (
    '<filter id="paper" x="0" y="0" width="100%" height="100%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="13" result="n"/>'
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="na"/>'
    '<feComponentTransfer in="na"><feFuncA type="linear" slope="0.05"/></feComponentTransfer>'
    '<feFlood flood-color="#c4b896" result="fib"/>'
    '<feComposite in="fib" in2="na" operator="in" result="fibers"/>'
    '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge></filter>'
)

RUB_DEFS = f"<defs>{STONE_FILTER}{PAPER_FILTER}</defs>"
SEAL_DEFS = f"<defs>{PAPER_FILTER}</defs>"
BRONZE_DEFS = "<defs></defs>"


# ── Coin geometry (600×600 viewBox) ───────────────────────
# All 6 coins share the same ring/hole as the system 素钱.

# 碑拓 ring/hole — ink strokes inherited from parent <g>
RUB_RING = (
    '<circle cx="300" cy="300" r="248" fill="none" stroke-width="40"/>'
    '<circle cx="300" cy="300" r="271" fill="none" stroke-width="5"/>'
    '<circle cx="300" cy="300" r="220" fill="none" stroke-width="4"/>'
)
RUB_HOLE = '<rect x="256" y="256" width="88" height="88" fill="none" stroke-width="22"/>'
RUB_PLAIN_BACK = (
    RUB_RING + RUB_HOLE
    + '<circle cx="300" cy="300" r="168" fill="none" stroke-width="2" opacity="0.3"/>'
)

# 印章 ring/hole — explicit red strokes
SEAL_RING = (
    f'<circle cx="300" cy="300" r="248" fill="none" stroke="{SEAL_INK}" stroke-width="40"/>'
    f'<circle cx="300" cy="300" r="271" fill="none" stroke="{SEAL_INK}" stroke-width="5"/>'
    f'<circle cx="300" cy="300" r="220" fill="none" stroke="{SEAL_INK}" stroke-width="4"/>'
)
SEAL_HOLE = f'<rect x="256" y="256" width="88" height="88" fill="none" stroke="{SEAL_INK}" stroke-width="22"/>'
SEAL_PLAIN_BACK = (
    SEAL_RING + SEAL_HOLE
    + f'<circle cx="300" cy="300" r="168" fill="none" stroke="{SEAL_INK}" stroke-width="2" opacity="0.3"/>'
)

# 写实 ring/hole — bright bronze for patina relief detection
BRONZE_RING = (
    f'<circle cx="300" cy="300" r="248" fill="none" stroke="{BRONZE_RELIEF}" stroke-width="40"/>'
    f'<circle cx="300" cy="300" r="271" fill="none" stroke="{BRONZE_RELIEF}" stroke-width="5"/>'
    f'<circle cx="300" cy="300" r="220" fill="none" stroke="{BRONZE_RELIEF}" stroke-width="4"/>'
)
BRONZE_HOLE = (
    f'<rect x="256" y="256" width="88" height="88" '
    f'fill="{BRONZE_GROUND}" stroke="{BRONZE_RELIEF}" stroke-width="22"/>'
)
BRONZE_PLAIN_BACK = (
    BRONZE_RING + BRONZE_HOLE
    + f'<circle cx="300" cy="300" r="168" fill="none" stroke="{BRONZE_RELIEF}" stroke-width="2" opacity="0.4"/>'
)


# ── Obverse fragments (per style) ─────────────────────────
RUB_OBVERSE = {cid: _build_obv(cid, INK, stroke_w=4) for cid in _CHAR_CFG}
SEAL_OBVERSE = {cid: _build_obv(cid, SEAL_INK, stroke_w=4) for cid in _CHAR_CFG}
BRONZE_OBVERSE = {cid: _build_obv(cid, BRONZE_RELIEF, stroke_w=3) for cid in _CHAR_CFG}
