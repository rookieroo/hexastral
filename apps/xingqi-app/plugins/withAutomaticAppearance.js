/**
 * Force the app to follow the system appearance.
 * Expo's userInterfaceStyle mapping does not overwrite an existing Dark plist.
 */

const { createRequire } = require('node:module')

const requireFromExpo = createRequire(require.resolve('expo/package.json'))
const { withAppDelegate, withInfoPlist } = requireFromExpo('@expo/config-plugins')

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withAutomaticAppearance(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIUserInterfaceStyle = 'Automatic'
    return cfg
  })
  return withAppDelegate(config, (cfg) => {
    const src = cfg.modResults.contents
    if (src.includes('overrideUserInterfaceStyle')) return cfg
    cfg.modResults.contents = src.replace(
      'window = UIWindow(frame: UIScreen.main.bounds)',
      'window = UIWindow(frame: UIScreen.main.bounds)\n    window?.overrideUserInterfaceStyle = .unspecified'
    )
    return cfg
  })
}
