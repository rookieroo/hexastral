#!/usr/bin/env python3
"""
Generate HexAstral family icons/splashes for 6 portfolio satellite apps.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BG = (9, 9, 11)
GOLD = (196, 168, 130)
INK = (161, 161, 170)
WHITE = (250, 250, 250)

TARGETS: dict[str, str] = {
    "coin-cast-app": "CC",
    "dream-oracle-app": "DO",
    "eight-pillars-app": "EP",
    "face-oracle-app": "FO",
    "soul-match-app": "SM",
    "star-palace-app": "SP",
}


def draw_family_icon(label: str, size: int = 1024) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    cx = size // 2
    cy = size // 2

    ring_outer = int(size * 0.32)
    ring_inner = int(size * 0.26)
    d.ellipse((cx - ring_outer, cy - ring_outer, cx + ring_outer, cy + ring_outer), fill=GOLD)
    d.ellipse((cx - ring_inner, cy - ring_inner, cx + ring_inner, cy + ring_inner), fill=BG)

    moon_r = int(size * 0.15)
    d.ellipse((cx - moon_r, cy - moon_r, cx + moon_r, cy + moon_r), fill=WHITE)
    d.ellipse((cx - moon_r // 2, cy - moon_r, cx + moon_r, cy + moon_r), fill=BG)

    # Small family tag bar
    bar_w = int(size * 0.34)
    bar_h = int(size * 0.08)
    bar_y = cy + int(size * 0.23)
    d.rectangle((cx - bar_w // 2, bar_y - bar_h // 2, cx + bar_w // 2, bar_y + bar_h // 2), fill=(24, 24, 27))
    d.text((cx, bar_y), label, fill=INK, anchor="mm")
    return img


def draw_splash(label: str, width: int = 1284, height: int = 2778) -> Image.Image:
    img = Image.new("RGB", (width, height), BG)
    icon = draw_family_icon(label, 820)
    x = (width - 820) // 2
    y = (height - 820) // 2 - 120
    img.paste(icon, (x, y))
    d = ImageDraw.Draw(img)
    d.text((width // 2, y + 930), f"HEXASTRAL {label}", fill=GOLD, anchor="mm")
    return img


def main() -> None:
    for app_dir, label in TARGETS.items():
        assets = ROOT / "apps" / app_dir / "assets"
        assets.mkdir(parents=True, exist_ok=True)
        icon = draw_family_icon(label)
        splash = draw_splash(label)
        icon.save(assets / "icon.png")
        splash.save(assets / "splash.png")
        print(f"generated: {app_dir}/assets/icon.png, splash.png")


if __name__ == "__main__":
    main()
