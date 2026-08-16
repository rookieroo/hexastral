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
  // IAP gate invariant: no-IAP ship requires production EXPO_PUBLIC_IAP_ENABLED=false;
  // the post-banking IAP ship (strict mode) requires true. Mismatch = loud failure —
  // a production build with the wrong flag either breaks sign-in (true without RC keys)
  // or ships a dead paywall (false with products configured).
  const iapEnabled = prodEnv.EXPO_PUBLIC_IAP_ENABLED
  if (strict) {
    if (iapEnabled !== 'true') {
      fail(
        `production EXPO_PUBLIC_IAP_ENABLED must be 'true' for the IAP ship (got ${String(iapEnabled)})`,
      )
    }
  } else if (iapEnabled !== 'false') {
    fail(
      `no-IAP ship requires production EXPO_PUBLIC_IAP_ENABLED='false' (got ${String(iapEnabled)}) — sign-in and the paywall depend on it`,
    )
  }

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

// EAS 云端构建机的 CocoaPods 固定 xcodeproj 1.27.0，其版本表不含 objectVersion 70
// （Xcode 26 会把工程写回 70）→ pod install 必挂：`Unable to find compatibility
// version string for object version '70'`。70/77 是同一代格式，77 可直接解析。
// 本地 Xcode/prebuild 改写工程后，此处会拦住，防「本地能跑、云端必挂」再发生。
{
  const pbx = join(ROOT, 'apps/auspice-app/ios/Yuun.xcodeproj/project.pbxproj')
  if (!existsSync(pbx)) {
    fail('apps/auspice-app/ios/Yuun.xcodeproj/project.pbxproj missing — ios/ 必须保持提交，EAS 才会直接用它构建')
  } else {
    const raw = readFileSync(pbx, 'utf8')
    const m = raw.match(/^\s*objectVersion\s*=\s*(\d+);/m)
    if (m?.[1] === '70') {
      fail(
        'ios/Yuun.xcodeproj/project.pbxproj objectVersion=70 会让 EAS 云端 pod install 必挂 — 改回 77（Xcode 26 本地改动后检查这里）',
      )
    } else if (!m) {
      warn('could not read objectVersion from ios/Yuun.xcodeproj/project.pbxproj')
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
