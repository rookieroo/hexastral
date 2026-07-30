/**
 * Expo config plugin: WidgetKit entitlements + validation for HexAstral apps.
 * CommonJS so Expo's config resolver can load it without ESM named-export issues.
 */

const { withEntitlementsPlist } = require('@expo/config-plugins')

/**
 * @typedef {object} WidgetKitIosPluginProps
 * @property {string} widgetName
 * @property {'yuun' | 'feng' | 'kindred' | 'yuan' | 'mingpan'} appSlug
 * @property {string} appGroupId
 * @property {boolean} [watchComplication]
 */

/** @type {import('@expo/config-plugins').ConfigPlugin<WidgetKitIosPluginProps>} */
const withWidgetExtension = (config, props) => {
  if (!props?.widgetName || !props?.appSlug || !props?.appGroupId) {
    throw new Error('[widget-kit-ios] All three of widgetName, appSlug, appGroupId are required')
  }

  console.log(
    `[widget-kit-ios] ${props.appSlug} → ${props.widgetName} group=${props.appGroupId}` +
      (props.watchComplication ? ' (watchComplication: YuunWatch via targets/watch-widget)' : '')
  )

  return withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.security.application-groups'
    const existing = cfg.modResults[key]
    const groups = Array.isArray(existing) ? existing.filter((g) => typeof g === 'string') : []
    if (!groups.includes(props.appGroupId)) {
      groups.push(props.appGroupId)
    }
    cfg.modResults[key] = groups
    return cfg
  })
}

module.exports = withWidgetExtension
