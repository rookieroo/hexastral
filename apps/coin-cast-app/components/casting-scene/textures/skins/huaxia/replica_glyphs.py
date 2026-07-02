"""Shared 华夏五枚字面 SVG fragments (对读 layout per SOURCING.md)."""

FONT_SEAL = "Songti SC, STSong, SimSun, serif"
FONT_KAI = "LXGW WenKai, Songti SC, KaiTi, serif"
FONT_SLENDER = "LXGW WenKai, Songti SC, serif"

# Rubbing palette (碑拓)
INK = "#16110a"
PAPER = "#e7ddc7"

# Bronze palette (写实)
BRONZE_BODY = "#7a6340"
BRONZE_RIM = "#4a3c28"
BRONZE_HI = "#b89458"
BRONZE_CARVED = "#3a2e1e"
BRONZE_PIT = "#2e2418"

HUAXIA_COINS = [
    ("banliang", "banliang.jpg", "秦 · 小篆"),
    ("wuzhu", "wuzhu.jpg", "汉 · 篆"),
    ("daquan", "daquan.jpg", "新莽 · 悬针篆"),
    ("kaiyuan", "kaiyuan.png", "唐 · 隶楷"),
    ("daguan", "daguan.jpg", "宋徽宗 · 瘦金体"),
]


def text_rub(
    ch: str,
    x: float,
    y: float,
    size: float,
    font: str = FONT_KAI,
    weight: str = "600",
) -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="middle" dominant-baseline="central" '
        f'stroke="none" fill="{INK}">{ch}</text>'
    )


def text_bronze(
    ch: str,
    x: float,
    y: float,
    size: float,
    font: str = FONT_KAI,
    weight: str = "600",
) -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="middle" dominant-baseline="central" '
        f'fill="{BRONZE_CARVED}" stroke="{BRONZE_PIT}" stroke-width="1.2">{ch}</text>'
    )


def two_horizontal_rub(right: str, left: str, size: float = 92, font: str = FONT_SEAL) -> str:
    return text_rub(right, 448, 302, size, font) + text_rub(left, 152, 302, size, font)


def two_horizontal_bronze(right: str, left: str, size: float = 92, font: str = FONT_SEAL) -> str:
    return text_bronze(right, 448, 302, size, font) + text_bronze(left, 152, 302, size, font)


def four_cross_rub(
    top: str,
    bottom: str,
    right: str,
    left: str,
    size: float = 84,
    font: str = FONT_KAI,
    weight: str = "600",
) -> str:
    return (
        text_rub(top, 300, 118, size, font, weight)
        + text_rub(bottom, 300, 492, size, font, weight)
        + text_rub(right, 468, 302, size - 4, font, weight)
        + text_rub(left, 132, 302, size - 4, font, weight)
    )


def four_cross_bronze(
    top: str,
    bottom: str,
    right: str,
    left: str,
    size: float = 84,
    font: str = FONT_KAI,
    weight: str = "600",
) -> str:
    return (
        text_bronze(top, 300, 118, size, font, weight)
        + text_bronze(bottom, 300, 492, size, font, weight)
        + text_bronze(right, 468, 302, size - 4, font, weight)
        + text_bronze(left, 132, 302, size - 4, font, weight)
    )


RUB_OBVERSE = {
    "banliang": two_horizontal_rub("半", "兩", 96, FONT_SEAL),
    "wuzhu": two_horizontal_rub("五", "銖", 94, FONT_SEAL),
    "daquan": four_cross_rub("大", "泉", "十", "五", 82, FONT_SEAL),
    "kaiyuan": four_cross_rub("開", "元", "寶", "通", 86, FONT_KAI),
    "daguan": four_cross_rub("大", "觀", "寶", "通", 78, FONT_SLENDER, "300"),
}

BRONZE_OBVERSE = {
    "banliang": two_horizontal_bronze("半", "兩", 96, FONT_SEAL),
    "wuzhu": two_horizontal_bronze("五", "銖", 94, FONT_SEAL),
    "daquan": four_cross_bronze("大", "泉", "十", "五", 82, FONT_SEAL),
    "kaiyuan": four_cross_bronze("開", "元", "寶", "通", 86, FONT_KAI),
    "daguan": four_cross_bronze("大", "觀", "寶", "通", 78, FONT_SLENDER, "300"),
}

# 碑拓 filters + geometry
RUB_DEFS = (
    '<defs><filter id="paper" x="0" y="0" width="100%" height="100%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="11" result="n"/>'
    '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0" result="na"/>'
    '<feComponentTransfer in="na" result="nf"><feFuncA type="linear" slope="0.11"/></feComponentTransfer>'
    '<feFlood flood-color="#7d6a45" result="fib"/>'
    '<feComposite in="fib" in2="nf" operator="in" result="fibers"/>'
    '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge></filter>'
    '<filter id="ink" x="-18%" y="-18%" width="136%" height="136%">'
    '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="warp"/>'
    '<feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="disp"/>'
    '<feTurbulence type="fractalNoise" baseFrequency="0.13" numOctaves="3" seed="21" result="g"/>'
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0" result="ga"/>'
    '<feComposite in="ga" in2="disp" operator="in" result="grain"/>'
    '<feComponentTransfer in="grain" result="gf"><feFuncA type="linear" slope="0.45"/></feComponentTransfer>'
    '<feFlood flood-color="#e8dfca" result="lift"/>'
    '<feComposite in="lift" in2="gf" operator="in" result="speck"/>'
    '<feMerge><feMergeNode in="disp"/><feMergeNode in="speck"/></feMerge></filter></defs>'
)
RUB_RING = (
    '<circle cx="300" cy="300" r="248" fill="none" stroke-width="40"/>'
    '<circle cx="300" cy="300" r="271" fill="none" stroke-width="5"/>'
    '<circle cx="300" cy="300" r="220" fill="none" stroke-width="4"/>'
)
RUB_HOLE = '<rect x="256" y="256" width="88" height="88" fill="none" stroke-width="22"/>'
RUB_PLAIN_BACK = (
    RUB_RING
    + RUB_HOLE
    + '<circle cx="300" cy="300" r="168" fill="none" stroke-width="1.5" opacity="0.35"/>'
)

# Bronze geometry (600 viewBox)
BRONZE_RING = (
    f'<circle cx="300" cy="300" r="271" fill="none" stroke="{BRONZE_RIM}" stroke-width="7"/>'
    f'<circle cx="300" cy="300" r="248" fill="{BRONZE_BODY}" stroke="{BRONZE_RIM}" stroke-width="32"/>'
    f'<circle cx="300" cy="300" r="218" fill="none" stroke="{BRONZE_HI}" stroke-width="2.5" opacity="0.45"/>'
)
BRONZE_HOLE = (
    f'<rect x="256" y="256" width="88" height="88" fill="rgb(14,12,11)" '
    f'stroke="{BRONZE_BODY}" stroke-width="20"/>'
)
BRONZE_PLAIN_BACK = (
    BRONZE_RING
    + BRONZE_HOLE
    + f'<circle cx="300" cy="300" r="168" fill="none" stroke="{BRONZE_CARVED}" '
    f'stroke-width="1.8" opacity="0.28"/>'
)
