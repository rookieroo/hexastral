"""五铢设计参考 — W01 Gary Todd S-114 武帝五铢（CC0）。"""
from __future__ import annotations

import importlib.util
import os

REF_FILE = "wuzhu-wudi.jpg"
REF_ID = "W01"
REF_LABEL = "S-114 · 汉武帝五铢 140–87 BC"
COMMONS_URL = (
    "https://commons.wikimedia.org/wiki/File:"
    "042_S-114_W._Han_Wu_Zhu,_Han_Wudi,_140-87,_25.5mm.jpg"
)
ATTRIBUTION = "Gary Lee Todd, Ph.D. — CC0"

# obv left / rev right in Todd 2-up frame
OBV_REGION = (0.0, 0.0, 0.5, 1.0)

PARENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(PARENT, "src", REF_FILE)
DESIGN = os.path.dirname(os.path.abspath(__file__))
RELIEF_OUT = os.path.join(DESIGN, "ref_wuzhu_relief.jpg")

CHAR_ANCHORS = [("wu", 454, 298), ("zhu", 147, 300)]

# W01 obverse hole — gen-huaxia.hole_box on squared coin (600 viewBox)
# Square ~160px centered at (315, 297); rim stroke 13
HOLE = {
    "x": 235,
    "y": 217,
    "w": 160,
    "h": 160,
    "stroke_w": 13,
}


def load_gen_huaxia():
    spec = importlib.util.spec_from_file_location(
        "gen_huaxia", os.path.join(PARENT, "gen-huaxia.py")
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def build_relief_annotated(out_path: str | None = None) -> str:
    import numpy as np
    from PIL import Image, ImageDraw
    from scipy import ndimage

    if not os.path.isfile(SRC_PATH):
        raise FileNotFoundError(f"missing reference {SRC_PATH}")

    gh = load_gen_huaxia()
    full = Image.open(SRC_PATH).convert("RGB")
    obv = gh.region_crop(full, OBV_REGION)
    box, _ = gh.pick_coin(obv)
    if box is None:
        raise RuntimeError(f"no coin in {REF_FILE}")
    coin = gh.square_coin(obv, box)
    arr = np.asarray(coin, dtype=np.float32)
    gray = arr.mean(axis=2)
    blur = ndimage.gaussian_filter(gray, 8)
    relief = gray - blur
    rel = (np.clip((relief - relief.min()) / (relief.max() - relief.min() + 1e-6), 0, 1) * 255).astype(
        np.uint8
    )
    im = Image.fromarray(rel).convert("RGB")
    d = ImageDraw.Draw(im)
    s = coin.width / 600.0
    for name, vx, vy in CHAR_ANCHORS:
        cx, cy = int(vx * s), int(vy * s)
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), outline="red")
        d.text((cx + 12, cy - 6), name, fill="red")
    dest = out_path or RELIEF_OUT
    im.save(dest, quality=92)
    return dest
