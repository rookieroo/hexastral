#!/usr/bin/env node
// ASO field char-count gate. CJK counts as 1 (JS string .length over BMP chars).
// Limits: title<=30, subtitle<=30, keywords<=100 (comma-tight), promotionalText<=170, description<=4000.
import { readFileSync } from 'node:fs'

const LIMITS = { title: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000 }
const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: node scripts/aso-charcount.mjs <aso-metadata.json> [...]')
  process.exit(2)
}

let failed = false
for (const file of files) {
  const meta = JSON.parse(readFileSync(file, 'utf8'))
  console.log(`\n${meta.appName ?? file} — ${file}`)
  for (const [locale, fields] of Object.entries(meta.locales ?? {})) {
    for (const [field, limit] of Object.entries(LIMITS)) {
      const val = fields[field]
      if (typeof val !== 'string') continue
      const len = [...val].length // code-point count (surrogate-safe)
      const ok = len <= limit
      if (!ok) failed = true
      const flag = ok ? 'ok ' : 'OVER'
      console.log(`  ${flag} ${locale.padEnd(8)} ${field.padEnd(16)} ${len}/${limit}`)
    }
  }
}
console.log(failed ? '\nRESULT: OVER LIMIT' : '\nRESULT: all within limits')
process.exit(failed ? 1 : 0)
