"""Prototype: 開元通寶 vector master → bronze cap PNG (readable at phone scale).

Outputs (not wired to coin-skins yet — compare in gallery / small-screen QA):
  dist/kaiyuan-vector-yang.png  — 隶楷四字 + rim on dark scene ground
  dist/kaiyuan-vector-yin.png   — plain 素背 matching patina tone

Requires: rsvg-convert (brew install librsvg), Pillow.
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "..", "dist")
os.makedirs(DIST, exist_ok=True)
S = 1024
GROUND = (14, 12, 11)
BRONZE = "#8a7348"
BRONZE_HI = "#c4a66a"
RIM = "#4a3f32"


def rsvg(svg: str, out: str) -> None:
    tmp = "/tmp/_kaiyuan_vec.svg"
    with open(tmp, "w") as f:
        f.write(svg)
    subprocess.run(["rsvg-convert", "-w", str(S), "-h", str(S), tmp, "-o", out], check=True)


def yang_svg() -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="rgb{GROUND}"/>
  <circle cx="300" cy="300" r="268" fill="none" stroke="{RIM}" stroke-width="6"/>
  <circle cx="300" cy="300" r="248" fill="none" stroke="{BRONZE}" stroke-width="28"/>
  <circle cx="300" cy="300" r="218" fill="none" stroke="{BRONZE_HI}" stroke-width="3" opacity="0.55"/>
  <rect x="256" y="256" width="88" height="88" fill="rgb{GROUND}" stroke="{BRONZE}" stroke-width="20"/>
  <g font-family="LXGW WenKai, Songti SC, STSong, serif" fill="{BRONZE_HI}" stroke="none" font-weight="600">
    <text x="300" y="118" text-anchor="middle" font-size="92">開</text>
    <text x="300" y="498" text-anchor="middle" font-size="92">元</text>
    <text x="498" y="318" text-anchor="middle" font-size="88">寶</text>
    <text x="102" y="318" text-anchor="middle" font-size="88">通</text>
  </g>
</svg>"""


def yin_svg() -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="rgb{GROUND}"/>
  <circle cx="300" cy="300" r="268" fill="none" stroke="{RIM}" stroke-width="6"/>
  <circle cx="300" cy="300" r="248" fill="none" stroke="{BRONZE}" stroke-width="28"/>
  <circle cx="300" cy="300" r="218" fill="none" stroke="{BRONZE_HI}" stroke-width="3" opacity="0.4"/>
  <rect x="256" y="256" width="88" height="88" fill="rgb{GROUND}" stroke="{BRONZE}" stroke-width="20"/>
  <circle cx="300" cy="300" r="165" fill="none" stroke="{BRONZE}" stroke-width="2" opacity="0.35"/>
</svg>"""


def patina_pass(path: str) -> None:
    im = Image.open(path).convert("RGB")
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Color(im).enhance(1.08)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))
    # subtle grain
    noise = Image.effect_noise((S, S), 12).convert("L")
    im = Image.composite(im, Image.new("RGB", (S, S), GROUND), noise.point(lambda p: 28 if p > 200 else 0))
    circ = Image.new("L", (S, S), 0)
    ImageDraw.Draw(circ).ellipse([2, 2, S - 3, S - 3], fill=255)
    flat = Image.new("RGB", (S, S), GROUND)
    flat.paste(im, (0, 0), circ)
    flat.save(path, format="PNG", compress_level=9, optimize=True)


def main() -> None:
    yang_out = os.path.join(DIST, "kaiyuan-vector-yang.png")
    yin_out = os.path.join(DIST, "kaiyuan-vector-yin.png")
    rsvg(yang_svg(), yang_out)
    rsvg(yin_svg(), yin_out)
    patina_pass(yang_out)
    patina_pass(yin_out)
    print("baked kaiyuan-vector-yang.png", os.path.getsize(yang_out) // 1024, "KB")
    print("baked kaiyuan-vector-yin.png", os.path.getsize(yin_out) // 1024, "KB")


if __name__ == "__main__":
    main()
