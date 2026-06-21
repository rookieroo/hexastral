import re
mark = open('mark_inner.txt').read()
g = dict(re.findall(r'(\w+)=(.+)', open('geom.txt').read()))
MARKTF = g['TF']
bw,bh,bx,by = map(float, re.match(r'(\d+)x(\d+)\+(\d+)\+(\d+)', g['BBOX']).groups())
cx,cy = bx+bw/2, by+bh/2
S = round(0.82*100/max(bw,bh), 5)
KNOTTF = f'translate(50,50) scale({S}) translate({-cx:.1f},{-cy:.1f})'

def knot(color):
    return f'<g transform="{KNOTTF}" color="{color}"><use href="#yuelmark"/></g>'
def tile(px, ground, color):
    return f'<svg viewBox="0 0 100 100" width="{px}" height="{px}"><rect width="100" height="100" fill="url(#{ground})"/>{knot(color)}</svg>'
def take_c():
    sizes = ''.join(f'<div class="s" style="width:{p}px;height:{p}px;border-radius:23%;overflow:hidden">{tile(p,"paper","#9B2226")}</div>' for p in (60,40,29))
    return f'<div class="card"><span class="tag">C · 宣纸朱砂 · 临摹填充</span><div class="tile">{tile(188,"paper","#9B2226")}</div><div class="sizes">{sizes}</div></div>'

def settings2(px, sw, col='#C4A882'):
    return (f'<svg viewBox="0 0 24 24" width="{px}" height="{px}" fill="none" stroke="{col}" stroke-width="{sw}" '
            'stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/>'
            '<circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>')
def spline(px, sw, col='#F5F0E8'):
    return (f'<svg viewBox="0 0 24 24" width="{px}" height="{px}" fill="none" stroke="{col}" stroke-width="{sw}" '
            'stroke-linecap="round" stroke-linejoin="round"><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>'
            '<path d="M5 17A12 12 0 0 1 17 5"/></svg>')
def logo(px):
    return f'<svg viewBox="0 0 100 100" width="{px}" height="{px}">{knot("#C4A882")}</svg>'

html = (open('template.html').read()
        .replace('__MARKTF__', MARKTF).replace('__MARK__', mark)
        .replace('__TAKE_C__', take_c())
        .replace('__LOGO_TL__', logo(30)).replace('__SET2_TR__', settings2(21, 2))
        .replace('__SET2_BIG__', settings2(40, 1.8)).replace('__SET2_22__', settings2(22, 2))
        .replace('__SPLINE_FAB__', spline(28, 2)).replace('__SPLINE_BIG__', spline(38, 1.9, '#C4A882')))
open('yuel-icons.html','w').write(html)
print(f"filled cinnabar; bbox {bw:.0f}x{bh:.0f} center=({cx:.0f},{cy:.0f}) S={S} -> mark ~{bw*S:.0f}x{bh*S:.0f} in tile")
