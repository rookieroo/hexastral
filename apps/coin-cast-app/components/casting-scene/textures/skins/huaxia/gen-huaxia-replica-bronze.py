"""Bake 华夏五枚「写实青铜复刻」— vector 对读字面 + photo-informed patina + corrosion.

Outputs JPEG caps (≤500KB) to huaxia/dist/replica-bronze/ for gallery preview.
Layout from replica-glyphs; material sampled from huaxia/src/ PD photos, reinforced
with procedural pitting / cuprite patches so glyphs stay readable.

  python3 gen-huaxia-replica-bronze.py
Requires: rsvg-convert, Pillow, numpy, scipy; huaxia/src/ reference photos.
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from scipy import ndimage

from replica_glyphs import (
    BRONZE_HOLE,
    BRONZE_OBVERSE,
    BRONZE_PLAIN_BACK,
    BRONZE_RING,
    HUAXIA_COINS,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dist", "replica-bronze")
SRC = os.path.join(HERE, "src")
os.makedirs(OUT, exist_ok=True)

S = 1024
GROUND = (14, 12, 11)
MAX_BYTES = 500 * 1024

# Per-coin patina tuning (seed, photo blend, corrosion strength, wear)
STYLE = {
    "banliang": {"seed": 11, "blend": 0.78, "corrosion": 0.38, "wear": 0.24},
    "wuzhu": {"seed": 23, "blend": 0.76, "corrosion": 0.42, "wear": 0.26},
    "daquan": {"seed": 37, "blend": 0.74, "corrosion": 0.48, "wear": 0.28},
    "kaiyuan": {"seed": 41, "blend": 0.80, "corrosion": 0.40, "wear": 0.22},
    "daguan": {"seed": 53, "blend": 0.72, "corrosion": 0.45, "wear": 0.27},
}


def load_huaxia_photo_module():
    path = os.path.join(HERE, "gen-huaxia.py")
    spec = importlib.util.spec_from_file_location("gen_huaxia", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load gen-huaxia.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def rsvg(svg: str, out: str, size: int = S) -> None:
    tmp = os.path.join(OUT, "_tmp.svg")
    with open(tmp, "w") as f:
        f.write(svg)
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), tmp, "-o", out], check=True)
    os.remove(tmp)


def bronze_svg(inner: str, *, yin: bool = False) -> str:
    body = BRONZE_PLAIN_BACK if yin else BRONZE_RING + BRONZE_HOLE + inner
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">'
        f'<rect width="600" height="600" fill="rgb{GROUND}"/>'
        f"{body}</svg>"
    )


def disc_mask(size: int = S, margin: float = 0.02) -> np.ndarray:
    yy, xx = np.ogrid[:size, :size]
    cx = cy = (size - 1) / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    return r <= size * (0.5 - margin)


def load_photo_cap(gh, cid: str, fname: str, *, face: str = "yang") -> Image.Image | None:
    path = os.path.join(SRC, fname)
    if not os.path.exists(path):
        return None
    full = Image.open(path).convert("RGB")
    if cid in ("daquan", "daguan"):
        obv_reg = (0.0, 0.0, 0.5, 1.0) if face == "yang" else (0.5, 0.0, 1.0, 1.0)
    elif cid == "banliang":
        obv_reg = (0.38, 0.25, 0.70, 0.74) if face == "yang" else None
    else:
        obv_reg = None
    if face == "yin" and obv_reg is None and cid not in ("daquan", "daguan"):
        return None
    src = gh.region_crop(full, obv_reg) if obv_reg else full
    box, bg = gh.pick_coin(src)
    if box is None:
        return None
    coin = gh.square_coin(src, box)
    sat_mul = 0.92 if face == "yin" else 1.0
    sharp_mul = 0.95 if face == "yin" else 1.0
    return gh.finish(coin, bg, 1.28, 1.22 * sat_mul, 1.6 * sharp_mul, 1.02)


def fractal_noise(shape: tuple[int, ...], seed: int, scales: tuple[float, ...]) -> np.ndarray:
    rng = np.random.default_rng(seed)
    acc = np.zeros(shape, dtype=np.float32)
    for i, sigma in enumerate(scales):
        n = rng.random(shape, dtype=np.float32)
        sm = ndimage.gaussian_filter(n, sigma=sigma)
        acc += sm / (i + 1)
    acc -= acc.min()
    if acc.max() > 0:
        acc /= acc.max()
    return acc


def apply_patina(
    base: Image.Image,
    relief: Image.Image,
    *,
    seed: int,
    corrosion: float,
    wear: float,
    photo: Image.Image | None,
    blend: float,
) -> Image.Image:
    arr = np.asarray(base, dtype=np.float32)
    disc = disc_mask()
    h, w = arr.shape[:2]

    low = fractal_noise((h, w), seed, (48, 18, 6))
    pit = fractal_noise((h, w), seed + 7, (3, 1.2))
    grain = fractal_noise((h, w), seed + 13, (2,))

    # Brown patina modulation
    tone = 0.88 + 0.14 * low - 0.10 * pit
    for c in range(3):
        arr[..., c][disc] *= tone[disc]
    arr[..., 0][disc] *= 1.02
    arr[..., 2][disc] *= 0.94

    # Cuprite / malachite patches (green corrosion)
    cor = (low > 0.52) & (pit > 0.48) & disc
    cor = ndimage.binary_dilation(cor, iterations=3)
    arr[..., 1][cor] = np.clip(arr[..., 1][cor] + 32 * corrosion, 0, 255)
    arr[..., 0][cor] = np.clip(arr[..., 0][cor] * (1 - 0.18 * corrosion), 0, 255)
    arr[..., 2][cor] = np.clip(arr[..., 2][cor] * (1 - 0.14 * corrosion), 0, 255)
    # Rust-brown pits
    rust = (pit > 0.62) & (low < 0.45) & disc
    arr[..., 0][rust] = np.clip(arr[..., 0][rust] * 0.88, 0, 255)
    arr[..., 1][rust] = np.clip(arr[..., 1][rust] * 0.82, 0, 255)

    # Rim wear — brighten outer band
    yy, xx = np.ogrid[:h, :w]
    cx = cy = (h - 1) / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (h * 0.5)
    rim = (r > 0.82) & (r < 0.98) & disc
    for c in range(3):
        arr[..., c][rim] = np.clip(arr[..., c][rim] + 18 * wear, 0, 255)

    out = np.clip(arr, 0, 255).astype(np.uint8)
    im = Image.fromarray(out)

    # Photo texture transfer (low-frequency patina from real artifact)
    if photo is not None:
        ph = photo.resize((S, S), Image.LANCZOS)
        ph_arr = np.asarray(ph, dtype=np.float32)
        ph_low = np.asarray(
            ph.filter(ImageFilter.GaussianBlur(radius=S * 0.045)),
            dtype=np.float32,
        )
        vec = np.asarray(im, dtype=np.float32)
        m = disc.astype(np.float32)
        for c in range(3):
            vec[..., c] = vec[..., c] * (1 - blend * m) + ph_low[..., c] * (blend * m)
        # keep some mid-freq from photo
        ph_mid = np.asarray(ph.filter(ImageFilter.GaussianBlur(radius=S * 0.012)), dtype=np.float32)
        mid_blend = blend * 0.45
        for c in range(3):
            vec[..., c] = vec[..., c] * (1 - mid_blend * m) + ph_mid[..., c] * (mid_blend * m)
        # Fine grain from photo (scratches / casting pores)
        ph_hi = np.asarray(ph, dtype=np.float32)
        hi = ph_hi - ph_mid
        hi_blend = blend * 0.22
        for c in range(3):
            vec[..., c] = np.clip(vec[..., c] + hi[..., c] * hi_blend * m, 0, 255)
        im = Image.fromarray(np.clip(vec, 0, 255).astype(np.uint8))

    # Reinforce carved glyphs from vector relief (darken recesses)
    rel = np.asarray(relief.convert("L"), dtype=np.float32) / 255.0
    carved = rel > 0.08
    carved = ndimage.binary_dilation(carved, iterations=1)
    v = np.asarray(im, dtype=np.float32)
    depth = np.clip((rel - 0.06) * 1.8, 0, 1)
    for c in range(3):
        v[..., c][carved] *= 1 - depth[carved] * 0.42
    im = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8))

    # Micro pitting specks
    speck = grain > 0.93
    speck &= disc
    v = np.asarray(im, dtype=np.float32)
    v[speck] *= 0.82
    im = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8))

    im = ImageEnhance.Contrast(im).enhance(1.14)
    im = ImageEnhance.Color(im).enhance(1.10)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.3, percent=125, threshold=2))

    flat = Image.new("RGB", (S, S), GROUND)
    mask = Image.fromarray((disc * 255).astype(np.uint8))
    flat.paste(im, (0, 0), mask)
    return flat


def synth_yin_from_yang(yang: Image.Image) -> Image.Image:
    """Plain 素背: blur inner field, keep rim sharp."""
    blurred = yang.filter(ImageFilter.GaussianBlur(S * 0.038))
    inner = Image.new("L", (S, S), 0)
    r = int(S * 0.38)
    ImageDraw.Draw(inner).ellipse([S // 2 - r, S // 2 - r, S // 2 + r, S // 2 + r], fill=255)
    inner = inner.filter(ImageFilter.GaussianBlur(S * 0.018))
    su = yang.copy()
    su.paste(blurred, (0, 0), inner)
    # Punch square hole clean
    hb = (int(S * 0.37), int(S * 0.37), int(S * 0.63), int(S * 0.63))
    ImageDraw.Draw(su).rectangle(hb, fill=GROUND)
    return su


def save_cap(im: Image.Image, path: str) -> None:
    jpath = path.rsplit(".", 1)[0] + ".jpg"
    base = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))
    for q in (88, 84, 80, 76, 72, 68):
        base.save(jpath, format="JPEG", quality=q, optimize=True, progressive=True)
        size = os.path.getsize(jpath)
        if size <= MAX_BYTES:
            print(f"  {os.path.basename(jpath)} {size // 1024}KB (q{q})")
            return
    print(f"  WARN {os.path.basename(jpath)} {os.path.getsize(jpath) // 1024}KB")


def bake_coin(cid: str, fname: str, gh) -> None:
    style = STYLE[cid]
    inner = BRONZE_OBVERSE[cid]

    yang_vec = os.path.join(OUT, f"{cid}-yang-vec.png")
    yin_vec = os.path.join(OUT, f"{cid}-yin-vec.png")
    rsvg(bronze_svg(inner, yin=False), yang_vec)
    rsvg(bronze_svg("", yin=True), yin_vec)

    photo_yang = load_photo_cap(gh, cid, fname, face="yang")
    photo_yin = load_photo_cap(gh, cid, fname, face="yin")

    yang = apply_patina(
        Image.open(yang_vec).convert("RGB"),
        Image.open(yang_vec),
        seed=style["seed"],
        corrosion=style["corrosion"],
        wear=style["wear"],
        photo=photo_yang,
        blend=style["blend"] if photo_yang else 0.0,
    )
    if photo_yin is not None:
        yin_base = photo_yin
    else:
        yin_base = synth_yin_from_yang(yang)
    yin = apply_patina(
        yin_base,
        Image.open(yin_vec),
        seed=style["seed"] + 99,
        corrosion=style["corrosion"] * 0.9,
        wear=style["wear"] * 0.75,
        photo=photo_yin if photo_yin is not None else photo_yang,
        blend=style["blend"] * 0.85 if (photo_yin or photo_yang) else 0.0,
    )

    save_cap(yang, os.path.join(OUT, f"{cid}-yang.png"))
    save_cap(yin, os.path.join(OUT, f"{cid}-yin.png"))
    for tmp in (yang_vec, yin_vec):
        if os.path.exists(tmp):
            os.remove(tmp)
    print("baked", cid)


def main() -> None:
    gh = load_huaxia_photo_module()
    for cid, fname, _note in HUAXIA_COINS:
        bake_coin(cid, fname, gh)
    print("done →", OUT)


if __name__ == "__main__":
    main()
