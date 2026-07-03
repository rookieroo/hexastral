"""半两设计参考图 — F01 咸阳博物馆（用户选定）。"""
from __future__ import annotations

import importlib.util
import os

REF_FILE = "banliang-xianyang.jpg"
REF_ID = "F01"
REF_LABEL = "咸阳博物馆 · 半两钱"
COMMONS_URL = "https://commons.wikimedia.org/wiki/File:Bianliang_Coin,_Xianyang_Museum.jpg"
ATTRIBUTION = "幽灵巴尼 / Wikimedia Commons — CC BY-SA"

PARENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_PATH = os.path.join(PARENT, "src", REF_FILE)
DESIGN = os.path.join(os.path.dirname(os.path.abspath(__file__)))
RELIEF_OUT = os.path.join(DESIGN, "ref_relief_annotated.jpg")


def load_gen_huaxia():
    spec = importlib.util.spec_from_file_location(
        "gen_huaxia", os.path.join(PARENT, "gen-huaxia.py")
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def build_relief_annotated(out_path: str | None = None) -> str:
    """Square coin + relief map with char anchor dots → JPEG for verify-glyphs."""
    import numpy as np
    from PIL import Image, ImageDraw
    from scipy import ndimage

    if not os.path.isfile(SRC_PATH):
        raise FileNotFoundError(f"missing reference {SRC_PATH}")

    gh = load_gen_huaxia()
    full = Image.open(SRC_PATH).convert("RGB")
    box, _ = gh.pick_coin(full)
    if box is None:
        raise RuntimeError(f"no coin detected in {REF_FILE}")
    coin = gh.square_coin(full, box)
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
    for name, vx, vy in [("ban", 448, 302), ("liang", 152, 302)]:
        cx, cy = int(vx * s), int(vy * s)
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), outline="red")
        d.text((cx + 12, cy - 6), name, fill="red")
    dest = out_path or RELIEF_OUT
    im.save(dest, quality=92)
    return dest
