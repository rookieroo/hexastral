#!/usr/bin/env node
/**
 * Fail production submit/build prep when placeholder secrets remain,
 * or when production env lacks required RevenueCat / ASC values.
 *
 * Run from repo root: `node scripts/assert-release-config.mjs`
 * Optional: `AUSPICE_REQUIRE_PROD_KEYS=1` to also require production profile
 * env files / EAS secrets to be non-placeholder (CI gate before submit).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const PLACEHOLDER = /REPLACE_WITH_|REPLACE_YUAN|REPLACE_FENG/i
const strict = process.env.AUSPICE_REQUIRE_PROD_KEYS === '1'

let failed = false

function fail(msg) {
  console.error(`FAIL ${msg}`)
  failed = true
}

function warn(msg) {
  console.warn(`WARN ${msg}`)
}

function readJson(path, label) {
  const full = join(ROOT, path)
  if (!existsSync(full)) {
    fail(`${label} (${path}): missing`)
    return null
  }
  const raw = readFileSync(full, 'utf8')
  if (PLACEHOLDER.test(raw)) {
    const hits = raw.match(/REPLACE_WITH_[A-Z0-9_]+|REPLACE_YUAN|REPLACE_FENG/g) ?? []
    const msg = `${label} (${path}): placeholder(s) ${[...new Set(hits)].join(', ')}`
    if (strict) fail(msg)
    else warn(`${msg} — ok until AUSPICE_REQUIRE_PROD_KEYS=1`)
  }
  try {
    return JSON.parse(raw)
  } catch (err) {
    fail(`${label} (${path}): invalid JSON (${err instanceof Error ? err.message : String(err)})`)
    return null
  }
}

function checkFile(path, label) {
  const full = join(ROOT, path)
  if (!existsSync(full)) {
    fail(`${label} (${path}): missing`)
    return
  }
  const raw = readFileSync(full, 'utf8')
  if (!PLACEHOLDER.test(raw)) return
  if (!strict) {
    warn(`${label} (${path}): still has REPLACE_* (ok until AUSPICE_REQUIRE_PROD_KEYS=1)`)
    return
  }
  fail(`${label} (${path}): contains REPLACE_*`)
}

const eas = readJson('apps/auspice-app/eas.json', 'eas.json')
checkFile('apps/auspice-app/lib/config.ts', 'config.ts')
checkFile('apps/auspice-app/app.json', 'app.json')

if (eas) {
  const asc = eas.submit?.production?.ios?.ascAppId
  if (typeof asc !== 'string' || PLACEHOLDER.test(asc) || !/^\d+$/.test(asc)) {
    if (strict) {
      fail(
        `eas.json submit.production.ios.ascAppId must be numeric App Store Connect id (got ${String(asc)})`,
      )
    } else {
      warn('eas.json ascAppId still placeholder — set before ASC submit')
    }
  }

  const prodEnv = eas.build?.production?.env ?? {}
  for (const key of ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY']) {
    const v = prodEnv[key]
    if (!v || PLACEHOLDER.test(String(v))) {
      if (strict) {
        fail(
          `production env missing ${key} in eas.json (or inject via EAS Secrets / sync-eas-env before build)`,
        )
      } else {
        warn(
          `production ${key} not in eas.json — ensure EAS Secrets / sync-eas-env before production build`,
        )
      }
    }
  }

  for (const profile of ['development', 'preview']) {
    const env = eas.build?.[profile]?.env ?? {}
    for (const key of ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY']) {
      if (env[key] && PLACEHOLDER.test(String(env[key])) && strict) {
        fail(`eas.json build.${profile}.env.${key} is still REPLACE_*`)
      }
    }
  }
}

const appJson = readJson('apps/auspice-app/app.json', 'app.json parse')
if (appJson?.expo) {
  if (appJson.expo.version !== '1.0.0') {
    warn(`app.json version is ${appJson.expo.version} (launch target 1.0.0)`)
  }
  if (appJson.expo.ios?.supportsTablet !== false) {
    warn('app.json ios.supportsTablet should be false unless iPad screenshots exist')
  }
}

console.log(`
Worker secrets checklist (hexastral-api — verify with wrangler secret list, do not print values):
  - REVENUECAT_API_KEY
  - REVENUECAT_WEBHOOK_SECRET
  - CYCLE_CALENDAR_SECRET
  - ALLOW_DEV_PRO=0 (wrangler vars)
ASC / RevenueCat dashboard:
  - products auspice_pro_monthly / auspice_pro_annual
  - entitlement auspice_pro · offering auspice_default
  - webhook → api.hexastral.com
Human checklist: docs/apps/yuun/release-config-gate.md
`)

if (failed) {
  console.error(
    '\nRelease config not ready. Fill ASC app id / RevenueCat keys via EAS Secrets before production submit.',
  )
  process.exit(1)
}

console.log(
  strict
    ? 'RESULT: release config OK (strict)'
    : 'RESULT: release config soft-OK (placeholders allowed until AUSPICE_REQUIRE_PROD_KEYS=1)',
)
process.exit(0)
