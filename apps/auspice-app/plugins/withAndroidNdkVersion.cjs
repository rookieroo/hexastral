/**
 * Android SDK/toolchain pins for local Expo prebuild.
 * - Prefer Expo's default NDK (27.x) once installed with source.properties.
 * - Falls back to NDK 26.1 if 27 is missing/corrupt (common half-install).
 */
const { createRequire } = require('node:module')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withAppBuildGradle, withProjectBuildGradle } = requireFromExpo('@expo/config-plugins')

const NDK_27 = '27.1.12297006'
const NDK_26 = '26.1.10909125'

function resolveNdkHome() {
  return (
    process.env.ANDROID_NDK_HOME ||
    process.env.ANDROID_NDK_ROOT ||
    path.join(
      process.env.ANDROID_HOME ||
        process.env.ANDROID_SDK_ROOT ||
        path.join(os.homedir(), 'Library/Android/sdk'),
      'ndk'
    )
  )
}

function pickNdkVersion() {
  const ndkRoot = resolveNdkHome()
  const has27 = fs.existsSync(path.join(ndkRoot, NDK_27, 'source.properties'))
  return has27 ? NDK_27 : NDK_26
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withAndroidNdkVersion = (config) => {
  const ndkVersion = pickNdkVersion()
  const rootPin = `\next.ndkVersion = "${ndkVersion}"\n`

  return withAppBuildGradle(
    withProjectBuildGradle(config, (cfg) => {
      if (cfg.modResults.language !== 'groovy') {
        return cfg
      }
      let contents = cfg.modResults.contents
      contents = contents.replace(
        /\n\/\/ Pin after expo-root-project[\s\S]*?ext\.ndkVersion\s*=\s*"[^"]+"\n?/g,
        '\n'
      )
      contents = contents.replace(/\n?ext\.ndkVersion\s*=\s*"[^"]+"\n?/g, '\n')
      const afterRoot = /apply plugin: "com\.facebook\.react\.rootproject"/
      if (afterRoot.test(contents)) {
        contents = contents.replace(
          afterRoot,
          `apply plugin: "com.facebook.react.rootproject"${rootPin}`
        )
      } else if (contents.includes('apply plugin: "expo-root-project"')) {
        contents = contents.replace(
          /apply plugin: "expo-root-project"/,
          `apply plugin: "expo-root-project"${rootPin}`
        )
      } else {
        contents = `${contents.trimEnd()}${rootPin}`
      }
      cfg.modResults.contents = contents
      return cfg
    }),
    (cfg) => {
      if (cfg.modResults.language !== 'groovy') {
        return cfg
      }
      let contents = cfg.modResults.contents
      // Prefer rootProject.ext so ExpoRootProject + our pin stay aligned.
      if (!contents.includes('ndkVersion rootProject.ext.ndkVersion')) {
        contents = contents.replace(/ndkVersion\s+"[^"]+"/, 'ndkVersion rootProject.ext.ndkVersion')
        contents = contents.replace(
          /ndkVersion\s+rootProject\.ext\.ndkVersion/,
          'ndkVersion rootProject.ext.ndkVersion'
        )
      }
      cfg.modResults.contents = contents
      return cfg
    }
  )
}

module.exports = withAndroidNdkVersion
