#!/usr/bin/env python3
"""1024x500 Google Play feature graphic for Yuun. No widgets / Watch / IAP."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / "apps/auspice-app/assets/icon.png"
OUT = ROOT / "docs/publish/play-paste-ready/feature-graphic.png"

W, H = 1024, 500
BG = (247, 245, 239)
INK = (42, 107, 66)
DIM = (79, 122, 92)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/Library/Fonts/Georgia.ttf",
        "/System/Library/Fonts/NewYork.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    canvas = Image.new("RGB", (W, H), BG)
    icon = Image.open(ICON).convert("RGBA").resize((280, 280), Image.Resampling.LANCZOS)
    canvas.paste(icon, (72, (H - 280) // 2), icon)
    draw = ImageDraw.Draw(canvas)
    draw.text((400, 148), "Yuun", fill=INK, font=font(76))
    draw.text((400, 248), "Chinese Almanac", fill=DIM, font=font(32))
    draw.text((400, 302), "Today · Lunar · Culture", fill=DIM, font=font(22))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, "PNG")
    print(f"wrote {OUT} {W}x{H}")


if __name__ == "__main__":
    main()
