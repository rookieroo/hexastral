#!/usr/bin/env python3
"""
水墨留白五帝钱 — brush calligraphy on bone paper (not photo stylize).

Uses Ma Shan Zheng (毛笔) for 通宝钱文; hand path strokes for 篆书半两/五铢.
Outputs faces/<id>-ink.png, -ink-back.png, -ink-bump.png.

  python3 apps/coin-cast-app/scripts/gen-wudi-ink-wash.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FACES = ROOT / "assets" / "coins" / "faces"
OUT = 1024
RIM = OUT * 0.453
HOLE = OUT * 0.195

BRUSH_FONT = Path.home() / "Library/Fonts/MaShanZheng-Regular.ttf"
FALLBACK_FONT = Path.home() / "Library/Fonts/LXGWWenKai-Regular.ttf"

# Seal paths in 100×100 box (same as wudi-coins.mjs)
SEAL = {
    "liang": [
        ((18, 22), (82, 22)),
        ((27, 22), (27, 80)),
        ((73, 22), (73, 80)),
        ((50, 30), (50, 80)),
        ((38, 42), (31, 70)),
        ((38, 42), (45, 66)),
        ((62, 42), (55, 66)),
        ((62, 42), (69, 70)),
        ((27, 80), (73, 80)),
    ],
    "ban": [
        ((38, 20), (45, 33)),
        ((62, 20), (55, 33)),
        ((50, 22), (50, 86)),
        ((24, 46), (76, 46)),
        ((32, 65), (68, 65)),
    ],
    "zhu": [
        ((24, 12), (10, 28)),
        ((24, 12), (38, 28)),
        ((24, 12), (24, 80)),
        ((12, 40), (36, 40)),
        ((12, 55), (36, 55)),
        ((8, 80), (40, 80)),
        ((15, 66), (21, 60)),
        ((33, 66), (27, 60)),
        ((48, 48), (92, 48)),
        ((70, 20), (70, 84)),
        ((70, 58), (52, 84)),
        ((70, 58), (88, 84)),
    ],
    "wu": [
        ((20, 22), (80, 22)),
        ((20, 78), (80, 78)),
        ((34, 30), (66, 70)),
        ((66, 30), (34, 70)),
    ],
}

COINS = {
    "qin-banliang": {
        "kind": "seal",
        "paper": (250, 246, 238),
        "ink": (26, 20, 16),
        "seal": ("liang", "ban"),  # left, right
    },
    "han-wuzhu": {
        "kind": "seal",
        "paper": (248, 250, 246),
        "ink": (20, 32, 24),
        "seal": ("zhu", "wu"),
    },
    "tang-kaiyuan": {
        "kind": "tongbao",
        "paper": (251, 247, 236),
        "ink": (28, 20, 8),
        # Simplified — Ma Shan Zheng has no 開/寶 glyphs (renders .notdef boxes).
        "chars": ("开", "元", "宝", "通"),
    },
    "song-songyuan": {
        "kind": "tongbao",
        "paper": (250, 246, 236),
        "ink": (26, 18, 8),
        "chars": ("宋", "元", "宝", "通"),
    },
    "ming-yongle": {
        "kind": "tongbao",
        "paper": (246, 248, 244),
        "ink": (16, 24, 18),
        "chars": ("永", "乐", "宝", "通"),
    },
}


def load_brush(size: int) -> ImageFont.FreeTypeFont:
    path = BRUSH_FONT if BRUSH_FONT.is_file() else FALLBACK_FONT
    if not path.is_file():
        raise SystemExit(f"brush font missing: {BRUSH_FONT}")
    return ImageFont.truetype(str(path), size=size)


def soft_circle_mask(size: int, radius: float, feather: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    c = size / 2
    d.ellipse((c - radius, c - radius, c + radius, c + radius), fill=255)
    if feather > 0:
        m = m.filter(ImageFilter.GaussianBlur(radius=feather))
    return m


def punch_hole(alpha: Image.Image, side: float) -> Image.Image:
    a = alpha.copy()
    d = ImageDraw.Draw(a)
    c = alpha.size[0] / 2
    h = side / 2
    d.rectangle((c - h, c - h, c + h, c + h), fill=0)
    return a


def paper_disc(paper: tuple[int, int, int]) -> Image.Image:
    """Near-flat bone paper — soft edge vignette only (留白 field)."""
    img = Image.new("RGB", (OUT, OUT), paper)
    arr = np.asarray(img).astype(np.float32)
    yy, xx = np.mgrid[0:OUT, 0:OUT]
    c = (OUT - 1) / 2
    dist = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / (OUT * 0.453)
    # Very soft edge darken only
    edge = np.clip((dist - 0.72) / 0.35, 0, 1)[..., None]
    arr = arr * (1 - edge * 0.08)
    # Fine paper tooth
    rng = np.random.default_rng(abs(hash(paper)) % (2**31))
    grain = rng.normal(0, 2.4, (OUT, OUT, 1))
    arr = np.clip(arr + grain, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def draw_brush_stroke(
    layer: Image.Image,
    pts: list[tuple[float, float]],
    color: tuple[int, int, int],
    width: float,
) -> None:
    d = ImageDraw.Draw(layer)
    if len(pts) < 2:
        return
    d.line(pts, fill=color + (255,), width=max(1, int(round(width))), joint="curve")


def draw_seal_glyph(
    canvas: Image.Image,
    name: str,
    ox: float,
    oy: float,
    scale: float,
    ink: tuple[int, int, int],
) -> None:
    strokes = SEAL[name]
    # Bleed underlay
    bleed = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    body = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    for a, b in strokes:
        p0 = (ox + a[0] * scale, oy + a[1] * scale)
        p1 = (ox + b[0] * scale, oy + b[1] * scale)
        draw_brush_stroke(bleed, [p0, p1], ink, 14 * scale * 1.15)
        draw_brush_stroke(body, [p0, p1], ink, 10 * scale)
    bleed = bleed.filter(ImageFilter.GaussianBlur(radius=OUT * 0.004))
    # Reduce bleed alpha
    ba = np.asarray(bleed).astype(np.float32)
    ba[..., 3] *= 0.28
    bleed = Image.fromarray(ba.astype(np.uint8), "RGBA")
    canvas.alpha_composite(bleed)
    canvas.alpha_composite(body)


def draw_char(
    canvas: Image.Image,
    ch: str,
    cx: float,
    cy: float,
    font: ImageFont.FreeTypeFont,
    ink: tuple[int, int, int],
) -> None:
    tmp = Image.new("L", (1, 1))
    td = ImageDraw.Draw(tmp)
    bbox = td.textbbox((0, 0), ch, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    # Anchor on glyph visual center (account for font ascent)
    x0 = cx - tw / 2 - bbox[0]
    y0 = cy - th / 2 - bbox[1]

    bleed = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bleed)
    bd.text((x0 + 2, y0 + 3), ch, font=font, fill=ink + (55,))
    bleed = bleed.filter(ImageFilter.GaussianBlur(radius=OUT * 0.007))
    canvas.alpha_composite(bleed)

    body = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.text((x0, y0), ch, font=font, fill=ink + (250,))
    canvas.alpha_composite(body)


def draw_rim(canvas: Image.Image, ink: tuple[int, int, int]) -> None:
    rim = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(rim)
    c = OUT / 2
    # Outer ink ring — slightly imperfect via blur
    d.ellipse(
        (c - RIM, c - RIM, c + RIM, c + RIM),
        outline=ink + (200,),
        width=max(3, int(OUT * 0.011)),
    )
    d.ellipse(
        (c - RIM * 0.9, c - RIM * 0.9, c + RIM * 0.9, c + RIM * 0.9),
        outline=ink + (70,),
        width=max(1, int(OUT * 0.004)),
    )
    # Inner 郭 — flush with punched 穿
    h = HOLE / 2
    d.rectangle(
        (c - h, c - h, c + h, c + h),
        outline=ink + (120,),
        width=max(2, int(OUT * 0.008)),
    )
    rim = rim.filter(ImageFilter.GaussianBlur(radius=0.8))
    canvas.alpha_composite(rim)


def draw_star_moon(canvas: Image.Image, ink: tuple[int, int, int]) -> None:
    layer = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = OUT / 2
    # 星
    sr = OUT * 0.02
    d.ellipse((c - sr, OUT * 0.2 - sr, c + sr, OUT * 0.2 + sr), fill=ink + (160,))
    # 月 crescent via two circles
    my = OUT * 0.78
    R = OUT * 0.042
    d.ellipse((c - R, my - R, c + R, my + R), fill=ink + (140,))
    cut = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cut)
    off = R * 0.55
    cd.ellipse((c - R + off, my - R, c + R + off, my + R), fill=(0, 0, 0, 255))
    # Punch crescent
    la = np.asarray(layer).copy()
    ca = np.asarray(cut)
    mask = ca[..., 3] > 0
    la[mask, 3] = 0
    layer = Image.fromarray(la, "RGBA").filter(ImageFilter.GaussianBlur(radius=0.7))
    canvas.alpha_composite(layer)


def compose(coin_id: str, side: str) -> Image.Image:
    defn = COINS[coin_id]
    paper = paper_disc(defn["paper"])
    ink = defn["ink"]
    # Start with transparent; paste paper under circular mask later
    canvas = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    canvas.paste(paper.convert("RGBA"))

    if side == "reverse":
        draw_star_moon(canvas, ink)
    elif defn["kind"] == "seal":
        left, right = defn["seal"]
        scale = OUT / 360.56
        ty = OUT * 0.3555
        draw_seal_glyph(canvas, left, OUT * 0.1172, ty, scale, ink)
        draw_seal_glyph(canvas, right, OUT * 0.6055, ty, scale, ink)
    else:
        font = load_brush(int(OUT * 0.2))
        top, bottom, left, right = defn["chars"]
        c = OUT / 2
        r = RIM
        draw_char(canvas, top, c, c - r * 0.5, font, ink)
        draw_char(canvas, bottom, c, c + r * 0.5, font, ink)
        draw_char(canvas, left, c - r * 0.5, c, font, ink)
        draw_char(canvas, right, c + r * 0.5, c, font, ink)

    draw_rim(canvas, ink)

    alpha = soft_circle_mask(OUT, RIM, OUT * 0.007)
    alpha = punch_hole(alpha, HOLE)
    out = canvas
    existing = np.asarray(out)[..., 3].astype(np.float32)
    # Paper fill was opaque — rebuild alpha from mask
    rgb = np.asarray(out)[..., :3]
    a = np.asarray(alpha).astype(np.float32)
    rgba = np.dstack([rgb, a]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def make_bump(face: Image.Image) -> Image.Image:
    g = face.convert("L").filter(ImageFilter.GaussianBlur(radius=0.5))
    arr = np.asarray(g).astype(np.float32)
    alpha = np.asarray(face)[..., 3]
    mask = alpha > 16
    if mask.any():
        lo, hi = np.percentile(arr[mask], (4, 96))
        if hi > lo:
            arr = (arr - lo) / (hi - lo) * 255
    arr = np.clip(arr, 0, 255)
    arr = 255 / (1 + np.exp(-(arr - 128) / 24))
    return ImageOps.autocontrast(Image.fromarray(arr.astype(np.uint8), "L"), cutoff=2)


def main() -> None:
    FACES.mkdir(parents=True, exist_ok=True)
    for coin_id in COINS:
        print(f"→ {coin_id}-ink (水墨)")
        ob = compose(coin_id, "obverse")
        bk = compose(coin_id, "reverse")
        bump = make_bump(ob)
        ob.save(FACES / f"{coin_id}-ink.png", optimize=True)
        bk.save(FACES / f"{coin_id}-ink-back.png", optimize=True)
        bump.save(FACES / f"{coin_id}-ink-bump.png", optimize=True)
        a = np.asarray(ob)[..., 3]
        print(
            f"  alpha center={a[OUT // 2, OUT // 2]} "
            f"body={a[OUT // 2, int(OUT * 0.30)]} corner={a[8, 8]}"
        )
    print(f"done — brush 水墨 @ {OUT}² → {FACES}")


if __name__ == "__main__":
    main()
