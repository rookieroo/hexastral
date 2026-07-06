/**
 * 中华大五帝钱 — 水墨印章矢量临摹（布局参考 assets/coins/source.png）.
 *
 * 正面 (obverse):
 *   秦半两 / 汉五铢 — 手绘篆书笔画 (SVG path, 非字库字形).
 *   唐开元 / 宋宋元 / 明永乐 — 通宝十字布局, 霞鹜文楷 (繁体钱文).
 * 背面 (reverse / 幕面):
 *   光背 + 星月纹 — 摇卦取「阳」面, 与字面一望即分.
 *
 * All faces are SVG → PNG (no photo crop); transparent outside the round rim.
 * Best rendered with `LXGW WenKai` (霞鹜文楷) installed for the 通宝 glyphs.
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

const KAI_FONT = 'LXGW WenKai, Noto Serif SC, Songti SC, STSong, serif'

/** Hand-traced seal-script strokes (100×100 glyph box, roughly centred on 50,50). */
const SEAL = {
  // 兩 — framed double 人
  liang:
    'M18 22 H82 M27 22 V80 M73 22 V80 M50 30 V80 M38 42 L31 70 M38 42 L45 66 M62 42 L55 66 M62 42 L69 70 M27 80 H73',
  // 半 — splayed 八 over 干
  ban: 'M38 20 L45 33 M62 20 L55 33 M50 22 V86 M24 46 H76 M32 65 H68',
  // 銖 — 金 radical + 朱
  zhu: 'M24 12 L10 28 M24 12 L38 28 M24 12 V80 M12 40 H36 M12 55 H36 M8 80 H40 M15 66 L21 60 M33 66 L27 60 M78 16 C66 22 60 32 58 42 M48 48 H92 M70 20 V84 M70 58 L52 84 M70 58 L88 84',
  // 五 — hourglass X between two bars
  wu: 'M20 22 H80 M20 78 H80 M34 30 C48 44 52 56 66 70 M66 30 C52 44 48 56 34 70',
}

/**
 * @typedef {Object} CoinDef
 * @property {'seal'|'tongbao'} kind
 * @property {[string,string,string]} wash            washHi/Mid/Lo
 * @property {string} lift                            highlight tint
 * @property {number} liftA
 * @property {string} mistMid
 * @property {number} mistMidA
 * @property {string} mistDark
 * @property {number} mistDarkA
 * @property {string} rim
 * @property {{ body: string; bleed: string; light: string }} ink
 * @property {{ void: string; border: string }} hole
 * @property {string} paper                           feColorMatrix values (grain tint)
 * @property {{ x: number; y: number; r: number; fill: string }[]} blooms  fractions of size
 * @property {{ left: string; right: string }} [seal]
 * @property {{ top: string; bottom: string; left: string; right: string }} [chars]
 */

/** @type {Record<WudiCoinId, CoinDef>} */
export const WUDI_COINS = {
  'qin-banliang': {
    kind: 'seal',
    wash: ['#e4e0d8', '#b3afa6', '#726f68'],
    lift: '#ece4d4',
    liftA: 0.34,
    mistMid: '#96928a',
    mistMidA: 0.22,
    mistDark: '#141008',
    mistDarkA: 0.42,
    rim: '#4c4a45',
    ink: { body: '#2b2118', bleed: '#181410', light: '#d8c9ad' },
    hole: { void: '#0a0a0b', border: '#2c2820' },
    paper: '0 0 0 0 0.16 0 0 0 0 0.14 0 0 0 0 0.12 0 0 0 0.16 0',
    blooms: [
      { x: 0.29, y: 0.7, r: 0.05, fill: 'rgba(20,16,12,0.16)' },
      { x: 0.73, y: 0.29, r: 0.04, fill: 'rgba(236,232,222,0.18)' },
    ],
    seal: { left: SEAL.liang, right: SEAL.ban },
  },
  'han-wuzhu': {
    kind: 'seal',
    wash: ['#c6d0c4', '#8ba593', '#48604f'],
    lift: '#d6e4d2',
    liftA: 0.34,
    mistMid: '#46684f',
    mistMidA: 0.28,
    mistDark: '#0e1810',
    mistDarkA: 0.5,
    rim: '#3a4d40',
    ink: { body: '#20302a', bleed: '#0e1a12', light: '#b9d0bc' },
    hole: { void: '#080b09', border: '#20302a' },
    paper: '0 0 0 0 0.1 0 0 0 0 0.15 0 0 0 0 0.11 0 0 0 0.2 0',
    blooms: [
      { x: 0.29, y: 0.29, r: 0.1, fill: 'rgba(58,110,72,0.34)' },
      { x: 0.71, y: 0.7, r: 0.117, fill: 'rgba(40,88,58,0.32)' },
      { x: 0.7, y: 0.29, r: 0.058, fill: 'rgba(150,178,150,0.24)' },
    ],
    seal: { left: SEAL.zhu, right: SEAL.wu },
  },
  'tang-kaiyuan': {
    kind: 'tongbao',
    wash: ['#e8d4a8', '#c4a878', '#8a7040'],
    lift: '#f0e2c0',
    liftA: 0.32,
    mistMid: '#8a7040',
    mistMidA: 0.24,
    mistDark: '#1c1408',
    mistDarkA: 0.44,
    rim: '#6a5430',
    ink: { body: '#3a2a12', bleed: '#1a1206', light: '#e8d4a0' },
    hole: { void: '#0a0805', border: '#3c2415' },
    paper: '0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 0 0.09 0 0 0 0.16 0',
    blooms: [
      { x: 0.3, y: 0.68, r: 0.09, fill: 'rgba(60,40,16,0.22)' },
      { x: 0.7, y: 0.3, r: 0.06, fill: 'rgba(236,216,160,0.2)' },
    ],
    chars: { top: '開', bottom: '元', left: '寶', right: '通' },
  },
  'song-songyuan': {
    kind: 'tongbao',
    wash: ['#dcc8a0', '#b89868', '#7a6038'],
    lift: '#e8d8b0',
    liftA: 0.32,
    mistMid: '#7a6038',
    mistMidA: 0.24,
    mistDark: '#1a1206',
    mistDarkA: 0.44,
    rim: '#5a4828',
    ink: { body: '#3a2c14', bleed: '#1c1408', light: '#e0c890' },
    hole: { void: '#0a0805', border: '#3c2415' },
    paper: '0 0 0 0 0.15 0 0 0 0 0.12 0 0 0 0 0.08 0 0 0 0.16 0',
    blooms: [
      { x: 0.28, y: 0.3, r: 0.08, fill: 'rgba(58,44,20,0.24)' },
      { x: 0.72, y: 0.7, r: 0.1, fill: 'rgba(44,32,14,0.22)' },
      { x: 0.7, y: 0.3, r: 0.05, fill: 'rgba(224,200,144,0.2)' },
    ],
    chars: { top: '宋', bottom: '元', left: '寶', right: '通' },
  },
  'ming-yongle': {
    kind: 'tongbao',
    wash: ['#b8c8bc', '#7a9488', '#3a5048'],
    lift: '#cdddce',
    liftA: 0.32,
    mistMid: '#3a5048',
    mistMidA: 0.28,
    mistDark: '#0e1810',
    mistDarkA: 0.5,
    rim: '#2e4038',
    ink: { body: '#22302a', bleed: '#0e1a12', light: '#b9d0bc' },
    hole: { void: '#080b09', border: '#20302a' },
    paper: '0 0 0 0 0.1 0 0 0 0 0.14 0 0 0 0 0.11 0 0 0 0.2 0',
    blooms: [
      { x: 0.3, y: 0.28, r: 0.1, fill: 'rgba(46,88,64,0.3)' },
      { x: 0.7, y: 0.7, r: 0.11, fill: 'rgba(30,60,44,0.3)' },
      { x: 0.3, y: 0.7, r: 0.05, fill: 'rgba(150,178,150,0.2)' },
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
  <clipPath id="clip-${uid}"><circle cx="${cx}" cy="${cx}" r="${r}"/></clipPath>
  <radialGradient id="wash-${uid}" cx="0.4" cy="0.32" r="0.72">
    <stop offset="0" stop-color="${c.wash[0]}"/>
    <stop offset="0.5" stop-color="${c.wash[1]}"/>
    <stop offset="1" stop-color="${c.wash[2]}"/>
  </radialGradient>
  <radialGradient id="mist-${uid}" cx="0.64" cy="0.72" r="0.6">
    <stop offset="0" stop-color="${rgba(c.mistMid, 0)}"/>
    <stop offset="0.68" stop-color="${rgba(c.mistMid, c.mistMidA)}"/>
    <stop offset="1" stop-color="${rgba(c.mistDark, c.mistDarkA)}"/>
  </radialGradient>
  <radialGradient id="lift-${uid}" cx="0.34" cy="0.24" r="0.5">
    <stop offset="0" stop-color="${rgba(c.lift, c.liftA)}"/>
    <stop offset="1" stop-color="${rgba(c.lift, 0)}"/>
  </radialGradient>
  <filter id="paper-${uid}" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="fractalNoise" baseFrequency="0.62 0.72" numOctaves="4" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="${c.paper}" result="g"/>
    <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
  </filter>
  <filter id="brush-${uid}">
    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed="9" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${(s * 0.017).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="bleed-${uid}" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="${(s * 0.0047).toFixed(2)}"/>
  </filter>
  <filter id="bloom-${uid}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="${(s * 0.02).toFixed(2)}"/>
  </filter>
</defs>`
}

/**
 * Disc body: wash + lift + mist + patina blooms (clipped to rim).
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
 * Hand-brushed 外郭 (round rim) + faint inner ring.
 * @param {WudiCoinId} id
 * @param {number} s
 */
function rims(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const r = s * 0.45
  return `<g filter="url(#brush-${uid})">
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${c.rim}" stroke-width="${(s * 0.0176).toFixed(2)}" opacity="0.72"/>
  <circle cx="${cx}" cy="${cx}" r="${(s * 0.4).toFixed(1)}" fill="none" stroke="${c.rim}" stroke-width="${(s * 0.008).toFixed(2)}" opacity="0.42"/>
</g>`
}

/**
 * 内郭 (square border) + 方孔 void.
 * @param {WudiCoinId} id
 * @param {number} s
 */
function holeAndInnerFrame(id, s) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const cx = s / 2
  const frame = s * 0.258
  const f0 = cx - frame / 2
  const hs = s * 0.195
  const h0 = cx - hs / 2
  const rx = (s * 0.016).toFixed(2)
  return `<rect x="${f0.toFixed(1)}" y="${f0.toFixed(1)}" width="${frame.toFixed(1)}" height="${frame.toFixed(1)}" rx="${(s * 0.014).toFixed(2)}" fill="none" stroke="${c.rim}" stroke-width="${(s * 0.0137).toFixed(2)}" opacity="0.5" filter="url(#brush-${uid})"/>
  <rect x="${h0.toFixed(1)}" y="${h0.toFixed(1)}" width="${hs.toFixed(1)}" height="${hs.toFixed(1)}" rx="${rx}" fill="${c.hole.void}"/>
  <rect x="${h0.toFixed(1)}" y="${h0.toFixed(1)}" width="${hs.toFixed(1)}" height="${hs.toFixed(1)}" rx="${rx}" fill="none" stroke="${c.hole.border}" stroke-width="${(s * 0.0117).toFixed(2)}" opacity="0.6"/>
  <rect x="${h0.toFixed(1)}" y="${h0.toFixed(1)}" width="${hs.toFixed(1)}" height="${hs.toFixed(1)}" rx="${rx}" fill="none" stroke="${rgba(c.lift, 0.14)}" stroke-width="${(s * 0.003).toFixed(2)}"/>`
}

/**
 * Hand-drawn seal glyph — bleed + body + faint rim light. Path is a 100-box.
 * @param {WudiCoinId} id @param {string} d @param {number} tx @param {number} ty @param {number} k
 */
function sealGlyph(id, d, tx, ty, k) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  return `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${k.toFixed(4)})" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <g stroke="${c.ink.bleed}" stroke-width="13" opacity="0.34" filter="url(#bleed-${uid})" transform="translate(2,3)"><path d="${d}"/></g>
  <path stroke="${c.ink.body}" stroke-width="10" d="${d}"/>
  <path stroke="${c.ink.light}" stroke-width="2.4" opacity="0.22" d="${d}"/>
</g>`
}

/**
 * Kai-font glyph — bleed + body + faint rim light.
 * @param {WudiCoinId} id @param {string} ch @param {number} x @param {number} y @param {number} fs
 */
function fontGlyph(id, ch, x, y, fs) {
  const c = WUDI_COINS[id]
  const uid = id.replace(/[^a-z]/g, '')
  const attr = `font-family="${KAI_FONT}" font-size="${fs.toFixed(1)}" text-anchor="middle" dominant-baseline="central"`
  return `<g>
  <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attr} fill="${c.ink.bleed}" opacity="0.4" filter="url(#bleed-${uid})" transform="translate(1.6,2.4)">${ch}</text>
  <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attr} fill="${c.ink.body}" opacity="0.92">${ch}</text>
  <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attr} fill="none" stroke="${c.ink.light}" stroke-width="${(fs * 0.03).toFixed(2)}" opacity="0.2">${ch}</text>
</g>`
}

/** 星月纹 for the reverse — a filled 星 (dot) top, a 月 (crescent) bottom. */
function starMoon(id, s) {
  const c = WUDI_COINS[id]
  const cx = s / 2
  // 星 — small filled dot above the hole
  const sx = cx
  const sy = s * 0.2
  const sr = s * 0.026
  // 月 — crescent below the hole
  const mx = cx
  const my = s * 0.795
  const R = s * 0.05
  const off = R * 0.62
  const crescent = `M ${mx.toFixed(1)} ${(my - R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 0 ${mx.toFixed(1)} ${(my + R).toFixed(1)} A ${R.toFixed(1)} ${R.toFixed(1)} 0 1 1 ${(mx - off).toFixed(1)} ${(my - R * 0.72).toFixed(1)} Z`
  return `<g>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${c.ink.body}" opacity="0.5"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr * 1.7).toFixed(1)}" fill="none" stroke="${c.ink.light}" stroke-width="${(s * 0.004).toFixed(2)}" opacity="0.16"/>
  <path d="${crescent}" fill="${c.ink.body}" opacity="0.42"/>
  <path d="${crescent}" fill="none" stroke="${c.ink.light}" stroke-width="${(s * 0.004).toFixed(2)}" opacity="0.16"/>
</g>`
}

/** Obverse glyph layer (字面). */
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
  const fs = s * 0.17
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
  const body = discBody(id, s) + rims(id, s) + glyphs + holeAndInnerFrame(id, s)
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">${buildDefs(id, s)}${body}</svg>`
}

/** Convenience — reverse (幕面). */
export function buildWudiReverseSvg(id, { size = 512 } = {}) {
  return buildWudiCoinSvg(id, { size, side: 'reverse' })
}
