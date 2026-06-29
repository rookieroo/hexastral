#!/usr/bin/env node
/**
 * Bake coin skin PNGs into textures/skins/.../dist/ (gitignored).
 * Requires: python3, Pillow, rsvg-convert (brew install librsvg).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skins = path.join(appRoot, 'components/casting-scene/textures/skins')

const REQUIRED = [
  path.join(skins, 'huaxia/dist/back-su-yin.png'),
  path.join(skins, 'huaxia/dist/back-su-yang.png'),
  path.join(skins, 'original/dist/bagua-yang.png'),
  path.join(skins, 'original/dist/taiji-yang.png'),
  path.join(skins, 'original/dist/beidou-yang.png'),
  path.join(skins, 'original/dist/luoshu-yang.png'),
  path.join(skins, 'original/dist/wuxing-jin-yang.png'),
  path.join(skins, 'original/dist/wuxing-mu-yang.png'),
  path.join(skins, 'original/dist/wuxing-shui-yang.png'),
  path.join(skins, 'original/dist/wuxing-huo-yang.png'),
  path.join(skins, 'original/dist/wuxing-tu-yang.png'),
]

if (REQUIRED.every((f) => existsSync(f))) {
  console.log('coin textures present — skip bake')
  process.exit(0)
}

function run(cmd, args, cwd = appRoot) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const rsvgCandidates = [
  'rsvg-convert',
  '/opt/homebrew/bin/rsvg-convert',
  '/usr/local/bin/rsvg-convert',
]
const rsvg = rsvgCandidates.find((p) => p === 'rsvg-convert' || existsSync(p))
if (!rsvg) {
  console.error('rsvg-convert not found — install with: brew install librsvg')
  process.exit(1)
}
process.env.PATH = `${path.dirname(rsvg)}:${process.env.PATH ?? ''}`

run('python3', [path.join(skins, 'huaxia/gen-su-back.py')])
run('python3', [path.join(skins, 'huaxia/gen-su-face.py')])
run('python3', [path.join(skins, 'original/gen-coins.py'), skins])

console.log('coin textures baked')
