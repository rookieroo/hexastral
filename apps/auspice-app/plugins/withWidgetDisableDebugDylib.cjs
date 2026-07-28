/**
 * Xcode 16+ Debug builds put WidgetKit extension code in `*.debug.dylib`.
 * WidgetKit often fails to load that layout → extension never appears in the
 * widget gallery. Apple's workaround: ENABLE_DEBUG_DYLIB=NO on the widget target.
 *
 * @see https://developer.apple.com/forums/thread/763386
 */
const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withXcodeProject } = requireFromExpo('@expo/config-plugins')

function isAuspiceWidgetConfig(settings) {
  const entitlements = String(settings.CODE_SIGN_ENTITLEMENTS ?? '')
  const infoPlist = String(settings.INFOPLIST_FILE ?? '')
  const bundleId = String(settings.PRODUCT_BUNDLE_IDENTIFIER ?? '')
  return (
    entitlements.includes('AuspiceWidget') ||
    infoPlist.includes('targets/widget') ||
    bundleId.includes('yuun.widget') ||
    bundleId.endsWith('.widget')
  )
}

function withWidgetDisableDebugDylib(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults
    const configs = project.pbxXCBuildConfigurationSection()

    for (const key of Object.keys(configs)) {
      const entry = configs[key]
      if (typeof entry !== 'object' || !entry.buildSettings) continue
      if (!isAuspiceWidgetConfig(entry.buildSettings)) continue
      entry.buildSettings.ENABLE_DEBUG_DYLIB = 'NO'
    }

    return cfg
  })
}

module.exports = withWidgetDisableDebugDylib
