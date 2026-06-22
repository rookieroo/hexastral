#!/usr/bin/env node
/**
 * Generate Yuel (kindred) brand raster assets from the canonical YuelMark knot
 * path, so the app icon / adaptive icon / native splash all match the in-app
 * <YuelMark/> glyph exactly. Run after editing the knot:
 *
 *   node scripts/gen-brand-assets.mjs
 *
 * Requires `rsvg-convert` (librsvg) on PATH. Re-balanced 2026-06: the mark is
 * landscape ~2.18:1, so it sits as a centered cinnabar seal (~58% width) with
 * generous margin — fixes the "too flat / edge-stuck" read and keeps the whole
 * mark inside the Android adaptive-icon 66% safe zone (no clipping under round /
 * squircle masks). Colours come from the kindred tokens:
 *   - icon / adaptive: cinnabar.seal #9B2226 on ricePaper.ivory #F5F0E8
 *   - splash: cinnabar.bright #C0392B on stone.void #0C0A09 (= kindredDark.seal,
 *     matches the home top-left logo the JS HomeSplash lands on)
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

/** Centered knot at `widthFrac` of a square canvas; optional ivory ground + vignette. */
function knotSvg({ size, widthFrac, color, ground }) {
  const w = Math.round(size * widthFrac)
  const h = Math.round((w * vbH) / vbW)
  const x = Math.round((size - w) / 2)
  const y = Math.round((size - h) / 2)
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
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">` +
    `<g transform="translate(0,${vbH}) scale(0.1,-0.1)"><path d="${knot}" fill="${color}"/></g>` +
    '</svg></svg>'
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

// iOS app icon — full-bleed ivory ground + cinnabar seal, centered with margin.
render('icon', knotSvg({ size: 1024, widthFrac: 0.58, color: ON_IVORY, ground: true }), 1024)
// Android adaptive foreground — transparent (bg ivory set in app.json). 0.58 width
// keeps the whole mark inside the central 66% safe zone.
render(
  'adaptive-icon',
  knotSvg({ size: 1024, widthFrac: 0.58, color: ON_IVORY, ground: false }),
  1024
)
// Native splash — transparent knot on the dark backgroundColor (#0C0A09 via app.json),
// in bright cinnabar so it matches the home YuelMark the JS HomeSplash flies onto.
render('splash', knotSvg({ size: 1284, widthFrac: 0.48, color: ON_DARK, ground: false }), 1284)
// Web favicon.
render('favicon', knotSvg({ size: 256, widthFrac: 0.62, color: ON_IVORY, ground: true }), 256)
console.log('done')
