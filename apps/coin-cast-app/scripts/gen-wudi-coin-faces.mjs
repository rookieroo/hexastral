#!/usr/bin/env node
/**
 * Generate 水墨留白 五帝钱 → faces/<id>-ink*.png
 *
 * Prefers Pillow brush pipeline (Ma Shan Zheng). Falls back to SVG+rsvg.
 *
 *   node apps/coin-cast-app/scripts/gen-wudi-coin-faces.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const py = join(here, 'gen-wudi-ink-wash.py')

const r = spawnSync('python3', [py], { stdio: 'inherit', cwd: join(here, '..', '..', '..') })
process.exit(r.status ?? 1)
