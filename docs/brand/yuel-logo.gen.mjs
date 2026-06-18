/**
 * Yuel (kindred) 姻缘符 logo — vector source generator.
 *
 * The 姻缘符 knot drawn as ONE continuous calligraphic brushstroke (一笔), traced
 * from the 碑拓 crop: top-left loop -> top-right loop (crossing) -> centre cross
 * -> bottom-left loop -> bottom-right loop -> foot. A single self-crossing
 * centerline, swept with a varying width profile (thin entry, full body, tapered
 * 符脚) into one filled ink ribbon — asymmetric and hand-irregular, NOT mirrored.
 *
 * Run:  node docs/brand/yuel-logo.gen.mjs        # writes the two demo SVGs
 *       node docs/brand/yuel-logo.gen.mjs --png  # also rasterizes (needs @resvg/resvg-js)
 *
 * Retouch the calligraphy by editing `KNOT` (the anchor points the brush passes
 * through, in drawing order) or `WIDTH` (brush pressure along the stroke).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))

// ── brush engine: one centerline (Catmull-Rom through anchors) -> filled ribbon
const R = (n) => Math.round(n * 100) / 100
function crSpline(pts, per = 20, tension = 1) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension]
    for (let j = 0; j <= per; j++) {
      const t = j / per, m = 1 - t
      out.push([
        m*m*m*p1[0] + 3*m*m*t*c1[0] + 3*m*t*t*c2[0] + t*t*t*p2[0],
        m*m*m*p1[1] + 3*m*m*t*c1[1] + 3*m*t*t*c2[1] + t*t*t*p2[1],
      ])
    }
  }
  return out
}
function widthAt(keys, f) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, w0] = keys[i], [p1, w1] = keys[i + 1]
    if (f <= p1) { const t = (f - p0) / (p1 - p0 || 1); return w0 + (w1 - w0) * t }
  }
  return keys[keys.length - 1][1]
}
function ribbon(c, wfn) {
  const L = [], Rr = [], N = c.length
  for (let i = 0; i < N; i++) {
    const p = c[Math.max(0, i - 1)], n = c[Math.min(N - 1, i + 1)]
    let dx = n[0] - p[0], dy = n[1] - p[1]
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l
    const w = wfn(i / (N - 1)) / 2
    L.push([c[i][0] - dy*w, c[i][1] + dx*w])
    Rr.push([c[i][0] + dy*w, c[i][1] - dx*w])
  }
  Rr.reverse()
  return 'M' + [...L, ...Rr].map((p) => `${R(p[0])} ${R(p[1])}`).join('L') + 'Z'
}

// ── the stroke: anchors in drawing order (the brush never lifts) ─────────────
const KNOT = [
  [101,107],[82,92],[94,71],[109,89],[101,105],         // top-left loop
  [117,93],                                              // bridge up-right
  [121,99],[127,71],[141,68],[149,89],[136,105],         // top-right loop (crosses the first)
  [121,122],                                             // centre crossing
  [104,131],                                             // diagonal down-left
  [97,141],[78,151],[87,173],[105,166],[101,145],        // bottom-left loop
  [117,148],                                             // bridge across
  [125,143],[139,139],[150,157],[137,175],[121,164],     // bottom-right loop
  [125,182],[123,201],                                   // 符脚 (foot), tapering out
]
const WIDTH = [[0,6],[0.04,12],[0.5,12.5],[0.9,11],[0.96,3],[1,1]]

export const knotPaths = (fill = 'url(#c)') =>
  `<path d="${ribbon(crSpline(KNOT, 20, 1), (f) => widthAt(WIDTH, f))}" fill="${fill}"/>`

// ── tiles ────────────────────────────────────────────────────────────────────
const DEFS = `
    <linearGradient id="c" x1="120" y1="66" x2="120" y2="200" gradientUnits="userSpaceOnUse">
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
