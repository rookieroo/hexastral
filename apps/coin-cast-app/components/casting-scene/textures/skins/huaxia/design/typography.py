"""华夏六币 · 书体与字体映射（标准字体库 → dark 青铜字面）。

见 TYPOGRAPHY.md。字面由 rsvg-convert 渲染 TTF，不再手描 SVG path。
"""
from __future__ import annotations

import os
from dataclasses import dataclass

FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts")


@dataclass(frozen=True)
class FontSpec:
    key: str
    file: str
    css_family: str
    script: str
    license_id: str


FONTS: dict[str, FontSpec] = {
    "shuowen": FontSpec(
        "shuowen",
        "Shuowen.ttf",
        "HuaxiaShuowen",
        "小篆 / 汉篆",
        "TW Gov 全字库说文解字（EBAS 对齐版）",
    ),
    "wenkai": FontSpec(
        "wenkai",
        "LXGWWenKai-Regular.ttf",
        "LXGW WenKai",
        "隶楷 / 楷书",
        "SIL OFL 1.1 · LXGW",
    ),
    "zhenkai": FontSpec(
        "zhenkai",
        "LXGWZhenKaiGB-Regular.ttf",
        "LXGW ZhenKai GB",
        "瘦金体（开源近似）",
        "SIL OFL 1.1 · LXGW",
    ),
}


@dataclass(frozen=True)
class GlyphSlot:
    key: str
    char: str
    x: float
    y: float
    size: float


@dataclass(frozen=True)
class CoinTypeSpec:
    coin_id: str
    era_script: str
    font_key: str
    rim_lip: bool
    hole: tuple[float, float, float, float, float]  # x,y,w,h,stroke_w
    glyphs: tuple[GlyphSlot, ...]
    stroke_w: float
    group_transform: str = ""


# 600×600 viewBox；读序见各币形制
COIN_TYPES: dict[str, CoinTypeSpec] = {
    "banliang": CoinTypeSpec(
        coin_id="banliang",
        era_script="秦 · 小篆",
        font_key="shuowen",
        rim_lip=False,
        hole=(258, 258, 84, 84, 11),
        glyphs=(
            GlyphSlot("right", "半", 448, 302, 132),
            GlyphSlot("left", "兩", 152, 302, 132),
        ),
        stroke_w=2.5,
    ),
    "wuzhu": CoinTypeSpec(
        coin_id="wuzhu",
        era_script="汉 · 篆书",
        font_key="shuowen",
        rim_lip=True,
        hole=(235, 217, 160, 160, 13),
        glyphs=(
            GlyphSlot("right", "五", 454, 298, 128),
            GlyphSlot("left", "銖", 146, 298, 128),
        ),
        stroke_w=2.5,
    ),
    "daquan": CoinTypeSpec(
        coin_id="daquan",
        era_script="新莽 · 悬针篆",
        font_key="shuowen",
        rim_lip=True,
        hole=(248, 248, 104, 104, 12),
        glyphs=(
            GlyphSlot("top", "大", 300, 118, 118),
            GlyphSlot("bottom", "泉", 300, 492, 118),
            GlyphSlot("right", "十", 468, 302, 112),
            GlyphSlot("left", "五", 132, 302, 112),
        ),
        stroke_w=2.2,
        group_transform='transform="translate(300,300) scale(0.96,1.12) translate(-300,-300)"',
    ),
    "kaiyuan": CoinTypeSpec(
        coin_id="kaiyuan",
        era_script="唐 · 隶楷",
        font_key="wenkai",
        rim_lip=True,
        hole=(248, 248, 104, 104, 13),
        glyphs=(
            GlyphSlot("top", "開", 300, 118, 108),
            GlyphSlot("bottom", "元", 300, 492, 108),
            GlyphSlot("right", "通", 468, 302, 104),
            GlyphSlot("left", "寶", 132, 302, 104),
        ),
        stroke_w=1.8,
    ),
    "daguan": CoinTypeSpec(
        coin_id="daguan",
        era_script="宋徽宗 · 瘦金体",
        font_key="zhenkai",
        rim_lip=True,
        hole=(250, 250, 100, 100, 12),
        glyphs=(
            GlyphSlot("top", "大", 300, 118, 104),
            GlyphSlot("bottom", "觀", 300, 492, 104),
            GlyphSlot("right", "通", 468, 302, 100),
            GlyphSlot("left", "寶", 132, 302, 100),
        ),
        stroke_w=1.2,
        group_transform='transform="translate(300,300) scale(0.98,1.06) translate(-300,-300)"',
    ),
    "hongwu": CoinTypeSpec(
        coin_id="hongwu",
        era_script="明 · 楷书",
        font_key="wenkai",
        rim_lip=True,
        hole=(248, 248, 104, 104, 13),
        glyphs=(
            GlyphSlot("top", "洪", 300, 118, 108),
            GlyphSlot("bottom", "武", 300, 492, 108),
            GlyphSlot("right", "通", 468, 302, 104),
            GlyphSlot("left", "寶", 132, 302, 104),
        ),
        stroke_w=1.8,
    ),
}


def font_path(spec: FontSpec) -> str:
    path = os.path.join(FONTS_DIR, spec.file)
    if not os.path.isfile(path):
        raise FileNotFoundError(
            f"missing font {spec.file} — run: python3 {os.path.join(FONTS_DIR, 'setup-fonts.py')}"
        )
    return path


def font_face_rules() -> str:
    rules: list[str] = []
    for spec in FONTS.values():
        abspath = font_path(spec).replace("\\", "/")
        rules.append(
            f"@font-face{{font-family:'{spec.css_family}';"
            f"src:url('file://{abspath}');font-weight:normal;font-style:normal;}}"
        )
    return "\n".join(rules)


def _char_svg(ch: str, x: float, y: float, size: float, family: str, ink: str, stroke_w: float) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size:.1f}" '
        f'text-anchor="middle" dominant-baseline="central" fill="{ink}" stroke="{ink}" '
        f'stroke-width="{stroke_w:.2f}" stroke-linejoin="round" stroke-linecap="round">{ch}</text>'
    )


def obverse_glyphs(coin_id: str, ink: str) -> str:
    spec = COIN_TYPES[coin_id]
    font = FONTS[spec.font_key]
    body = "".join(
        _char_svg(g.char, g.x, g.y, g.size, font.css_family, ink, spec.stroke_w) for g in spec.glyphs
    )
    if spec.group_transform:
        return f"<g {spec.group_transform}>{body}</g>"
    return body
