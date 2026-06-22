#!/usr/bin/env node
/**
 * Generate Yuel (kindred) brand raster assets from the canonical YuelMark knot
 * path, so the app icon / adaptive icon / native splash all match the in-app
 * <YuelMark/> glyph exactly. Run after editing the knot:
 *
 *   node scripts/gen-brand-assets.mjs
 *
 * Requires `rsvg-convert` (librsvg) on PATH. The mark is landscape ~2.18:1, but the
 * WHOLE SUITE is the VERTICAL seal (90° CW + horizontal mirror): icon / adaptive /
 * favicon AND splash — and the in-app `<YuelMark vertical>` (home logo + HomeSplash)
 * matches it, so there is no orientation switch anywhere. Vertical plants like an 印章
 * (L/R margin > T/B; the lead-in stroke sweeps down-left as a 收锋 flourish) and the
 * long axis stays inside the Android adaptive 66% safe zone. Colours from the kindred
 * tokens:
 *   - icon / adaptive / favicon: cinnabar.seal #9B2226 on ricePaper.ivory #F5F0E8
 *   - splash: cinnabar.bright #C0392B on stone.void #0C0A09 (= kindredDark.seal)
 * stone.void (#0C0A09) / ivory (#F5F0E8) are set as backgroundColor in app.json.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appDir = join(here, '..')
const assets = join(appDir, 'assets')

// Single source of truth: pull the knot path + viewBox straight from the component.
const src = readFileSync(join(appDir, 'components', 'YuelMark.tsx'), 'utf8')
const vbW = Number(src.match(/const VB_W = (\d+)/)?.[1])
const vbH = Number(src.match(/const VB_H = (\d+)/)?.[1])
const knot = src.match(/const KNOT\s*=\s*'([^']+)'/)?.[1]
if (!vbW || !vbH || !knot) throw new Error('Could not extract YuelMark KNOT path / viewBox')

const ON_IVORY = '#9B2226' // cinnabar.seal — knot on the light icon ground
const ON_DARK = '#C0392B' // cinnabar.bright — knot on the dark splash
const IVORY = '#F5F0E8' // ricePaper.ivory

/**
 * Place the knot centered on a square canvas; optional ivory ground + vignette.
 * `frac` = the mark's dominant dimension as a fraction of the canvas — width when
 * horizontal, the vertical long axis when `rotate`. `rotate` renders the vertical
 * icon seal: 90° CW + horizontal mirror (so the lead-in stroke exits down-left as a
 * 收锋 flourish and L/R margin > T/B). Horizontal (`rotate` off) stays for the splash.
 */
function knotSvg({ size, frac, color, ground, rotate }) {
  const inner = `<g transform="translate(0,${vbH}) scale(0.1,-0.1)"><path d="${knot}" fill="${color}"/></g>`
  let placed
  if (rotate) {
    const s = (frac * size) / vbW // long axis (vbW) → `frac` of the canvas, vertical
    const c = size / 2
    placed = `<g transform="translate(${c},${c}) scale(-1,1) rotate(90) scale(${s}) translate(${-vbW / 2},${-vbH / 2})">${inner}</g>`
  } else {
    const w = Math.round(frac * size)
    const h = Math.round((w * vbH) / vbW)
    const x = Math.round((size - w) / 2)
    const y = Math.round((size - h) / 2)
    placed = `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">${inner}</svg>`
  }
  const defs = ground
    ? '<defs><radialGradient id="paper" cx="50%" cy="47%" r="66%">' +
      '<stop offset="0%" stop-color="#F8F3EB"/>' +
      `<stop offset="62%" stop-color="${IVORY}"/>` +
      '<stop offset="100%" stop-color="#ECE3D3"/></radialGradient></defs>'
    : ''
  const bg = ground ? `<rect width="${size}" height="${size}" fill="url(#paper)"/>` : ''
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
    defs +
    bg +
    placed +
    '</svg>'
  )
}

const tmp = mkdtempSync(join(tmpdir(), 'yuel-assets-'))
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
      console.log(`✓ ${name}.png  ${px}×${px}`)
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

// iOS app icon — VERTICAL cinnabar seal on the ivory ground; long axis ~62% of the
// tile, so L/R margin exceeds T/B (planted, not floating).
render(
  'icon',
  knotSvg({ size: 1024, frac: 0.62, color: ON_IVORY, ground: true, rotate: true }),
  1024
)
// Android adaptive foreground — transparent (bg ivory set in app.json). Long axis
// 0.58 keeps the whole vertical mark inside the central 66% safe zone.
render(
  'adaptive-icon',
  knotSvg({ size: 1024, frac: 0.58, color: ON_IVORY, ground: false, rotate: true }),
  1024
)
// Native splash — VERTICAL too, so native splash → JS HomeSplash → home logo → icon
// are one orientation. Transparent bright-cinnabar knot on the dark backgroundColor;
// long axis ~0.48 ≈ the JS HomeSplash's 200pt mark, so the native→JS seam is seamless.
render(
  'splash',
  knotSvg({ size: 1284, frac: 0.48, color: ON_DARK, ground: false, rotate: true }),
  1284
)
// Web favicon — matches the vertical app-icon family.
render(
  'favicon',
  knotSvg({ size: 256, frac: 0.66, color: ON_IVORY, ground: true, rotate: true }),
  256
)
console.log('done')
