# Reproducible master generator for the original 碑拓 Pro coin set.
#   python3 gen-coins.py <skins_dir>   (default: alongside this file's ../)
# Renders 1254x1254 PNGs into original/dist/. Requires rsvg-convert + LXGW WenKai font.
import subprocess, math, sys, os
REPO=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),"..")
D=os.path.join(REPO,"original","dist"); os.makedirs(D,exist_ok=True)
DEFS='<defs><filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0" result="na"/><feComponentTransfer in="na" result="nf"><feFuncA type="linear" slope="0.11"/></feComponentTransfer><feFlood flood-color="#7d6a45" result="fib"/><feComposite in="fib" in2="nf" operator="in" result="fibers"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibers"/></feMerge></filter><filter id="ink" x="-18%" y="-18%" width="136%" height="136%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="disp"/><feTurbulence type="fractalNoise" baseFrequency="0.13" numOctaves="3" seed="21" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0" result="ga"/><feComposite in="ga" in2="disp" operator="in" result="grain"/><feComponentTransfer in="grain" result="gf"><feFuncA type="linear" slope="0.45"/></feComponentTransfer><feFlood flood-color="#e8dfca" result="lift"/><feComposite in="lift" in2="gf" operator="in" result="speck"/><feMerge><feMergeNode in="disp"/><feMergeNode in="speck"/></feMerge></filter></defs>'
RING='<circle cx="300" cy="300" r="248" fill="none" stroke-width="40"/><circle cx="300" cy="300" r="271" fill="none" stroke-width="5"/><circle cx="300" cy="300" r="220" fill="none" stroke-width="4"/>'
HOLE='<rect x="256" y="256" width="88" height="88" fill="none" stroke-width="22"/>'
def render(inner,out):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 600 600">{DEFS}<rect width="600" height="600" fill="#e7ddc7" filter="url(#paper)"/><g filter="url(#ink)" fill="#16110a" stroke="#16110a">{inner}</g></svg>'
    open("/tmp/_g.svg","w").write(svg); subprocess.run(["rsvg-convert","-w","1254","-h","1254","/tmp/_g.svg","-o",out],check=True); print("baked",os.path.basename(out))
# 五行 四体: 甲骨(上,reused from kindred ElementGlyph) 小篆(右) 隶书(下) 楷书(左)
G={
'水':{'jg':(['M50,12 C43,30 57,46 50,62 C43,78 57,96 50,118','M33,40 C31,46 31,51 33,57','M31,74 C29,80 29,85 31,91','M67,46 C69,52 69,57 67,63','M69,80 C71,86 71,91 69,97'],130),'zh':(['M50,6 C45,28 55,50 50,66 C46,84 54,102 50,116','M40,30 C32,37 30,46 34,55','M38,68 C29,76 28,88 34,98','M60,30 C68,37 70,46 66,55','M62,68 C71,76 72,88 66,98'],120),'li':(['M50,10 L50,100 C50,107 46,110 40,109','M50,44 C42,39 34,41 28,48','M48,62 C39,74 31,86 24,98','M52,56 C61,69 70,81 80,95'],120)},
'火':{'jg':(['M50,120 C49,98 51,80 50,56 C49,47 50,40 51,33','M44,112 C41,93 35,80 31,62 C29,55 30,50 32,45','M56,112 C59,93 65,80 69,62 C71,55 70,50 68,45','M46,86 L43,75','M54,86 L57,75'],130),'zh':(['M50,114 C49,92 51,70 50,48 C49,38 50,30 51,22','M44,104 C39,86 33,72 30,54 C28,46 30,40 33,34','M56,104 C61,86 67,72 70,54 C72,46 70,40 67,34'],120),'li':(['M40,30 C37,38 36,44 38,50','M60,30 C63,38 64,44 62,50','M50,40 C44,60 36,80 26,104','M50,52 C57,68 66,84 78,104'],120)},
'木':{'jg':(['M50,16 L50,116','M50,46 C42,38 34,32 26,26','M50,46 C58,38 66,32 74,26','M50,84 C42,92 34,100 26,110','M50,84 C58,92 66,100 74,110'],130),'zh':(['M50,12 L50,116','M50,44 C40,36 31,30 22,26','M50,44 C60,36 69,30 78,26','M50,82 C40,90 31,98 22,108','M50,82 C60,90 69,98 78,108'],120),'li':(['M22,46 C40,43 60,43 78,46','M50,18 L50,114','M50,60 C40,76 30,92 20,110','M50,60 C60,76 70,92 80,110'],120)},
'土':{'jg':(['M24,108 L76,108','M50,108 L50,62','M50,40 C61,46 64,55 62,64 L38,64 C36,55 39,46 50,40 Z'],130),'zh':(['M26,104 C40,101 60,101 74,104','M50,104 L50,42','M50,42 C58,46 60,54 58,62 L42,62 C40,54 42,46 50,42 Z'],120),'li':(['M36,46 C44,44 56,44 64,46','M50,30 L50,98','M24,98 C42,95 58,95 76,98'],120)},
'金':{'jg':(['M26,54 L50,22 L74,54','M40,42 L60,42','M50,54 L50,106','M34,78 L66,78','M30,106 L70,106'],130),'zh':(['M50,16 L28,50 L72,50 Z','M50,50 L50,104','M37,72 C44,70 56,70 63,72','M37,90 C44,88 56,88 63,90','M27,104 C42,101 58,101 73,104'],120),'li':(['M50,20 C42,36 34,48 24,58','M50,20 C58,36 66,48 76,58','M34,64 C44,62 56,62 66,64','M50,58 L50,104','M34,86 C44,84 56,84 66,86','M26,104 C42,101 58,101 74,104'],120)},
}
DOTS={'金':{'jg':[[38,92,3.8],[62,92,3.8]],'zh':[[34,82,3.6],[66,82,3.6]],'li':[[37,75,3.4],[63,75,3.4]]}}
def place(el,sc,px,py,target=78,sw=7.5):
    paths,boxh=G[el][sc]; s=target/boxh; tx,ty=px-50*s,py-(boxh/2)*s; body=''
    for i,d in enumerate(paths):
        if el=='土' and i==2: body+=f'<path d="{d}" fill="#16110a" stroke="none"/>'
        else: body+=f'<path d="{d}" fill="none" stroke="#16110a" stroke-width="{sw/s:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
    for dx,dy,r in DOTS.get(el,{}).get(sc,[]): body+=f'<circle cx="{dx}" cy="{dy}" r="{r}" fill="#16110a" stroke="none"/>'
    return f'<g transform="translate({tx:.1f},{ty:.1f}) scale({s:.3f})">{body}</g>'
def kai(el): return f'<g font-family="LXGW WenKai, Songti SC, serif" text-anchor="middle" dominant-baseline="central" font-size="76" stroke="none" fill="#16110a"><text x="160" y="300">{el}</text></g>'
for el,name in [('金','jin'),('木','mu'),('水','shui'),('火','huo'),('土','tu')]:
    render(RING+HOLE+place(el,'jg',300,150)+place(el,'zh',442,300)+place(el,'li',300,452)+kai(el), os.path.join(D,f"wuxing-{name}-yang.png"))
# 太极 v3 (yin-yang disc, eyes top/bottom, clear center for hole)
R=198
taiji=(f'<path d="M300 {300-R} A {R} {R} 0 0 1 300 {300+R} A {R//2} {R//2} 0 0 1 300 300 A {R//2} {R//2} 0 0 0 300 {300-R} Z" stroke="none"/>'
 f'<circle cx="300" cy="{300-R//2}" r="26" fill="#e7ddc7" stroke="none"/><circle cx="300" cy="{300+R//2}" r="26" fill="#16110a" stroke="none"/>'
 '<circle cx="300" cy="300" r="78" fill="#e7ddc7" stroke="none"/>'+RING+'<rect x="258" y="258" width="84" height="84" fill="none" stroke-width="22"/>')
render(taiji, os.path.join(D,"taiji-yang.png"))
# 太极 yin — inverted fish (背面对读: 阴鱼朝上)
taiji_yin=(f'<path d="M300 {300+R} A {R} {R} 0 0 0 300 {300-R} A {R//2} {R//2} 0 0 0 300 300 A {R//2} {R//2} 0 0 1 300 {300+R} Z" stroke="none"/>'
 f'<circle cx="300" cy="{300+R//2}" r="26" fill="#e7ddc7" stroke="none"/><circle cx="300" cy="{300-R//2}" r="26" fill="#16110a" stroke="none"/>'
 '<circle cx="300" cy="300" r="78" fill="#e7ddc7" stroke="none"/>'+RING+'<rect x="258" y="258" width="84" height="84" fill="none" stroke-width="22"/>')
render(taiji_yin, os.path.join(D,"taiji-yin.png"))
# 八卦 (bold trigrams, 先天)
TRI={'乾':[1,1,1],'坤':[0,0,0],'坎':[0,1,0],'離':[1,0,1],'巽':[1,1,0],'震':[0,0,1],'艮':[1,0,0],'兌':[0,1,1]}
POS=[('乾',270),('巽',315),('坎',0),('艮',45),('坤',90),('震',135),('離',180),('兌',225)]; Rb=186; bg=''
for n,ang in POS:
    a=math.radians(ang); cx=300+Rb*math.cos(a); cy=300+Rb*math.sin(a)
    for i,b in enumerate(TRI[n]):
        ly=cy-16+i*16
        bg+= (f'<rect x="{cx-28:.0f}" y="{ly-4.5:.0f}" width="56" height="9" rx="2"/>' if b else f'<rect x="{cx-28:.0f}" y="{ly-4.5:.0f}" width="22" height="9" rx="2"/><rect x="{cx+6:.0f}" y="{ly-4.5:.0f}" width="22" height="9" rx="2"/>')
render(RING+HOLE+bg, os.path.join(D,"bagua-yang.png"))
# 八卦 yin — 后天八卦 (背纹与字面先天不同)
HOUTIAN_POS=[('坎',270),('艮',315),('震',0),('巽',45),('離',90),('坤',135),('兌',180),('乾',225)]
bg_yin=''
for n,ang in HOUTIAN_POS:
    a=math.radians(ang); cx=300+Rb*math.cos(a); cy=300+Rb*math.sin(a)
    for i,b in enumerate(TRI[n]):
        ly=cy-14+i*14
        bg_yin+= (f'<rect x="{cx-24:.0f}" y="{ly-3.5:.0f}" width="48" height="7" rx="1.5"/>' if b else f'<rect x="{cx-24:.0f}" y="{ly-3.5:.0f}" width="18" height="7" rx="1.5"/><rect x="{cx+6:.0f}" y="{ly-3.5:.0f}" width="18" height="7" rx="1.5"/>')
render(RING+HOLE+bg_yin, os.path.join(D,"bagua-yin.png"))
# 北斗七星 (星象)
SB=[(165,232),(150,176),(212,168),(232,224),(300,206),(356,178),(398,196)]
def _star(x,y,r=8,sp=14): return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="#16110a" stroke="none"/><line x1="{x-sp}" y1="{y}" x2="{x+sp}" y2="{y}" stroke="#16110a" stroke-width="2.4"/><line x1="{x}" y1="{y-sp}" x2="{x}" y2="{y+sp}" stroke="#16110a" stroke-width="2.4"/>')
_ord=[(0,1),(1,2),(2,3),(3,0),(3,4),(4,5),(5,6)]
_ln=''.join(f'<line x1="{SB[a][0]}" y1="{SB[a][1]}" x2="{SB[b][0]}" y2="{SB[b][1]}" stroke="#16110a" stroke-width="3.2"/>' for a,b in _ord)
render(RING+HOLE+_ln+''.join(_star(x,y) for x,y in SB), os.path.join(D,"beidou-yang.png"))
# 洛书 九宫 (magic square 4 9 2 / 3 5(hole) 7 / 8 1 6; odd=ink yang, even=hollow yin)
_GRID=[(190,190,4),(300,150,9),(410,190,2),(150,300,3),(450,300,7),(190,410,8),(300,450,1),(410,410,6)]
_ODD={9,3,7,1}
def _cluster(cx,cy,n,ink):
    rows=[]; k=n
    while k>0: rows.append(min(3,k)); k-=min(3,k)
    sp=17; H=(len(rows)-1)*sp; out=''
    for ri,c in enumerate(rows):
        y=cy-H/2+ri*sp; W=(c-1)*sp
        for ci in range(c):
            x=cx-W/2+ci*sp
            out+=(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6.5" fill="#16110a" stroke="none"/>' if ink else f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6.5" fill="#e7ddc7" stroke="#16110a" stroke-width="3"/>')
    return out
render(RING+HOLE+''.join(_cluster(cx,cy,n,(n in _ODD)) for cx,cy,n in _GRID), os.path.join(D,"luoshu-yang.png"))
print("done")
