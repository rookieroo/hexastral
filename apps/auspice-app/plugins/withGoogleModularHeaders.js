/**
 * Inject modular_headers for Google Sign-In → AppCheckCore static-lib build.
 * Same fix as apps/feng-app/ios/Podfile (GoogleUtilities + RecaptchaInterop).
 *
 * Resolve @expo/config-plugins via expo's install (Bun nests packages; bare
 * require('@expo/config-plugins') fails from this app-local plugins/ path).
 */

const { createRequire } = require('node:module')
const fs = require('node:fs')
const path = require('node:path')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withDangerousMod } = requireFromExpo('@expo/config-plugins')

const MARKER = "pod 'GoogleUtilities'"
const SNIPPET = `
  # Google Sign-In → AppCheckCore (Swift) imports Obj-C pods that lack module maps
  # when CocoaPods links statically (default for RN/Expo).
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withGoogleModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      if (!fs.existsSync(podfilePath)) return cfg
      let contents = fs.readFileSync(podfilePath, 'utf8')
      if (contents.includes(MARKER)) return cfg
      const anchor = 'config = use_native_modules!(config_command)'
      if (!contents.includes(anchor)) {
        throw new Error(
          '[withGoogleModularHeaders] Podfile missing use_native_modules! anchor — update plugin'
        )
      }
      contents = contents.replace(anchor, `${SNIPPET}\n  ${anchor}`)
      fs.writeFileSync(podfilePath, contents)
      return cfg
    },
  ])

module.exports = withGoogleModularHeaders
