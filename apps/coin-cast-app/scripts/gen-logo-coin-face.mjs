#!/usr/bin/env node
/**
 * Bake the default logo coin cap textures (obverse / reverse / bump).
 *
 *   node apps/coin-cast-app/scripts/gen-logo-coin-face.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildPlainLogoCoinSvg } from './mark-coincast.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const faces = join(here, '..', 'assets', 'coins', 'faces')
const punchPy = join(here, 'punch-wudi-ink-alpha.py')
const root = join(here, '..', '..', '..')
const SIZE = 1024

const RSVG = [
  'rsvg-convert',
  '/Users/chris/miniconda3/bin/rsvg-convert',
  '/opt/homebrew/bin/rsvg-convert',
]

function rsvgConvert(svgPath, outPath) {
  let lastErr
  for (const bin of RSVG) {
    try {
      execFileSync(bin, ['-w', String(SIZE), '-h', String(SIZE), svgPath, '-o', outPath])
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

mkdirSync(faces, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'coincast-logo-face-'))

const obSvg = join(tmp, 'logo-ob.svg')
const revSvg = join(tmp, 'logo-rev.svg')
const obPng = join(tmp, 'logo-ob.png')
const revPng = join(tmp, 'logo-rev.png')

writeFileSync(obSvg, buildPlainLogoCoinSvg({ size: SIZE, side: 'obverse' }))
writeFileSync(revSvg, buildPlainLogoCoinSvg({ size: SIZE, side: 'reverse' }))
rsvgConvert(obSvg, obPng)
rsvgConvert(revSvg, revPng)

const prefix = join(faces, 'logo')
const r = spawnSync(
  'python3',
  [punchPy, '--obverse', obPng, '--reverse', revPng, '--out-prefix', prefix, '--hole-frac', '0'],
  { stdio: 'inherit', cwd: root }
)
process.exit(r.status ?? 1)
