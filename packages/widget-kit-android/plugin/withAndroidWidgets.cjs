/**
 * Expo config plugin for Yuun Android home widgets.
 * Autolinking merges the module AndroidManifest (Glance receivers).
 * This plugin validates props and logs wiring for prebuild.
 */

/**
 * @typedef {object} WidgetKitAndroidPluginProps
 * @property {string} widgetName Display name in the launcher widget picker
 * @property {'yuun' | 'feng' | 'kindred' | 'yuan' | 'mingpan'} appSlug
 */

/** @type {import('@expo/config-plugins').ConfigPlugin<WidgetKitAndroidPluginProps>} */
const withAndroidWidgets = (config, props) => {
  if (!props?.widgetName || !props?.appSlug) {
    throw new Error('[widget-kit-android] widgetName and appSlug are required')
  }

  console.log(
    `[widget-kit-android] ${props.appSlug} → Glance home widgets labeled "${props.widgetName}" (small/medium/large)`
  )

  return config
}

module.exports = withAndroidWidgets
