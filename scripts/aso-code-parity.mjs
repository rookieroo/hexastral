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

/**
 * Widget / Watch / lock-screen claims are evidence-gated: only claim them once a
 * production archive containing the widget + watch targets passes the device
 * matrix (docs/apps/yuun/widget-build-runbook.md / android-widget-runbook.md).
 * The ASO file flips `_widgetEvidence: true` at that moment; until then any claim
 * fails. Regexes target claim phrases, NOT settings labels like 组件外观 /
 * ウィジェット外観 (which describe an in-app settings entry, not a store promise).
 */
const WIDGET_WATCH_CLAIMS = [
  /\bwidgets?\b/i,
  /lock\s*screen/i,
  /complications?/i,
  /\bwatch\b/i,
  /Apple\s*Watch|アップルウォッチ/i,
  /(桌面|主屏|主畫面|ホーム画面|ホームスクリーン).{0,6}(组件|元件|小組件|小部件|ウィジェット)/,
  /锁屏|鎖屏|ロック画面|ロックスクリーン/,
  /(免费|免費|無料|free).{0,10}(组件|元件|小組件|小部件|ウィジェット|widget)/i,
]

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
  const widgetEvidence = meta._widgetEvidence === true
  console.log(`\n${meta.appName ?? file} — parity check`)

  const scanDoNotUse = (where, text) => {
    if (typeof text !== 'string') return
    for (const term of doNotUse) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        console.error(`  FAIL ${where}: _doNotUse term "${term}"`)
        failed = true
      }
    }
  }

  // Widget/Watch claims — evidence-gated across every copy surface. The
  // description's "NOT astrology / 不是占星" disclaimers are exempt from
  // _doNotUse (intentional category-distancing), so only the indexed fields
  // feed that check while claims are scanned everywhere.
  const scanWidgetClaims = (where, text) => {
    if (typeof text !== 'string' || widgetEvidence) return
    for (const re of WIDGET_WATCH_CLAIMS) {
      if (re.test(text)) {
        console.error(
          `  FAIL ${where}: widget/Watch claim without evidence (_widgetEvidence !== true) — matches ${re}`,
        )
        failed = true
      }
    }
  }

  for (const [locale, fields] of Object.entries(meta.locales ?? {})) {
    for (const field of INDEXED) {
      scanDoNotUse(`${locale} ${field}`, fields[field])
      scanWidgetClaims(`${locale} ${field}`, fields[field])
    }

    const desc = fields.description
    if (typeof desc === 'string') {
      scanWidgetClaims(`${locale} description`, desc)
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
          /public almanac|公开黄历|公開黃曆|公開黄暦/i.test(desc)
        if (!hasFreeAlmanac) {
          console.warn(`  WARN ${locale} description: missing free public-almanac framing`)
          warned = true
        }
      }
    }
  }

  for (const [locale, fields] of Object.entries(meta.googlePlay?.locales ?? {})) {
    scanWidgetClaims(`googlePlay ${locale} shortDescription`, fields.shortDescription)
    scanWidgetClaims(`googlePlay ${locale} fullDescription`, fields.fullDescription)
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
