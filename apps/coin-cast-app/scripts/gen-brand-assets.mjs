#!/usr/bin/env node
/**
 * Generate CoinCast brand raster assets from the canonical three-coin mark, so the
 * app icon (iOS light/dark/tinted), Android adaptive icon, and native splash all
 * match the in-app <CoinCastSealLogo/> (三枚圆形方孔铜钱 = 金钱卦). Run after a mark
 * tweak:
 *
 *   node scripts/gen-brand-assets.mjs
 *
 * Requires `rsvg-convert` (librsvg) on PATH. Each coin = an opaque amber disc with a
 * square hole painted in the dark ground colour (#09090B), plus a darker rim. Two
 * coins behind, one in front (front drawn last so it overlaps). Every variant sits on
 * a dark backdrop, so the dark hole reads as a clean cutout. dark/tinted icons ship
 * transparent so the iOS 18 system grounds them. DARKBG = icon/splash bg in app.json.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'assets')

const AMBER_HI = '#CC9A41' // coin face top
const AMBER_LO = '#94661F' // coin face bottom (gradient)
const RIM = '#5E411A' // coin edge + hole rim
const MONO = '#D9D4CA' // tinted: warm light grey (iOS recolours by luminance)
const MONO_RIM = '#A8A39A'
const DARKBG = '#09090B'

/** Build the three-coin mark on a square `size` canvas. `frac` = cluster width as a
 *  fraction of the canvas. `ground` paints the dark bg; otherwise transparent. */
function markSvg({ size, frac, ground, mono }) {
  const r = (frac * size) / 3.24 // cluster width = 3.24r
  const cx = size / 2
  const dx = r * 0.62
  const dyTop = r * 0.3
  const dyFront = r * 0.62
  const cy = size / 2 - (dyFront - dyTop) / 2 // vertically centre the cluster
  const coins = [
    { x: cx - dx, y: cy - dyTop },
    { x: cx + dx, y: cy - dyTop },
    { x: cx, y: cy + dyFront },
  ]
  const hs = r * 0.44 // square hole side
  const fill = mono ? MONO : 'url(#amber)'
  const rim = mono ? MONO_RIM : RIM
  // Opaque disc + a hole painted in the dark ground colour (every variant sits on a
  // dark backdrop, so a #09090B hole reads as a clean cutout with no see-through
  // artifacts). Coins drawn front-last so the front disc overlaps the two behind.
  let body = ''
  for (const c of coins) {
    const x0 = c.x - hs / 2
    const y0 = c.y - hs / 2
    body += `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${fill}"/>`
    body += `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="none" stroke="${rim}" stroke-width="${(r * 0.06).toFixed(2)}"/>`
    body += `<rect x="${x0}" y="${y0}" width="${hs}" height="${hs}" rx="${(r * 0.03).toFixed(2)}" fill="${DARKBG}"/>`
    body += `<rect x="${x0}" y="${y0}" width="${hs}" height="${hs}" rx="${(r * 0.03).toFixed(2)}" fill="none" stroke="${rim}" stroke-width="${(r * 0.055).toFixed(2)}"/>`
  }
  const defs =
    '<defs><linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${AMBER_HI}"/><stop offset="1" stop-color="${AMBER_LO}"/>` +
    '</linearGradient></defs>'
  const bg = ground ? `<rect width="${size}" height="${size}" fill="${DARKBG}"/>` : ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${defs}${bg}${body}</svg>`
}

const tmp = mkdtempSync(join(tmpdir(), 'coincast-assets-'))
const RSVG = [
  'rsvg-convert',
  '/Users/chris/miniconda3/bin/rsvg-convert',
  '/opt/homebrew/bin/rsvg-convert',
]
function render(name, svg, px) {
  const f = join(tmp, `${name}.svg`)
  writeFileSync(f, svg)
  let lastErr
  for (const bin of RSVG) {
    try {
      execFileSync(bin, ['-w', String(px), '-h', String(px), f, '-o', join(assets, `${name}.png`)])
      unlinkSync(f)
      console.log(`OK ${name}.png  ${px}x${px}`)
      return
    } catch (e) {
      if (e.code === 'ENOENT') {
        lastErr = e
        continue
      }
      throw e
    }
  }
  throw lastErr ?? new Error('rsvg-convert not found')
}

// iOS light icon — amber on the dark ground (matches the in-app dark theme).
render('icon', markSvg({ size: 1024, frac: 0.66, ground: true, mono: false }), 1024)
// iOS dark icon — transparent; the iOS 18 system supplies the dark backdrop.
render('icon-dark', markSvg({ size: 1024, frac: 0.66, ground: false, mono: false }), 1024)
// iOS tinted icon — grayscale on transparent; the system applies the user's tint.
render('icon-tinted', markSvg({ size: 1024, frac: 0.66, ground: false, mono: true }), 1024)
// Android adaptive foreground — transparent (bg set in app.json); 0.52 keeps the
// cluster inside the central 66% safe zone.
render('adaptive-icon', markSvg({ size: 1024, frac: 0.52, ground: false, mono: false }), 1024)
// Native splash — small transparent mark on the dark backgroundColor.
render('splash', markSvg({ size: 1284, frac: 0.34, ground: false, mono: false }), 1284)
console.log('done')
