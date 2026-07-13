#!/usr/bin/env node
/**
 * ASO ↔ code parity gate — fails on claims the v1 app does not ship.
 * Run: node scripts/aso-code-parity.mjs apps/auspice-app/aso-metadata.json
 */
import { readFileSync } from 'node:fs'

const INDEXED = ['title', 'subtitle', 'keywords', 'promotionalText']
const MUST_NOT_CLAIM = [
  /\bwidget\b/i,
  /\bwidgets\b/i,
  /小组件/,
  /小組件/,
  /ウィジェット/,
  /\bwatch\b/i,
  /apple watch/i,
  /ウォッチ/,
  /\b4[\s-]?tab\b/i,
  /4 tab/i,
  /4 タブ/,
  /4 tab 结构/,
  /4 tab 結構/,
  /\bicloud\b/i,
  /iCloud/,
  /节庆 tab/i,
  /節慶 tab/,
  /small widget/i,
]

const SOFT_WARN = [/\bfortune\b/i, /major-fortune/i, /\blucky\b/i, /fortune-telling/i]

const PRIVACY_URL =
  /^https:\/\/yuun\.hexastral\.com\/(en|zh|tw|ja)\/privacy\/auspice$/
const TERMS_URL = /^https:\/\/yuun\.hexastral\.com\/(en|zh|tw|ja)\/terms$/

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: node scripts/aso-code-parity.mjs <aso-metadata.json> [...]')
  process.exit(2)
}

let failed = false
let warned = false

for (const file of files) {
  const meta = JSON.parse(readFileSync(file, 'utf8'))
  const doNotUse = meta._doNotUse ?? []
  console.log(`\n${meta.appName ?? file} — parity check`)

  for (const [locale, fields] of Object.entries(meta.locales ?? {})) {
    for (const field of INDEXED) {
      const val = fields[field]
      if (typeof val !== 'string') continue
      const lower = val.toLowerCase()
      for (const term of doNotUse) {
        if (lower.includes(term.toLowerCase())) {
          console.error(`  FAIL ${locale} ${field}: _doNotUse term "${term}"`)
          failed = true
        }
      }
    }

    const desc = fields.description
    if (typeof desc === 'string') {
      for (const re of MUST_NOT_CLAIM) {
        if (re.test(desc)) {
          console.error(`  FAIL ${locale} description: matches MUST_NOT_CLAIM ${re}`)
          failed = true
        }
      }
      for (const re of SOFT_WARN) {
        if (re.test(desc)) {
          console.warn(`  WARN ${locale} description: soft term ${re}`)
          warned = true
        }
      }

      const privacyMatch = desc.match(
        /yuun\.hexastral\.com\/(en|zh|tw|ja)\/privacy\/auspice/g,
      )
      const termsMatch = desc.match(/yuun\.hexastral\.com\/(en|zh|tw|ja)\/terms/g)
      for (const url of privacyMatch ?? []) {
        if (!PRIVACY_URL.test(`https://${url}`)) {
          console.error(`  FAIL ${locale} description: bad privacy URL https://${url}`)
          failed = true
        }
      }
      for (const url of termsMatch ?? []) {
        if (!TERMS_URL.test(`https://${url}`)) {
          console.error(`  FAIL ${locale} description: bad terms URL https://${url}`)
          failed = true
        }
      }
    }
  }

  if (meta.contentRating !== '12+') {
    console.error(`  FAIL contentRating: expected 12+, got ${meta.contentRating}`)
    failed = true
  }
}

console.log(
  failed
    ? '\nRESULT: PARITY FAIL'
    : warned
      ? '\nRESULT: pass with warnings'
      : '\nRESULT: parity OK',
)
process.exit(failed ? 1 : 0)
