/**
 * Yuel (kindred) 姻缘符 logo — vector source generator.
 *
 * The mark is grass-script (草书) brush calligraphy traced from the 天师婚书
 * talisman crop: a top sweep hooks into two overlapping loops (the 同心 knot),
 * each closing in a small curl, with two energetic 符脚 terminals. Strokes are
 * VARIABLE-WIDTH brush ribbons (centerline + width profile → filled outline),
 * which is why they read as ink, not as uniform-stroke vectors.
 *
 * Run:  node docs/brand/yuel-logo.gen.mjs        # writes yuel-logo-demo.svg
 *       node docs/brand/yuel-logo.gen.mjs --png  # also rasterizes (needs @resvg/resvg-js)
 *
 * Edit the `strokes` table (control points + per-node widths) to retouch the
 * calligraphy; everything downstream is derived.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))

// Each stroke: chained cubic segments [p0,p1,p2,p3] + node widths (segs+1).
export const strokes = [
  { segs: [[[56,110],[80,78],[120,74],[146,90]],[[146,90],[158,98],[172,100],[181,89]],[[181,89],[187,81],[181,70],[171,75]]], w: [3,16,9,4,2] },
  { segs: [[[167,96],[192,106],[192,140],[165,145]],[[165,145],[148,147],[149,126],[165,123]]], w: [10,13,5,2] },
  { segs: [[[151,126],[120,113],[86,119],[86,144]],[[86,144],[86,167],[116,169],[122,147]]], w: [11,14,5,2] },
  { segs: [[[105,160],[99,176],[90,188],[81,184]]], w: [8,2] },
  { segs: [[[160,146],[167,168],[174,184],[183,179]]], w: [8,2] },
]

const R = (n) => Math.round(n * 100) / 100
const cubic = (a,b,c,d,n) => Array.from({length:n+1}, (_,i)=>{const t=i/n,m=1-t;return [m*m*m*a[0]+3*m*m*t*b[0]+3*m*t*t*c[0]+t*t*t*d[0], m*m*m*a[1]+3*m*m*t*b[1]+3*m*t*t*c[1]+t*t*t*d[1]]})
const centerline = (segs,per) => segs.reduce((p,s,i)=>{const g=cubic(s[0],s[1],s[2],s[3],per);return p.concat(i===0?g:g.slice(1))},[])
const widths = (nw,sc,len,bump)=>Array.from({length:len},(_,i)=>{const f=i/(len-1)*sc,lo=Math.floor(f),hi=Math.min(sc,lo+1),t=f-lo;return nw[lo]*(1-t)+nw[hi]*t+bump})
function ribbon(c,wd){const L=[],Rr=[];for(let i=0;i<c.length;i++){const p=c[Math.max(0,i-1)],n=c[Math.min(c.length-1,i+1)];let dx=n[0]-p[0],dy=n[1]-p[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const w=wd[i]/2;L.push([c[i][0]-dy*w,c[i][1]+dx*w]);Rr.push([c[i][0]+dy*w,c[i][1]-dx*w])}Rr.reverse();return 'M'+[...L,...Rr].map(p=>`${R(p[0])} ${R(p[1])}`).join('L')+'Z'}
export const brush = (s,bump=1,per=32)=>{const c=centerline(s.segs,per);return ribbon(c,widths(s.w,s.segs.length,c.length,bump))}
export const knotPaths = (fill='url(#c)',bump=1)=>strokes.map(s=>`<path d="${brush(s,bump)}" fill="${fill}"/>`).join('')

export const svg = `<svg width="1024" height="1024" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="c" x1="120" y1="64" x2="120" y2="196" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#D14A3A"/><stop offset="1" stop-color="#9B2226"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="#1A1512"/><stop offset="1" stop-color="#0C0A09"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" rx="54" fill="url(#v)"/>
  <rect x="9" y="9" width="222" height="222" rx="46" fill="none" stroke="#C4A882" stroke-opacity="0.16" stroke-width="1.4"/>
  <g transform="translate(2,1)">${knotPaths()}</g>
</svg>`

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(join(DIR, 'yuel-logo-demo.svg'), svg)
  if (process.argv.includes('--png')) {
    const { Resvg } = await import('@resvg/resvg-js')
    writeFileSync(join(DIR, 'yuel-logo-demo.png'), new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng())
  }
  console.log('wrote yuel-logo-demo.svg')
}
