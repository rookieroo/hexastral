"""Bake the 华夏钱币史 realistic-bronze skin set (obverse + reverse) from real
Public-Domain / CC0 coin photographs.

Each skin = two 1254² cap textures: `<id>-yang.png` (字面 / obverse, the inscription)
and `<id>-yin.png` (背面 / reverse). Two-coin source photos (大觀 · 大泉五十) yield a
real 素背 reverse; obverse-only coins get a faithful synthetic 素背 (these issues ARE
plain-backed) blurred from the coin's own patina so the pair matches.

Pipeline: detect the coin blob(s) (scipy CC over a background-distance mask) → square
crop → enhance patina (contrast / saturation / sharpen) → circular cap mask → punch the
square 方孔 dark → flatten on the dark scene ground. Sources + licenses: SOURCING.md.

Run:  python3 gen-huaxia.py /abs/path/to/coins-src   (dir with the downloaded photos)
Requires Pillow + numpy + scipy. Photos are NOT committed; re-download per SOURCING.md.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(OUT, exist_ok=True)
S = 1254
GROUND = (14, 12, 11)  # dark scene ground behind the coin disc


def detect_coins(im, min_frac=0.02):
    """Bounding boxes of coin blobs, left→right (handles 1- or 2-coin photos)."""
    arr = np.asarray(im.convert("RGB"), np.int16)
    h, w = arr.shape[:2]
    frame = np.concatenate(
        [
            arr[:8].reshape(-1, 3),
            arr[-8:].reshape(-1, 3),
            arr[:, :8].reshape(-1, 3),
            arr[:, -8:].reshape(-1, 3),
        ]
    )
    bg = np.median(frame, 0)
    dist = np.abs(arr - bg).sum(2)
    mask = dist > 60
    mask = ndimage.binary_closing(mask, iterations=4)
    mask = ndimage.binary_fill_holes(mask)
    mask = ndimage.binary_opening(mask, iterations=3)
    lbl, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < min_frac * h * w:
            continue
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
    boxes.sort(key=lambda b: b[0])
    return boxes, bg


def square_coin(im, box, pad=-0.05):
    """Square crop centred on the coin. Negative pad slightly over-fills so the coin
    reaches the cap's circular edge (no background halo)."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    side = int(max(w, h) * (1 + pad))
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    left, top = cx - side // 2, cy - side // 2
    out = Image.new("RGB", (side, side), GROUND)
    src = im.crop(
        (max(0, left), max(0, top), min(im.width, left + side), min(im.height, top + side))
    )
    out.paste(src, (max(0, -left), max(0, -top)))
    return out.resize((S, S), Image.LANCZOS)


def region_crop(im, frac):
    """Pre-crop to a fractional (x0,y0,x1,y1) sub-region to isolate one coin."""
    if frac is None:
        return im
    w, h = im.size
    return im.crop((int(frac[0] * w), int(frac[1] * h), int(frac[2] * w), int(frac[3] * h)))


def pick_coin(im):
    """Detect + pick the most coin-like blob (largest, aspect near 1)."""
    boxes, bg = detect_coins(im)
    if not boxes:
        return None, bg
    def score(b):
        w, h = b[2] - b[0], b[3] - b[1]
        area = w * h
        aspect = min(w, h) / max(w, h)
        return area * (aspect**2)
    return max(boxes, key=score), bg


def hole_box(coin_rgb, bg):
    """Locate the square 方孔 = the largest central blob showing the background (the
    hole reveals the ground behind the coin, whether bright paper or dark cloth).
    Clamped to a sane 方孔 size so a mis-detect never paints a speck or the whole face."""
    fallback = (int(S * 0.37), int(S * 0.37), int(S * 0.63), int(S * 0.63))
    arr = np.asarray(coin_rgb, np.int16)
    dist = np.abs(arr - bg).sum(2)
    holeish = dist < 85
    m = int(S * 0.28)
    region = np.zeros((S, S), bool)
    region[m : S - m, m : S - m] = True
    holeish &= region
    holeish = ndimage.binary_closing(holeish, iterations=3)
    holeish = ndimage.binary_opening(holeish, iterations=2)
    lbl, n = ndimage.label(holeish)
    if n == 0:
        return fallback
    best, best_score = None, -1.0
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(xs) < 800:
            continue
        cx, cy = xs.mean(), ys.mean()
        centrality = 1.0 / (1.0 + ((cx - S / 2) ** 2 + (cy - S / 2) ** 2) ** 0.5)
        score = len(xs) * centrality
        if score > best_score:
            best_score = score
            best = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    if best is None:
        return fallback
    w, h = best[2] - best[0], best[3] - best[1]
    # too small (speck) or implausibly large → clamp to a centred 方孔
    if w < 0.15 * S or h < 0.15 * S or w > 0.5 * S or h > 0.5 * S:
        return fallback
    return tuple(best)


def finish(coin_rgb, bg, contrast, sat, sharp, warm):
    im = ImageEnhance.Contrast(coin_rgb).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Sharpness(im).enhance(sharp)
    if warm != 1.0:
        a = np.asarray(im, np.float32)
        a[..., 0] = np.clip(a[..., 0] * warm, 0, 255)
        a[..., 2] = np.clip(a[..., 2] * (2 - warm), 0, 255)
        im = Image.fromarray(a.astype(np.uint8))
    hb = hole_box(coin_rgb, bg)
    out = Image.new("RGB", (S, S), GROUND)
    circ = Image.new("L", (S, S), 0)
    ImageDraw.Draw(circ).ellipse([2, 2, S - 3, S - 3], fill=255)
    out.paste(im, (0, 0), circ)
    d = ImageDraw.Draw(out)
    d.rectangle(hb, fill=GROUND)
    return out


def synth_su(coin_rgb, bg):
    """Faithful plain 素背 from the coin's own patina: keep the rim, blur the field."""
    blurred = coin_rgb.filter(ImageFilter.GaussianBlur(S * 0.085))
    inner = Image.new("L", (S, S), 0)
    r = int(S * 0.40)
    ImageDraw.Draw(inner).ellipse([S // 2 - r, S // 2 - r, S // 2 + r, S // 2 + r], fill=255)
    inner = inner.filter(ImageFilter.GaussianBlur(S * 0.03))
    su = coin_rgb.copy()
    su.paste(blurred, (0, 0), inner)
    return su


# id, file, enhance (contrast,sat,sharp,warm), reverse mode, obverse region, reverse region
#   reverse "pair" → crop the real 素背 from `rev_region`; "su" → synth from obverse.
#   regions are fractional (x0,y0,x1,y1) sub-crops isolating one coin; None = full frame.
COINS = [
    ("banliang", "banliang.jpg", (1.30, 1.35, 1.7, 1.02), "su", (0.38, 0.25, 0.70, 0.74), None),
    ("wuzhu", "wuzhu.jpg", (1.26, 1.28, 1.6, 1.05), "su", None, None),
    ("daquan", "daquan.jpg", (1.32, 1.34, 1.7, 1.0), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)),
    ("kaiyuan", "kaiyuan.png", (1.28, 1.35, 1.6, 1.04), "su", None, None),
    ("daguan", "daguan.jpg", (1.32, 1.28, 1.7, 1.0), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0)),
]

for cid, fname, (c, sat, sh, warm), rev, obv_reg, rev_reg in COINS:
    path = os.path.join(SRC, fname)
    if not os.path.exists(path):
        print("SKIP missing", fname)
        continue
    full = Image.open(path).convert("RGB")
    obv_src = region_crop(full, obv_reg)
    obv_box, bg = pick_coin(obv_src)
    if obv_box is None:
        print("SKIP no coin", fname)
        continue
    obv = square_coin(obv_src, obv_box)
    yang = finish(obv, bg, c, sat, sh, warm)
    if rev == "pair":
        rev_src = region_crop(full, rev_reg)
        rev_box, rbg = pick_coin(rev_src)
        rvs = square_coin(rev_src, rev_box if rev_box else obv_box)
        yin = finish(rvs, rbg, c, sat * 0.9, sh * 0.85, warm)
    else:
        yin = finish(synth_su(obv, bg), bg, c, sat * 0.85, sh * 0.6, warm)
    yang.save(os.path.join(OUT, f"{cid}-yang.png"))
    yin.save(os.path.join(OUT, f"{cid}-yin.png"))
    print("baked", cid)
print("done")
