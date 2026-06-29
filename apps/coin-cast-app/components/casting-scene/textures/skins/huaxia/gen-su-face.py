"""Generate back-su-yang.png = the default coin's FRONT face (字面).

The default 素钱 had identical front/back, so a cast coin couldn't be read as
heads/tails. We add 四出文 (sì chū wén) — four lines radiating from the square
hole's corners to the rim — a genuine historical plain-coin motif (e.g. 四出五銖).
No fabricated script, geometric + owned, and composited onto the EXACT same
rubbing texture as the back so the two faces are a matched pair.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "dist", "back-su-yin.png")
OUT = os.path.join(HERE, "dist", "back-su-yang.png")

img = Image.open(SRC).convert("RGB")
W, H = img.size
cx, cy = W / 2, H / 2
px = img.load()

# ── Detect the square hole: darkest connected region in the central 26% box ──
def luma(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]

half = int(W * 0.13)
xs, ys = [], []
for y in range(int(cy - half), int(cy + half)):
    for x in range(int(cx - half), int(cx + half)):
        if luma(px[x, y]) < 120:  # dark hole border
            xs.append(x)
            ys.append(y)
if xs:
    hx0, hx1, hy0, hy1 = min(xs), max(xs), min(ys), max(ys)
else:  # fallback to generator geometry (viewBox 600 → 1254, hole 256..344)
    s = W / 600
    hx0, hy0, hx1, hy1 = 256 * s, 256 * s, 344 * s, 344 * s

# Sample the ring's ink colour so the strokes match the rubbing's duotone.
ring_x = int(cx)
ring_y = int(cy - W * 0.40)
ink = px[ring_x, ring_y]
if luma(ink) > 150:  # landed on cream — step inward until we hit the ring
    for r in range(int(W * 0.40), int(W * 0.30), -2):
        c = px[int(cx), int(cy - r)]
        if luma(c) < 150:
            ink = c
            break

# ── Draw 四出文 on a transparent overlay, then texture + composite ──
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)

inner_r = W * 0.345  # stop just shy of the inner ring line
corners = [(hx1, hy0), (hx1, hy1), (hx0, hy1), (hx0, hy0)]  # TR, BR, BL, TL
sw = int(W * 0.034)
for (qx, qy) in corners:
    ang = math.atan2(qy - cy, qx - cx)
    ex = cx + inner_r * math.cos(ang)
    ey = cy + inner_r * math.sin(ang)
    od.line([(qx, qy), (ex, ey)], fill=(ink[0], ink[1], ink[2], 235), width=sw)
    od.ellipse([ex - sw / 2, ey - sw / 2, ex + sw / 2, ey + sw / 2],
               fill=(ink[0], ink[1], ink[2], 235))

# Roughen the edges a touch so it reads as ink rubbing, not vector.
overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
img.paste(overlay, (0, 0), overlay)
img.save(OUT)
print("baked", OUT, "hole bbox", (round(hx0), round(hy0), round(hx1), round(hy1)), "ink", ink)
