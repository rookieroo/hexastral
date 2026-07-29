#!/usr/bin/env node
/**
 * ASO ↔ code parity gate — fails on claims the v1 app does not ship,
 * or Free/Pro framing that contradicts current product truth.
 * Run: node scripts/aso-code-parity.mjs apps/auspice-app/aso-metadata.json
 */
import { readFileSync } from 'node:fs'

const INDEXED = ['title', 'subtitle', 'keywords', 'promotionalText']

/** Still forbidden — not shipped or wrong IA. */
const MUST_NOT_CLAIM = [
  /\b4[\s-]?tab\b/i,
  /4 tab/i,
  /4 タブ/,
  /4 tab 结构/,
  /4 tab 結構/,
  /\bicloud\b/i,
  /iCloud/,
  /节庆 tab/i,
  /節慶 tab/,
]

/**
 * Product truth 2026-07: public 黄历 + Home/Lock/Watch are free;
 * For you on widgets after birth is not a Pro gate.
 * Fail if Pro section still sells widgets / Watch / public almanac as paid.
 */
const MUST_NOT_IN_PRO = [
  /Pro[^\n]{0,200}\b(?:adds|unlocks?)\b[^\n]{0,80}\b(?:For you|你而言|あなたへ).{0,40}\bwidget/i,
  /Pro[^\n]{0,200}(?:组件|元件|ウィジェット).{0,40}(?:对你而言|對你而言|あなたへ)/i,
  /For you line on widgets/i,
  /组件「对你而言」行/,
  /元件「對你而言」行/,
  /ウィジェットのあなたへ行/,
]

const SOFT_WARN = [/\bfortune\b/i, /major-fortune/i, /\blucky\b/i, /fortune-telling/i]

const PRIVACY_URL =
  /^https:\/\/yuun\.hexastral\.com\/(en|zh|tw|ja)\/privacy\/yuun$/
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
      for (const re of MUST_NOT_IN_PRO) {
        if (re.test(desc)) {
          console.error(`  FAIL ${locale} description: Pro framing contradicts free widgets/For you ${re}`)
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
        /yuun\.hexastral\.com\/(en|zh|tw|ja)\/privacy\/(?:yuun|auspice)/g,
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

      // Soft expect: free public almanac framing present for Yuun
      if (meta.appName === 'Yuun') {
        const hasFreeAlmanac =
          /public almanac|公开黄历|公開黃曆|公開黄暦/i.test(desc) ||
          /Home \/ Lock \/ Watch|主屏 \/ 锁屏 \/ Watch|主屏 \/ 鎖屏 \/ Watch|ホーム／ロック／Watch/.test(
            desc,
          )
        if (!hasFreeAlmanac) {
          console.warn(`  WARN ${locale} description: missing free public-almanac / Home-Lock-Watch framing`)
          warned = true
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
