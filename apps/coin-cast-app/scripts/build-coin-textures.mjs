#!/usr/bin/env node
/**
 * Bake coin skin PNGs into textures/skins/.../dist/.
 * Requires: python3, Pillow (+ numpy/scipy for huaxia), rsvg-convert.
 *
 *   bun run textures:build        — skip if all caps present
 *   bun run textures:rebake       — force huaxia + original + gallery
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skins = path.join(appRoot, 'components/casting-scene/textures/skins')
const forceRebake = process.argv.includes('--rebake')

const HUAXIA_IDS = ['banliang', 'wuzhu', 'daquan', 'kaiyuan', 'daguan', 'hongwu']
const HUAXIA_DESIGN_CAPS = HUAXIA_IDS.flatMap((id) => [
  path.join(skins, 'huaxia/design/dist/rub', `${id}-yang.png`),
  path.join(skins, 'huaxia/design/dist/rub', `${id}-yin.png`),
])
const huaxiaPhotoCaps = HUAXIA_IDS.flatMap((id) => [
  path.join(skins, 'huaxia/dist', `${id}-yang.jpg`),
  path.join(skins, 'huaxia/dist', `${id}-yin.jpg`),
])

const ORIGINAL_CAPS = [
  path.join(skins, 'huaxia/dist/back-su-yin.png'),
  path.join(skins, 'huaxia/dist/back-su-yang.png'),
  path.join(skins, 'original/dist/bagua-yang.png'),
  path.join(skins, 'original/dist/bagua-yin.png'),
  path.join(skins, 'original/dist/taiji-yang.png'),
  path.join(skins, 'original/dist/taiji-yin.png'),
  path.join(skins, 'original/dist/beidou-yang.png'),
  path.join(skins, 'original/dist/luoshu-yang.png'),
  path.join(skins, 'original/dist/wuxing-jin-yang.png'),
  path.join(skins, 'original/dist/wuxing-mu-yang.png'),
  path.join(skins, 'original/dist/wuxing-shui-yang.png'),
  path.join(skins, 'original/dist/wuxing-huo-yang.png'),
  path.join(skins, 'original/dist/wuxing-tu-yang.png'),
]

const ALL = [...HUAXIA_DESIGN_CAPS, ...huaxiaPhotoCaps, ...ORIGINAL_CAPS]

if (!forceRebake && ALL.every((f) => existsSync(f))) {
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
run('python3', [path.join(skins, 'huaxia/fonts/setup-fonts.py')])
run('python3', [path.join(skins, 'huaxia/design/gen-pattern-skins.py')])
run('python3', [path.join(skins, 'huaxia/design/gen-pattern-gallery.py')])
run('python3', [path.join(skins, 'huaxia/gen-huaxia.py')])
run('python3', [path.join(skins, 'huaxia/gen-huaxia-tracing.py')])
run('python3', [path.join(skins, 'huaxia/gen-seal-from-tracing.py')])
run('python3', [path.join(skins, 'huaxia/gen-huaxia-hand-rubbing.py')])

const kaiyuanVec = path.join(skins, 'huaxia/vector/gen-kaiyuan-vector.py')
if (existsSync(kaiyuanVec)) {
  const r = spawnSync('python3', [kaiyuanVec], { cwd: appRoot, stdio: 'inherit' })
  if (r.status !== 0) {
    console.warn('kaiyuan vector prototype skipped (non-fatal)')
  }
}

run('python3', [path.join(skins, 'gen-gallery.py')])

console.log('coin textures baked')
