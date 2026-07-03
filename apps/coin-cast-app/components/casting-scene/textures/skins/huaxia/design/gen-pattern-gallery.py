#!/usr/bin/env python3
"""原创卦钱纹样 · 三风格图鉴。"""
from __future__ import annotations

import base64
import io
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from coin_motifs import ORACLE_SET, coin_motif_label  # noqa: E402

COINS = [
    ("banliang", "半兩"),
    ("wuzhu", "五銖"),
    ("daquan", "大泉五十"),
    ("kaiyuan", "開元通寶"),
    ("daguan", "大觀通寶"),
    ("hongwu", "洪武通寶"),
]
STYLES = [("rub", "碑拓"), ("seal", "印章"), ("ink", "水墨")]


def thumb(path: str, size: int = 130) -> str:
    im = Image.open(path).convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=82)
    return base64.b64encode(buf.getvalue()).decode()


def card(lab: str, note: str, yp: str, np_: str, tier: str) -> str:
    return f'''<div class="card">
  <div class="faces"><img src="data:image/jpeg;base64,{thumb(yp)}"/><img src="data:image/jpeg;base64,{thumb(np_)}"/></div>
  <div class="lab">{lab}</div><div class="note">{note}</div><div class="tier">{tier}</div>
</div>'''


sections: list[str] = []
for sid, slabel in STYLES:
    cards: list[str] = []
    for cid, lab in COINS:
        yp = os.path.join(HERE, "dist", sid, f"{cid}-yang.png")
        np_ = os.path.join(HERE, "dist", sid, f"{cid}-yin.png")
        if os.path.isfile(yp):
            cards.append(card(lab, coin_motif_label(cid), yp, np_, slabel))
    sections.append(f'<section><h2>{slabel}</h2><div class="grid">{"".join(cards)}</div></section>')

html = f'''<!doctype html><meta charset="utf-8"><title>原创卦钱纹样</title>
<style>
body{{background:#0e0c0b;color:#d8d2c6;font-family:-apple-system,sans-serif;margin:0;padding:28px}}
h1{{font-weight:500;font-size:20px}}
.sub{{color:#8a8478;font-size:13px;margin-bottom:22px;max-width:56rem;line-height:1.55}}
section{{margin-bottom:32px}}
h2{{font-size:15px;color:#c9b896;margin:0 0 14px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px}}
.card{{background:#17130f;border:0.5px solid #2a241d;border-radius:14px;padding:14px;text-align:center}}
.faces{{display:flex;gap:8px;justify-content:center}}
.faces img{{width:74px;height:74px;border-radius:50%;object-fit:cover;border:0.5px solid #2a241d}}
.lab{{margin-top:10px;font-size:14px}}
.note{{color:#8a8478;font-size:10px;margin-top:4px}}
.tier{{display:inline-block;margin-top:8px;font-size:10px;padding:2px 8px;border-radius:8px;background:#1a242f;color:#7eb0d9}}
</style>
<h1>卦钱 · 六爻原创套</h1>
<div class="sub">HexAstral 自有 IP · 图案主 / 一字点睛 · 碑拓·印章·水墨做旧。字面：卦/爻/变/易/觀/陰。</div>
{"".join(sections)}
'''
open(os.path.join(HERE, "pattern-gallery.html"), "w", encoding="utf-8").write(html)
print("pattern-gallery.html", len(html), "bytes")
