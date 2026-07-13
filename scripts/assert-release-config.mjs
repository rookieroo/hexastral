#!/usr/bin/env node
/**
 * Fail production submit/build prep when placeholder secrets remain.
 * Run: node scripts/assert-release-config.mjs
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const PLACEHOLDER = /REPLACE_WITH_/i

let failed = false

function checkJson(path, label) {
  const raw = readFileSync(join(ROOT, path), 'utf8')
  if (PLACEHOLDER.test(raw)) {
    const hits = raw.match(/REPLACE_WITH_[A-Z0-9_]+/g) ?? []
    console.error(`FAIL ${label} (${path}): placeholder(s) ${[...new Set(hits)].join(', ')}`)
    failed = true
  }
}

function checkFile(path, label) {
  const raw = readFileSync(join(ROOT, path), 'utf8')
  if (PLACEHOLDER.test(raw)) {
    console.error(`FAIL ${label} (${path}): contains REPLACE_WITH_*`)
    failed = true
  }
}

// EAS submit + dev/preview env placeholders
checkJson('apps/auspice-app/eas.json', 'eas.json')
checkFile('apps/auspice-app/lib/config.ts', 'config.ts')

const appJson = readFileSync(join(ROOT, 'apps/auspice-app/app.json'), 'utf8')
if (PLACEHOLDER.test(appJson)) {
  console.error('FAIL app.json: contains REPLACE_WITH_*')
  failed = true
}

if (failed) {
  console.error(
    '\nRelease config not ready. Fill ASC app id / RevenueCat keys via EAS Secrets before production submit.',
  )
  process.exit(1)
}

console.log('RESULT: release config placeholders OK (or none in checked paths)')
process.exit(0)
