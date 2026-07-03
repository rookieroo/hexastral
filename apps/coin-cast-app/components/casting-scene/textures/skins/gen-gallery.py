"""Regenerate skins/gallery.html — a self-contained visual record (base64) of every
coin skin, front (字面) + back (背面). Run after re-baking any set."""
import base64
import io
import os

from PIL import Image

SK = os.path.dirname(os.path.abspath(__file__))
HX = os.path.join(SK, "huaxia", "dist")
TRC = os.path.join(HX, "tracing")
SEAL = os.path.join(HX, "seal-photo")
HAND = os.path.join(HX, "hand-rubbing")
OR = os.path.join(SK, "original", "dist")
DESIGN = os.path.join(SK, "huaxia", "design", "dist", "rub")
SU_BACK = os.path.join(HX, "back-su-yin.png")

CLASSIC = [("classic", "素钱 · Plain", "free · owned", os.path.join(HX, "back-su-yang.png"), SU_BACK)]
HUAXIA = [
    ("banliang", "半兩", "起卦"),
    ("wuzhu", "五銖", "揲爻"),
    ("daquan", "大泉五十", "变卦"),
    ("kaiyuan", "開元通寶", "流通"),
    ("daguan", "大觀通寶", "观象"),
    ("hongwu", "洪武通寶", "阴阳"),
]
HUAXIA_TRACE = []  # 六币均已走 design 六爻纹样管线；照片 tier 仍保留在 华夏
ORIG = [
    ("bagua", "八卦钱", "先天八卦"),
    ("taiji", "太极", "阴阳"),
    ("wuxing-jin", "五行·金", "四体"),
    ("wuxing-mu", "五行·木", "四体"),
    ("wuxing-shui", "五行·水", "四体"),
    ("wuxing-huo", "五行·火", "四体"),
    ("wuxing-tu", "五行·土", "四体"),
    ("beidou", "北斗七星", "星象"),
    ("luoshu", "洛书", "九宫"),
]


def cap_path(dist_dir: str, cid: str, face: str) -> str:
    for ext in (".jpg", ".png"):
        p = os.path.join(dist_dir, f"{cid}-{face}{ext}")
        if os.path.exists(p):
            return p
    return os.path.join(dist_dir, f"{cid}-{face}.jpg")


def thumb(path: str, size: int = 150) -> str:
    im = Image.open(path).convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def card(label: str, note: str, ypath: str, npath: str, tier: str) -> str:
    y = thumb(ypath)
    n = thumb(npath)
    return f'''<div class="card">
  <div class="faces"><img src="data:image/jpeg;base64,{y}"/><img src="data:image/jpeg;base64,{n}"/></div>
  <div class="lab">{label}</div><div class="note">{note}</div><div class="tier {tier}">{tier}</div>
</div>'''


cards: list[str] = []
for cid, lab, note, yp, np_ in CLASSIC:
    cards.append(card(lab, note, yp, np_, "free"))
for cid, lab, note in HUAXIA:
    cards.append(card(lab, note, cap_path(HX, cid, "yang"), cap_path(HX, cid, "yin"), "华夏"))
# 华夏六币：字体库 + dark 青铜设计（已接入 coin-skins）
for coin_id, lab, note in HUAXIA:
    yp = cap_path(DESIGN, coin_id, "yang")
    if os.path.exists(yp):
        cards.append(card(lab, note + " · 六爻原创", yp, cap_path(DESIGN, coin_id, "yin"), "设计"))
for cid, lab, note in HUAXIA_TRACE:
    yp = cap_path(TRC, cid, "yang")
    np_ = cap_path(TRC, cid, "yin")
    if os.path.exists(yp):
        cards.append(card(lab, note + " · 线稿碑拓", yp, np_, "碑拓"))
for cid, lab, note in HUAXIA_TRACE:
    yp = cap_path(SEAL, cid, "yang")
    np_ = cap_path(SEAL, cid, "yin")
    if os.path.exists(yp):
        cards.append(card(lab, note + " · 印章", yp, np_, "印章"))
for cid, lab, note in HUAXIA_TRACE:
    yp = cap_path(HAND, cid, "yang")
    np_ = cap_path(HAND, cid, "yin")
    if os.path.exists(yp):
        cards.append(card(lab, note + " · 手描path", yp, np_, "手描"))
for cid, lab, note in ORIG:
    np_ = os.path.join(OR, f"{cid}-yin.png")
    if not os.path.exists(np_):
        np_ = SU_BACK
    cards.append(card(lab, note, os.path.join(OR, f"{cid}-yang.png"), np_, "原创"))

html = f'''<!doctype html><meta charset="utf-8"><title>CoinCast 卦钱皮肤图鉴</title>
<style>
body{{background:#0e0c0b;color:#d8d2c6;font-family:-apple-system,sans-serif;margin:0;padding:28px}}
h1{{font-weight:500;letter-spacing:2px;font-size:20px}}
.sub{{color:#8a8478;font-size:13px;margin-bottom:22px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px}}
.card{{background:#17130f;border:0.5px solid #2a241d;border-radius:14px;padding:14px;text-align:center}}
.faces{{display:flex;gap:8px;justify-content:center}}
.faces img{{width:74px;height:74px;border-radius:50%;object-fit:cover;border:0.5px solid #2a241d}}
.lab{{margin-top:10px;font-size:14px}}
.note{{color:#8a8478;font-size:11px;margin-top:2px}}
.tier{{display:inline-block;margin-top:8px;font-size:10px;letter-spacing:1px;padding:2px 8px;border-radius:8px}}
.free{{background:#1f2a1a;color:#9fce7e}} .华夏{{background:#2a1f14;color:#d9a441}} .设计{{background:#1a242f;color:#7eb0d9}} .碑拓{{background:#2a2414;color:#c9b896}} .印章{{background:#2a1414;color:#d97070}} .手描{{background:#1f2a24;color:#7ec9a8}} .原创{{background:#1a1f2a;color:#7e9fce}}
</style>
<h1>CoinCast · 卦钱皮肤图鉴</h1>
<div class="sub">华夏六币：卦钱六爻原创套（碑拓默认 · 三风格见 design/pattern-gallery.html）。</div>
<div class="grid">
{''.join(cards)}
</div>'''

open(os.path.join(SK, "gallery.html"), "w", encoding="utf-8").write(html)
print("gallery.html", len(html), "bytes,", len(cards), "coins")
