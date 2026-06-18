/**
 * Yuel (kindred) 姻缘符 logo — vector source generator.
 *
 * A vertical interlaced 同心结 (lover's knot) traced from the 天师婚书 talisman
 * crop: two upper loops + two lower loops, split by a woven waist, with small
 * curl-eyes at the crowns and two 符脚 at the base. Strokes are VARIABLE-WIDTH
 * brush ribbons (centerline + width profile -> filled outline), so they read as
 * ink, not uniform vectors — a talisman, not a tidy Chinese-knot ribbon.
 *
 * Run:  node docs/brand/yuel-logo.gen.mjs        # writes the two demo SVGs
 *       node docs/brand/yuel-logo.gen.mjs --png  # also rasterizes (needs @resvg/resvg-js)
 *
 * Retouch the calligraphy by editing the stroke table below; all output derives
 * from it.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))

// ── brush engine ────────────────────────────────────────────────────────────
const R = (n) => Math.round(n * 100) / 100
const cubic = (a, b, c, d, n) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, m = 1 - t
  return [
    m*m*m*a[0] + 3*m*m*t*b[0] + 3*m*t*t*c[0] + t*t*t*d[0],
    m*m*m*a[1] + 3*m*m*t*b[1] + 3*m*t*t*c[1] + t*t*t*d[1],
  ]
})
const centerline = (segs, per) => segs.reduce((p, s, i) => {
  const g = cubic(s[0], s[1], s[2], s[3], per)
  return p.concat(i === 0 ? g : g.slice(1))
}, [])
const widthProfile = (nw, sc, len) => Array.from({ length: len }, (_, i) => {
  const f = i / (len - 1) * sc, lo = Math.floor(f), hi = Math.min(sc, lo + 1), t = f - lo
  return nw[lo] * (1 - t) + nw[hi] * t
})
function ribbon(c, wd) {
  const L = [], Rr = []
  for (let i = 0; i < c.length; i++) {
    const p = c[Math.max(0, i - 1)], n = c[Math.min(c.length - 1, i + 1)]
    let dx = n[0] - p[0], dy = n[1] - p[1]
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l
    const w = wd[i] / 2
    L.push([c[i][0] - dy*w, c[i][1] + dx*w])
    Rr.push([c[i][0] + dy*w, c[i][1] - dx*w])
  }
  Rr.reverse()
  return 'M' + [...L, ...Rr].map((p) => `${R(p[0])} ${R(p[1])}`).join('L') + 'Z'
}
function brush(s, per = 36) {
  const c = centerline(s.segs, per)
  return ribbon(c, widthProfile(s.w, s.segs.length, c.length))
}
const mirX = (s) => ({ w: s.w, segs: s.segs.map((seg) => seg.map(([x, y]) => [240 - x, y])) })

// ── the knot — each stroke: chained cubics + per-node widths (segs+1) ─────────
const TOP = { w: [10,12,12,12,12,10], segs: [
  [[120,122],[94,120],[84,86],[102,79]],      // centre-bottom -> left hump
  [[102,79],[113,74],[119,90],[120,108]],      // left eye -> centre dip
  [[120,108],[120,118],[120,118],[120,108]],   // hold the dip
  [[120,108],[121,90],[127,74],[138,79]],      // dip -> right hump
  [[138,79],[156,86],[146,120],[120,122]],     // right hump -> centre-bottom
]}
const BOT = { w: [10,12,12,12,12,10], segs: [
  [[120,138],[94,140],[84,174],[102,181]],
  [[102,181],[113,186],[119,170],[120,152]],
  [[120,152],[120,142],[120,142],[120,152]],
  [[120,152],[121,170],[127,186],[138,181]],
  [[138,181],[156,174],[146,140],[120,138]],
]}
const WAIST = { w: [11,14,14,11], segs: [[[120,110],[120,120],[120,140],[120,150]]] }
const EYE_L = { w: [5,2], segs: [[[102,79],[92,72],[88,80],[95,84]]] }
const FOOT_L = { w: [7,2], segs: [[[102,182],[98,193],[95,203],[100,211]]] }

export const strokes = [TOP, BOT, WAIST, EYE_L, mirX(EYE_L), FOOT_L, mirX(FOOT_L)]
export const knotPaths = (fill = 'url(#c)') => strokes.map((s) => `<path d="${brush(s)}" fill="${fill}"/>`).join('')

// ── tiles ────────────────────────────────────────────────────────────────────
const DEFS = `
    <linearGradient id="c" x1="120" y1="70" x2="120" y2="206" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#D14A3A"/><stop offset="1" stop-color="#9B2226"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="#1A1512"/><stop offset="1" stop-color="#0C0A09"/>
    </radialGradient>`

export const logoSvg = `<svg width="1024" height="1024" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>${DEFS}</defs>
  <rect width="240" height="240" rx="54" fill="url(#v)"/>
  <rect x="9" y="9" width="222" height="222" rx="46" fill="none" stroke="#C4A882" stroke-opacity="0.16" stroke-width="1.4"/>
  ${knotPaths()}
</svg>`

const compareSvg = `<svg width="1120" height="640" viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="moon" x1="70" y1="70" x2="230" y2="230" gradientUnits="userSpaceOnUse">
      <stop offset="0.18" stop-color="#0B0B0C"/><stop offset="0.5" stop-color="#3A3B40"/><stop offset="1" stop-color="#D7D8DC"/>
    </linearGradient>${DEFS}
  </defs>
  <rect width="560" height="320" fill="#080706"/>
  <rect x="40" y="40" width="200" height="200" rx="45" fill="#0B0B0C"/>
  <circle cx="140" cy="140" r="78" fill="url(#moon)"/>
  <text x="140" y="276" fill="#C4A882" font-family="Georgia,serif" font-size="20" letter-spacing="3" text-anchor="middle">YUUN</text>
  <text x="140" y="298" fill="#6E6A63" font-family="Georgia,serif" font-size="12" text-anchor="middle">almanac · moon</text>
  <rect x="320" y="40" width="200" height="200" rx="45" fill="url(#v)"/>
  <rect x="328" y="48" width="184" height="184" rx="38" fill="none" stroke="#C4A882" stroke-opacity="0.16" stroke-width="1.2"/>
  <g transform="translate(320,40) scale(0.8333)">${knotPaths()}</g>
  <text x="420" y="276" fill="#C4A882" font-family="Georgia,serif" font-size="20" letter-spacing="3" text-anchor="middle">YUEL</text>
  <text x="420" y="298" fill="#6E6A63" font-family="Georgia,serif" font-size="12" text-anchor="middle">姻缘 · 红线符</text>
</svg>`

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(join(DIR, 'yuel-logo-demo.svg'), logoSvg)
  writeFileSync(join(DIR, 'yuel-vs-yuun-demo.svg'), compareSvg)
  if (process.argv.includes('--png')) {
    const { Resvg } = await import('@resvg/resvg-js')
    const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng()
    writeFileSync(join(DIR, 'yuel-logo-demo.png'), png(logoSvg, 1024))
    writeFileSync(join(DIR, 'yuel-vs-yuun-demo.png'), png(compareSvg, 1120))
  }
  console.log('wrote yuel-logo-demo.svg + yuel-vs-yuun-demo.svg')
}
