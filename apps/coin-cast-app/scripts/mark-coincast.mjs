/**
 * Canonical CoinCast mark geometry — zinc ground + ink-gold coins.
 * Colors align with `ink.gold` / `zinc.950` in packages/hexastral-tokens/src/palette.ts.
 */

/** @typedef {{ size: number; frac: number; ground: boolean; mono: boolean }} MarkOptions */

export const COIN_COLORS = {
  faceHi: '#D4B896',
  faceLo: '#8B6F4E',
  rim: '#5C4835',
  ground: '#09090B',
  mono: '#D4D4D8',
  monoRim: '#71717A',
}

/**
 * Three overlapping round coins with square holes (金钱卦).
 * @param {MarkOptions} opts
 */
export function buildMarkSvg({ size, frac, ground, mono }) {
  const { faceHi, faceLo, rim, ground: dark, mono: monoFill, monoRim } = COIN_COLORS
  const r = (frac * size) / 3.24
  const cx = size / 2
  const dx = r * 0.62
  const dyTop = r * 0.3
  const dyFront = r * 0.62
  const cy = size / 2 - (dyFront - dyTop) / 2
  const coins = [
    { x: cx - dx, y: cy - dyTop },
    { x: cx + dx, y: cy - dyTop },
    { x: cx, y: cy + dyFront },
  ]
  const hs = r * 0.44
  const fill = mono ? monoFill : 'url(#inkGold)'
  const stroke = mono ? monoRim : rim
  let body = ''
  for (const c of coins) {
    const x0 = c.x - hs / 2
    const y0 = c.y - hs / 2
    const sw = (r * 0.06).toFixed(2)
    const hsw = (r * 0.055).toFixed(2)
    const rx = (r * 0.03).toFixed(2)
    body += `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${fill}"/>`
    body += `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`
    body += `<rect x="${x0}" y="${y0}" width="${hs}" height="${hs}" rx="${rx}" fill="${dark}"/>`
    body += `<rect x="${x0}" y="${y0}" width="${hs}" height="${hs}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${hsw}"/>`
  }
  const defs =
    '<defs><linearGradient id="inkGold" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${faceHi}"/><stop offset="1" stop-color="${faceLo}"/>` +
    '</linearGradient></defs>'
  const bg = ground ? `<rect width="${size}" height="${size}" fill="${dark}"/>` : ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${defs}${bg}${body}</svg>`
}

/**
 * Plain logo coin — circle + square hole only (matches app icon geometry).
 * @param {{ size?: number; side?: 'obverse'|'reverse' }} [opts]
 */
export function buildPlainLogoCoinSvg({ size = 512, side = 'obverse' } = {}) {
  const { faceHi, faceLo, rim, ground: dark } = COIN_COLORS
  const s = size
  const cx = s / 2
  const r = s * 0.46
  const hs = s * 0.22
  const h0 = cx - hs / 2
  const strokeW = (s * 0.015).toFixed(2)
  const inner = r * 0.82
  const star =
    side === 'reverse'
      ? `<g opacity="0.55">
  <circle cx="${cx}" cy="${(s * 0.28).toFixed(1)}" r="${(s * 0.024).toFixed(1)}" fill="${rim}"/>
  <path d="M ${(cx - s * 0.032).toFixed(1)} ${(s * 0.72).toFixed(1)} A ${(s * 0.032).toFixed(1)} ${(s * 0.032).toFixed(1)} 0 1 0 ${(cx + s * 0.032).toFixed(1)} ${(s * 0.72).toFixed(1)}" fill="none" stroke="${rim}" stroke-width="${Math.max(3, s * 0.012)}" stroke-linecap="round"/>
</g>`
      : ''
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="inkGold" x1="0.25" y1="0" x2="0.75" y2="1">
    <stop offset="0" stop-color="${faceHi}"/>
    <stop offset="1" stop-color="${faceLo}"/>
  </linearGradient>
  <radialGradient id="shine" cx="0.38" cy="0.32" r="0.55">
    <stop offset="0" stop-color="rgba(255,255,255,0.14)"/>
    <stop offset="1" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>
</defs>
<circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#inkGold)" stroke="${rim}" stroke-width="${strokeW}"/>
<circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#shine)"/>
<circle cx="${cx}" cy="${cx}" r="${inner}" fill="none" stroke="${rim}" stroke-width="${(s * 0.008).toFixed(2)}" opacity="0.45"/>
${star}
<rect x="${h0}" y="${h0}" width="${hs}" height="${hs}" rx="${(s * 0.02).toFixed(2)}" fill="${dark}"/>
<rect x="${h0}" y="${h0}" width="${hs}" height="${hs}" rx="${(s * 0.02).toFixed(2)}" fill="none" stroke="${rim}" stroke-width="${strokeW}"/>
</svg>`
}

/**
 * Single 方孔钱 reference (五铢 simplified strokes) for docs / exports.
 * @param {{ size?: number; ground?: boolean }} [opts]
 */
export function buildSingleCoinSvg({ size = 100, ground = false } = {}) {
  const { faceHi, faceLo, rim, ground: dark } = COIN_COLORS
  const s = size
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.46
  const hs = s * 0.22
  const h0 = cx - hs / 2
  const bg = ground ? `<rect width="${s}" height="${s}" fill="${dark}"/>` : ''
  const inner = r * 0.82
  const strokeW = (s * 0.015).toFixed(2)
  const inscription = `
    <g fill="none" stroke="${rim}" stroke-width="${(s * 0.012).toFixed(2)}" stroke-linecap="round" opacity="0.55">
      <path d="M ${cx - r * 0.55} ${cy - r * 0.62} H ${cx + r * 0.55}"/>
      <path d="M ${cx - r * 0.62} ${cy - r * 0.38} H ${cx + r * 0.62}"/>
      <path d="M ${cx - r * 0.48} ${cy - r * 0.14} H ${cx + r * 0.48}"/>
      <path d="M ${cx - r * 0.35} ${cy + r * 0.52} Q ${cx} ${cy + r * 0.72} ${cx + r * 0.35} ${cy + r * 0.52}"/>
    </g>`
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="inkGold" x1="0.25" y1="0" x2="0.75" y2="1">
    <stop offset="0" stop-color="${faceHi}"/>
    <stop offset="1" stop-color="${faceLo}"/>
  </linearGradient>
  <radialGradient id="shine" cx="0.38" cy="0.32" r="0.55">
    <stop offset="0" stop-color="rgba(255,255,255,0.14)"/>
    <stop offset="1" stop-color="rgba(0,0,0,0)"/>
  </radialGradient>
</defs>
${bg}
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#inkGold)" stroke="${rim}" stroke-width="${strokeW}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shine)"/>
<circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="${rim}" stroke-width="${(s * 0.008).toFixed(2)}" opacity="0.45"/>
${inscription}
<rect x="${h0}" y="${h0}" width="${hs}" height="${hs}" rx="${(s * 0.02).toFixed(2)}" fill="${dark}"/>
<rect x="${h0}" y="${h0}" width="${hs}" height="${hs}" rx="${(s * 0.02).toFixed(2)}" fill="none" stroke="${rim}" stroke-width="${strokeW}"/>
</svg>`
}
