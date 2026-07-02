"""Bake the 华夏钱币史 realistic-bronze skin set (obverse + reverse) from real
Public-Domain / CC0 coin photographs.

Each skin = two 1024² cap textures: `<id>-yang.png` (字面) + `<id>-yin.png` (背面).
Run:  python3 gen-huaxia.py [src_dir]
Requires Pillow + numpy + scipy. Sources: huaxia/src/ (see SOURCING.md).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
os.makedirs(OUT, exist_ok=True)
S = 1024  # POT square per textures/README.md
MAX_BYTES = 500 * 1024
GROUND = (14, 12, 11)


def detect_coins(im, min_frac=0.02):
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
    bg_brightness = float(np.mean(bg))

    if bg_brightness < 80:
        gray = arr.astype(float).mean(axis=2)
        thresh = max(80, gray.mean() + gray.std() * 0.3)
        mask = gray > thresh
    else:
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
    if frac is None:
        return im
    w, h = im.size
    return im.crop((int(frac[0] * w), int(frac[1] * h), int(frac[2] * w), int(frac[3] * h)))


def pick_coin(im):
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
        if len(xs) < 600:
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
    """Plain 素背: keep rim sharp, lightly soften only the inner field."""
    blurred = coin_rgb.filter(ImageFilter.GaussianBlur(S * 0.038))
    inner = Image.new("L", (S, S), 0)
    r = int(S * 0.38)
    ImageDraw.Draw(inner).ellipse([S // 2 - r, S // 2 - r, S // 2 + r, S // 2 + r], fill=255)
    inner = inner.filter(ImageFilter.GaussianBlur(S * 0.018))
    su = coin_rgb.copy()
    su.paste(blurred, (0, 0), inner)
    return su


def save_cap(im: Image.Image, path: str) -> None:
    """Cap texture — JPEG q82 target ≤500KB (opaque albedo; textures/README.md)."""
    jpath = path.rsplit(".", 1)[0] + ".jpg"
    base = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=115, threshold=2))
    for q in (88, 84, 80, 76, 72):
        base.save(jpath, format="JPEG", quality=q, optimize=True, progressive=True)
        size = os.path.getsize(jpath)
        if size <= MAX_BYTES:
            print(f"  {os.path.basename(jpath)} {size // 1024}KB (q{q})")
            return
    print(f"  WARN {os.path.basename(jpath)} {os.path.getsize(jpath) // 1024}KB")


# id, file, (contrast, sat, sharp, warm), reverse, obv_region, rev_region, gamma
# New CC0 sources: banliang-qin + wuzhu-han (Scott Semans), kaiyuan-tang (Gary Todd)
COINS = [
    ("banliang", "banliang-qin.jpg", (1.18, 1.22, 1.85, 1.05), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 1.0),
    ("wuzhu", "wuzhu-han.jpg", (1.20, 1.26, 1.95, 1.04), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 1.0),
    ("daquan", "daquan.jpg", (1.36, 1.38, 2.2, 1.0), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 1.0),
    ("kaiyuan", "kaiyuan-cc0.jpg", (1.20, 1.24, 1.90, 1.06), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 0.65),
    ("daguan", "daguan.jpg", (1.32, 1.28, 2.0, 1.02), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 0.58),
    ("hongwu", "hongwu.jpg", (1.20, 1.24, 1.85, 1.04), "pair", (0.0, 0.0, 0.5, 1.0), (0.5, 0.0, 1.0, 1.0), 1.0),
]


def bake_all() -> None:
    """Bake photo-based 华夏 caps into dist/."""
    for cid, fname, (c, sat, sh, warm), rev, obv_reg, rev_reg, gamma in COINS:
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
        if gamma != 1.0:
            arr = np.array(obv, dtype=float)
            arr = 255 * (arr / 255) ** gamma
            obv = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        yang = finish(obv, bg, c, sat, sh, warm)
        if rev == "pair":
            rev_src = region_crop(full, rev_reg)
            rev_box, rbg = pick_coin(rev_src)
            rvs = square_coin(rev_src, rev_box if rev_box else obv_box)
            if gamma != 1.0:
                arr_r = np.array(rvs, dtype=float)
                arr_r = 255 * (arr_r / 255) ** gamma
                rvs = Image.fromarray(np.clip(arr_r, 0, 255).astype(np.uint8))
            yin = finish(rvs, rbg, c, sat * 0.92, sh * 0.95, warm)
        else:
            yin = finish(synth_su(obv, bg), bg, c, sat * 0.9, sh * 0.88, warm)
        print("baked", cid)
        save_cap(yang, os.path.join(OUT, f"{cid}-yang.png"))
        save_cap(yin, os.path.join(OUT, f"{cid}-yin.png"))


if __name__ == "__main__":
    bake_all()
    print("done")
