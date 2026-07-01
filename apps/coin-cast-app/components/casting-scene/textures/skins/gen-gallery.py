"""Regenerate skins/gallery.html — a self-contained visual record (base64) of every
coin skin, front (字面) + back (背面). Run after re-baking any set. Prevents the
'lost the coins, no record' problem."""
import base64, io, os
from PIL import Image

SK = "/Users/chris/Desktop/code/web/hexastral/apps/coin-cast-app/components/casting-scene/textures/skins"
HX = os.path.join(SK, "huaxia", "dist")
OR = os.path.join(SK, "original", "dist")
SU_BACK = os.path.join(HX, "back-su-yin.png")

def thumb(path, size=150):
    im = Image.open(path).convert("RGB"); im.thumbnail((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=80)
    return base64.b64encode(b.getvalue()).decode()

# (id, label, note, yang_path, yin_path)
CLASSIC = [("classic", "素钱 · Plain", "free · owned", os.path.join(HX, "back-su-yang.png"), SU_BACK)]
HUAXIA = [
    ("banliang", "半兩", "秦 · 小篆"), ("wuzhu", "五銖", "汉 · 篆"),
    ("daquan", "大泉五十", "新莽 · 悬针篆"), ("kaiyuan", "開元通寶", "唐 · 隶楷"),
    ("daguan", "大觀通寶", "宋徽宗 · 瘦金体"),
]
ORIG = [
    ("bagua", "八卦钱", "先天八卦"), ("taiji", "太极", "阴阳"),
    ("wuxing-jin", "五行·金", "四体"), ("wuxing-mu", "五行·木", "四体"),
    ("wuxing-shui", "五行·水", "四体"), ("wuxing-huo", "五行·火", "四体"),
    ("wuxing-tu", "五行·土", "四体"), ("beidou", "北斗七星", "星象"), ("luoshu", "洛书", "九宫"),
]

def card(label, note, ypath, npath, tier):
    y = thumb(ypath); n = thumb(npath)
    return f'''<div class="card">
  <div class="faces"><img src="data:image/jpeg;base64,{y}"/><img src="data:image/jpeg;base64,{n}"/></div>
  <div class="lab">{label}</div><div class="note">{note}</div><div class="tier {tier}">{tier}</div>
</div>'''

cards = []
for cid, lab, note, yp, np_ in CLASSIC:
    cards.append(card(lab, note, yp, np_, "free"))
for cid, lab, note in HUAXIA:
    cards.append(card(lab, note, os.path.join(HX, f"{cid}-yang.png"), os.path.join(HX, f"{cid}-yin.png"), "华夏"))
for cid, lab, note in ORIG:
    cards.append(card(lab, note, os.path.join(OR, f"{cid}-yang.png"), SU_BACK, "原创"))

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
.free{{background:#1f2a1a;color:#9fce7e}} .华夏{{background:#2a1f14;color:#d9a441}} .原创{{background:#1a1f2a;color:#7e9fce}}
</style>
<h1>CoinCast · 卦钱皮肤图鉴</h1>
<div class="sub">left = 字面 (obverse / 阳) · right = 背面 (reverse / 阴) — every skin two-sided</div>
<div class="grid">
{''.join(cards)}
</div>'''

open(os.path.join(SK, "gallery.html"), "w").write(html)
print("gallery.html", len(html), "bytes,", len(cards), "coins")
