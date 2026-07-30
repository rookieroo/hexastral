#!/usr/bin/env node
/**
 * Device builds for Yuun need `-allowProvisioningUpdates` whenever new native
 * targets appear (Watch companion + complications). Expo CLI only passes that
 * flag when DEVELOPMENT_TEAM is *missing* from the pbxproj; after prebuild the
 * team is already set, so signing fails with "No profiles for …watch…".
 *
 * This wrapper puts a shim `xcodebuild` first on PATH that always appends the
 * provisioning flags, then delegates to `expo run:ios --device`.
 */
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yuun-xcodebuild-'))
const shimPath = path.join(shimDir, 'xcodebuild')
const realXcodebuild =
  spawnSync('which', ['xcodebuild'], { encoding: 'utf8' }).stdout.trim() || '/usr/bin/xcodebuild'

fs.writeFileSync(
  shimPath,
  `#!/bin/bash
set -euo pipefail
exec "${realXcodebuild}" "$@" -allowProvisioningUpdates -allowProvisioningDeviceRegistration
`
)
fs.chmodSync(shimPath, 0o755)

const expoBin = path.join(__dirname, '..', 'node_modules', '.bin', 'expo')
const extra = process.argv.slice(2)
const hasDeviceFlag = extra.some(
  (a) => a === '--device' || a === '-d' || a.startsWith('--device=') || a.startsWith('-d=')
)
const expoArgs = ['run:ios', ...(hasDeviceFlag ? [] : ['--device']), ...extra]
const child = spawn(expoBin, expoArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ''}`,
    LANG: process.env.LANG ?? 'en_US.UTF-8',
    LC_ALL: process.env.LC_ALL ?? 'en_US.UTF-8',
  },
  cwd: path.join(__dirname, '..'),
})

child.on('exit', (code, signal) => {
  try {
    fs.rmSync(shimDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup
  }
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
