#!/usr/bin/env node
/**
 * Thin wrapper — alignment + hole punch live in the Python extractor.
 *
 *   node apps/coin-cast-app/scripts/extract-wudi-from-source.mjs
 *   # or:
 *   python3 apps/coin-cast-app/scripts/extract-wudi-from-source.py
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const py = join(dirname(fileURLToPath(import.meta.url)), 'extract-wudi-from-source.py')
const r = spawnSync('python3', [py], { stdio: 'inherit' })
process.exit(r.status ?? 1)
