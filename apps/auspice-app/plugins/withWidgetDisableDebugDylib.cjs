/**
 * Xcode 16+ Debug builds put extension / watch code in `*.debug.dylib`.
 * WidgetKit and watchOS installs often fail to load that layout. Workaround:
 * ENABLE_DEBUG_DYLIB=NO on widget + Watch companion + watch-widget.
 *
 * @see https://developer.apple.com/forums/thread/763386
 */
const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withXcodeProject } = requireFromExpo('@expo/config-plugins')

function isYuunNativeExtensionConfig(settings) {
  const entitlements = String(settings.CODE_SIGN_ENTITLEMENTS ?? '')
  const infoPlist = String(settings.INFOPLIST_FILE ?? '')
  const bundleId = String(settings.PRODUCT_BUNDLE_IDENTIFIER ?? '')
  return (
    entitlements.includes('AuspiceWidget') ||
    entitlements.includes('AuspiceWatch') ||
    entitlements.includes('YuunWatch') ||
    infoPlist.includes('targets/widget') ||
    infoPlist.includes('targets/watch-widget') ||
    infoPlist.includes('targets/watch/') ||
    // Companion Watch App (….yuun.watch) and its complication (….watch.widget)
    bundleId === 'com.hexastral.yuun.watch' ||
    bundleId.includes('yuun.widget') ||
    bundleId.includes('yuun.watch') ||
    bundleId.endsWith('.widget') ||
    bundleId.endsWith('.watch') ||
    bundleId.endsWith('.watch.widget')
  )
}

function withWidgetDisableDebugDylib(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults
    const configs = project.pbxXCBuildConfigurationSection()

    for (const key of Object.keys(configs)) {
      const entry = configs[key]
      if (typeof entry !== 'object' || !entry.buildSettings) continue
      if (!isYuunNativeExtensionConfig(entry.buildSettings)) continue
      entry.buildSettings.ENABLE_DEBUG_DYLIB = 'NO'
    }

    return cfg
  })
}

module.exports = withWidgetDisableDebugDylib
