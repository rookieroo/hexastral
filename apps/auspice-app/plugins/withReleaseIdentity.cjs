/**
 * Align committed Xcode MARKETING_VERSION / TARGETED_DEVICE_FAMILY with
 * app.json (version 1.0.0, iPhone-only). Watch targets keep family 4.
 */

const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withXcodeProject } = requireFromExpo('@expo/config-plugins')

function isWatchTarget(settings) {
  const family = String(settings.TARGETED_DEVICE_FAMILY ?? '')
  const bundleId = String(settings.PRODUCT_BUNDLE_IDENTIFIER ?? '')
  const infoPlist = String(settings.INFOPLIST_FILE ?? '')
  const entitlements = String(settings.CODE_SIGN_ENTITLEMENTS ?? '')
  return (
    family === '4' ||
    bundleId === 'com.hexastral.yuun.watch' ||
    bundleId.includes('yuun.watch') ||
    bundleId.endsWith('.watch') ||
    bundleId.endsWith('.watch.widget') ||
    infoPlist.includes('targets/watch') ||
    entitlements.includes('AuspiceWatch') ||
    entitlements.includes('YuunWatch')
  )
}

function withReleaseIdentity(config) {
  const version = String(config.version ?? '1.0.0')

  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults
    const configs = project.pbxXCBuildConfigurationSection()

    for (const key of Object.keys(configs)) {
      const entry = configs[key]
      if (typeof entry !== 'object' || !entry.buildSettings) continue
      const settings = entry.buildSettings
      settings.MARKETING_VERSION = version
      if (!isWatchTarget(settings)) {
        settings.TARGETED_DEVICE_FAMILY = '1'
      }
    }

    return cfg
  })
}

module.exports = withReleaseIdentity
