#!/usr/bin/env node
/**
 * Generate CoinCast brand raster assets from the canonical three-coin mark, so the
 * app icon (iOS light/dark/tinted), Android adaptive icon, and native splash all
 * match the in-app <CoinCastSealLogo/> (三枚圆形方孔铜钱 = 金钱卦). Run after a mark
 * tweak:
 *
 *   node scripts/gen-brand-assets.mjs
 *
 * Requires `rsvg-convert` (librsvg) on PATH. Also writes source SVGs to
 * docs/design/coins/ for version control.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildMarkSvg, buildSingleCoinSvg } from './mark-coincast.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'assets')
const designCoins = join(here, '..', '..', '..', 'docs', 'design', 'coins')

mkdirSync(designCoins, { recursive: true })
writeFileSync(
  join(designCoins, 'coincast-mark-three.svg'),
  buildMarkSvg({ size: 1024, frac: 0.66, ground: true, mono: false }),
)
writeFileSync(join(designCoins, 'wu-zhu.svg'), buildSingleCoinSvg({ size: 512, ground: true }))
console.log('Wrote docs/design/coins/coincast-mark-three.svg + wu-zhu.svg')

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

render('icon', buildMarkSvg({ size: 1024, frac: 0.66, ground: true, mono: false }), 1024)
render('icon-dark', buildMarkSvg({ size: 1024, frac: 0.66, ground: false, mono: false }), 1024)
render('icon-tinted', buildMarkSvg({ size: 1024, frac: 0.66, ground: false, mono: true }), 1024)
render('adaptive-icon', buildMarkSvg({ size: 1024, frac: 0.52, ground: false, mono: false }), 1024)
render('splash', buildMarkSvg({ size: 1284, frac: 0.34, ground: false, mono: false }), 1284)
console.log('done')
