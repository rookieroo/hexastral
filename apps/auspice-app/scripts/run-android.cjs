#!/usr/bin/env node
/**
 * Yuun Android local run — pin JDK 17 (Gradle + Maven TLS fail on JDK 23+)
 * and invoke Expo from the app package.
 *
 * Usage (from apps/auspice-app):
 *   bun run android
 *   bun run android -- --device
 *   bun run android -- -d 2e2c22c1
 */
const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')

const appRoot = path.join(__dirname, '..')
const expoBin = path.join(appRoot, 'node_modules', '.bin', 'expo')

function resolveJavaHome17() {
  if (process.env.JAVA_HOME && /17|zulu-17|temurin-17/i.test(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME
  }
  if (process.platform === 'darwin') {
    const r = spawnSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' })
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim()
  }
  return process.env.JAVA_HOME || ''
}

const javaHome = resolveJavaHome17()
if (!javaHome) {
  console.error(
    '[yuun-android] JDK 17 required. Install Zulu/Temurin 17, then:\n' +
      '  export JAVA_HOME=$(/usr/libexec/java_home -v 17)'
  )
  process.exit(1)
}

const extra = process.argv.slice(2)
const child = spawn(expoBin, ['run:android', ...extra], {
  stdio: 'inherit',
  cwd: appRoot,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    // Prefer JDK 17 on PATH for Gradle daemons spawned by Expo.
    PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
  },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
