import { readFileSync, writeFileSync } from 'node:fs'

const DARK_TOKENS_BG = '#09090B'
const appJsonPath = process.argv[2]

if (!appJsonPath) {
  console.error('Usage: node scripts/sync-satellite-colors.mjs <app.json>')
  process.exit(1)
}

const raw = readFileSync(appJsonPath, 'utf8')
const data = JSON.parse(raw)

if (!data.expo) {
  console.error('Invalid app.json: missing expo field')
  process.exit(1)
}

data.expo.splash = {
  ...(data.expo.splash ?? {}),
  backgroundColor: DARK_TOKENS_BG,
}
data.expo.android = {
  ...(data.expo.android ?? {}),
  adaptiveIcon: {
    ...(data.expo.android?.adaptiveIcon ?? {}),
    backgroundColor: DARK_TOKENS_BG,
  },
}

writeFileSync(appJsonPath, `${JSON.stringify(data, null, 2)}\n`)
