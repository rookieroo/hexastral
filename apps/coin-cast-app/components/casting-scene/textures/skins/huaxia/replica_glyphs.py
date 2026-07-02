"""Shared 华夏六枚字面 SVG fragments — 印章/石刻 style.

Bold calligraphic fonts with seal-carving SVG filters. Clean duotone,
bold strokes, rice-paper texture. No photo extraction noise.
"""
import json
import os

FONT_SEAL = "Songti SC, STSong, Noto Serif SC, serif"
FONT_KAI = "LXGW WenKai, Songti SC, KaiTi, serif"
FONT_SLENDER = "LXGW WenKai, Songti SC, serif"

# 碑拓 palette (black ink on rice paper)
INK = "#16110a"
PAPER = "#f5f0e6"

# 印章 palette (red ink on rice paper)
SEAL_INK = "#8b1a1a"
SEAL_PAPER = "#faf5ee"

HUAXIA_COINS = [
    ("banliang", "秦 · 小篆"),
    ("wuzhu", "汉 · 篆"),
    ("daquan", "新莽 · 悬针篆"),
    ("kaiyuan", "唐 · 隶楷"),
    ("daguan", "宋徽宗 · 瘦金体"),
    ("hongwu", "明 · 楷书"),
]


def char_text(ch: str, x: float, y: float, size: float, font: str, ink: str, weight: str = "bold") -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="middle" dominant-baseline="central" '
        f'fill="{ink}" stroke="none">{ch}</text>'
    )


def two_horizontal(
    right: str, left: str, size: float = 120, font: str = FONT_SEAL, ink: str = INK
) -> str:
    return (
        char_text(right, 448, 302, size, font, ink)
        + char_text(left, 152, 302, size, font, ink)
    )


def four_cross(
    top: str, bottom: str, right: str, left: str,
    size: float = 110, font: str = FONT_KAI, ink: str = INK, weight: str = "bold",
) -> str:
    s = size - 6
    return (
        char_text(top, 300, 118, size, font, ink, weight)
        + char_text(bottom, 300, 492, size, font, ink, weight)
        + char_text(right, 468, 302, s, font, ink, weight)
        + char_text(left, 132, 302, s, font, ink, weight)
    )


RUB_OBVERSE = {
    "banliang": two_horizontal("半", "兩", 120, FONT_SEAL, INK),
    "wuzhu": two_horizontal("五", "銖", 118, FONT_SEAL, INK),
    "daquan": four_cross("大", "泉", "十", "五", 104, FONT_SEAL, INK),
    "kaiyuan": four_cross("開", "元", "寶", "通", 108, FONT_KAI, INK),
    "daguan": four_cross("大", "觀", "寶", "通", 100, FONT_SLENDER, INK, "600"),
    "hongwu": four_cross("洪", "武", "寶", "通", 106, FONT_KAI, INK),
}

SEAL_OBVERSE = {
    "banliang": two_horizontal("半", "兩", 120, FONT_SEAL, SEAL_INK),
    "wuzhu": two_horizontal("五", "銖", 118, FONT_SEAL, SEAL_INK),
    "daquan": four_cross("大", "泉", "十", "五", 104, FONT_SEAL, SEAL_INK),
    "kaiyuan": four_cross("開", "元", "寶", "通", 108, FONT_KAI, SEAL_INK),
    "daguan": four_cross("大", "觀", "寶", "通", 100, FONT_SLENDER, SEAL_INK, "600"),
    "hongwu": four_cross("洪", "武", "寶", "通", 106, FONT_KAI, SEAL_INK),
}

# Stone-carving SVG filter: rough edges + ink bleed
STONE_FILTER = (
    '<filter id="stone" x="-10%" y="-10%" width="120%" height="120%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="3" result="n"/>'
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="disp"/>'
    '<feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="3" seed="17" result="s"/>'
    '<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 0" result="sa"/>'
    '<feComposite in="sa" in2="disp" operator="in" result="speck"/>'
    '<feComponentTransfer in="speck"><feFuncA type="linear" slope="0.18"/></feComponentTransfer>'
    '<feMerge><feMergeNode in="disp"/><feMergeNode in="speck"/></feMerge></filter>'
)

# Paper fiber filter (gentle)
PAPER_FILTER = (
    '<filter id="paper" x="0" y="0" width="100%" height="100%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" seed="11" result="n"/>'
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0" result="na"/>'
    '<feComponentTransfer in="na"><feFuncA type="linear" slope="0.08"/></feComponentTransfer>'
    '<feFlood flood-color="#c4b896" result="fib"/>'
    '<feComposite in="fib" in2="na" operator="in" result="fibers"/>'
    '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge></filter>'
)

RUB_DEFS = f"<defs>{STONE_FILTER}{PAPER_FILTER}</defs>"

# Coin geometry matching the default 素钱 (Plain) design from original/gen-coins.py.
# All 6 historical coins use the same ring/hole as the system default.
RUB_RING = (
    '<circle cx="300" cy="300" r="248" fill="none" stroke-width="40"/>'
    '<circle cx="300" cy="300" r="271" fill="none" stroke-width="5"/>'
    '<circle cx="300" cy="300" r="220" fill="none" stroke-width="4"/>'
)
RUB_HOLE = '<rect x="256" y="256" width="88" height="88" fill="none" stroke-width="22"/>'


RUB_PLAIN_BACK = (
    RUB_RING + RUB_HOLE
    + '<circle cx="300" cy="300" r="168" fill="none" stroke-width="2" opacity="0.25"/>'
)
