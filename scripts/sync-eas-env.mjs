import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const appsDir = join(root, 'apps')

const BASE_API_URL = 'https://api.hexastral.com'
const TEST_RC_KEY = 'test_RbVidJpEkAdpCjYRzjqCyEDAYDx'

const SATELLITE_APPS = [
  ['coin-cast-app', 'c07ecae2-d37c-4f8c-8dfa-3a3ceb6ef002', true],
  ['eight-pillars-app', 'e87ecae4-d37c-4f8c-8dfa-3a3ceb6ef004', true],
  ['face-oracle-app', 'f47ecae1-d37c-4f8c-8dfa-3a3ceb6ef001', true],
  ['feng-shui-app', 'fe7ecae5-d37c-4f8c-8dfa-3a3ceb6ef005', false],
  ['soul-match-app', '507ecae6-d37c-4f8c-8dfa-3a3ceb6ef006', true],
  ['star-palace-app', '5a7ecae7-d37c-4f8c-8dfa-3a3ceb6ef007', true],
]

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function envFor(projectId, stage, withRevenueCat) {
  const env = {
    EXPO_PUBLIC_API_URL: BASE_API_URL,
    EXPO_PUBLIC_EAS_PROJECT_ID: projectId,
    EXPO_PUBLIC_ENV: stage,
  }
  if (withRevenueCat && stage !== 'production') {
    env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = TEST_RC_KEY
    env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = TEST_RC_KEY
  }
  return env
}

for (const [app, projectId, withRevenueCat] of SATELLITE_APPS) {
  const easPath = join(appsDir, app, 'eas.json')
  const eas = readJson(easPath)
  eas.build.development.env = envFor(projectId, 'development', withRevenueCat)
  eas.build.preview.env = envFor(projectId, 'preview', withRevenueCat)
  eas.build.production.env = envFor(projectId, 'production', withRevenueCat)
  writeJson(easPath, eas)
}

const hexPath = join(appsDir, 'hexastral-app', 'eas.json')
const hex = readJson(hexPath)
const hexProjectId = '0a4af280-d37c-4f8c-8dfa-3a3ceb6ef3c4'
const googleIosClientId =
  '443209724807-74241r1rvca3nb4io9o6184ddrkhtf7m.apps.googleusercontent.com'
const googleAndroidClientId =
  '443209724807-nt26socuql9j5jmsrd1ve9h8ap7i3ubp.apps.googleusercontent.com'
const sentryDsn =
  'https://a2eeb5cea98aa6dd94b9255bde081951@o4511156674953216.ingest.us.sentry.io/4511156679671808'

hex.build.development.env = {
  EXPO_PUBLIC_API_URL: BASE_API_URL,
  EXPO_PUBLIC_EAS_PROJECT_ID: hexProjectId,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleAndroidClientId,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: TEST_RC_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: TEST_RC_KEY,
  EXPO_PUBLIC_ENV: 'development',
}
hex.build.preview.env = {
  EXPO_PUBLIC_API_URL: BASE_API_URL,
  EXPO_PUBLIC_EAS_PROJECT_ID: hexProjectId,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleAndroidClientId,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: TEST_RC_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: TEST_RC_KEY,
  EXPO_PUBLIC_SENTRY_DSN: sentryDsn,
  EXPO_PUBLIC_ENV: 'preview',
  SENTRY_DISABLE_AUTO_UPLOAD: 'true',
}
hex.build.production.env = {
  EXPO_PUBLIC_API_URL: BASE_API_URL,
  EXPO_PUBLIC_EAS_PROJECT_ID: hexProjectId,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: googleAndroidClientId,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_RlvRyEKWPqhtOZKmCponixllMxp',
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: TEST_RC_KEY,
  EXPO_PUBLIC_SENTRY_DSN: sentryDsn,
  EXPO_PUBLIC_ENV: 'production',
  SENTRY_DISABLE_AUTO_UPLOAD: 'true',
}
writeJson(hexPath, hex)

console.log('Synchronized EAS env blocks for Expo apps.')
