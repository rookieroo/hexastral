/**
 * 中华大五帝钱 — 水墨留白矢量（毛笔钱文，非写实拓印）.
 *
 * 正面 (obverse):
 *   秦半两 / 汉五铢 — 手绘篆书笔画 (SVG path).
 *   唐开元 / 宋宋元 / 明永乐 — 通宝十字布局, 毛笔字库 (马善政 / 龙藏 / 霞鹜文楷).
 * 背面 (reverse / 幕面):
 *   光背留白 + 淡墨星月.
 *
 * Outside the rim and 方孔 are transparent (hole punched in gen post-pass).
 */

/** @typedef {'qin-banliang'|'han-wuzhu'|'tang-kaiyuan'|'song-songyuan'|'ming-yongle'} WudiCoinId */
/** @typedef {'obverse'|'reverse'} CoinSide */

export const WUDI_COIN_IDS = /** @type {const} */ ([
  'qin-banliang',
  'han-wuzhu',
  'tang-kaiyuan',
  'song-songyuan',
  'ming-yongle',
])

/** Brush calligraphy — embedded via @font-face in SVG for reliable rsvg rendering. */
const BRUSH_FONT_FAMILY = 'CoinCastBrush'
const BRUSH_FONT_FILE = '/Users/chris/Library/Fonts/MaShanZheng-Regular.ttf'

/** Hand-traced seal-script strokes (100×100 glyph box, roughly centred on 50,50). */
const SEAL = {
  liang:
    'M18 22 H82 M27 22 V80 M73 22 V80 M50 30 V80 M38 42 L31 70 M38 42 L45 66 M62 42 L55 66 M62 42 L69 70 M27 80 H73',
  ban: 'M38 20 L45 33 M62 20 L55 33 M50 22 V86 M24 46 H76 M32 65 H68',
  zhu: 'M24 12 L10 28 M24 12 L38 28 M24 12 V80 M12 40 H36 M12 55 H36 M8 80 H40 M15 66 L21 60 M33 66 L27 60 M78 16 C66 22 60 32 58 42 M48 48 H92 M70 20 V84 M70 58 L52 84 M70 58 L88 84',
  wu: 'M20 22 H80 M20 78 H80 M34 30 C48 44 52 56 66 70 M66 30 C52 44 48 56 34 70',
}

/**
 * @typedef {Object} CoinDef
 * @property {'seal'|'tongbao'} kind
 * @property {[string,string,string]} wash            paper field (hi → edge)
 * @property {string} lift
 * @property {number} liftA
 * @property {string} mistMid
 * @property {number} mistMidA
 * @property {string} mistDark
 * @property {number} mistDarkA
 * @property {string} rim
 * @property {{ body: string; bleed: string; light: string }} ink
 * @property {string} holeBorder
 * @property {string} paper
 * @property {{ x: number; y: number; r: number; fill: string }[]} blooms
 * @property {{ left: string; right: string }} [seal]
 * @property {{ top: string; bottom: string; left: string; right: string }} [chars]
 */

/** Sparse 留白 paper + deep ink — not cast-metal photo. */
/** @type {Record<WudiCoinId, CoinDef>} */
export const WUDI_COINS = {
  'qin-banliang': {
    kind: 'seal',
    wash: ['#faf6ee', '#f5efe4', '#ebe2d2'],
    lift: '#fffdf8',
    liftA: 0.55,
    mistMid: '#c4b8a4',
    mistMidA: 0.06,
    mistDark: '#2a2218',
    mistDarkA: 0.04,
    rim: '#2a241c',
    ink: { body: '#1a1410', bleed: '#0c0a08', light: '#8a7a64' },
    holeBorder: '#2a241c',
    paper: '0 0 0 0 0.08 0 0 0 0 0.07 0 0 0 0 0.05 0 0 0 0.1 0',
    blooms: [
      { x: 0.22, y: 0.78, r: 0.12, fill: 'rgba(26,20,16,0.07)' },
      { x: 0.78, y: 0.24, r: 0.09, fill: 'rgba(26,20,16,0.05)' },
    ],
    seal: { left: SEAL.liang, right: SEAL.ban },
  },
  'han-wuzhu': {
    kind: 'seal',
    wash: ['#f8faf6', '#f2f5f0', '#e6ebe4'],
    lift: '#fcfdfb',
    liftA: 0.5,
    mistMid: '#9aaca0',
    mistMidA: 0.06,
    mistDark: '#1a241c',
    mistDarkA: 0.04,
    rim: '#1e2a22',
    ink: { body: '#142018', bleed: '#0a100c', light: '#6a7a6e' },
    holeBorder: '#1e2a22',
    paper: '0 0 0 0 0.06 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.1 0',
    blooms: [
      { x: 0.2, y: 0.26, r: 0.11, fill: 'rgba(20,32,24,0.06)' },
      { x: 0.76, y: 0.74, r: 0.13, fill: 'rgba(20,32,24,0.07)' },
    ],
    seal: { left: SEAL.zhu, right: SEAL.wu },
  },
  'tang-kaiyuan': {
    kind: 'tongbao',
    wash: ['#fbf7ec', '#f6f0e2', '#ebe2ce'],
    lift: '#fffdf8',
    liftA: 0.52,
    mistMid: '#c8b898',
    mistMidA: 0.05,
    mistDark: '#2a2010',
    mistDarkA: 0.04,
    rim: '#2a2214',
    ink: { body: '#1c1408', bleed: '#0e0a04', light: '#8a7850' },
    holeBorder: '#2a2214',
    paper: '0 0 0 0 0.08 0 0 0 0 0.07 0 0 0 0 0.05 0 0 0 0.09 0',
    blooms: [
      { x: 0.24, y: 0.72, r: 0.1, fill: 'rgba(28,20,8,0.06)' },
      { x: 0.74, y: 0.28, r: 0.08, fill: 'rgba(28,20,8,0.05)' },
    ],
    chars: { top: '開', bottom: '元', left: '寶', right: '通' },
  },
  'song-songyuan': {
    kind: 'tongbao',
    wash: ['#faf6ec', '#f4eee0', '#e8dfcc'],
    lift: '#fffdf8',
    liftA: 0.5,
    mistMid: '#b8a888',
    mistMidA: 0.05,
    mistDark: '#241c10',
    mistDarkA: 0.04,
    rim: '#241c12',
    ink: { body: '#1a1208', bleed: '#0c0804', light: '#7a6a48' },
    holeBorder: '#241c12',
    paper: '0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0 0.05 0 0 0 0.09 0',
    blooms: [
      { x: 0.26, y: 0.28, r: 0.09, fill: 'rgba(26,18,8,0.06)' },
      { x: 0.74, y: 0.74, r: 0.11, fill: 'rgba(26,18,8,0.07)' },
    ],
    chars: { top: '宋', bottom: '元', left: '寶', right: '通' },
  },
  'ming-yongle': {
    kind: 'tongbao',
    wash: ['#f6f8f4', '#eef2ec', '#e0e6e0'],
    lift: '#fcfdfb',
    liftA: 0.5,
    mistMid: '#98a898',
    mistMidA: 0.06,
    mistDark: '#141c16',
    mistDarkA: 0.04,
    rim: '#1a221c',
    ink: { body: '#101812', bleed: '#080c0a', light: '#687868' },
    holeBorder: '#1a221c',
    paper: '0 0 0 0 0.05 0 0 0 0 0.07 0 0 0 0 0.06 0 0 0 0.1 0',
    blooms: [
      { x: 0.28, y: 0.26, r: 0.1, fill: 'rgba(16,24,18,0.06)' },
      { x: 0.72, y: 0.72, r: 0.12, fill: 'rgba(16,24,18,0.07)' },
    ],
    chars: { top: '永', bottom: '樂', left: '寶', right: '通' },
  },
}

/** @param {string} hex */
function hexRgb(hex) {
  const h = hex.replace('#', '')
  const n = Number.parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** @param {string} hex @param {number} a */
function rgba(hex, a) {
  const { r, g, b } = hexRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * @param {WudiCoinId} id
 * @param {number} s
 */
function buildDefs(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const r = s * 0.453
  return `<defs>
  <style type="text/css"><![CDATA[
    @font-face {
      font-family: '${BRUSH_FONT_FAMILY}';
      src: url('file://${BRUSH_FONT_FILE}');
    }
  ]]></style>
  <clipPath id="clip-${uid}"><circle cx="${cx}" cy="${cx}" r="${r}"/></clipPath>
  <radialGradient id="wash-${uid}" cx="0.45" cy="0.4" r="0.85">
    <stop offset="0" stop-color="${c.wash[0]}"/>
    <stop offset="0.75" stop-color="${c.wash[1]}"/>
    <stop offset="1" stop-color="${c.wash[2]}"/>
  </radialGradient>
  <radialGradient id="mist-${uid}" cx="0.72" cy="0.8" r="0.5">
    <stop offset="0" stop-color="${rgba(c.mistMid, 0)}"/>
    <stop offset="0.8" stop-color="${rgba(c.mistMid, c.mistMidA)}"/>
    <stop offset="1" stop-color="${rgba(c.mistDark, c.mistDarkA)}"/>
  </radialGradient>
  <radialGradient id="lift-${uid}" cx="0.3" cy="0.2" r="0.45">
    <stop offset="0" stop-color="${rgba(c.lift, c.liftA)}"/>
    <stop offset="1" stop-color="${rgba(c.lift, 0)}"/>
  </radialGradient>
  <filter id="paper-${uid}" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1 1.2" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="${c.paper}" result="g"/>
    <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
  </filter>
  <filter id="brush-${uid}" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.035" numOctaves="2" seed="3" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${(s * 0.018).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="bleed-${uid}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="${(s * 0.008).toFixed(2)}"/>
  </filter>
  <filter id="bloom-${uid}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="${(s * 0.032).toFixed(2)}"/>
  </filter>
</defs>`
}

/**
 * @param {WudiCoinId} id
 * @param {number} s
 */
function discBody(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const r = s * 0.453
  const blooms = c.blooms
    .map(
      (b) =>
        `<circle cx="${(b.x * s).toFixed(1)}" cy="${(b.y * s).toFixed(1)}" r="${(b.r * s).toFixed(1)}" fill="${b.fill}" filter="url(#bloom-${uid})"/>`
    )
    .join('')
  return `<g clip-path="url(#clip-${uid})" filter="url(#paper-${uid})">
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#wash-${uid})"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#lift-${uid})"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#mist-${uid})"/>
  ${blooms}
</g>`
}

/**
 * @param {WudiCoinId} id
 * @param {number} s
 */
function rims(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const r = s * 0.45
  return `<g filter="url(#brush-${uid})" fill="none" stroke-linecap="round">
  <circle cx="${cx}" cy="${cx}" r="${r}" stroke="${c.rim}" stroke-width="${(s * 0.014).toFixed(2)}" opacity="0.78"/>
  <circle cx="${cx}" cy="${cx}" r="${(s * 0.408).toFixed(1)}" stroke="${c.rim}" stroke-width="${(s * 0.0055).toFixed(2)}" opacity="0.28"/>
</g>`
}

/**
 * 内郭 only — 方孔 left empty for post-pass alpha punch (真留白/透空).
 * @param {WudiCoinId} id
 * @param {number} s
 */
function innerFrame(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const frame = s * 0.258
  const f0 = cx - frame / 2
  const hs = s * 0.195
  const h0 = cx - hs / 2
  const rx = (s * 0.016).toFixed(2)
  return `<g>
  <rect x="${f0.toFixed(1)}" y="${f0.toFixed(1)}" width="${frame.toFixed(1)}" height="${frame.toFixed(1)}" rx="${(s * 0.014).toFixed(2)}" fill="none" stroke="${c.rim}" stroke-width="${(s * 0.011).toFixed(2)}" opacity="0.45" filter="url(#brush-${uid})"/>
  <rect x="${h0.toFixed(1)}" y="${h0.toFixed(1)}" width="${hs.toFixed(1)}" height="${hs.toFixed(1)}" rx="${rx}" fill="none" stroke="${c.holeBorder}" stroke-width="${(s * 0.01).toFixed(2)}" opacity="0.55"/>
</g>`
}

/** Fraction of size — must match post-pass punch. */
export const WUDI_HOLE_FRAC = 0.195

/**
 * Brush seal glyph — wide bleed + dry-brush body.
 * @param {WudiCoinId} id @param {string} d @param {number} tx @param {number} ty @param {number} k
 */
function sealGlyph(id, d, tx, ty, k) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  // No feDisplacement on the group — that paints a rectangular filter region.
  return `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${k.toFixed(4)})" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="${c.ink.bleed}" stroke-width="18" opacity="0.22" filter="url(#bleed-${uid})" transform="translate(3,4)"><path d="${d}"/></g>
  <path stroke="${c.ink.body}" stroke-width="12" opacity="0.92" d="${d}"/>
  <path stroke="${c.ink.body}" stroke-width="5.5" opacity="0.55" d="${d}"/>
</g>`
}

/**
 * Brush-font glyph — 毛笔钱文 with ink bleed (embedded Ma Shan Zheng).
 * @param {WudiCoinId} id @param {string} ch @param {number} x @param {number} y @param {number} fs
 */
function fontGlyph(id, ch, x, y, fs) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const attr = `font-family="${BRUSH_FONT_FAMILY}" font-size="${fs.toFixed(1)}" text-anchor="middle" dominant-baseline="central"`
  return `<g>
  <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attr} fill="${c.ink.bleed}" opacity="0.28" filter="url(#bleed-${uid})" transform="translate(2.5,3.5)">${ch}</text>
  <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attr} fill="${c.ink.body}" opacity="0.95">${ch}</text>
</g>`
}

function starMoon(id, s) {
  const c = WUDI_COINS[id]
  const cx = s / 2
  const sx = cx
  const sy = s * 0.2
  const sr = s * 0.022
  const mx = cx
  const my = s * 0.795
  const R = s * 0.045
  const off = R * 0.62
  const crescent = `M ${mx.toFixed(1)} ${(my - R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 0 ${mx.toFixed(1)} ${(my + R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 1 ${(mx - off).toFixed(1)} ${(my - R * 0.72).toFixed(1)} Z`
  return `<g filter="url(#brush-${id.replace(/[^a-z]/g, '')})">
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${c.ink.body}" opacity="0.55"/>
  <path d="${crescent}" fill="${c.ink.body}" opacity="0.4"/>
</g>`
}

function obverseGlyphs(id, s) {
  const c = WUDI_COINS[id]
  const cx = s / 2
  const r = s * 0.453
  if (c.kind === 'seal' && c.seal) {
    const k = s / 360.56
    const ty = s * 0.3555
    return (
      sealGlyph(id, c.seal.left, s * 0.1172, ty, k) +
      sealGlyph(id, c.seal.right, s * 0.6055, ty, k)
    )
  }
  const chars = c.chars
  if (!chars) return ''
  const fs = s * 0.195
  return (
    fontGlyph(id, chars.top, cx, cx - r * 0.5, fs) +
    fontGlyph(id, chars.bottom, cx, cx + r * 0.5, fs) +
    fontGlyph(id, chars.left, cx - r * 0.5, cx, fs) +
    fontGlyph(id, chars.right, cx + r * 0.5, cx, fs)
  )
}

/**
 * @param {WudiCoinId} id
 * @param {{ size?: number; side?: CoinSide }} [opts]
 */
export function buildWudiCoinSvg(id, { size = 512, side = 'obverse' } = {}) {
  if (!WUDI_COINS[id]) throw new Error(`Unknown coin id: ${id}`)
  const s = size
  const glyphs = side === 'reverse' ? starMoon(id, s) : obverseGlyphs(id, s)
  const body = discBody(id, s) + rims(id, s) + glyphs + innerFrame(id, s)
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">${buildDefs(id, s)}${body}</svg>`
}

/** Convenience — reverse (幕面). */
export function buildWudiReverseSvg(id, { size = 512 } = {}) {
  return buildWudiCoinSvg(id, { size, side: 'reverse' })
}
