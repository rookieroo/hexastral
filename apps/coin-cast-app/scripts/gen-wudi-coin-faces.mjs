#!/usr/bin/env node
/**
 * Generate ink-wash 五帝钱 face PNGs (正面 + 背面) from vector SVG.
 *
 *   node apps/coin-cast-app/scripts/gen-wudi-coin-faces.mjs
 *
 * Requires `rsvg-convert` (librsvg). Best with `LXGW WenKai` installed for the 通宝 glyphs.
 * Outputs:
 *   assets/coins/faces/<id>.png        (obverse / 字面)
 *   assets/coins/faces/<id>-back.png   (reverse / 幕面)
 *   docs/design/coins/wudi-ink-<id>.svg + wudi-ink-<id>-back.svg
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildWudiCoinSvg, WUDI_COIN_IDS } from './wudi-coins.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const facesDir = join(here, '..', 'assets', 'coins', 'faces')
const designDir = join(here, '..', '..', '..', 'docs', 'design', 'coins')

mkdirSync(facesDir, { recursive: true })
mkdirSync(designDir, { recursive: true })

const RSVG = ['rsvg-convert', '/opt/homebrew/bin/rsvg-convert', '/usr/bin/rsvg-convert']
const tmp = mkdtempSync(join(tmpdir(), 'wudi-ink-'))

function rsvgBin() {
  for (const bin of RSVG) {
    try {
      execFileSync(bin, ['--version'], { stdio: 'ignore' })
      return bin
    } catch {
      continue
    }
  }
  throw new Error('rsvg-convert not found — install librsvg')
}

const bin = rsvgBin()

/** @param {string} svg @param {string} svgOut @param {string} pngOut */
function emit(svg, svgOut, pngOut) {
  writeFileSync(svgOut, svg)
  const svgPath = join(tmp, `${Date.now()}-${Math.random().toString(36).slice(2)}.svg`)
  writeFileSync(svgPath, svg)
  execFileSync(bin, ['-w', '512', '-h', '512', svgPath, '-o', pngOut])
  unlinkSync(svgPath)
}

for (const id of WUDI_COIN_IDS) {
  emit(
    buildWudiCoinSvg(id, { size: 512, side: 'obverse' }),
    join(designDir, `wudi-ink-${id}.svg`),
    join(facesDir, `${id}.png`)
  )
  emit(
    buildWudiCoinSvg(id, { size: 512, side: 'reverse' }),
    join(designDir, `wudi-ink-${id}-back.svg`),
    join(facesDir, `${id}-back.png`)
  )
  console.log(`OK ${id} — 字面 + 幕面`)
}

console.log('done — ink-wash 五帝钱 (obverse + reverse)')
