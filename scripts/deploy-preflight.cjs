#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const skipIos = process.argv.includes('--skip-ios')

function mustExist(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required path: ${relativePath}`)
  }
}

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath)
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

function assertScript(pkg, name, scriptName) {
  if (!pkg.scripts || typeof pkg.scripts[scriptName] !== 'string') {
    throw new Error(`Missing script "${scriptName}" in ${name}`)
  }
}

function run() {
  console.log('[preflight] validating repository layout...')
  mustExist('bun.lock')
  mustExist('apps/hexastral-web')
  mustExist('apps/hexastral-api')
  mustExist('services')

  console.log('[preflight] validating required scripts...')
  const rootPkg = readJson('package.json')
  assertScript(rootPkg, 'root package.json', 'deploy')
  assertScript(rootPkg, 'root package.json', 'deploy:api')
  assertScript(rootPkg, 'root package.json', 'deploy:services')

  const webPkg = readJson('apps/hexastral-web/package.json')
  assertScript(webPkg, 'apps/hexastral-web/package.json', 'deploy')

  const apiPkg = readJson('apps/hexastral-api/package.json')
  assertScript(apiPkg, 'apps/hexastral-api/package.json', 'deploy')

  if (!skipIos) {
    mustExist('apps/hexastral-app/eas.json')
  }

  console.log(`[preflight] ok${skipIos ? ' (ios checks skipped)' : ''}`)
}

try {
  run()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[preflight] failed: ${message}`)
  process.exit(1)
}
