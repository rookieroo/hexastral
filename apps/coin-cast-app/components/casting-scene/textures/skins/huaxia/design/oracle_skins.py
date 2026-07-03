"""六爻占卜 · 六套铜钱皮肤主题（图案主、文字辅）。"""
from __future__ import annotations

from dataclasses import dataclass

from oracle_patterns import ORACLE_PATTERNS, HoleGeom


@dataclass(frozen=True)
class OracleSkinSpec:
    coin_id: str
    oracle_theme: str
    era_script: str
    rim_lip: bool
    hole: tuple[float, float, float, float, float]
    # 单字点睛 — 小、靠边，不抢纹样
    mark_char: str
    mark_x: float
    mark_y: float
    mark_size: float
    font_key: str
    mark_stroke: float = 0.8


ORACLE_SKINS: dict[str, OracleSkinSpec] = {
    "banliang": OracleSkinSpec(
        coin_id="banliang",
        oracle_theme="起卦 · 四出",
        era_script="秦",
        rim_lip=False,
        hole=(258, 258, 84, 84, 11),
        mark_char="卦",
        mark_x=300,
        mark_y=518,
        mark_size=34,
        font_key="shuowen",
    ),
    "wuzhu": OracleSkinSpec(
        coin_id="wuzhu",
        oracle_theme="五运 · 五行",
        era_script="汉",
        rim_lip=True,
        hole=(235, 217, 160, 160, 13),
        mark_char="爻",
        mark_x=300,
        mark_y=520,
        mark_size=36,
        font_key="shuowen",
    ),
    "daquan": OracleSkinSpec(
        coin_id="daquan",
        oracle_theme="变革 · 十字",
        era_script="新莽",
        rim_lip=True,
        hole=(248, 248, 104, 104, 12),
        mark_char="变",
        mark_x=300,
        mark_y=518,
        mark_size=32,
        font_key="shuowen",
    ),
    "kaiyuan": OracleSkinSpec(
        coin_id="kaiyuan",
        oracle_theme="流通 · 八卦",
        era_script="唐",
        rim_lip=True,
        hole=(248, 248, 104, 104, 13),
        mark_char="易",
        mark_x=300,
        mark_y=518,
        mark_size=34,
        font_key="wenkai",
    ),
    "daguan": OracleSkinSpec(
        coin_id="daguan",
        oracle_theme="观照 · 三爻",
        era_script="宋",
        rim_lip=True,
        hole=(250, 250, 100, 100, 12),
        mark_char="觀",
        mark_x=300,
        mark_y=518,
        mark_size=30,
        font_key="zhenkai",
    ),
    "hongwu": OracleSkinSpec(
        coin_id="hongwu",
        oracle_theme="阴阳 · 日月",
        era_script="明",
        rim_lip=True,
        hole=(248, 248, 104, 104, 13),
        mark_char="陰",
        mark_x=300,
        mark_y=518,
        mark_size=32,
        font_key="wenkai",
    ),
}


def hole_geom(spec: OracleSkinSpec) -> HoleGeom:
    x, y, w, h, _ = spec.hole
    return HoleGeom(x, y, w, h)


def yang_pattern(coin_id: str) -> str:
    yang_fn, _ = ORACLE_PATTERNS[coin_id]
    return yang_fn(hole_geom(ORACLE_SKINS[coin_id]))


def yin_pattern(coin_id: str) -> str:
    _, yin_fn = ORACLE_PATTERNS[coin_id]
    return yin_fn(hole_geom(ORACLE_SKINS[coin_id]))
