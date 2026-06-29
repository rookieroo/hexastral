"""Generate back-su-yin.png = plain 素背 (no inscription) rubbing.

Matches the original/dist coin geometry (600 viewBox → 1254 PNG) so
gen-su-face.py can composite 四出文 onto the same ring/hole layout.
Requires Pillow only (no rsvg).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "back-su-yin.png")
SIZE = 1254
VIEW = 600
SCALE = SIZE / VIEW
PAPER = (231, 221, 199)  # #e7ddc7
INK = (22, 17, 10)  # #16110a


def s(v: float) -> float:
    return v * SCALE


def add_paper_noise(img: Image.Image) -> Image.Image:
    rng = random.Random(11)
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b = px[x, y]
            n = rng.randint(-10, 10)
            px[x, y] = (
                max(0, min(255, r + n)),
                max(0, min(255, g + n)),
                max(0, min(255, b + n)),
            )
    return img.filter(ImageFilter.GaussianBlur(0.35))


def stroke_ring(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, width: float) -> None:
    w = s(width)
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        outline=INK,
        width=int(max(2, round(w))),
    )


def main() -> None:
    rng = random.Random(7)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img = Image.new("RGB", (SIZE, SIZE), PAPER)
    img = add_paper_noise(img)
    draw = ImageDraw.Draw(img)

    cx = cy = SIZE / 2
    # gen-coins.py RING + HOLE geometry
    stroke_ring(draw, cx, cy, s(248), 40)
    stroke_ring(draw, cx, cy, s(271), 5)
    stroke_ring(draw, cx, cy, s(220), 4)

    hole = s(88)
    hx0 = cx - hole / 2
    hy0 = cy - hole / 2
    draw.rectangle(
        [hx0, hy0, hx0 + hole, hy0 + hole],
        outline=INK,
        width=int(max(2, round(s(22)))),
    )

    # Slight ink roughening so it reads as rubbing, not vector.
    ink_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(ink_layer)
    for _ in range(1800):
        ang = rng.random() * math.tau
        rad = s(120 + rng.random() * 155)
        x = cx + rad * math.cos(ang)
        y = cy + rad * math.sin(ang)
        idraw.point((x, y), fill=(INK[0], INK[1], INK[2], rng.randint(20, 55)))
    ink_layer = ink_layer.filter(ImageFilter.GaussianBlur(0.8))
    img.paste(ink_layer, (0, 0), ink_layer)
    img.save(OUT)
    print("baked", OUT)


if __name__ == "__main__":
    main()
